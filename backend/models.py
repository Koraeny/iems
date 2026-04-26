from extensions import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash


class User(db.Model):
    __tablename__ = 'users'

    id            = db.Column(db.Integer, primary_key=True)
    name          = db.Column(db.String(100), nullable=False)
    email         = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role          = db.Column(db.Enum('administrator', 'general_user'), default='general_user')
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'created_at': self.created_at.isoformat()
        }


class Zone(db.Model):
    __tablename__ = 'zones'

    id          = db.Column(db.Integer, primary_key=True)
    name        = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255))
    capacity    = db.Column(db.Integer, default=10)  # number of people
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    readings = db.relationship('EnergyReading', backref='zone', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'capacity': self.capacity
        }


class EnergyReading(db.Model):
    __tablename__ = 'energy_readings'

    id          = db.Column(db.Integer, primary_key=True)
    zone_id     = db.Column(db.Integer, db.ForeignKey('zones.id'), nullable=False)
    consumption = db.Column(db.Float, nullable=False)   # kWh
    voltage     = db.Column(db.Float, default=240.0)    # Volts
    current     = db.Column(db.Float)                   # Amps
    power_factor= db.Column(db.Float, default=0.9)
    timestamp   = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'zone_id': self.zone_id,
            'zone_name': self.zone.name if self.zone else None,
            'consumption': self.consumption,
            'voltage': self.voltage,
            'current': self.current,
            'power_factor': self.power_factor,
            'timestamp': self.timestamp.isoformat()
        }


class Alert(db.Model):
    __tablename__ = 'alerts'

    id          = db.Column(db.Integer, primary_key=True)
    zone_id     = db.Column(db.Integer, db.ForeignKey('zones.id'), nullable=True)
    type        = db.Column(db.Enum('anomaly', 'threshold', 'system'), nullable=False)
    severity    = db.Column(db.Enum('low', 'medium', 'high'), default='medium')
    message     = db.Column(db.String(255), nullable=False)
    value       = db.Column(db.Float)       # the reading that triggered the alert
    threshold   = db.Column(db.Float)       # the threshold that was breached
    resolved    = db.Column(db.Boolean, default=False)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    zone = db.relationship('Zone', backref='alerts')

    def to_dict(self):
        return {
            'id': self.id,
            'zone_id': self.zone_id,
            'zone_name': self.zone.name if self.zone else 'System',
            'type': self.type,
            'severity': self.severity,
            'message': self.message,
            'value': self.value,
            'threshold': self.threshold,
            'resolved': self.resolved,
            'created_at': self.created_at.isoformat()
        }


class ControlAction(db.Model):
    __tablename__ = 'control_actions'

    id          = db.Column(db.Integer, primary_key=True)
    zone_id     = db.Column(db.Integer, db.ForeignKey('zones.id'), nullable=True)
    action      = db.Column(db.String(100), nullable=False)  # e.g. "Turn off lights"
    triggered_by= db.Column(db.Enum('rule', 'manual'), default='rule')
    user_id     = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    timestamp   = db.Column(db.DateTime, default=datetime.utcnow)

    zone = db.relationship('Zone')
    user = db.relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'zone_id': self.zone_id,
            'zone_name': self.zone.name if self.zone else 'System',
            'action': self.action,
            'triggered_by': self.triggered_by,
            'user': self.user.name if self.user else 'System',
            'timestamp': self.timestamp.isoformat()
        }


class SystemSettings(db.Model):
    __tablename__ = 'system_settings'

    id                   = db.Column(db.Integer, primary_key=True)
    zone_id              = db.Column(db.Integer, db.ForeignKey('zones.id'), nullable=True)
    alert_threshold_kwh  = db.Column(db.Float, default=50.0)   # alert when consumption > X kWh
    anomaly_std_factor   = db.Column(db.Float, default=2.0)    # flag if > mean + N*std
    working_hours_start  = db.Column(db.Integer, default=8)    # 8 AM
    working_hours_end    = db.Column(db.Integer, default=18)   # 6 PM
    auto_control_enabled = db.Column(db.Boolean, default=True)
    updated_at           = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    zone = db.relationship('Zone')

    def to_dict(self):
        return {
            'id': self.id,
            'zone_id': self.zone_id,
            'zone_name': self.zone.name if self.zone else 'Global',
            'alert_threshold_kwh': self.alert_threshold_kwh,
            'anomaly_std_factor': self.anomaly_std_factor,
            'working_hours_start': self.working_hours_start,
            'working_hours_end': self.working_hours_end,
            'auto_control_enabled': self.auto_control_enabled
        }


class Device(db.Model):
    __tablename__ = 'devices'

    id          = db.Column(db.Integer, primary_key=True)
    zone_id     = db.Column(db.Integer, db.ForeignKey('zones.id'), nullable=False)
    name        = db.Column(db.String(100), nullable=False)
    type        = db.Column(db.Enum('light', 'ac', 'outlet', 'master'), nullable=False)
    status      = db.Column(db.Enum('on', 'off'), default='on')
    power_watts = db.Column(db.Float, default=0.0)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    zone = db.relationship('Zone', backref='devices')
    logs = db.relationship('DeviceLog', backref='device', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'zone_id': self.zone_id,
            'zone_name': self.zone.name if self.zone else None,
            'name': self.name,
            'type': self.type,
            'status': self.status,
            'power_watts': self.power_watts,
            'created_at': self.created_at.isoformat()
        }


class DeviceLog(db.Model):
    __tablename__ = 'device_logs'

    id           = db.Column(db.Integer, primary_key=True)
    device_id    = db.Column(db.Integer, db.ForeignKey('devices.id'), nullable=False)
    action       = db.Column(db.Enum('on', 'off'), nullable=False)
    triggered_by = db.Column(db.Enum('manual', 'auto', 'schedule'), default='manual')
    user_id      = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    reason       = db.Column(db.String(255))
    timestamp    = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'device_id': self.device_id,
            'device_name': self.device.name if self.device else None,
            'zone_name': self.device.zone.name if self.device and self.device.zone else None,
            'action': self.action,
            'triggered_by': self.triggered_by,
            'user': self.user.name if self.user else 'System',
            'reason': self.reason,
            'timestamp': self.timestamp.isoformat()
        }
