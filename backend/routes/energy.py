from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from extensions import db
from models import EnergyReading, Zone, ControlAction, Alert, SystemSettings
from datetime import datetime, timedelta
import random, math
from ai_engine import simulate_reading, detect_anomaly, predict_next_month

energy_bp = Blueprint('energy', __name__)


# ── Zones ──────────────────────────────────────────────────────────────────────

@energy_bp.route('/zones', methods=['GET'])
@jwt_required()
def get_zones():
    zones = Zone.query.all()
    return jsonify({'zones': [z.to_dict() for z in zones]}), 200


@energy_bp.route('/zones', methods=['POST'])
@jwt_required()
def create_zone():
    data = request.get_json()
    zone = Zone(
        name=data.get('name'),
        description=data.get('description', ''),
        capacity=data.get('capacity', 10)
    )
    db.session.add(zone)
    db.session.commit()
    return jsonify({'zone': zone.to_dict()}), 201


# ── Readings ───────────────────────────────────────────────────────────────────

@energy_bp.route('/readings', methods=['GET'])
@jwt_required()
def get_readings():
    zone_id = request.args.get('zone_id', type=int)
    hours   = request.args.get('hours', 24, type=int)
    since   = datetime.utcnow() - timedelta(hours=hours)

    q = EnergyReading.query.filter(EnergyReading.timestamp >= since)
    if zone_id:
        q = q.filter_by(zone_id=zone_id)
    readings = q.order_by(EnergyReading.timestamp.asc()).all()
    return jsonify({'readings': [r.to_dict() for r in readings]}), 200


@energy_bp.route('/readings', methods=['POST'])
@jwt_required()
def add_reading():
    data    = request.get_json()
    zone_id = data.get('zone_id')
    if not zone_id or not Zone.query.get(zone_id):
        return jsonify({'error': 'Valid zone_id required'}), 400

    reading = EnergyReading(
        zone_id=zone_id,
        consumption=data.get('consumption'),
        voltage=data.get('voltage', 240.0),
        current=data.get('current'),
        power_factor=data.get('power_factor', 0.9)
    )
    db.session.add(reading)
    db.session.commit()

    # Run anomaly check after each new reading
    _check_and_alert(reading)

    return jsonify({'reading': reading.to_dict()}), 201


# ── Simulate (generate fake sensor data) ──────────────────────────────────────

@energy_bp.route('/simulate', methods=['POST'])
@jwt_required()
def simulate():
    """Generate one simulated reading per zone and store it."""
    zones    = Zone.query.all()
    now      = datetime.utcnow()
    new_readings = []

    for zone in zones:
        consumption, voltage, current = simulate_reading(now.hour, zone.capacity)
        reading = EnergyReading(
            zone_id=zone.id,
            consumption=consumption,
            voltage=voltage,
            current=current,
            power_factor=round(random.uniform(0.85, 0.98), 2),
            timestamp=now
        )
        db.session.add(reading)
        new_readings.append(reading)

    db.session.commit()

    alerts_triggered = []
    for r in new_readings:
        alert = _check_and_alert(r)
        if alert:
            alerts_triggered.append(alert.to_dict())

    return jsonify({
        'readings': [r.to_dict() for r in new_readings],
        'alerts_triggered': alerts_triggered
    }), 201


# ── Dashboard Stats ────────────────────────────────────────────────────────────

@energy_bp.route('/stats', methods=['GET'])
@jwt_required()
def stats():
    since_24h = datetime.utcnow() - timedelta(hours=24)
    readings  = EnergyReading.query.filter(EnergyReading.timestamp >= since_24h).all()

    total_usage  = sum(r.consumption for r in readings)
    peak_load    = max((r.consumption for r in readings), default=0)
    active_alerts= Alert.query.filter_by(resolved=False).count()
    auto_actions = ControlAction.query.filter(
        ControlAction.timestamp >= since_24h,
        ControlAction.triggered_by == 'rule'
    ).count()

    # Per-zone summary
    zones = Zone.query.all()
    zone_stats = []
    for z in zones:
        zone_readings = [r for r in readings if r.zone_id == z.id]
        zone_stats.append({
            'zone': z.name,
            'total_kwh': round(sum(r.consumption for r in zone_readings), 2),
            'peak_kwh': round(max((r.consumption for r in zone_readings), default=0), 2),
            'readings_count': len(zone_readings)
        })

    return jsonify({
        'total_usage_kwh': round(total_usage, 2),
        'peak_load_kwh': round(peak_load, 2),
        'active_alerts': active_alerts,
        'auto_actions': auto_actions,
        'zone_stats': zone_stats
    }), 200


# ── Prediction ─────────────────────────────────────────────────────────────────

@energy_bp.route('/predict', methods=['GET'])
@jwt_required()
def predict():
    readings = EnergyReading.query.order_by(EnergyReading.timestamp.asc()).all()
    if len(readings) < 5:
        return jsonify({'error': 'Not enough data for prediction. Run simulate first.'}), 400

    result = predict_next_month(readings)
    return jsonify(result), 200


# ── Internal helper ────────────────────────────────────────────────────────────

def _check_and_alert(reading: EnergyReading):
    """Run anomaly + threshold check and create an Alert if needed."""
    # Get settings for this zone (fall back to global)
    settings = (
        SystemSettings.query.filter_by(zone_id=reading.zone_id).first()
        or SystemSettings.query.filter_by(zone_id=None).first()
    )
    threshold = settings.alert_threshold_kwh if settings else 50.0
    std_factor = settings.anomaly_std_factor if settings else 2.0

    # Threshold breach
    if reading.consumption > threshold:
        alert = Alert(
            zone_id=reading.zone_id,
            type='threshold',
            severity='high',
            message=f"Consumption {reading.consumption:.1f} kWh exceeds threshold of {threshold} kWh",
            value=reading.consumption,
            threshold=threshold
        )
        db.session.add(alert)
        db.session.commit()
        return alert

    # Statistical anomaly – look at last 20 readings for this zone
    recent = (EnergyReading.query
              .filter_by(zone_id=reading.zone_id)
              .order_by(EnergyReading.timestamp.desc())
              .limit(20).all())
    is_anomaly, mean, std = detect_anomaly(reading.consumption, recent, std_factor)

    if is_anomaly:
        alert = Alert(
            zone_id=reading.zone_id,
            type='anomaly',
            severity='medium',
            message=f"Anomalous reading {reading.consumption:.1f} kWh (mean={mean:.1f}, std={std:.1f})",
            value=reading.consumption,
            threshold=round(mean + std_factor * std, 2)
        )
        db.session.add(alert)

        # Auto control action
        if settings and settings.auto_control_enabled:
            action = ControlAction(
                zone_id=reading.zone_id,
                action=f"Auto-reduced load in {reading.zone.name}",
                triggered_by='rule'
            )
            db.session.add(action)

        db.session.commit()
        return alert

    return None
