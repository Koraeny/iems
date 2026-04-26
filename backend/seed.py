"""
seed.py – Run once to populate the database with default zones,
an admin user, and 7 days of simulated energy readings.

Usage:
    python seed.py
"""

from app import create_app
from extensions import db
from models import User, Zone, EnergyReading, SystemSettings
from ai_engine import simulate_reading
from datetime import datetime, timedelta
import random

app = create_app()

with app.app_context():
    db.drop_all()
    db.create_all()

    # Admin user
    admin = User(name='Admin User', email='admin@iems.ac.ke', role='administrator')
    admin.set_password('Admin@1234')
    db.session.add(admin)

    # General user
    staff = User(name='Office Staff', email='staff@iems.ac.ke', role='general_user')
    staff.set_password('Staff@1234')
    db.session.add(staff)

    # Zones
    zone_data = [
        ('Board Room',    'Executive meeting room',    15),
        ('Open Office A', 'Main open-plan workspace',  40),
        ('Open Office B', 'Secondary workspace',       30),
        ('Server Room',   '24/7 IT infrastructure',    5),
        ('Cafeteria',     'Staff dining area',         50),
    ]
    zones = []
    for name, desc, cap in zone_data:
        z = Zone(name=name, description=desc, capacity=cap)
        db.session.add(z)
        zones.append(z)

    db.session.flush()  # get zone IDs

    # Global settings
    global_settings = SystemSettings(
        zone_id=None,
        alert_threshold_kwh=60.0,
        anomaly_std_factor=2.0,
        working_hours_start=8,
        working_hours_end=18,
        auto_control_enabled=True
    )
    db.session.add(global_settings)

    # 7 days of simulated readings (every 30 minutes)
    now = datetime.utcnow()
    for day_offset in range(7, 0, -1):
        for hour in range(24):
            for minute in [0, 30]:
                ts = now - timedelta(days=day_offset) + timedelta(hours=hour, minutes=minute)
                for zone in zones:
                    consumption, voltage, current = simulate_reading(hour, zone.capacity)
                    reading = EnergyReading(
                        zone_id=zone.id,
                        consumption=consumption,
                        voltage=voltage,
                        current=current,
                        power_factor=round(random.uniform(0.85, 0.98), 2),
                        timestamp=ts
                    )
                    db.session.add(reading)

    db.session.commit()
    print("✅ Database seeded successfully.")
    print("   Admin:  admin@iems.ac.ke  /  Admin@1234")
    print("   Staff:  staff@iems.ac.ke  /  Staff@1234")
    print(f"   Zones:  {len(zones)}")
    print(f"   Readings: 7 days × 24h × 2/hr × {len(zones)} zones")

# Re-run with devices
with app.app_context():
    from models import Device, DeviceLog

    # Device templates per zone type
    device_templates = {
        'Board Room':    [
            ('Main Lights', 'light', 200), ('AC Unit', 'ac', 1500),
            ('Projector Outlet', 'outlet', 300), ('Master Switch', 'master', 0),
        ],
        'Open Office A': [
            ('Lights Row A', 'light', 400), ('Lights Row B', 'light', 400),
            ('AC Unit 1', 'ac', 2000), ('AC Unit 2', 'ac', 2000),
            ('Workstation Outlets', 'outlet', 800), ('Master Switch', 'master', 0),
        ],
        'Open Office B': [
            ('Lights', 'light', 300), ('AC Unit', 'ac', 1800),
            ('Workstation Outlets', 'outlet', 600), ('Master Switch', 'master', 0),
        ],
        'Server Room':   [
            ('Server Rack Lights', 'light', 100), ('Precision AC', 'ac', 3000),
            ('Server Rack Outlets', 'outlet', 5000), ('UPS Outlet', 'outlet', 2000),
            ('Master Switch', 'master', 0),
        ],
        'Cafeteria':     [
            ('Main Lights', 'light', 600), ('Kitchen AC', 'ac', 2500),
            ('Kitchen Appliances', 'outlet', 3000), ('Display Fridge Outlet', 'outlet', 500),
            ('Master Switch', 'master', 0),
        ],
    }

    # Get zones
    zones = Zone.query.all()
    for zone in zones:
        templates = device_templates.get(zone.name, [])
        for name, dtype, watts in templates:
            d = Device(zone_id=zone.id, name=name, type=dtype,
                       status='on', power_watts=watts)
            db.session.add(d)

    db.session.commit()
    print(f"   Devices: seeded for all zones")
