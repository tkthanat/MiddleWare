import React, { useState, useEffect } from 'react';
import { FaCopy, FaCheckCircle, FaLink, FaCode } from 'react-icons/fa';

const WebhookCard = ({ token }) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // Form State สำหรับสร้าง JSON
  const [market, setMarket] = useState('SET');
  const [symbol, setSymbol] = useState('PTT');
  const [action, setAction] = useState('BUY');
  const [volume, setVolume] = useState(100);

  // เปลี่ยน Action อัตโนมัติเมื่อเปลี่ยนตลาด
  useEffect(() => {
    if (market === 'SET') {
      setAction('BUY');
      setSymbol('PTT');
      setVolume(100);
    } else {
      setAction('OPEN_LONG');
      setSymbol('S50Z24');
      setVolume(1);
    }
  }, [market]);

  // URL สำหรับนำไปใส่ใน TradingView
  const webhookUrl = `https://karan-nonremovable-admonitorily.ngrok-free.dev/webhook/${token || 'loading...'}`;

  // สร้าง JSON อัตโนมัติตาม Form
  const jsonPayload = JSON.stringify({
    market: market,
    symbol: symbol,
    action: action,
    volume: Number(volume),
    price: 0
  }, null, 2);

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
        
        {/* Webhook URL */}
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

        {/* เครื่องมือสร้าง JSON */}
        <div className="p-3 bg-light rounded border">
          <label className="form-label text-muted small mb-3">
            <FaCode className="me-1"/> Message Generator
          </label>
          
          <div className="row g-2 mb-3">
            <div className="col-6">
              <label className="form-label small mb-1 text-muted">Market</label>
              <select className="form-select form-select-sm" value={market} onChange={(e) => setMarket(e.target.value)}>
                <option value="SET">SET</option>
                <option value="TFEX">TFEX</option>
              </select>
            </div>
            <div className="col-6">
              <label className="form-label small mb-1 text-muted">Symbol</label>
              <input type="text" className="form-control form-control-sm text-uppercase" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} />
            </div>
            <div className="col-6">
              <label className="form-label small mb-1 text-muted">Action</label>
              <select className="form-select form-select-sm" value={action} onChange={(e) => setAction(e.target.value)}>
                {market === 'SET' ? (
                  <>
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </>
                ) : (
                  <>
                    <option value="OPEN_LONG">OPEN LONG</option>
                    <option value="CLOSE_LONG">CLOSE LONG</option>
                    <option value="OPEN_SHORT">OPEN SHORT</option>
                    <option value="CLOSE_SHORT">CLOSE SHORT</option>
                  </>
                )}
              </select>
            </div>
            <div className="col-6">
              <label className="form-label small mb-1 text-muted">Volume</label>
              <input type="number" className="form-control form-control-sm" value={volume} onChange={(e) => setVolume(e.target.value)} />
            </div>
          </div>

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