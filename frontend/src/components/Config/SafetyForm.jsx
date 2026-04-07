import { FaShieldAlt, FaCheckCircle, FaTimesCircle, FaInfoCircle } from 'react-icons/fa';

// Component Info Icon
const InfoIcon = ({ title, children, color }) => (
  <div className="info-container ms-1">
    <FaInfoCircle className={`info-icon ${color}`} style={{ fontSize: '0.9em' }} />
    <div className="info-popover text-start" style={{ width: '280px' }}>
      <div className="info-title">{title}</div>
      <ul className="info-list">{children}</ul>
    </div>
  </div>
);

// รับ Prop isSystemOk เข้ามาเพื่อเช็คสถานะ Server
const SafetyForm = ({ data, onChange, isSystemOk }) => {
  return (
    <div className="card dashboard-card h-100 border-0">
      <div className="card-body p-4">
         <div className="d-flex justify-content-between mb-3">
            <h6 className="fw-bold text-dark"><FaShieldAlt className="me-2 text-muted"/> Safety Protection</h6>
        </div>
        
        {/* MIN/MAX Trade Guard */}
        <div className="mb-3">
           <label className="text-muted small fw-bold">MIN/MAX Trade Guard</label>
           {isSystemOk ? (
             <div className="d-flex align-items-center text-success small fw-bold transition-all">
                <FaCheckCircle className="me-2"/> Active (Skip {"<"} 100)
             </div>
           ) : (
             <div className="d-flex align-items-center text-danger small fw-bold transition-all">
                <FaTimesCircle className="me-2"/> Offline (Server Down)
             </div>
           )}
        </div>
        
        {/* Duplicate Signal Guard */}
        <div className="mb-3">
           <label className="text-muted small fw-bold d-flex align-items-center">
              Duplicate Signal Guard
              <InfoIcon title="ระบบป้องกันคำสั่งซ้ำ" color="text-secondary">
                  <li>ป้องกัน TradingView หรือผู้ใช้ส่งสัญญาณเดิมซ้ำซ้อน (Anti-Spam)</li>
                  <li>ระบบจะบล็อกออเดอร์ในหุ้น/สัญญาเดียวกัน ที่ถูกส่งเข้ามาติดๆ กันภายใน 10 วินาที</li>
              </InfoIcon>
           </label>
           {isSystemOk ? (
             <div className="d-flex align-items-center text-success small fw-bold transition-all">
                <FaCheckCircle className="me-2"/> Active (10s Delay)
             </div>
           ) : (
             <div className="d-flex align-items-center text-danger small fw-bold transition-all">
                <FaTimesCircle className="me-2"/> Offline (Server Down)
             </div>
           )}
        </div>

        {/* Odd Lot / Board Lot Automation */}
        <div className="mb-3">
           <label className="text-muted small fw-bold d-flex align-items-center">
              Odd / Board Lot Guard
              <InfoIcon title="ระบบจัดการเศษหุ้นอัตโนมัติ" color="text-secondary">
                  <li>ระบบจะบังคับปัดเศษหุ้น (SET) เป็น Board Lot แบบ "ปัดลง (Round Down)" เสมอ เพื่อป้องกันปัญหาเงินไม่พอจ่าย</li>
                  <li>หากทุนคำนวณได้ไม่ถึง 100 หุ้น ระบบจะส่งคำสั่งเป็นเศษหุ้น (Odd Lot) ให้โดยอัตโนมัติ</li>
              </InfoIcon>
           </label>
           {isSystemOk ? (
             <div className="d-flex align-items-center text-success small fw-bold transition-all">
                <FaCheckCircle className="me-2"/> Active (Auto-Round Down)
             </div>
           ) : (
             <div className="d-flex align-items-center text-danger small fw-bold transition-all">
                <FaTimesCircle className="me-2"/> Offline (Server Down)
             </div>
           )}
        </div>

        {/* Max Loss Limit */}
        <div className={`mt-4 p-3 rounded border transition-all ${data.is_max_loss_active ? 'bg-danger bg-opacity-10 border-danger border-opacity-25' : 'bg-light border-light'}`}>
            <div className="d-flex justify-content-between align-items-center mb-2">
                <span className={`small fw-bold d-flex align-items-center ${data.is_max_loss_active ? 'text-danger' : 'text-muted'}`}>
                  Max Loss Limit (Daily)
                  <InfoIcon title="ระบบตัดขาดทุนรายวัน" color="text-secondary">
                    <li>ระบบจะเช็คยอดกำไร/ขาดทุนสะสม (P/L) ของพอร์ตในวันนั้น</li>
                    <li>หากพอร์ตติดลบเกินจำนวนเงินที่ตั้งไว้ บอทจะหยุดส่งคำสั่งซื้อขายทุกชนิด จนกว่าจะขึ้นวันใหม่</li>
                  </InfoIcon>
                </span>
                <div className="form-check form-switch">
                    <input 
                        className="form-check-input" 
                        type="checkbox" 
                        name="is_max_loss_active"
                        checked={data.is_max_loss_active || false}
                        onChange={onChange}
                        disabled={!isSystemOk}
                    />
                </div>
            </div>
            
            {data.is_max_loss_active ? (
                <div className="input-group input-group-sm">
                    <input 
                        type="number" 
                        className="form-control border-danger text-danger fw-bold opacity-50" 
                        placeholder="5000"
                        name="max_loss_amount"
                        value={data.max_loss_amount}
                        onChange={onChange}
                        disabled={!isSystemOk}
                    />
                    <span className="input-group-text bg-danger text-white border-danger">THB</span>
                </div>
            ) : (
                <div className="d-flex align-items-center text-muted opacity-50">Disabled</div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SafetyForm;