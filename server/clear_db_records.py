import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'water_monitoring.db')

def clear_database():
    print(f"Connecting to SQLite database: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("Clearing all data records from database...")
    cursor.execute("DELETE FROM meter_readings")
    cursor.execute("DELETE FROM daily_production_targets")
    cursor.execute("DELETE FROM stp_etp_readings")
    cursor.execute("DELETE FROM audit_logs")

    # Reset autoincrement primary keys
    cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ('meter_readings', 'daily_production_targets', 'stp_etp_readings', 'audit_logs')")

    conn.commit()

    # Verify counts
    cursor.execute("SELECT COUNT(*) FROM meter_readings")
    m_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM daily_production_targets")
    p_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM stp_etp_readings")
    s_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM audit_logs")
    a_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM meters")
    meters_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM users")
    users_count = cursor.fetchone()[0]

    conn.close()

    print("=" * 60)
    print("      DATABASE CLEANUP COMPLETE")
    print("=" * 60)
    print(f"  • meter_readings remaining: {m_count}")
    print(f"  • daily_production_targets remaining: {p_count}")
    print(f"  • stp_etp_readings remaining: {s_count}")
    print(f"  • audit_logs remaining: {a_count}")
    print(f"  • Configured Meters retained: {meters_count}")
    print(f"  • User Accounts retained: {users_count}")
    print("=" * 60)

if __name__ == '__main__':
    clear_database()
