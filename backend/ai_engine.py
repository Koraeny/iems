"""
AI Engine for IEMS
------------------
1. simulate_reading  – generates realistic simulated energy data
2. detect_anomaly    – statistical anomaly detection (mean ± N*std)
3. predict_next_month – simple linear regression to forecast next month's consumption
"""

import random
import math
import statistics
from datetime import datetime


# ── 1. Energy Simulation ──────────────────────────────────────────────────────

def simulate_reading(hour: int, zone_capacity: int = 10):
    """
    Generate a realistic simulated energy reading for a zone.

    Parameters:
        hour          – current hour of day (0-23)
        zone_capacity – number of occupants the zone supports

    Returns:
        (consumption_kwh, voltage_v, current_a)
    """
    # Base load: higher during working hours (8–18), lower outside
    if 8 <= hour < 12:
        base = 20 + (zone_capacity * 1.5)          # Morning ramp-up
    elif 12 <= hour < 14:
        base = 15 + (zone_capacity * 1.0)          # Lunch dip
    elif 14 <= hour < 18:
        base = 22 + (zone_capacity * 1.8)          # Afternoon peak
    elif 18 <= hour < 22:
        base = 10 + (zone_capacity * 0.5)          # Evening wind-down
    else:
        base = 5 + (zone_capacity * 0.2)           # Night standby

    # Add Gaussian noise (±15 %)
    noise        = random.gauss(0, base * 0.15)
    consumption  = max(0.5, round(base + noise, 2))

    # Occasionally inject a spike (5 % chance) for anomaly detection to catch
    if random.random() < 0.05:
        consumption = round(consumption * random.uniform(2.0, 3.5), 2)

    voltage = round(random.uniform(228, 242), 1)   # ±2 % of 240 V
    current = round(consumption / (voltage * 0.9) * 1000 / voltage, 2)  # simplified

    return consumption, voltage, current


# ── 2. Anomaly Detection ──────────────────────────────────────────────────────

def detect_anomaly(value: float, recent_readings, std_factor: float = 2.0):
    """
    Detect whether a reading is anomalous using a statistical baseline.

    Parameters:
        value           – the consumption value to test
        recent_readings – list of EnergyReading objects (last N readings)
        std_factor      – how many standard deviations above mean triggers an alert

    Returns:
        (is_anomaly: bool, mean: float, std: float)
    """
    if len(recent_readings) < 3:
        return False, 0.0, 0.0

    values = [r.consumption for r in recent_readings]
    mean   = statistics.mean(values)
    std    = statistics.stdev(values) if len(values) > 1 else 0.0

    if std == 0:
        return False, mean, std

    upper_bound = mean + std_factor * std
    is_anomaly  = value > upper_bound

    return is_anomaly, round(mean, 2), round(std, 2)


# ── 3. Linear Regression Prediction ──────────────────────────────────────────

def predict_next_month(readings):
    """
    Use simple linear regression to estimate next month's total energy consumption
    and electricity cost.

    Parameters:
        readings – all EnergyReading objects (ordered by timestamp asc)

    Returns:
        dict with predicted_kwh, estimated_cost_kes, model details
    """
    if len(readings) < 5:
        return {'error': 'Insufficient data'}

    # Aggregate readings into daily totals
    daily = {}
    for r in readings:
        day_key = r.timestamp.strftime('%Y-%m-%d')
        daily.setdefault(day_key, 0.0)
        daily[day_key] += r.consumption

    sorted_days = sorted(daily.keys())
    y = [daily[d] for d in sorted_days]   # daily consumption
    x = list(range(len(y)))               # day index (0, 1, 2, ...)

    n      = len(x)
    x_mean = sum(x) / n
    y_mean = sum(y) / n

    # Calculate slope (m) and intercept (b) for y = mx + b
    numerator   = sum((x[i] - x_mean) * (y[i] - y_mean) for i in range(n))
    denominator = sum((x[i] - x_mean) ** 2 for i in range(n))

    if denominator == 0:
        slope = 0
    else:
        slope = numerator / denominator

    intercept = y_mean - slope * x_mean

    # Predict next 30 days
    last_x       = x[-1]
    future_daily = [slope * (last_x + i + 1) + intercept for i in range(30)]
    future_daily = [max(0, v) for v in future_daily]   # no negative consumption
    predicted_kwh = round(sum(future_daily), 2)

    # Kenya Power rate: approximately KES 25–30 per kWh (commercial)
    rate_kes_per_kwh  = 27.0
    estimated_cost_kes = round(predicted_kwh * rate_kes_per_kwh, 2)

    # R² score
    ss_res = sum((y[i] - (slope * x[i] + intercept)) ** 2 for i in range(n))
    ss_tot = sum((y[i] - y_mean) ** 2 for i in range(n))
    r2     = round(1 - (ss_res / ss_tot), 4) if ss_tot != 0 else 0

    return {
        'predicted_kwh_next_month': predicted_kwh,
        'estimated_cost_kes': estimated_cost_kes,
        'rate_kes_per_kwh': rate_kes_per_kwh,
        'model': {
            'slope': round(slope, 4),
            'intercept': round(intercept, 4),
            'r_squared': r2,
            'data_points': n
        },
        'daily_forecast': [
            {'day': i + 1, 'predicted_kwh': round(v, 2)}
            for i, v in enumerate(future_daily)
        ]
    }
