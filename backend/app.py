from flask import Flask
from flask_cors import CORS
from extensions import db, jwt
from routes.auth import auth_bp
from routes.energy import energy_bp
from routes.alerts import alerts_bp
from routes.settings import settings_bp
from routes.reports import reports_bp
from routes.devices import devices_bp
import os

def create_app():
    app = Flask(__name__)

    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'iems-secret-key-2024')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
        'DATABASE_URL',
        'mysql+pymysql://iems_user:password@localhost/iems_db'
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'iems-jwt-secret-2024')

    # Extensions
    CORS(app, origins=["http://localhost:3000"])
    db.init_app(app)
    jwt.init_app(app)

    # Blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(energy_bp,   url_prefix='/api/energy')
    app.register_blueprint(alerts_bp,   url_prefix='/api/alerts')
    app.register_blueprint(settings_bp, url_prefix='/api/settings')
    app.register_blueprint(reports_bp,  url_prefix='/api/reports')
    app.register_blueprint(devices_bp, url_prefix='/api/devices')

    with app.app_context():
        db.create_all()

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)

import pymysql
pymysql.install_as_MySQLdb()
