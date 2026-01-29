import requests
import asyncio
import time
from collections import deque
from config import load_user_settings

# Anti-Spam Logic
last_error_logs = {}
ERROR_COOLDOWN = 60
processed_signal_ids = deque(maxlen=100)

async def send_telegram_message(message: str):
    try:
        settings = await load_user_settings()
        bot_token = settings.get("telegram_bot_token", "")
        chat_id = settings.get("telegram_chat_id", "")

        if not bot_token or not chat_id:
            return

        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        payload = {"chat_id": chat_id, "text": message, "parse_mode": "Markdown"}
        
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, lambda: requests.post(url, json=payload))
            
    except Exception as e:
        print(f"Telegram Error: {e}")

async def send_notification_smart(message: str, type="INFO"):
    global last_error_logs
    if type == "ERROR":
        current_time = time.time()
        if message in last_error_logs:
            if current_time - last_error_logs[message] < ERROR_COOLDOWN:
                return
        last_error_logs[message] = current_time

    await send_telegram_message(message)