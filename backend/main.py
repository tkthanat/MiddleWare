import uvicorn
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import Routers
from routers import settings, system, webhook

app = FastAPI()

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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)