import React, { useState, useEffect } from "react";
import { User, Shield, Key, Lock, ChevronRight, Smartphone, Mail, AlertCircle, X, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom"; 
import axios from "axios";
import "../css/Settings.css";

const API_BASE_URL = "http://localhost:8000/api/user";

const Settings = () => {
  const navigate = useNavigate();
  
  const getCurrentUsername = () => {
      try {
          const storedData = localStorage.getItem("user_data");
          if (storedData) {
              const parsed = JSON.parse(storedData);
              return parsed.username;
          }
      } catch (e) { console.error("Error parsing user data", e); }
      return localStorage.getItem("username");
  };

  const currentUsername = getCurrentUsername();

  const [activeTab, setActiveTab] = useState("profile");
  
  // --- UI States ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // --- Data States ---
  const [userData, setUserData] = useState({ 
    username: "", full_name: "", email: "", phone: "", is_2fa_enabled: false 
  });

  // --- Security Modal States ---
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [timeLeft, setTimeLeft] = useState(0); 

  useEffect(() => {
    if (!currentUsername) { 
        window.location.href = "/login"; 
        return; 
    }
    fetchProfile();
  }, [currentUsername]); 

  useEffect(() => {
    if (message.text) {
        const timer = setTimeout(() => setMessage({ type: "", text: "" }), 3000);
        return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    }
  }, [timeLeft]);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/me?username=${currentUsername}`);
      setUserData(res.data);
    } catch (err) { console.error(err); }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await axios.put(`${API_BASE_URL}/me?username=${currentUsername}`, userData);
      setMessage({ type: "success", text: "บันทึกข้อมูลเรียบร้อย ✅" });
    } catch (error) {
      setMessage({ type: "error", text: "บันทึกไม่สำเร็จ" });
    } finally { setLoading(false); }
  };

  const handleRequestOtp = async () => {
    if (!userData.email) return alert("กรุณากรอกอีเมลในหน้า Edit Profile ก่อน");
    
    setShowOtpModal(true);
    setIsSendingOtp(true);
    setOtpCode("");
    setNewPassword("");

    try {
      await axios.post(`${API_BASE_URL}/request-otp?username=${currentUsername}`, { action: "change_password" });
      setTimeLeft(180);
    } catch (error) {
      alert("ส่ง OTP ไม่สำเร็จ: " + (error.response?.data?.detail || "Error"));
      setShowOtpModal(false);
    } finally { 
      setIsSendingOtp(false); 
    }
  };

  const handleSubmitPassword = async () => {
    if (!otpCode || !newPassword) return alert("กรุณากรอกข้อมูลให้ครบ");
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/verify-change-password?username=${currentUsername}`, {
        otp_code: otpCode,
        new_password: newPassword
      });
      alert("✅ เปลี่ยนรหัสผ่านเรียบร้อยแล้ว!");
      setShowOtpModal(false);
    } catch (error) {
      alert("❌ " + (error.response?.data?.detail || "OTP ผิดพลาด"));
    } finally { setLoading(false); }
  };

  const handleToggle2FA = async (e) => {
    if (!userData.email) {
        e.preventDefault(); 
        alert("⚠️ กรุณาระบุ Email ในหน้า Edit Profile ก่อนเปิดใช้งาน 2FA");
        return;
    }

    const newState = e.target.checked;
    try {
      await axios.put(`${API_BASE_URL}/toggle-2fa?username=${currentUsername}`, { enabled: newState });
      setUserData(prev => ({ ...prev, is_2fa_enabled: newState }));
    } catch (error) {
      alert("Update 2FA Failed: " + (error.response?.data?.detail || "Unknown Error"));
      e.target.checked = !newState; 
    }
  };

  // Helper for Mobile
  const selectTab = (tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="settings-container">
      
      {/* Hamburger Menu & Mobile Sidebar */}
      <div className="mobile-nav-toggle" onClick={() => setIsSidebarOpen(true)}>
         <Menu size={24} color="#333" />
      </div>

      <div className={`sidebar-overlay ${isSidebarOpen ? 'show' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>

      <div className={`settings-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header"><h2>Settings</h2></div>
        <nav className="sidebar-menu">
          <button onClick={() => selectTab("profile")} className={`menu-btn ${activeTab === "profile" ? "active" : ""}`}>
            <User size={20} /> Edit Profile
          </button>
          <button onClick={() => selectTab("security")} className={`menu-btn ${activeTab === "security" ? "active" : ""}`}>
            <Shield size={20} /> Security
          </button>
        </nav>
      </div>

      <div className="settings-content">
        <div className="close-btn-wrapper">
            <button className="btn-close" onClick={() => navigate('/')} title="Close Settings">
                <X size={24} />
            </button>
        </div>

        <div className="content-wrapper">
          
          {/* Edit Profile */}
          {activeTab === "profile" && (
            <div className="fade-in">
              <h3 style={{ marginBottom: '30px', fontSize: '22px', fontWeight: '700', color: '#1a1a1a' }}>
                Personal Information
              </h3>

              <input type="text" style={{display:'none'}} />
              <input type="password" style={{display:'none'}} />

              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '35px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: 'bold', color: '#555', marginRight: '16px', flexShrink: 0 }}>
                    {userData.username ? userData.username.charAt(0).toUpperCase() : "?"}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#000' }}>@{userData.username}</h4>
                    <span style={{ fontSize: '13px', color: '#888' }}>Trading Account ID</span>
                  </div>
              </div>

              {message.text && (
                 <div style={{ padding: '12px', marginBottom: '20px', borderRadius: '8px', background: message.type === 'success' ? '#edffed' : '#fff0f0', color: message.type === 'success' ? '#1a7f1a' : '#cc0000', border: `1px solid ${message.type === 'success' ? '#bcedbc' : '#ffcccc'}`, display: 'flex', alignItems: 'center', gap: '10px', transition: 'opacity 0.5s' }}>
                    {message.type === "error" && <AlertCircle size={18} />}
                    {message.text}
                 </div>
              )}

              <div className="form-group" style={{marginBottom:'20px'}}>
                  <label style={{display:'block', marginBottom:'8px', fontWeight:'600'}}>Full Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    style={{width:'100%', padding:'12px', border:'1px solid #dbdbdb', borderRadius:'6px'}} 
                    value={userData.full_name} 
                    onChange={(e) => setUserData({...userData, full_name: e.target.value})} 
                    placeholder="Enter your real name"
                    autoComplete="off" 
                  />
              </div>

              <div className="form-group" style={{marginBottom:'20px'}}>
                  <label style={{display:'block', marginBottom:'8px', fontWeight:'600'}}>Email</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    style={{width:'100%', padding:'12px', border:'1px solid #dbdbdb', borderRadius:'6px'}} 
                    value={userData.email} 
                    onChange={(e) => setUserData({...userData, email: e.target.value})} 
                    placeholder="name@company.com" 
                    autoComplete="off" 
                    name="new-email"
                  />
              </div>

              <div className="form-group" style={{marginBottom:'20px'}}>
                  <label style={{display:'block', marginBottom:'8px', fontWeight:'600'}}>Phone Number</label>
                  <input 
                    type="tel" 
                    className="form-input" 
                    style={{width:'100%', padding:'12px', border:'1px solid #dbdbdb', borderRadius:'6px'}} 
                    value={userData.phone} 
                    onChange={(e) => setUserData({...userData, phone: e.target.value})} 
                    placeholder="08X-XXX-XXXX" 
                    autoComplete="off"
                  />
              </div>

              <div className="form-actions">
                  <button onClick={handleSaveProfile} disabled={loading} className="sec-btn-confirm" style={{maxWidth: '150px'}}>
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
              </div>
            </div>
          )}

          {/* Security */}
          {activeTab === "security" && (
            <div className="fade-in">
              <h3 style={{marginBottom:'20px'}}>Login & Security</h3>
              
              <div className="security-list">
                <div className="security-item" onClick={handleRequestOtp}>
                  <div className="sec-left">
                    <Key size={24} className="sec-icon" />
                    <div className="sec-text">
                      <h4>Change Password</h4>
                      <p>We'll send a code to your email: {userData.email || "No Email"}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} color="#ccc" />
                </div>

                <div className="security-item" style={{cursor: !userData.email ? 'not-allowed' : 'default'}}>
                  <div className="sec-left">
                    <Smartphone size={24} className="sec-icon" style={{opacity: !userData.email ? 0.5 : 1}} />
                    <div className="sec-text">
                      <h4 style={{opacity: !userData.email ? 0.5 : 1}}>Two-Factor Authentication</h4>
                      <p style={{opacity: !userData.email ? 0.5 : 1}}>Add an extra layer of security to your account.</p>
                      
                      {!userData.email && (
                          <span style={{color: '#ef4444', fontSize: '12px', fontWeight: '600', display:'flex', alignItems:'center', marginTop:'4px'}}>
                            <AlertCircle size={12} style={{marginRight:'4px'}}/> 
                            Please set up Email first!
                          </span>
                      )}
                    </div>
                  </div>
                  
                  <label className="sec-toggle-switch" style={{opacity: !userData.email ? 0.5 : 1}}>
                    <input 
                        type="checkbox" 
                        checked={userData.is_2fa_enabled} 
                        onChange={handleToggle2FA}
                        disabled={!userData.email} 
                    />
                    <span className="sec-slider"></span>
                  </label>
                </div>

                <div className="security-item">
                  <div className="sec-left">
                    <Lock size={24} className="sec-icon" />
                    <div className="sec-text">
                      <h4>Login Activity</h4>
                      <p>See where you're logged in.</p>
                    </div>
                  </div>
                  <ChevronRight size={20} color="#ccc" />
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Modal Popup */}
      {showOtpModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            {isSendingOtp ? (
                <div style={{padding: '20px'}}>
                    <div className="spinner"></div>
                    <p style={{marginTop: '15px', fontWeight: '500'}}>Sending OTP to {userData.email}...</p>
                    <p style={{fontSize: '12px', color: '#888'}}>This may take a few seconds</p>
                </div>
            ) : (
                <>
                    <div className="modal-icon"><Mail size={32} /></div>
                    <h3 className="modal-title">Verify it's you</h3>
                    <p className="modal-desc">
                    We sent a security code to <b>{userData.email}</b>. 
                    It expires in {formatTime(timeLeft)}.
                    </p>

                    <input type="text" style={{display:'none'}} />

                    <input type="text" className="otp-input" placeholder="000000" maxLength={6} value={otpCode} onChange={(e) => setOtpCode(e.target.value.toUpperCase())} autoComplete="off" />
                    <input type="password" className="otp-input" style={{fontSize:'16px', letterSpacing:'normal'}} placeholder="Enter New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="off" />

                    {timeLeft === 0 && <p className="timer-text">Code Expired. Please request again.</p>}

                    <div className="modal-actions">
                        <button className="sec-btn-confirm" onClick={handleSubmitPassword} disabled={timeLeft === 0 || loading}>
                            {loading ? "Verifying..." : "Confirm & Change Password"}
                        </button>
                        <button className="sec-btn-cancel" onClick={() => setShowOtpModal(false)}>Cancel</button>
                    </div>
                </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Settings;