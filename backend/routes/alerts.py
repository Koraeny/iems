from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from extensions import db
from models import Alert

alerts_bp = Blueprint('alerts', __name__)


@alerts_bp.route('/', methods=['GET'])
@jwt_required()
def get_alerts():
    resolved = request.args.get('resolved', 'false').lower() == 'true'
    limit    = request.args.get('limit', 50, type=int)
    alerts   = (Alert.query
                .filter_by(resolved=resolved)
                .order_by(Alert.created_at.desc())
                .limit(limit).all())
    return jsonify({'alerts': [a.to_dict() for a in alerts]}), 200


@alerts_bp.route('/<int:alert_id>/resolve', methods=['PATCH'])
@jwt_required()
def resolve_alert(alert_id):
    alert = Alert.query.get_or_404(alert_id)
    alert.resolved = True
    db.session.commit()
    return jsonify({'alert': alert.to_dict()}), 200


@alerts_bp.route('/resolve-all', methods=['PATCH'])
@jwt_required()
def resolve_all():
    Alert.query.filter_by(resolved=False).update({'resolved': True})
    db.session.commit()
    return jsonify({'message': 'All alerts resolved'}), 200
