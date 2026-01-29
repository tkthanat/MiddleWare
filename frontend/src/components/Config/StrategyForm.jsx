import { FaCog } from 'react-icons/fa';

const StrategyForm = ({ data, onChange }) => {
  return (
    <div className="card dashboard-card h-100 border-0">
      <div className="card-body p-4">
        <div className="d-flex justify-content-between mb-3">
            <h6 className="fw-bold text-dark"><FaCog className="me-2 text-muted"/> Trading Strategy</h6>
        </div>

        <div className="mb-3">
           <label className="text-muted small fw-bold">Mode</label>
           <select className="form-select form-control-modern" name="trade_mode" value={data.trade_mode} onChange={onChange}>
              <option value="AMOUNT">Amount</option>
              <option value="VOLUME">Volume</option>
           </select>
        </div>

        {data.trade_mode === 'AMOUNT' ? (
            <div className="mb-3">
                <label className="text-muted small fw-bold">Budget Per Trade (THB)</label>
                <input type="number" min="0" className="form-control form-control-modern" name="budget_per_trade" value={data.budget_per_trade} onChange={onChange} />
            </div>
        ) : (
            <div className="mb-3">
                <label className="text-muted small fw-bold">Fixed Volume (Shares)</label>
                <input type="number" min="0" step="100" className="form-control form-control-modern" name="fixed_volume" value={data.fixed_volume} onChange={onChange} />
            </div>
        )}
        
        <div className="d-flex align-items-center justify-content-between mt-4 p-2 bg-light rounded">
            <span className="small text-muted fw-bold">Auto-correct Board Lot</span>
            <div className="form-check form-switch">
                <input className="form-check-input" type="checkbox" checked={true} readOnly/>
            </div>
        </div>
      </div>
    </div>
  );
};

export default StrategyForm;