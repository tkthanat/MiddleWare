from database import engine, Base
import models

def create_tables():
    print("🔄 Checking and creating new tables...")
    
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Created table 'user_security' successfully!")
    except Exception as e:
        print(f"❌ Error creating table: {e}")

if __name__ == "__main__":
    create_tables()