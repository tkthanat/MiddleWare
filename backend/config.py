import asyncio
import json

# Global Lock
config_lock = asyncio.Lock()

# Global State
SYSTEM_STATUS = {
    "is_active": True,
    "triggered_by": None
}

# Load Settings Function
async def load_user_settings():
    async with config_lock:
        try:
            with open("settings.json", "r") as f:
                return json.load(f)
        except FileNotFoundError:
            return {
                "account_no": "SANDBOX",
                "pin": "000000",
                "trade_mode": "AMOUNT",
                "budget_per_trade": 5000,
                "fixed_volume": 100
            }

async def save_user_settings(new_settings: dict):
    async with config_lock:
        with open("settings.json", "w") as f:
            json.dump(new_settings, f, indent=4)