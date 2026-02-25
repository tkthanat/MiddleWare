import { useState } from 'react';
import { FaPowerOff, FaCheckCircle } from 'react-icons/fa';

// Hooks
import { useSystemStatus } from '../hooks/useSystemStatus';
import { useConfig } from '../hooks/useConfig';

// Components
import StatusCard from '../components/Config/StatusCard';
import ApiConnectionForm from '../components/Config/ApiConnectionForm';
import AccountForm from '../components/Config/AccountForm';
import StrategyForm from '../components/Config/StrategyForm';
import SafetyForm from '../components/Config/SafetyForm';
import NotificationForm from '../components/Config/NotificationForm';
import HealthCard from '../components/Config/HealthCard';
import SymbolForm from '../components/Config/SymbolForm';
import ModalPopup from '../components/Common/ModalPopup';
import SaveBar from '../components/Config/SaveBar';
import Toast from '../components/Common/Toast';
import WebhookCard from '../components/Config/WebhookCard';

// CSS
import '../css/ConfigPage.css';

function ConfigPage() {
  const { isSystemOnline, isSystemActive, toggleSystem } = useSystemStatus();
  const { 
    formData, handleChange, saveSettings, 
    showToast, setShowToast,
    testMsgStatus, handleTestNotification 
  } = useConfig();
  
  const [showModal, setShowModal] = useState(false);

  const handleConfirmToggle = async () => {
      const success = await toggleSystem();
      if (success) setShowModal(false);
  };

  return (
    <div className="container pb-5 config-container">
      
      {/* Status Section */}
      <StatusCard 
         isSystemOnline={isSystemOnline} 
         isSystemActive={isSystemActive} 
         onEmergencyClick={() => setShowModal(true)} 
      />

      <form onSubmit={saveSettings}>
        
        {/* API Connection */}
        <div className="row mb-4">
           <div className="col-12">
               <ApiConnectionForm data={formData} onChange={handleChange} />
           </div>
        </div>

        {/* Main Config Grid */}
        <div className="row g-4 mb-4">
           <div className="col-12 col-md-6 col-lg-4">
               <AccountForm data={formData} onChange={handleChange} />
           </div>
           <div className="col-12 col-md-6 col-lg-4">
               <StrategyForm data={formData} onChange={handleChange} />
           </div>
           <div className="col-12 col-md-6 col-lg-4">
               <SafetyForm data={formData} onChange={handleChange} />
           </div>
        </div>

        {/* Webhook & Whitelist Grid */}
        <div className="row g-4 mb-4">
            <div className="col-12 col-lg-6 d-flex">
                <WebhookCard token={formData.webhook_token} />
            </div>
            <div className="col-12 col-lg-6 d-flex">
                <SymbolForm data={formData} onChange={handleChange} />
            </div>
        </div>

        {/* Notification & Health Grid */}
        <div className="row g-4 mb-5">
            <div className="col-12 col-lg-7">
                <NotificationForm 
                    data={formData} 
                    onChange={handleChange} 
                    testMsgStatus={testMsgStatus}
                    onTestClick={handleTestNotification}
                />
            </div>
            <div className="col-12 col-lg-5">
                <HealthCard />
            </div>
        </div>

        {/* Common Elements (Modal & Toast) */}
        <ModalPopup 
            show={showModal} 
            isSystemActive={isSystemActive} 
            onClose={() => setShowModal(false)}
            onConfirm={handleConfirmToggle}
        />

        <Toast 
            show={showToast} 
            onClose={() => setShowToast(false)} 
            message="Settings Saved Successfully!"
            type="success"
        />

        {/* Save Bar */}
        <div className="save-bar-wrapper">
            <SaveBar isSystemOnline={isSystemOnline} />
        </div>

      </form>
    </div>
  )
}

export default ConfigPage;