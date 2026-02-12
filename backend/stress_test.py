import requests
import time
import random
import concurrent.futures
from datetime import datetime

# --- CONFIG ---
WEBHOOK_URL = "http://localhost:8000/webhook"

# SET
SET_SYMBOLS = ["PTT", "AOT", "CPALL", "BDMS", "GULF", "ADVANC", "KBANK", "SCB", "DELTA", "SCC"]

# TFEX
TFEX_SYMBOLS = ["S50Z24", "GOU24", "USDH25", "S50H25"]

ALL_SYMBOLS = SET_SYMBOLS + TFEX_SYMBOLS

TARGET_USER = "test01"

def send_trade_signal(symbol, index):
    try:
        # Construct unique signal ID
        signal_id = f"BURST-{int(time.time())}-{index}-{random.randint(1000,9999)}"
        
        market_type = "TFEX" if any(char.isdigit() for char in symbol) else "SET"

        # Payload
        payload = {
            "passphrase": "YOUR_SECURE_PASSPHRASE",
            "username": TARGET_USER,
            "timestamp": datetime.now().isoformat(),
            "exchange": market_type,
            "symbol": symbol,
            "side": "buy",
            "price": 0,
            "volume": 100,
            "signal_id": signal_id
        }
        
        start_t = time.time()
        response = requests.post(WEBHOOK_URL, json=payload)
        duration = time.time() - start_t
        
        res_json = response.json()
        status_msg = res_json.get("status", "Unknown")
        order_no = res_json.get("order_no", "-")
        
        icon = "📈" if market_type == "SET" else "📉"
        print(f"{icon} [SENT] {symbol:<8} | Type: {market_type:<4} | Status: {status_msg} (Ord: {order_no}) | Time: {duration:.4f}s")
        return response.status_code
        
    except Exception as e:
        print(f"❌ [ERROR] {symbol}: {e}")

if __name__ == "__main__":
    print(f"🔥 STARTING STRESS TEST (SET & TFEX) for User: {TARGET_USER}")
    print(f"🎯 Targets: {len(ALL_SYMBOLS)} symbols")
    print("-" * 60)
    
    start_all = time.time()
    
    # ใช้ ThreadPool ยิงพร้อมกัน
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        futures = []
        for i, stock in enumerate(ALL_SYMBOLS):
            futures.append(executor.submit(send_trade_signal, stock, i))
        
        concurrent.futures.wait(futures)

    total_time = time.time() - start_all
    print("-" * 60)
    print(f"✅ COMPLETE in {total_time:.4f} seconds")