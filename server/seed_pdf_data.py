import os
import sqlite3
import re
import pymupdf

DB_PATH = os.path.join(os.path.dirname(__file__), 'water_monitoring.db')
PDF_PATH = r'C:\Users\HP\.gemini\antigravity-ide\brain\1e57bf54-9be2-4b63-9a1f-28a6b8957f22\.user_uploaded\media_1788143367143.pdf'

def parse_and_seed():
    print("Opening PDF file:", PDF_PATH)
    doc = pymupdf.open(PDF_PATH)

    def get_lines(p_idx):
        return [l.strip() for l in doc[p_idx].get_text().split('\n') if l.strip()]

    # Data structures indexed by date_str
    targets = {}
    readings = {} # date -> { meter_code -> value }
    stp_etp = {}  # date -> { plant_type_field_code -> value }

    # 1. Parse Table 7: Date, Month, Year, Production (MT), Manpower, Garden Area (m2), PW1 (Pages 64-72, indices 63-71)
    dates_list = []
    for p in range(63, 72):
        lines = get_lines(p)
        for i, line in enumerate(lines):
            m = re.match(r'^(\d{4}-\d{2}-\d{2})\s+([A-Za-z]+)$', line)
            if m:
                d_str = m.group(1)
                dates_list.append(d_str)
                prod = float(lines[i+2])
                manpower = int(lines[i+3])
                garden_area = float(lines[i+4])
                pw1 = float(lines[i+5])

                targets[d_str] = {
                    'production_mt': prod,
                    'manpower': manpower,
                    'garden_area_m2': garden_area,
                    'intake_target_kl': 3000.0,
                    'domestic_target_kl': 45.0,
                    'specific_total_target': 1.5,
                    'specific_process_target': 1.2,
                    'domestic_lpd_target': 30.0,
                    'garden_lpd_target': 5.0
                }
                if d_str not in readings: readings[d_str] = {}
                readings[d_str]['PW1'] = pw1

    print(f"Parsed {len(dates_list)} dates from Table 7 (Production & PW1)")

    # 2. Parse Table 5: BW1, BW2, Tanker, Public Supply, Industry Supply, Rain water (Pages 48-55, indices 47-54)
    t5_idx = 0
    for p in range(47, 55):
        lines = get_lines(p)
        for i, line in enumerate(lines):
            m = re.match(r'^(\d{4}-\d{2}-\d{2})\s+([A-Za-z]+)$', line)
            if m:
                d_str = m.group(1)
                bw1 = float(lines[i+2])
                bw2 = float(lines[i+3])
                tanker = float(lines[i+4])
                public_sup = float(lines[i+5])
                ind_sup = float(lines[i+6])
                rain = float(lines[i+7])

                readings[d_str]['BW1'] = bw1
                readings[d_str]['BW2'] = bw2
                readings[d_str]['TANKER'] = tanker
                readings[d_str]['PUB_SUPPLY'] = public_sup
                readings[d_str]['IND_SUPPLY'] = ind_sup
                readings[d_str]['RAINWATER'] = rain
                t5_idx += 1

    print(f"Parsed {t5_idx} rows from Table 5 (Intake Sources)")

    # 3. Parse Table 8: PW2, PW3, Process Water, DW1..DW6 (Pages 73-81, indices 72-80)
    t8_rows = []
    headers8 = {'PW2', 'PW3', 'Process Water', 'DW1', 'DW2', 'DW3', 'DW4', 'DW5', 'DW6'}
    for p in range(72, 81):
        lines = get_lines(p)
        num_lines = [l for l in lines if l not in headers8 and is_float(l)]
        for i in range(0, len(num_lines), 9):
            chunk = num_lines[i:i+9]
            if len(chunk) == 9:
                t8_rows.append(chunk)

    for i, d_str in enumerate(dates_list):
        if i < len(t8_rows):
            r = t8_rows[i]
            readings[d_str]['PW2'] = float(r[0])
            readings[d_str]['PW3'] = float(r[1])
            readings[d_str]['DW1'] = float(r[3])
            readings[d_str]['DW2'] = float(r[4])
            readings[d_str]['DW3'] = float(r[5])
            readings[d_str]['DW4'] = float(r[6])
            readings[d_str]['DW5'] = float(r[7])
            readings[d_str]['DW6'] = float(r[8])

    print(f"Parsed {len(t8_rows)} rows from Table 8 (PW2-3, DW1-6)")

    # 4. Parse Table 9: DW7..DW10, Domestic Water, GW1..GW4 (Pages 82-90, indices 81-89)
    t9_rows = []
    headers9 = {'DW7', 'DW8', 'DW9', 'DW10', 'Domestic Water', 'GW1', 'GW2', 'GW3', 'GW4'}
    for p in range(81, 90):
        lines = get_lines(p)
        num_lines = [l for l in lines if l not in headers9 and is_float(l)]
        for i in range(0, len(num_lines), 9):
            chunk = num_lines[i:i+9]
            if len(chunk) == 9:
                t9_rows.append(chunk)

    for i, d_str in enumerate(dates_list):
        if i < len(t9_rows):
            r = t9_rows[i]
            readings[d_str]['DW7'] = float(r[0])
            readings[d_str]['DW8'] = float(r[1])
            readings[d_str]['DW9'] = float(r[2])
            readings[d_str]['DW10'] = float(r[3])
            readings[d_str]['GW1'] = float(r[5])
            readings[d_str]['GW2'] = float(r[6])
            readings[d_str]['GW3'] = float(r[7])
            readings[d_str]['GW4'] = float(r[8])

    print(f"Parsed {len(t9_rows)} rows from Table 9 (DW7-10, GW1-4)")

    # 5. Parse Table 10: GW5..GW10, Garden Water, OW1, OW2 (Pages 91-99, indices 90-98)
    t10_rows = []
    headers10 = {'GW5', 'GW6', 'GW7', 'GW8', 'GW9', 'GW10', 'Garden Water', 'OW1', 'OW2'}
    for p in range(90, 99):
        lines = get_lines(p)
        num_lines = [l for l in lines if l not in headers10 and is_float(l)]
        for i in range(0, len(num_lines), 9):
            chunk = num_lines[i:i+9]
            if len(chunk) == 9:
                t10_rows.append(chunk)

    for i, d_str in enumerate(dates_list):
        if i < len(t10_rows):
            r = t10_rows[i]
            readings[d_str]['GW5'] = float(r[0])
            readings[d_str]['GW6'] = float(r[1])
            readings[d_str]['GW7'] = float(r[2])
            readings[d_str]['GW8'] = float(r[3])
            readings[d_str]['GW9'] = float(r[4])
            readings[d_str]['GW10'] = float(r[5])
            readings[d_str]['OW1'] = float(r[7])
            readings[d_str]['OW2'] = float(r[8])

    print(f"Parsed {len(t10_rows)} rows from Table 10 (GW5-10, OW1-2)")

    # 6. Parse Table 2: Outside, STP Gen, STP Process, STP Garden, ETP Gen, ETP Reused, Spec Total (Pages 24-31, indices 23-30)
    t2_rows = []
    for p in range(23, 31):
        lines = get_lines(p)
        num_lines = []
        for l in lines:
            if any(h in l for h in ['Outside', 'STP', 'ETP', 'Specific', 'Water', 'Generation', 'Process', 'Garden', 'Reused', 'used']):
                continue
            if is_float(l):
                num_lines.append(l)
        for i in range(0, len(num_lines), 7):
            chunk = num_lines[i:i+7]
            if len(chunk) == 7:
                t2_rows.append(chunk)

    for i, d_str in enumerate(dates_list):
        if i < len(t2_rows):
            r = t2_rows[i]
            stp_gen = float(r[1])
            stp_proc = float(r[2])
            stp_gard = float(r[3])
            etp_gen = float(r[4])
            etp_reused = float(r[5])

            readings[d_str]['STP_REUSE'] = stp_proc + stp_gard
            readings[d_str]['ETP_REUSE'] = etp_reused

            if d_str not in stp_etp: stp_etp[d_str] = {}
            stp_etp[d_str]['STP_stp_inlet_kl'] = stp_gen
            stp_etp[d_str]['STP_stp_generation_kl'] = stp_gen
            stp_etp[d_str]['STP_stp_recycle_process_kl'] = stp_proc
            stp_etp[d_str]['STP_stp_recycle_garden_kl'] = stp_gard

            stp_etp[d_str]['ETP_total_effluent_kl'] = etp_gen
            stp_etp[d_str]['ETP_recycle_kl'] = etp_reused

    print(f"Parsed {len(t2_rows)} rows from Table 2 (STP / ETP totals)")

    # 7. Parse Table 11: ETP Effluent PW1, PW2, PW3, Total Effluent (Pages 157-164, indices 156-163)
    t11_idx = 0
    for p in range(156, 164):
        lines = get_lines(p)
        for i, line in enumerate(lines):
            m = re.match(r'^(\d{4}-\d{2}-\d{2})\s+([A-Za-z]+)$', line)
            if m:
                d_str = m.group(1)
                eff_pw1 = float(lines[i+3])
                eff_pw2 = float(lines[i+4])
                eff_pw3 = float(lines[i+5])
                eff_total = float(lines[i+6])

                if d_str not in stp_etp: stp_etp[d_str] = {}
                stp_etp[d_str]['ETP_eff_pw1_kl'] = eff_pw1
                stp_etp[d_str]['ETP_eff_pw2_kl'] = eff_pw2
                stp_etp[d_str]['ETP_eff_pw3_kl'] = eff_pw3
                stp_etp[d_str]['ETP_total_effluent_kl'] = eff_total
                t11_idx += 1

    print(f"Parsed {t11_idx} rows from Table 11 (ETP lines)")

    # 8. Parse Table 12: RO Feed, Permeate, Reject, MEE Condensate, MEE Concentrate, AFTD (Pages 165-172, indices 164-171)
    t12_rows = []
    headers12 = {'RO Feed', 'Ist Stage', '2nd', 'Stage', '3rd Stage', 'Permeate', 'Reject', 'MEE', 'Condenstae', 'concentrate', 'AFTD Cons DW9'}
    for p in range(164, 172):
        lines = get_lines(p)
        num_lines = [l for l in lines if l not in headers12 and is_float(l)]
        for i in range(0, len(num_lines), 9):
            chunk = num_lines[i:i+9]
            if len(chunk) == 9:
                t12_rows.append(chunk)

    for i, d_str in enumerate(dates_list):
        if i < len(t12_rows):
            r = t12_rows[i]
            ro_feed = float(r[0])
            permeate = float(r[3])
            reject = float(r[4])
            mee_cond = float(r[5])

            if d_str not in stp_etp: stp_etp[d_str] = {}
            stp_etp[d_str]['ETP_ro_feed_kl'] = ro_feed
            stp_etp[d_str]['ETP_permeate_kl'] = permeate
            stp_etp[d_str]['ETP_reject_kl'] = reject
            stp_etp[d_str]['ETP_mee_condensate_kl'] = mee_cond

    print(f"Parsed {len(t12_rows)} rows from Table 12 (RO & MEE)")

    # 9. Parse Table 13: Salt Gen, Recycle Water (Pages 173-180, indices 172-179)
    t13_rows = []
    for p in range(172, 180):
        lines = get_lines(p)
        num_lines = []
        for l in lines:
            if any(h in l for h in ['Salt', 'Generation', 'Recycle', 'Specific', 'Effluent', 'water', '(KL/MT)', '(MT/MT)2']):
                continue
            if is_float(l):
                num_lines.append(l)
        for i in range(0, len(num_lines), 4):
            chunk = num_lines[i:i+4]
            if len(chunk) == 4:
                t13_rows.append(chunk)

    for i, d_str in enumerate(dates_list):
        if i < len(t13_rows):
            r = t13_rows[i]
            salt_gen = float(r[0])
            recycle_w = float(r[1])

            if d_str not in stp_etp: stp_etp[d_str] = {}
            stp_etp[d_str]['ETP_salt_gen_mt'] = salt_gen
            if 'ETP_recycle_kl' not in stp_etp[d_str]:
                stp_etp[d_str]['ETP_recycle_kl'] = recycle_w

    print(f"Parsed {len(t13_rows)} rows from Table 13 (Salt Gen)")

    # Connect to SQLite Database and Insert All Data
    print(f"Connecting to database at: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Category map for meters
    meter_cats = {
        'BW1': 'intake', 'BW2': 'intake', 'TANKER': 'intake', 'PUB_SUPPLY': 'intake', 'IND_SUPPLY': 'intake',
        'RAINWATER': 'intake', 'STP_REUSE': 'intake', 'ETP_REUSE': 'intake',
        'PW1': 'process', 'PW2': 'process', 'PW3': 'process', 'PW4': 'process', 'PW5': 'process',
        'DW1': 'domestic', 'DW2': 'domestic', 'DW3': 'domestic', 'DW4': 'domestic', 'DW5': 'domestic',
        'DW6': 'domestic', 'DW7': 'domestic', 'DW8': 'domestic', 'DW9': 'domestic', 'DW10': 'domestic',
        'GW1': 'garden', 'GW2': 'garden', 'GW3': 'garden', 'GW4': 'garden', 'GW5': 'garden',
        'GW6': 'garden', 'GW7': 'garden', 'GW8': 'garden', 'GW9': 'garden', 'GW10': 'garden',
        'OW1': 'outside', 'OW2': 'outside'
    }

    # Insert Production Targets
    target_count = 0
    for d_str, t in targets.items():
        cursor.execute(
            """INSERT OR REPLACE INTO daily_production_targets (
                date, production_mt, manpower, garden_area_m2, intake_target_kl, domestic_target_kl,
                specific_total_target, specific_process_target, domestic_lpd_target, garden_lpd_target, updated_by, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pdf_upload', CURRENT_TIMESTAMP)""",
            (
                d_str, t['production_mt'], t['manpower'], t['garden_area_m2'],
                t['intake_target_kl'], t['domestic_target_kl'], t['specific_total_target'],
                t['specific_process_target'], t['domestic_lpd_target'], t['garden_lpd_target']
            )
        )
        target_count += 1

    print(f"Inserted/Updated {target_count} daily production targets.")

    # Insert Meter Readings
    meter_count = 0
    for d_str, m_map in readings.items():
        for m_code, val in m_map.items():
            cat = meter_cats.get(m_code, 'other')
            cursor.execute(
                """INSERT OR REPLACE INTO meter_readings (
                    date, meter_code, category, value, entered_by, updated_at
                ) VALUES (?, ?, ?, ?, 'pdf_upload', CURRENT_TIMESTAMP)""",
                (d_str, m_code, cat, val)
            )
            meter_count += 1

    print(f"Inserted/Updated {meter_count} meter readings across 365 days.")

    # Insert STP / ETP Readings
    stp_etp_count = 0
    for d_str, se_map in stp_etp.items():
        for key, val in se_map.items():
            parts = key.split('_')
            plant_type = parts[0]
            field_code = '_'.join(parts[1:])
            cursor.execute(
                """INSERT OR REPLACE INTO stp_etp_readings (
                    date, plant_type, field_code, value, entered_by, updated_at
                ) VALUES (?, ?, ?, ?, 'pdf_upload', CURRENT_TIMESTAMP)""",
                (d_str, plant_type, field_code, val)
            )
            stp_etp_count += 1

    print(f"Inserted/Updated {stp_etp_count} STP/ETP readings.")

    # Log action to audit log
    cursor.execute(
        """INSERT INTO audit_logs (username, action, entity_type, entity_id, notes)
           VALUES ('pdf_upload', 'IMPORT_PDF_DATA', 'FULL_YEAR_2026', '2026-01-01_to_2026-12-31', 'Uploaded full 365 days of 2026 historical water monitoring PDF records to SQLite database')"""
    )

    conn.commit()
    conn.close()
    print("PDF Data upload to SQLite Database complete!")

def is_float(val):
    try:
        float(val)
        return True
    except ValueError:
        return False

if __name__ == '__main__':
    parse_and_seed()
