import os
import json

TRADE_LOG_FILE = "trade_logs.json"

def save_trade_log(log_entry):
    logs = []
    if os.path.exists(TRADE_LOG_FILE):
        try:
            with open(TRADE_LOG_FILE, "r", encoding="utf-8") as f:
                logs = json.load(f)
        except:
            logs = []
    
    logs.insert(0, log_entry)
    if len(logs) > 100:
        logs = logs[:100]

    with open(TRADE_LOG_FILE, "w", encoding="utf-8") as f:
        json.dump(logs, f, indent=4, ensure_ascii=False)

def get_trade_logs():
    if os.path.exists(TRADE_LOG_FILE):
        try:
            with open(TRADE_LOG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            return []
    return []