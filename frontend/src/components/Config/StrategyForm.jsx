import { FaCog, FaChartLine, FaProjectDiagram, FaInfoCircle } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

const InfoIcon = ({ title, children, color }) => (
  <div className="info-container ms-1">
    <FaInfoCircle className={`info-icon ${color}`} style={{ fontSize: '0.9em' }} />
    <div className="info-popover text-start" style={{ width: '280px' }}>
      <div className="info-title">{title}</div>
      <ul className="info-list">{children}</ul>
    </div>
  </div>
);

const StrategyForm = ({ data, onChange }) => {
  const allocationType = data.allocation_type || 'FIX';
  const tradeMode = data.trade_mode || 'AMOUNT';

  const [balance, setBalance] = useState(0);
  useEffect(() => {
    fetch('/api/balance', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(d => setBalance(d.balance || 0))
    .catch(() => {});
  }, []);

  return (
    <div className="card dashboard-card h-100 border-0 d-flex flex-column">

      <div className="card-header bg-white border-0 p-4 px-4 pb-0 flex-shrink-0">
          <div className="d-flex justify-content-between align-items-center">
              <h6 className="fw-bold text-dark m-0"><FaCog className="me-2 text-muted"/> Trading Strategy</h6>
          </div>
      </div>

      <div className="card-body p-4 pt-3 pe-3" style={{ maxHeight: '350px', overflowY: 'auto', overflowX: 'hidden' }}>
        
        <div className="mb-4">
           <label className="text-muted small fw-bold">Position Sizing</label>
           <select className="form-select form-control-modern form-select-sm border-primary" name="allocation_type" value={allocationType} onChange={onChange}>
              <option value="FIX">Fixed (ขนาดไม้ตายตัว)</option>
              <option value="DYNAMIC">Dynamic (ตามสัดส่วนพอร์ต)</option>
           </select>
        </div>

        {allocationType === 'FIX' && (
          <>
            <div className="p-3 bg-light rounded mb-3 border">
                <h6 className="fw-bold mb-3 small" style={{ color: '#2c3e50' }}><FaChartLine className="me-2"/> SET (Equity)</h6>
                <div className="mb-3">
                   <label className="text-muted small fw-bold">Trading Unit</label>
                   <select className="form-select form-control-modern form-select-sm" name="trade_mode" value={tradeMode} onChange={onChange}>
                      <option value="AMOUNT">Value (บาท)</option>
                      <option value="VOLUME">Volume (หุ้น)</option>
                   </select>
                </div>

                {tradeMode === 'AMOUNT' ? (
                    <div className="mb-2">
                        <label className="text-muted small fw-bold">Budget Per Trade (THB)</label>
                        <input 
                          type="number" 
                          min="0" 
                          className="form-control form-control-modern form-control-sm border-primary" 
                          name="budget_per_trade" 
                          value={data.budget_per_trade || ''} 
                          onChange={(e) => {
                              if (balance > 0 && Number(e.target.value) > balance) {
                                  const htmlMsg = `
                                      <div style="text-align: left; background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 10px; border: 1px solid #dee2e6;">
                                          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                                              <span style="white-space: nowrap; margin-right: 15px;"><b>Budget Per Trade :</b></span> 
                                              <span style="color: #dc3545; font-weight: bold; text-align: right; word-break: break-word;">${Number(e.target.value).toLocaleString()} THB</span>
                                          </div>
                                          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                              <span style="white-space: nowrap; margin-right: 15px;"><b>Line Available :</b></span> 
                                              <span style="color: #198754; font-weight: bold; text-align: right; word-break: break-word;">${balance.toLocaleString()} THB</span>
                                          </div>
                                      </div>
                                      <div style="margin-top: 15px; font-size: 0.85em; color: #6c757d;">กรุณาระบุงบประมาณไม่ให้เกิน Line Available ของคุณ</div>
                                  `;
                                  Swal.fire({
                                      icon: 'warning',
                                      title: 'Line Available ไม่เพียงพอ!',
                                      html: htmlMsg,
                                      width: 600,
                                      confirmButtonColor: '#ffc107',
                                      confirmButtonText: 'ปรับปรุงการตั้งค่า',
                                      customClass: { popup: 'rounded-4 shadow' }
                                  });
                                  return;
                              }
                              onChange(e);
                          }} 
                        />
                        {balance > 0 && (
                            <small className="text-success mt-1 d-block" style={{fontSize: '0.7rem'}}>
                                * Line Available (อำนาจซื้อ): {balance.toLocaleString()} THB
                            </small>
                        )}
                    </div>
                ) : (
                    <div className="mb-2">
                        <label className="text-muted small fw-bold">Fixed Volume (Shares)</label>
                        <input type="number" min="0" step="100" className="form-control form-control-modern form-control-sm" name="fixed_volume" value={data.fixed_volume || ''} onChange={onChange} />
                    </div>
                )}
            </div>

            <div className="p-3 bg-light rounded mb-3 border">
                <h6 className="fw-bold mb-3 small" style={{ color: '#d35400' }}><FaProjectDiagram className="me-2"/> TFEX (Derivatives)</h6>
                <div className="mb-3">
                   <label className="text-muted small fw-bold">Trading Unit</label>
                   <select className="form-select form-control-modern form-select-sm" disabled style={{ backgroundColor: '#e9ecef' }}>
                      <option>Volume (สัญญา)</option>
                   </select>
                </div>
                <div className="mb-2">
                    <label className="text-muted small fw-bold">Fixed Volume (Contracts)</label>
                    <input type="number" min="1" step="1" className="form-control form-control-modern form-control-sm" name="tfex_volume" value={data.tfex_volume || ''} onChange={onChange} />
                </div>
            </div>
          </>
        )}

        {allocationType === 'DYNAMIC' && (
          <div className="p-3 bg-light rounded mb-3 border">
              <h6 className="fw-bold mb-3 small text-primary">Dynamic Sizing</h6>
              <div className="mb-2">
                  <label className="text-muted small fw-bold">Risk per Trade (%)</label>
                  <input type="number" min="1" max="100" className="form-control form-control-modern form-control-sm" name="dynamic_percent" value={data.dynamic_percent || ''} onChange={onChange} placeholder="e.g. 10" />
                  <small className="text-muted mt-2 d-block" style={{fontSize: '0.65rem'}}>
                      *ระบบจะคำนวณไม้เทรดให้อัตโนมัติจากทุนในพอร์ต
                  </small>
              </div>
          </div>
        )}

        <div className="mb-1">
           <label className="text-muted small fw-bold d-flex align-items-center">
             Market Price Type
             <InfoIcon title="ประเภทราคา (Price Type)" color="text-primary">
                <li><b>Limit :</b> ซื้อขายตามราคาที่ระบุ (ตั้งรอคิว)</li>
                <li><b>MP-MKT :</b> ซื้อขายที่ราคาตลาด จับคู่ทันที (กวาดทุกคิว)</li>
                <li><b>MP-MTL :</b> ซื้อขายที่ราคาตลาด จับคู่เฉพาะคิวแรกสุด</li>
                <li><b>ATO :</b> ส่งคำสั่งซื้อขาย ณ ราคาเปิดตลาด</li>
                <li><b>ATC :</b> ส่งคำสั่งซื้อขาย ณ ราคาปิดตลาด</li>
             </InfoIcon>
           </label>
           <select className="form-select form-control-modern form-select-sm" name="price_type" value={data.price_type || 'MP-MKT'} onChange={onChange}>
              <option value="Limit">Limit</option>
              <option value="MP-MKT">MP-MKT</option>
              <option value="MP-MTL">MP-MTL</option>
              <option value="ATO">ATO</option>
              <option value="ATC">ATC</option>
           </select>
        </div>

      </div>
    </div>
  );
};

export default StrategyForm;