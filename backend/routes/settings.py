from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from extensions import db
from models import SystemSettings, Zone

settings_bp = Blueprint('settings', __name__)


@settings_bp.route('/', methods=['GET'])
@jwt_required()
def get_settings():
    settings = SystemSettings.query.all()
    if not settings:
        # Create default global settings
        default = SystemSettings()
        db.session.add(default)
        db.session.commit()
        settings = [default]
    return jsonify({'settings': [s.to_dict() for s in settings]}), 200


@settings_bp.route('/', methods=['POST'])
@jwt_required()
def create_or_update_settings():
    data    = request.get_json()
    zone_id = data.get('zone_id')          # None = global

    existing = SystemSettings.query.filter_by(zone_id=zone_id).first()
    if existing:
        s = existing
    else:
        s = SystemSettings(zone_id=zone_id)
        db.session.add(s)

    s.alert_threshold_kwh  = data.get('alert_threshold_kwh',  s.alert_threshold_kwh)
    s.anomaly_std_factor   = data.get('anomaly_std_factor',   s.anomaly_std_factor)
    s.working_hours_start  = data.get('working_hours_start',  s.working_hours_start)
    s.working_hours_end    = data.get('working_hours_end',    s.working_hours_end)
    s.auto_control_enabled = data.get('auto_control_enabled', s.auto_control_enabled)
    db.session.commit()

    return jsonify({'settings': s.to_dict()}), 200
