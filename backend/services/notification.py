import requests
import asyncio
import time
from collections import deque

# Anti-Spam Logic
last_error_logs = {}
ERROR_COOLDOWN = 60
processed_signal_ids = deque(maxlen=100)

async def send_telegram_message(bot_token: str, chat_id: str, message: str):
    try:
        if not bot_token or not chat_id:
            return

        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        payload = {"chat_id": chat_id, "text": message, "parse_mode": "Markdown"}
        
        loop = asyncio.get_event_loop()
        
        # ฟังก์ชันช่วยยิง Request
        def do_post(pl):
            return requests.post(url, json=pl)

        response = await loop.run_in_executor(None, do_post, payload)
        
        # Smart Retry
        if response.status_code == 400 and "parse entities" in response.text.lower():
            print(f"⚠️ [Telegram] Markdown Parse Error! Retrying as plain text...")
            payload["parse_mode"] = ""
            await loop.run_in_executor(None, do_post, payload)
            
        elif response.status_code != 200:
            print(f"⚠️ [Telegram] Send Failed: {response.text}")
            
    except Exception as e:
        print(f"⚠️ [Telegram] Exception: {e}")

async def send_notification_smart(bot_token: str, chat_id: str, message: str, type="INFO"):
    global last_error_logs
    if type == "ERROR":
        current_time = time.time()
        if message in last_error_logs:
            if current_time - last_error_logs[message] < ERROR_COOLDOWN:
                return
        last_error_logs[message] = current_time

    await send_telegram_message(bot_token, chat_id, message)