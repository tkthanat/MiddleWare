import { FaShieldAlt, FaExclamationTriangle, FaClock, FaExclamationCircle } from 'react-icons/fa';

const SummaryBar = ({ summary }) => {
  const { total, success, failed, skipped } = summary;

  // Health Check
  const getNetStatus = () => {
      // no order trades
      if (total === 0) {
          return {
              text: 'Idle',
              subText: 'Waiting for signals...',
              colorClass: 'text-secondary',
              bgClass: 'bg-light',
              icon: <FaClock size={40} className="text-secondary opacity-50"/>
          };
      }

      // Failed / Total
      const failureRate = (failed / total) * 100;

      if (failureRate >= 50) {
          // If more than 50% is damaged (CRITICAL)
          return {
              text: 'Critical',
              subText: 'High Failure Rate!',
              colorClass: 'text-danger',
              bgClass: 'bg-danger bg-opacity-10 border-danger',
              icon: <FaExclamationTriangle size={40} className="text-danger"/>
          };
      } 
      
      if (failureRate >= 20) {
          // If more than 20% is damaged (WARNING)
          return {
              text: 'Warning',
              subText: 'Check Errors',
              colorClass: 'text-warning',
              bgClass: 'bg-warning bg-opacity-10 border-warning',
              icon: <FaExclamationCircle size={40} className="text-warning"/>
          };
      }

      // GOOD
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
         {/* Total Card */}
         <div className="col-md-2 col-6">
            <div className="card border-0 bg-primary text-white shadow-sm rounded-4 h-100">
                <div className="card-body text-center p-3">
                    <div className="small opacity-75 fw-bold text-uppercase">Total Trades</div>
                    <div className="display-6 fw-bold">{total}</div>
                </div>
            </div>
         </div>

         {/* Success Card */}
         <div className="col-md-2 col-6">
            <div className="card border-0 bg-success text-white shadow-sm rounded-4 h-100">
                <div className="card-body text-center p-3">
                    <div className="small opacity-75 fw-bold text-uppercase">Success</div>
                    <div className="display-6 fw-bold">{success}</div>
                </div>
            </div>
         </div>

         {/* Failed Card */}
         <div className="col-md-2 col-6">
            <div className="card border-0 bg-danger text-white shadow-sm rounded-4 h-100">
                <div className="card-body text-center p-3">
                    <div className="small opacity-75 fw-bold text-uppercase">Failed</div>
                    <div className="display-6 fw-bold">{failed}</div>
                </div>
            </div>
         </div>

         {/* Skipped Card */}
         <div className="col-md-2 col-6">
            <div className="card border-0 bg-warning text-dark shadow-sm rounded-4 h-100">
                <div className="card-body text-center p-3">
                    <div className="small opacity-75 fw-bold text-uppercase">Skipped</div>
                    <div className="display-6 fw-bold">{skipped}</div>
                </div>
            </div>
         </div>

         {/* Status Indicator Card (Dynamic) */}
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