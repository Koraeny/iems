from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models import EnergyReading
from datetime import datetime, timedelta

reports_bp = Blueprint('reports', __name__)


@reports_bp.route('/daily', methods=['GET'])
@jwt_required()
def daily_report():
    days  = request.args.get('days', 7, type=int)
    since = datetime.utcnow() - timedelta(days=days)
    readings = EnergyReading.query.filter(EnergyReading.timestamp >= since).all()

    # Group by date
    by_date = {}
    for r in readings:
        key = r.timestamp.strftime('%Y-%m-%d')
        by_date.setdefault(key, 0)
        by_date[key] += r.consumption

    report = [{'date': k, 'total_kwh': round(v, 2)} for k, v in sorted(by_date.items())]
    return jsonify({'report': report, 'period_days': days}), 200


@reports_bp.route('/hourly', methods=['GET'])
@jwt_required()
def hourly_report():
    readings = EnergyReading.query.filter(
        EnergyReading.timestamp >= datetime.utcnow() - timedelta(hours=24)
    ).all()

    by_hour = {}
    for r in readings:
        key = r.timestamp.strftime('%H:00')
        by_hour.setdefault(key, 0)
        by_hour[key] += r.consumption

    report = [{'hour': k, 'total_kwh': round(v, 2)} for k, v in sorted(by_hour.items())]
    return jsonify({'report': report}), 200
