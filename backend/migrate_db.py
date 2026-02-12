import sqlite3

def migrate():
    conn = sqlite3.connect('middleware.db')
    cursor = conn.cursor()
    
    print("🚀 Starting Database Migration...")
    
    # เพิ่มช่อง derivatives_account
    try:
        cursor.execute("ALTER TABLE system_settings ADD COLUMN derivatives_account VARCHAR DEFAULT ''")
        print("✅ Added column 'derivatives_account' successfully.")
    except sqlite3.OperationalError as e:
        print(f"⚠️ Column 'derivatives_account' might already exist or error: {e}")
        
    # เพิ่มช่อง active_symbols
    try:
        cursor.execute("ALTER TABLE system_settings ADD COLUMN active_symbols VARCHAR DEFAULT ''")
        print("✅ Added column 'active_symbols' successfully.")
    except sqlite3.OperationalError as e:
        print(f"⚠️ Column 'active_symbols' might already exist or error: {e}")

    conn.commit()
    conn.close()
    print("🎉 Database migration completed!")

if __name__ == "__main__":
    migrate()