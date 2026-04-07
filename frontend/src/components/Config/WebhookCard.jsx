import React, { useState, useEffect } from 'react';
import { FaCopy, FaCheckCircle, FaLink, FaCode, FaInfoCircle } from 'react-icons/fa';

// Component Info Icon
const InfoIcon = ({ title, children, color }) => {
  return (
    <div className="info-container ms-1">
      <FaInfoCircle className={`info-icon ${color}`} style={{ fontSize: '0.9em' }} />
      <div className="info-popover">
        <div className="info-title">{title}</div>
        <ul className="info-list">
          {children}
        </ul>
      </div>
    </div>
  );
};

const WebhookCard = ({ token }) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const [alertSource, setAlertSource] = useState('strategy'); 
  const [market, setMarket] = useState('SET');
  const [symbol, setSymbol] = useState('PTT');
  const [volume, setVolume] = useState(0); 
  const [indicatorAction, setIndicatorAction] = useState('BUY');
  const [indicatorPrice, setIndicatorPrice] = useState('0');

  useEffect(() => {
    if (market === 'SET') {
      setSymbol('PTT');
      setVolume(0);
      setIndicatorAction('BUY');
    } else {
      setSymbol('S50H26');
      setVolume(0);
      setIndicatorAction('LONG');
    }
  }, [market]);

  const webhookUrl = `https://karan-nonremovable-admonitorily.ngrok-free.dev/webhook/${token || 'loading...'}`;

  const generateJsonPayload = () => {
    if (alertSource === 'strategy') {
      return `{
  "market": "${market}",
  "symbol": "${symbol}",
  "action": "{{strategy.order.action}}",
  "volume": ${volume || 0},
  "price": {{strategy.order.price}}
}`;
    } else {
      return `{
  "market": "${market}",
  "symbol": "${symbol}",
  "action": "${indicatorAction}",
  "volume": ${volume || 0},
  "price": ${indicatorPrice}
}`;
    }
  };

  const jsonPayload = generateJsonPayload();

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    }
  };

  return (
    <div className="card dashboard-card border-0 w-100 h-100">
      <div className="card-body p-4">
        <div className="d-flex justify-content-between mb-3">
            <h6 className="fw-bold text-dark"><FaLink className="me-2 text-muted"/> TradingView Webhook Setup</h6>
        </div>
        
        <div className="mb-4">
          <label className="form-label text-muted small mb-1">Webhook URL</label>
          <div className="input-group">
            <input type="text" className="form-control bg-light" value={webhookUrl} readOnly />
            <button 
              className={`btn ${copiedUrl ? 'btn-success' : 'btn-primary'}`} 
              onClick={() => handleCopy(webhookUrl, 'url')}
            >
              {copiedUrl ? <><FaCheckCircle className="me-1"/> Copied</> : <><FaCopy className="me-1"/> Copy URL</>}
            </button>
          </div>
        </div>

        <div className="p-3 bg-light rounded border">
          <label className="form-label text-muted small mb-3">
            <FaCode className="me-1"/> Message Generator
          </label>

          <div className="mb-3">
            <label className="form-label small mb-1 text-muted fw-bold d-flex align-items-center">
              Alert Source
              <InfoIcon title="การเลือกแหล่งที่มาของสัญญาณ" color="text-primary">
                <li><b>Strategy:</b> บอทจะดึงคำสั่งซื้อขายและราคาอัตโนมัติจากระบบกลยุทธ์ของ TradingView</li>
                <li><b>Indicator:</b> กำหนดคำสั่งด้วยตัวเอง เหมาะสำหรับสัญญาณแจ้งเตือนทั่วไป เช่น เส้นตัดกัน</li>
              </InfoIcon>
            </label>
            <select className="form-select form-select-sm border-primary" value={alertSource} onChange={(e) => setAlertSource(e.target.value)}>
              <option value="strategy">TradingView Strategy</option>
              <option value="indicator">TradingView Indicator</option>
            </select>
          </div>
          
          <div className="row g-2 mb-3">
            <div className="col-4">
              <label className="form-label small mb-1 text-muted">Market</label>
              <select className="form-select form-select-sm" value={market} onChange={(e) => setMarket(e.target.value)}>
                <option value="SET">SET</option>
                <option value="TFEX">TFEX</option>
              </select>
            </div>
            <div className="col-4">
              <label className="form-label small mb-1 text-muted">Symbol</label>
              <input type="text" className="form-control form-control-sm text-uppercase" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} />
            </div>
            <div className="col-4">
              <label className="form-label small mb-1 text-muted d-flex align-items-center">
                Volume
                <InfoIcon title="การกำหนดขนาดสัญญา/หุ้น" color="text-secondary">
                  <li><b>หากใส่ 0 :</b> บอทจะใช้การตั้งค่าขนาดไม้ (Position Sizing) ด้านบนมาคำนวณอัตโนมัติ</li>
                  <li><b>หากใส่ตัวเลข :</b> บอทจะซื้อขายตามจำนวนที่ระบุนี้ทันที</li>
                </InfoIcon>
              </label>
              <input type="number" className="form-control form-control-sm" value={volume} onChange={(e) => setVolume(e.target.value)} />
            </div>
          </div>

          {alertSource === 'indicator' && (
            <div className="row g-2 mb-3">
              <div className="col-6">
                <label className="form-label small mb-1 text-muted d-flex align-items-center">
                  Action
                  <InfoIcon title="คำสั่งซื้อขาย (Action)" color="text-secondary">
                    {/* Information Action */}
                    {market === 'SET' ? (
                      <>
                        <li><b>Buy:</b> ส่งคำสั่งซื้อหุ้น (ทำกำไรขาขึ้น)</li>
                        <li><b>Sell:</b> ส่งคำสั่งขายหุ้น (ทำกำไรขาลง / ตัดขาดทุน)</li>
                      </>
                    ) : (
                      <>
                        <li><b>Long:</b> เปิดสถานะซื้อ (ขาขึ้น)</li>
                        <li><b>Short:</b> เปิดสถานะขาย (ขาลง)</li>
                        <li><b>Close Long:</b> ปิด Long เดิม (Take Profit / Stop Loss)</li>
                        <li><b>Close Short:</b> ปิด Short เดิม (Take Profit / Stop Loss)</li>
                      </>
                    )}
                  </InfoIcon>
                </label>
                <select className="form-select form-select-sm" value={indicatorAction} onChange={(e) => setIndicatorAction(e.target.value)}>
                  {/* Dropdown Action */}
                  {market === 'SET' ? (
                    <>
                      <option value="BUY">Buy</option>
                      <option value="SELL">Sell</option>
                    </>
                  ) : (
                    <>
                      <option value="LONG">Long</option>
                      <option value="SHORT">Short</option>
                      <option value="CLOSE_LONG">Close Long</option>
                      <option value="CLOSE_SHORT">Close Short</option>
                    </>
                  )}
                </select>
              </div>
              <div className="col-6">
                <label className="form-label small mb-1 text-muted d-flex align-items-center">
                  Price
                  <InfoIcon title="การกำหนดราคา (Price)" color="text-secondary">
                    <li><b>0 :</b> ซื้อขายทันทีด้วยราคาตลาดปัจจุบัน (ไม่ต้องรอคิว)</li>
                    <li><b>{"{{close}}"} :</b> นำราคาปิดของแท่งเทียนนั้นไปตั้งคิวรอซื้อขาย (Limit)</li>
                    <li className="text-danger mt-2" style={{fontSize: '0.9em', borderTop: '1px solid #eee', paddingTop: '5px'}}><b>คำเตือน</b> หากเลือก {"{{close}}"} ต้องไปตั้งค่า Market Price Type เป็น Limit ด้วย</li>
                  </InfoIcon>
                </label>
                <select className="form-select form-select-sm border-warning" value={indicatorPrice} onChange={(e) => setIndicatorPrice(e.target.value)}>
                  <option value="0">0</option>
                  <option value="{{close}}">{"{{close}}"}</option>
                </select>
                <small className="text-danger mt-1 d-block" style={{fontSize: '0.66rem', fontWeight: 'bold'}}>
                    *อย่าลืมเช็ค Market Price Type ให้ตรงกัน
                </small>
              </div>
            </div>
          )}

          <div className="position-relative">
            <pre className="bg-dark text-success p-3 rounded small mb-0" style={{ overflowX: 'auto' }}>
              <code>{jsonPayload}</code>
            </pre>
            <button 
              className={`btn btn-sm position-absolute top-0 end-0 m-2 ${copiedJson ? 'btn-success' : 'btn-light'}`}
              onClick={() => handleCopy(jsonPayload, 'json')}
            >
              {copiedJson ? <><FaCheckCircle/> Copied</> : <><FaCopy/> Copy</>}
            </button>
          </div>
          
        </div>

      </div>
    </div>
  );
};

export default WebhookCard;