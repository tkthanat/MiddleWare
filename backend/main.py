import uvicorn
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
import models
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from services.scheduler_service import sync_pending_orders
from services.telegram_bot import start_telegram_bot, stop_telegram_bot

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
    from routers.settings import health_check
    print("Health Check System: STARTED")
    while True:
        await asyncio.sleep(300)
        try:
            await health_check()
        except Exception:
            pass

# --- System Services Startup ---
@app.on_event("startup")
async def start_system_services():
    # tart Scheduler
    scheduler.add_job(sync_pending_orders, "interval", seconds=5)
    scheduler.start()
    print("🚀 [System] Scheduler started! (Syncing every 5s)")

    # Start Telegram Bot
    asyncio.create_task(start_telegram_bot())

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