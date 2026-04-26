from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Device, DeviceLog, Zone, User

devices_bp = Blueprint('devices', __name__)


# ── List all devices (optionally filter by zone) ───────────────────────────────
@devices_bp.route('/', methods=['GET'])
@jwt_required()
def get_devices():
    zone_id = request.args.get('zone_id', type=int)
    q = Device.query
    if zone_id:
        q = q.filter_by(zone_id=zone_id)
    devices = q.order_by(Device.zone_id, Device.type).all()
    return jsonify({'devices': [d.to_dict() for d in devices]}), 200


# ── Create a device ────────────────────────────────────────────────────────────
@devices_bp.route('/', methods=['POST'])
@jwt_required()
def create_device():
    data = request.get_json()
    zone = Zone.query.get(data.get('zone_id'))
    if not zone:
        return jsonify({'error': 'Invalid zone_id'}), 400

    device = Device(
        zone_id=data['zone_id'],
        name=data.get('name', 'Unnamed Device'),
        type=data.get('type', 'outlet'),
        status=data.get('status', 'on'),
        power_watts=data.get('power_watts', 0.0)
    )
    db.session.add(device)
    db.session.commit()
    return jsonify({'device': device.to_dict()}), 201


# ── Toggle a device on or off ──────────────────────────────────────────────────
@devices_bp.route('/<int:device_id>/toggle', methods=['PATCH'])
@jwt_required()
def toggle_device(device_id):
    user_id = get_jwt_identity()
    device  = Device.query.get_or_404(device_id)
    action  = request.get_json().get('action')  # 'on' or 'off'

    if action not in ('on', 'off'):
        return jsonify({'error': "action must be 'on' or 'off'"}), 400

    device.status = action

    log = DeviceLog(
        device_id=device.id,
        action=action,
        triggered_by='manual',
        user_id=int(user_id),
        reason=request.get_json().get('reason', 'Manual control via dashboard')
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        'device': device.to_dict(),
        'log': log.to_dict(),
        'message': f"{device.name} turned {action} successfully"
    }), 200


# ── Turn off ALL devices in a zone (emergency/auto) ────────────────────────────
@devices_bp.route('/zone/<int:zone_id>/off', methods=['PATCH'])
@jwt_required()
def zone_off(zone_id):
    user_id = get_jwt_identity()
    data    = request.get_json() or {}
    reason  = data.get('reason', 'Zone shutdown triggered')
    trigger = data.get('triggered_by', 'manual')

    devices = Device.query.filter_by(zone_id=zone_id, status='on').all()
    if not devices:
        return jsonify({'message': 'No active devices in this zone'}), 200

    logs = []
    for device in devices:
        device.status = 'off'
        log = DeviceLog(
            device_id=device.id,
            action='off',
            triggered_by=trigger,
            user_id=int(user_id) if trigger == 'manual' else None,
            reason=reason
        )
        db.session.add(log)
        logs.append(log)

    db.session.commit()
    return jsonify({
        'message': f"All {len(devices)} devices in zone turned off",
        'devices_affected': len(devices)
    }), 200


# ── Turn on ALL devices in a zone ──────────────────────────────────────────────
@devices_bp.route('/zone/<int:zone_id>/on', methods=['PATCH'])
@jwt_required()
def zone_on(zone_id):
    user_id = get_jwt_identity()
    data    = request.get_json() or {}
    reason  = data.get('reason', 'Zone power restored')

    devices = Device.query.filter_by(zone_id=zone_id, status='off').all()
    for device in devices:
        device.status = 'on'
        log = DeviceLog(
            device_id=device.id,
            action='on',
            triggered_by='manual',
            user_id=int(user_id),
            reason=reason
        )
        db.session.add(log)

    db.session.commit()
    return jsonify({
        'message': f"{len(devices)} devices in zone turned on",
        'devices_affected': len(devices)
    }), 200


# ── Device control logs ────────────────────────────────────────────────────────
@devices_bp.route('/logs', methods=['GET'])
@jwt_required()
def get_logs():
    limit = request.args.get('limit', 50, type=int)
    logs  = DeviceLog.query.order_by(DeviceLog.timestamp.desc()).limit(limit).all()
    return jsonify({'logs': [l.to_dict() for l in logs]}), 200


# ── Device summary per zone ────────────────────────────────────────────────────
@devices_bp.route('/summary', methods=['GET'])
@jwt_required()
def summary():
    zones   = Zone.query.all()
    result  = []
    for zone in zones:
        devices = Device.query.filter_by(zone_id=zone.id).all()
        on_count  = sum(1 for d in devices if d.status == 'on')
        off_count = sum(1 for d in devices if d.status == 'off')
        total_watts = sum(d.power_watts for d in devices if d.status == 'on')
        result.append({
            'zone_id': zone.id,
            'zone_name': zone.name,
            'total_devices': len(devices),
            'on': on_count,
            'off': off_count,
            'active_watts': total_watts
        })
    return jsonify({'summary': result}), 200


# ── Scheduled auto-off (call this at working hours end) ───────────────────────
@devices_bp.route('/auto-off', methods=['POST'])
@jwt_required()
def scheduled_auto_off():
    """Turn off all non-server devices outside working hours."""
    from models import SystemSettings
    from datetime import datetime

    settings = SystemSettings.query.filter_by(zone_id=None).first()
    end_hour = settings.working_hours_end if settings else 18
    now_hour = datetime.utcnow().hour + 3  # EAT = UTC+3

    if now_hour < end_hour:
        return jsonify({'message': f'Still within working hours (end: {end_hour}:00 EAT)'}), 200

    # Turn off all non-server-room devices
    server_zones = [z.id for z in Zone.query.filter(Zone.name.ilike('%server%')).all()]
    devices = Device.query.filter(
        Device.status == 'on',
        ~Device.zone_id.in_(server_zones)
    ).all()

    count = 0
    for device in devices:
        device.status = 'off'
        log = DeviceLog(
            device_id=device.id,
            action='off',
            triggered_by='schedule',
            reason=f'Scheduled auto-off at {end_hour}:00 EAT'
        )
        db.session.add(log)
        count += 1

    db.session.commit()
    return jsonify({'message': f'Scheduled auto-off: {count} devices turned off', 'devices_off': count}), 200
