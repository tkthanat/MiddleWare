# 1. เพิ่มตัวแปรสำหรับจำค่าเงินต้น (Cache)
_DAILY_INITIAL_EQUITY = None 

def get_or_set_initial_equity(equity_instance):
    """
    ฟังก์ชันสำหรับดึงเงินต้น:
    - ถ้ายังไม่เคยจำ (เพิ่งเปิดบอท) -> ให้ดึงค่าปัจจุบันมาเป็นค่าเริ่มต้น
    - ถ้าจำไว้แล้ว -> ให้ใช้ค่าเดิม (จะได้คำนวณ P/L เทียบกับตอนเช้าได้)
    """
    global _DAILY_INITIAL_EQUITY
    if _DAILY_INITIAL_EQUITY is None:
        try:
            # ดึง Equity ปัจจุบันมาเป็นจุดอ้างอิงเริ่มต้น
            _DAILY_INITIAL_EQUITY = equity_instance.get_total_equity()
            print(f"[SYSTEM] Initial Equity Set: {_DAILY_INITIAL_EQUITY:,.2f} THB")
        except Exception as e:
            print(f"[ERROR] Cannot set initial equity: {e}")
            return 0 # กันตาย
            
    return _DAILY_INITIAL_EQUITY

def check_circuit_breaker(equity_instance, settings, initial_equity):
    
    # TEST MAX LOSS
    #return False, "⛔ [TEST MODE] Simulated Max Loss Triggered (-99,999 THB)"

    is_active = settings.get("is_max_loss_active", False)
    if not is_active:
        return True, "Guard Inactive"

    max_loss_limit = settings.get("max_loss_amount", 0)
    
    try:
        # cash + positions market value
        current_equity = equity_instance.get_total_equity() 
        
        # realized + unrealized P/L
        total_day_pnl = current_equity - initial_equity

        # check max loss
        loss_threshold = -1 * abs(max_loss_limit)
        
        if total_day_pnl <= loss_threshold:
            msg = f"⛔ DAILY MAX LOSS TRIGGERED! Total P/L: {total_day_pnl:,.2f} (Limit: {loss_threshold})"
            return False, msg

        return True, f"OK (Day P/L: {total_day_pnl:,.2f})"

    except Exception as e:
        print(f"Error checking circuit breaker: {e}")
        return True, "Check Error"