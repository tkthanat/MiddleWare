from settrade_v2 import Investor

# Initialize Instance
try:
    investor = Investor(
        app_id="MHxt6BcfwjzEDyEI",
        app_secret="CpIs5Aw+mCx9WZqETJZilmvNRc5pcm5NqRQgRtvYmoY=",
        broker_id="SANDBOX",
        app_code="SANDBOX",
        is_auto_queue=False
    )
    market = investor.MarketData()
except Exception as e:
    print(f"Settrade Init Error: {e}")
    investor = None
    market = None

def get_equity_instance(account_no):
    if not investor or not account_no:
        return None
    
    # Smart Routing Logic : ตรวจสอบประเภทบัญชีจาก Suffix
    if account_no.strip().upper().endswith("-D"):
        return investor.Derivatives(account_no=account_no)
    
    return investor.Equity(account_no=account_no)