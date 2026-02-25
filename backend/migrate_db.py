import sqlite3

# ชื่อไฟล์ Database ของคุณ
DB_NAME = "middleware.db"

def migrate():
    print(f"🔧 Starting Migration for {DB_NAME}...")
    try:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        
        # รายชื่อคอลัมน์ใหม่ที่จะเพิ่ม
        new_columns = [
            ("app_id", "TEXT DEFAULT ''"),
            ("app_secret", "TEXT DEFAULT ''"),
            ("broker_id", "TEXT DEFAULT 'SANDBOX'"),
            ("app_code", "TEXT DEFAULT 'SANDBOX'"),
            ("is_sandbox", "BOOLEAN DEFAULT 1")
        ]

        for col, col_type in new_columns:
            try:
                # คำสั่ง SQL เพิ่มคอลัมน์
                cursor.execute(f"ALTER TABLE system_settings ADD COLUMN {col} {col_type}")
                print(f"✅ Added column: {col}")
            except Exception as e:
                # ถ้ามีอยู่แล้วจะ Error ซึ่งเราจะข้ามไป
                if "duplicate column name" in str(e):
                    print(f"⚠️ Column {col} already exists. Skipped.")
                else:
                    print(f"❌ Error adding {col}: {e}")

        conn.commit()
        conn.close()
        print("🎉 Database Migration Completed! You can run main.py now.")
        
    except Exception as e:
        print(f"🔥 Critical Error: {e}")

if __name__ == "__main__":
    migrate()