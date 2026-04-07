import sqlite3

def upgrade_database():
    print("⏳ กำลังเชื่อมต่อกับฐานข้อมูล middleware.db...")
    conn = sqlite3.connect("middleware.db")
    cursor = conn.cursor()
    
    # รายชื่อคอลัมน์ใหม่ที่ต้องการเพิ่ม
    new_columns = [
        ("order_no", "VARCHAR"),
        ("account_no", "VARCHAR"),
        ("matched_volume", "INTEGER DEFAULT 0"),
        ("cancelled_volume", "INTEGER DEFAULT 0"),
        ("reject_code", "INTEGER"),
        ("reject_reason", "VARCHAR"),
        ("order_type", "VARCHAR")
    ]
    
    for col_name, col_type in new_columns:
        try:
            cursor.execute(f"ALTER TABLE trade_logs ADD COLUMN {col_name} {col_type}")
            print(f"✅ เพิ่มคอลัมน์สำเร็จ: {col_name}")
        except sqlite3.OperationalError as e:
            # ดัก Error กรณีที่คอลัมน์นี้เคยถูกเพิ่มไปแล้ว
            print(f"⚠️ ข้ามการทำงาน: คอลัมน์ '{col_name}' มีอยู่แล้วในตาราง")
            
    conn.commit()
    conn.close()
    print("🎉 อัปเกรดฐานข้อมูลเสร็จสมบูรณ์!")

if __name__ == "__main__":
    upgrade_database()