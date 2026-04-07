import uvicorn
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
import models
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from services.scheduler_service import sync_pending_orders
from services.telegram_bot import start_telegram_bot, stop_telegram_bot
from services.tfex_margin import schedule_margin_update 
from services.logger import auto_clean_logs
from services.market_status import update_market_status_cache 

models.Base.metadata.create_all(bind=engine)

# Import Routers
from routers import settings, system, webhook, auth, user

app = FastAPI()

# Instance Scheduler
scheduler = AsyncIOScheduler()

# --- Setup CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Include Routers ---
app.include_router(settings.router)
app.include_router(system.router)
app.include_router(webhook.router)
app.include_router(auth.router)
app.include_router(user.router)

# --- Health Check Loop ---
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(health_check_loop())

async def health_check_loop():
    from database import SessionLocal
    import models
    from services.settrade_client import get_investor
    from datetime import datetime
    
    print("Health Check System: STARTED")
    while True:
        await asyncio.sleep(300)
        db = SessionLocal()
        try:
            # Multi-User: ดึง User ทั้งหมดที่ Active มาวนลูปเช็ค
            users = db.query(models.User).filter(models.User.is_active == True).all()
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            for user in users:
                # get_investor จะพยายาม Reconnect ให้ด้วยถ้าพบว่าหลุด
                inv = get_investor(user.id)
                if inv is None:
                    print(f"[{timestamp}] 🔴 Health Check [User {user.username}]: OFFLINE (Disconnected)")
                
        except Exception as e:
            print(f"⚠️ Health Check Loop Error: {e}")
        finally:
            db.close()

# --- System Services Startup ---
@app.on_event("startup")
async def start_system_services():
    # Start Scheduler
    scheduler.add_job(sync_pending_orders, "interval", seconds=15)
    
    # Auto-Clean Logs
    scheduler.add_job(auto_clean_logs, "cron", hour=3, minute=0) 
    
    # Background Polling
    scheduler.add_job(update_market_status_cache, "interval", minutes=1)
    
    scheduler.start()
    print("🚀 [System] Scheduler started! (Syncing every 15s)")
    print("🧹 [System] Auto-Clean Logs scheduled at 03:00 AM daily")
    print("🌐 [System] Market Status Cache scheduled! (Every 1m)")

    # Start Telegram Bot
    asyncio.create_task(start_telegram_bot())
    
    # Start TFEX Margin Service
    asyncio.create_task(schedule_margin_update())
    print("🚀 [System] TFEX Margin Service started!")

    # Start Market Status Cache Update (Immediate)
    asyncio.create_task(update_market_status_cache())

# --- System Services Shutdown ---
@app.on_event("shutdown")
async def stop_system_services():
    # Stop Scheduler
    try:
        scheduler.shutdown()
        print("🛑 [System] Scheduler stopped.")
    except Exception as e:
        print(f"⚠️ Scheduler shutdown error: {e}")

    # Stop Telegram Bot
    try:
        await stop_telegram_bot()
    except Exception as e:
        print(f"⚠️ Telegram Bot shutdown error: {e}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)