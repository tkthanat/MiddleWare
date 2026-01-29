import { FaHeartbeat, FaCheckCircle } from 'react-icons/fa';

const HealthCard = () => {
  return (
    <div className="card dashboard-card h-100 border-0">
      <div className="card-body p-4">
        <h6 className="fw-bold text-dark mb-4"><FaHeartbeat className="me-2 text-muted"/> System Health</h6>
        <ul className="list-unstyled">
           <li className="d-flex justify-content-between mb-3 border-bottom pb-2">
               <span className="text-muted small">API Health</span>
               <FaCheckCircle className="text-success"/>
           </li>
           <li className="d-flex justify-content-between mb-3 border-bottom pb-2">
               <span className="text-muted small">Streaming Connection</span>
               <FaCheckCircle className="text-success"/>
           </li>
           <li className="d-flex justify-content-between mb-0">
               <span className="text-muted small">Database/Logs</span>
               <FaCheckCircle className="text-success"/>
           </li>
        </ul>
      </div>
    </div>
  );
};

export default HealthCard;