import React, { useState, useEffect } from 'react';
import { FaHeartbeat, FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';
import axios from '../../api/axios'; 

const HealthCard = () => {
  const [healthStatus, setHealthStatus] = useState({
    api: 'loading',
    stream: 'loading',
    db: 'loading'
  });

  useEffect(() => {
    const checkSystemHealth = async () => {
      try {
        const response = await axios.get('/health/settrade');
        
        if (response.status === 200) {
          setHealthStatus({ api: 'ok', stream: 'ok', db: 'ok' });
        }
      } catch (error) {
        if (error.response && error.response.status === 503) {
          setHealthStatus({ api: 'error', stream: 'error', db: 'ok' });
        } else {
          setHealthStatus({ api: 'error', stream: 'error', db: 'error' });
        }
      }
    };

    checkSystemHealth();
    
    // ตั้งเวลาให้เช็คซ้ำอัตโนมัติทุกๆ 10 วิ
    const interval = setInterval(checkSystemHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const renderIcon = (status) => {
    if (status === 'loading') return <FaSpinner className="text-warning spin-animation" />;
    if (status === 'ok') return <FaCheckCircle className="text-success" />;
    return <FaTimesCircle className="text-danger" />;
  };

  return (
    <div className="card dashboard-card h-100 border-0">
      <div className="card-body p-4">
        <h6 className="fw-bold text-dark mb-4">
          <FaHeartbeat className={`me-2 ${healthStatus.api === 'error' ? 'text-danger' : 'text-success'}`}/> 
          System Health
        </h6>
        <ul className="list-unstyled">
           <li className="d-flex justify-content-between mb-3 border-bottom pb-2">
               <span className="text-muted small">API Health (Settrade)</span>
               {renderIcon(healthStatus.api)}
           </li>
           <li className="d-flex justify-content-between mb-3 border-bottom pb-2">
               <span className="text-muted small">Streaming Connection</span>
               {renderIcon(healthStatus.stream)}
           </li>
           <li className="d-flex justify-content-between mb-0">
               <span className="text-muted small">Database/Logs</span>
               {renderIcon(healthStatus.db)}
           </li>
        </ul>
        {healthStatus.api === 'error' && (
           <small className="text-danger d-block mt-3 text-center fw-bold">
              ⚠️ ไม่สามารถเชื่อมต่อระบบหลักได้
           </small>
        )}
      </div>
    </div>
  );
};

export default HealthCard;