from settrade_v2 import Investor
from database import SessionLocal
import models

# Global Instances
investor = None
market = None

# ดึงค่า Setting จาก DB
def get_settrade_credentials():
    db = SessionLocal()
    try:
        setting = db.query(models.SystemSetting).filter(models.SystemSetting.app_id != "").order_by(models.SystemSetting.id.desc()).first()
        if not setting:
            setting = db.query(models.SystemSetting).order_by(models.SystemSetting.id.desc()).first()
        return setting
    except Exception as e:
        print(f"DB Load Error: {e}")
        return None
    finally:
        db.close()

# Initialize Settrade Client
def setup_client(app_id=None, app_secret=None, broker_id=None, app_code=None, is_sandbox=None):
    global investor, market
    
    if not app_id:
        setting = get_settrade_credentials()
        if setting:
            app_id = setting.app_id
            app_secret = setting.app_secret
            broker_id = setting.broker_id
            app_code = setting.app_code
            is_sandbox = setting.is_sandbox
        else:
             print("⚠️ No Credentials found in DB. Waiting for config.")
             return

    # Logic Fallback: ถ้าเป็น Sandbox หรือไม่มีค่า ให้ใช้ Default Sandbox Key
    if is_sandbox or not app_id:
        if not app_id or app_id == "":
            app_id = "MHxt6BcfwjzEDyEI"
            app_secret = "CpIs5Aw+mCx9WZqETJZilmvNRc5pcm5NqRQgRtvYmoY="
            broker_id = "SANDBOX"
            app_code = "SANDBOX"
            is_sandbox = True

    # Connect to Settrade API
    try:
        print(f"🔄 Connecting to Settrade... ({'SANDBOX' if is_sandbox else 'PRODUCTION'})")
        investor = Investor(
            app_id=app_id.strip() if app_id else "",
            app_secret=app_secret.strip() if app_secret else "",
            broker_id=broker_id.strip() if broker_id else "",
            app_code=app_code.strip() if app_code else "",
            is_auto_queue=False
        )
        market = investor.MarketData()
        
        mode_str = "🥪 SANDBOX" if is_sandbox else "🔥 PRODUCTION"
        print(f"✅ Settrade Client Connected: [{mode_str}] Broker: {broker_id}")
        
    except Exception as e:
        print(f"❌ Settrade Connection Error: {e}")
        investor = None
        market = None

# Auto-start on module load
setup_client()

# SET (Equity) Wrapper
def get_equity_instance(account_no):
    if not investor: setup_client()
    if not investor or not account_no: return None
    return investor.Equity(account_no=account_no)

# TFEX (Derivatives) Wrapper
def get_derivatives_instance(account_no):
    if not investor: setup_client()
    if not investor or not account_no: return None
    return investor.Derivatives(account_no=account_no)