"""
Add this to models.py — Device and DeviceLog models
"""

# Add these two classes to your existing models.py file

class Device(db.Model):
    __tablename__ = 'devices'

    id          = db.Column(db.Integer, primary_key=True)
    zone_id     = db.Column(db.Integer, db.ForeignKey('zones.id'), nullable=False)
    name        = db.Column(db.String(100), nullable=False)       # e.g. "AC Unit 1"
    type        = db.Column(db.Enum('light', 'ac', 'outlet', 'master'), nullable=False)
    status      = db.Column(db.Enum('on', 'off'), default='on')
    power_watts = db.Column(db.Float, default=0.0)                # rated power draw
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

    id          = db.Column(db.Integer, primary_key=True)
    device_id   = db.Column(db.Integer, db.ForeignKey('devices.id'), nullable=False)
    action      = db.Column(db.Enum('on', 'off'), nullable=False)
    triggered_by= db.Column(db.Enum('manual', 'auto', 'schedule'), default='manual')
    user_id     = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    reason      = db.Column(db.String(255))
    timestamp   = db.Column(db.DateTime, default=datetime.utcnow)

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
