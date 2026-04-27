import { FaShieldAlt, FaExclamationTriangle, FaClock, FaExclamationCircle } from 'react-icons/fa';

const SummaryBar = ({ summary, activeFilter, onFilterChange }) => {
  const { total, success, failed, skipped } = summary;

  const getNetStatus = () => {
      if (total === 0) {
          return {
              text: 'Idle',
              subText: 'Waiting for signals...',
              colorClass: 'text-secondary',
              bgClass: 'bg-light',
              icon: <FaClock size={40} className="text-secondary opacity-50"/>
          };
      }

      const failureRate = (failed / total) * 100;

      if (failureRate >= 50) {
          return {
              text: 'Critical',
              subText: 'High Failure Rate!',
              colorClass: 'text-danger',
              bgClass: 'bg-danger bg-opacity-10 border-danger',
              icon: <FaExclamationTriangle size={40} className="text-danger"/>
          };
      } 
      
      if (failureRate >= 20) {
          return {
              text: 'Warning',
              subText: 'Check Errors',
              colorClass: 'text-warning',
              bgClass: 'bg-warning bg-opacity-10 border-warning',
              icon: <FaExclamationCircle size={40} className="text-warning"/>
          };
      }

      return {
          text: 'Good',
          subText: 'System Healthy',
          colorClass: 'text-success',
          bgClass: 'bg-white',
          icon: <FaShieldAlt size={40} className="text-success"/>
      };
  };

  const status = getNetStatus();

  return (
    <>
      <h6 className="text-uppercase text-muted fw-bold mb-3 ls-1 small">Summary Bar</h6>
      <div className="row g-3 mb-4">
         <div className="col-md-2 col-6">
            <div 
                className={`card border-0 text-white shadow-sm rounded-4 h-100 summary-clickable ${activeFilter === 'ALL' ? 'bg-primary' : 'bg-primary opacity-50'}`}
                onClick={() => onFilterChange('ALL')}
            >
                <div className="card-body text-center p-3">
                    <div className="small fw-bold text-uppercase">Total Trades</div>
                    <div className="display-6 fw-bold">{total}</div>
                </div>
            </div>
         </div>

         <div className="col-md-2 col-6">
            <div 
                className={`card border-0 text-white shadow-sm rounded-4 h-100 summary-clickable ${activeFilter === 'SUCCESS' ? 'bg-success' : 'bg-success opacity-50'}`}
                onClick={() => onFilterChange('SUCCESS')}
            >
                <div className="card-body text-center p-3">
                    <div className="small fw-bold text-uppercase">Success</div>
                    <div className="display-6 fw-bold">{success}</div>
                </div>
            </div>
         </div>

         <div className="col-md-2 col-6">
            <div 
                className={`card border-0 text-white shadow-sm rounded-4 h-100 summary-clickable ${activeFilter === 'FAILED' ? 'bg-danger' : 'bg-danger opacity-50'}`}
                onClick={() => onFilterChange('FAILED')}
            >
                <div className="card-body text-center p-3">
                    <div className="small fw-bold text-uppercase">Failed</div>
                    <div className="display-6 fw-bold">{failed}</div>
                </div>
            </div>
         </div>

         <div className="col-md-2 col-6">
            <div 
                className={`card border-0 text-dark shadow-sm rounded-4 h-100 summary-clickable ${activeFilter === 'SKIPPED' ? 'bg-warning' : 'bg-warning opacity-50'}`}
                onClick={() => onFilterChange('SKIPPED')}
            >
                <div className="card-body text-center p-3">
                    <div className="small fw-bold text-uppercase">Skipped</div>
                    <div className="display-6 fw-bold">{skipped}</div>
                </div>
            </div>
         </div>

         <div className="col-md-4 col-12">
            <div className={`card border-0 shadow-sm rounded-4 h-100 d-flex align-items-center justify-content-center transition-all ${status.bgClass}`}>
                <div className="card-body d-flex align-items-center justify-content-center gap-3">
                    {status.icon}
                    <div>
                        <h4 className={`fw-bold mb-0 ${status.colorClass}`}>{status.text}</h4>
                        <div className={`small fw-bold ${status.colorClass} opacity-75`}>{status.subText}</div>
                    </div>
                </div>
            </div>
         </div>
      </div>
    </>
  );
};

export default SummaryBar;