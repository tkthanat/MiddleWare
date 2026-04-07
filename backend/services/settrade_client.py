import sys
import time
import gc
from settrade_v2 import Investor
from database import SessionLocal
import models

# Multi-User System
investors = {}
user_credentials_cache = {}
login_penalty_time = {}

def get_settrade_credentials(user_id: int):
    db = SessionLocal()
    try:
        return db.query(models.SystemSetting).filter(models.SystemSetting.user_id == user_id).first()
    except Exception as e:
        print(f"DB Load Error: {e}")
        return None
    finally:
        db.close()

def setup_client(user_id: int, app_id=None, app_secret=None, broker_id=None, app_code=None, is_sandbox=None):
    global investors, user_credentials_cache, login_penalty_time
    
    current_time = time.time()
    
    # ระบบ Penalty ป้องกันการส่ง Request ถี่เกินไป (Rate Limiting / Cooldown)
    if user_id in login_penalty_time and current_time < login_penalty_time[user_id]:
        return None

    is_manual_save = (app_id is not None)
    
    if not is_manual_save:
        setting = get_settrade_credentials(user_id)
        if setting:
            app_id = setting.app_id
            app_secret = setting.app_secret
            broker_id = setting.broker_id
            app_code = setting.app_code
            is_sandbox = setting.is_sandbox
        else:
             return None

    current_creds_key = f"{app_id}_{app_secret}_{broker_id}_{app_code}_{is_sandbox}"
    is_creds_changed = (user_credentials_cache.get(user_id) != current_creds_key)

    # Bypass ถ้า API Key เดิมและมี Session ที่ Active อยู่แล้ว
    if not is_creds_changed and investors.get(user_id) is not None:
        return investors.get(user_id)

    if is_sandbox:
        broker_id = "SANDBOX"
        app_code = "SANDBOX"
        if not app_id or str(app_id).strip() == "":
            app_id = "MHxt6BcfwjzEDyEI"
            app_secret = "CpIs5Aw+mCx9WZqETJZilmvNRc5pcm5NqRQgRtvYmoY="

    try:
        mode_str = "🥪 SANDBOX" if is_sandbox else "🔥 PRODUCTION"
        clean_app_id = str(app_id).strip() if app_id else ""
        clean_app_secret = str(app_secret).strip() if app_secret else ""
        
        # เคลียร์ Session เก่าและคืนหน่วยความจำ (Garbage Collection)
        if user_id in investors:
            del investors[user_id]
        gc.collect()

        # ล้างความจำ Settrade SDK เพื่อลบ URL ของ Sandbox ทิ้ง
        for module_name in list(sys.modules.keys()):
            if module_name.startswith('settrade_v2'):
                del sys.modules[module_name]
        
        # โหลดไลบรารีเข้ามาใหม่ด้วยสถานะที่สะอาด (เหมือนเพิ่ง Restart Server)
        from settrade_v2 import Investor
        
        print(f"🔄 [User {user_id}] Initializing Settrade Connection... ({mode_str})")
        print(f"    DEBUG -> App ID : '{clean_app_id}'")
        print(f"    DEBUG -> Secret : {len(clean_app_secret)} chars")
        if len(clean_app_secret) > 4:
            print(f"    DEBUG -> Ending with : '{clean_app_secret[-4:]}'")

        inv = Investor(
            app_id=clean_app_id,
            app_secret=clean_app_secret,
            broker_id=str(broker_id).strip() if broker_id else "",
            app_code=str(app_code).strip() if app_code else "",
            is_auto_queue=False
        )
        
        investors[user_id] = inv
        user_credentials_cache[user_id] = current_creds_key
        
        # ปลดล็อกแบน (Penalty) ทันทีที่เชื่อมต่อสำเร็จ
        if user_id in login_penalty_time:
            del login_penalty_time[user_id]
            
        print(f"✅ [User {user_id}] Connected Successfully: [{mode_str}] Broker: {broker_id}")
        return inv
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ [User {user_id}] Connection Error: {error_msg}")
        
        # เคลียร์ Session ทันทีที่เกิด Error
        if user_id in investors:
            del investors[user_id]
        gc.collect()
        
        # Dynamic Maintenance Detection (ดักจับการปิดปรับปรุงระบบจาก API ช่วง 04:15 - 05:15)
        if "Service unavailable" in error_msg or "Please try again during" in error_msg or "503" in error_msg:
            print(f"🌙 [System] API ปิดปรับปรุงระบบ: หยุดพักการเชื่อมต่อ (Sleep Mode) เป็นเวลา 15 นาที...")
            login_penalty_time[user_id] = current_time + 900
            return None
            
        # ดักจับเคส Broker เตรียมฐานข้อมูลช้าตอนเช้ามืด
        if "User not found BrokerId" in error_msg:
            print(f"🌅 [System] โบรกเกอร์กำลังเตรียมฐานข้อมูลหลังปิดปรับปรุง: ขยายเวลาพักรออีก 15 นาที...")
            login_penalty_time[user_id] = current_time + 900
            return None
        
        # กรณี Error ทั่วไป -> ระงับการล็อกอิน 5 นาที (Cooldown)
        login_penalty_time[user_id] = current_time + 300
        print(f"🛑 [Penalty] ระงับการล็อกอินชั่วคราว 5 นาที เพื่อป้องกันการถูกบล็อก API...")
        return None

def get_investor(user_id: int):
    if user_id not in investors or investors[user_id] is None:
        setup_client(user_id)
    return investors.get(user_id)

def get_equity_instance(user_id: int, account_no: str):
    inv = get_investor(user_id)
    if not inv: return None
    return inv.Equity(account_no=account_no)

def get_derivatives_instance(user_id: int, account_no: str):
    inv = get_investor(user_id)
    if not inv: return None
    return inv.Derivatives(account_no=account_no)

def get_market_data(user_id: int):
    inv = get_investor(user_id)
    if not inv: return None
    return inv.MarketData()

def force_reconnect(user_id: int):
    global investors, user_credentials_cache, login_penalty_time
        
    current_time = time.time()
    if user_id in login_penalty_time and current_time < login_penalty_time[user_id]:
        return None

    print(f"♻️ [User {user_id}] Token หมดอายุ หรือการเชื่อมต่อขาดหาย: กำลังเคลียร์ Session และเชื่อมต่อใหม่...")
    
    # ล้างข้อมูล Credentials และ Session เก่าออกจากระบบ
    if user_id in investors:
        del investors[user_id]
    if user_id in user_credentials_cache:
        del user_credentials_cache[user_id]
        
    # Clear background threads
    gc.collect()
    
    # หน่วงเวลา 2 วิเพื่อให้ฝั่ง Server ปิด Socket เก่าอย่างสมบูรณ์
    time.sleep(2)
    
    return setup_client(user_id)