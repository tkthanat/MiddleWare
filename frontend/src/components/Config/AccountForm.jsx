import { useState } from 'react';
import { FaWallet, FaEye, FaEyeSlash } from 'react-icons/fa';

const AccountForm = ({ data, onChange }) => {
  const [showPin, setShowPin] = useState(false);

  return (
    <div className="card dashboard-card h-100 border-0">
      <div className="card-body p-4">
        <div className="d-flex justify-content-between mb-3">
            <h6 className="fw-bold text-dark"><FaWallet className="me-2 text-muted"/> Trading Account</h6>
        </div>
        <div className="mb-3">
          <label className="text-muted small fw-bold">Account Number</label>
          <input type="text" className="form-control form-control-modern bg-light" name="account_no" value={data.account_no} onChange={onChange} />
        </div>
        <div className="mb-3">
           <label className="text-muted small fw-bold">PIN</label>
           <div className="input-group">
               <input 
                   type={showPin ? "text" : "password"} 
                   className="form-control form-control-modern bg-light border-end-0" 
                   name="pin" value={data.pin} onChange={onChange} 
               />
               <button className="btn border border-start-0" type="button" onClick={() => setShowPin(!showPin)} style={{ backgroundColor: '#F9FAFB' }}>
                   {showPin ? <FaEyeSlash /> : <FaEye />}
               </button>
           </div>
        </div>
        <div className="mb-0">
          <label className="text-muted small fw-bold">Market</label>
          <div className="p-2 bg-light rounded text-dark fw-bold small border">Equity (SET)</div>
        </div>
      </div>
    </div>
  );
};

export default AccountForm;