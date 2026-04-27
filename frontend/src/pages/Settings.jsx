import React, { useState, useEffect } from "react";
import { Shield, Key, Lock, Mail, AlertCircle, Menu, Image as ImageIcon, ChevronRight, Smartphone, Edit2, X, CheckCircle } from "lucide-react";
import { FaSun, FaMoon, FaSyncAlt } from 'react-icons/fa'; 
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
    } catch (e) { 
      console.error("Error parsing user data", e); 
    }
    return localStorage.getItem("username");
  };

  const currentUsername = getCurrentUsername();

  const [activeTab, setActiveTab] = useState("profile");
  
  // UI states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Theme state
  const [theme, setTheme] = useState(localStorage.getItem('data-theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Data states
  const [userData, setUserData] = useState({ 
    username: "", 
    full_name: "", 
    email: "", 
    phone: "", 
    is_2fa_enabled: false 
  });
  
  const [loginActivities, setLoginActivities] = useState([]);

  // Security and profile modal states
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [passwordStep, setPasswordStep] = useState(1); 
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState(""); 
  const [timeLeft, setTimeLeft] = useState(0); 

  // Edit profile modals
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showEditEmailModal, setShowEditEmailModal] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: "", email: "", phone: "" });

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
    } catch (err) { 
      console.error(err); 
    }
  };

  const openEditProfile = () => {
    setEditForm({ ...userData });
    setShowEditProfileModal(true);
  };

  const openEditEmail = () => {
    setEditForm({ ...userData });
    setShowEditEmailModal(true);
  };

  const submitProfileUpdate = async () => {
    setLoading(true);
    try {
      await axios.put(`${API_BASE_URL}/me?username=${currentUsername}`, editForm);
      setUserData(editForm);
      setMessage({ type: "success", text: "Profile updated successfully ✅" });
      setShowEditProfileModal(false);
      setShowEditEmailModal(false);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to update profile" });
    } finally { 
      setLoading(false); 
    }
  };

  // Security logic
  const handleRequestOtp = async () => {
    if (!userData.email) {
      return alert("กรุณาตั้งค่าอีเมลในหน้า Edit Profile ก่อน");
    }

    setShowOtpModal(true); 
    setPasswordStep(1); 
    setIsSendingOtp(true);
    setOtpCode(""); 
    setNewPassword(""); 
    setConfirmPassword("");

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
    if (!otpCode || !newPassword || !confirmPassword) {
      return alert("กรุณากรอกข้อมูลให้ครบ");
    }
    if (newPassword !== confirmPassword) {
      return alert("Passwords do not match!");
    }

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
    } finally { 
      setLoading(false); 
    }
  };

  const handleToggle2FA = async (e) => {
    if (!userData.email) {
      e.preventDefault(); 
      alert("⚠️ กรุณาตั้งค่าอีเมลก่อนเปิดใช้งาน 2FA"); 
      return;
    }

    const newState = e.target.checked;
    try {
      await axios.put(`${API_BASE_URL}/toggle-2fa?username=${currentUsername}`, { enabled: newState });
      setUserData(prev => ({ ...prev, is_2fa_enabled: newState }));
    } catch (error) {
      e.target.checked = !newState; 
    }
  };

  const selectTab = (tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60); 
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const openLoginActivity = async () => {
    setActiveTab("login_activity");
    try {
      const res = await axios.get(`${API_BASE_URL}/login-activity?username=${currentUsername}`);
      setLoginActivities(res.data);
    } catch(e) { 
      console.error("Error fetching activity", e); 
    }
  };

  // Security score calculation
  const calculateSecurity = () => {
    let score = 0;
    let tips = [];

    if (userData.full_name) {
      score += 25;
    } else {
      tips.push("Add Full Name");
    }

    if (userData.phone) {
      score += 25;
    } else {
      tips.push("Add Phone Number");
    }

    if (userData.email) {
      score += 25;
    } else {
      tips.push("Add Email Address");
    }

    if (userData.is_2fa_enabled) {
      score += 25;
    } else {
      tips.push("Enable 2-Factor Auth (2FA)");
    }

    return { score, tips };
  };

  const { score: securityScore, tips: securityTips } = calculateSecurity();
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (securityScore / 100) * circumference;
  const donutColor = securityScore === 100 ? "#10B981" : securityScore >= 50 ? "#F59E0B" : "#EF4444";

  return (
    <div className="settings-page-wrapper">
      
      <div className="mobile-nav-toggle" onClick={() => setIsSidebarOpen(true)}>
         <Menu size={24} className="mobile-menu-icon" />
      </div>
      <div className={`sidebar-overlay ${isSidebarOpen ? 'show' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>

      {/* Sidebar */}
      <div className={`settings-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Settings</h2>
        </div>
        <nav className="sidebar-menu">
          <button onClick={() => selectTab("profile")} className={`menu-btn ${activeTab === "profile" ? "active" : ""}`}>
            <Shield size={18} className="menu-icon" /> My Profile
          </button>
          <button onClick={() => selectTab("security")} className={`menu-btn ${activeTab === "security" || activeTab === "login_activity" ? "active" : ""}`}>
            <Shield size={18} className="menu-icon" /> Security
          </button>
        </nav>
      </div>

      {/* Content area */}
      <div className="settings-content">
        <div className="content-scroll-area">
          <div className="content-inner-wrapper">
            
            {/* Content header */}
            <div className="content-header">
              <div className="content-header-left">
                <div className="header-back-triangle" onClick={() => {
                  if (activeTab === 'login_activity') {
                    setActiveTab('security');
                  } else {
                    navigate('/');
                  }
                }}></div>
                <h2 style={{ display: 'flex', alignItems: 'center' }}>
                  {activeTab === "profile" && "My Profile"}
                  {activeTab === "security" && "Security"}
                  {activeTab === "login_activity" && (
                    <>Security <span className="breadcrumb-arrow">&gt;</span> Login Activity</>
                  )}
                </h2>
              </div>
              <div className="content-header-right">
                <button type="button" className="icon-btn" onClick={toggleTheme} title="Switch Theme">
                  {theme === 'light' ? <FaSun size={20} /> : <FaMoon size={20} />}
                </button>
              </div>
            </div>

            {/* Edit profile tab */}
            {activeTab === "profile" && (
              <div className="fade-in">
                  
                {message.text && (
                  <div className={`alert-message ${message.type}`}>
                    {message.type === "error" && <AlertCircle size={18} />}
                    {message.text}
                  </div>
                )}

                <div className="profile-header-section" style={{marginBottom: '30px'}}>
                  <div className="profile-avatar-wrapper">
                    <div className="profile-avatar">
                      <ImageIcon size={32} color="var(--st-text-secondary)" />
                      <div className="avatar-add-badge">+</div>
                    </div>
                    <div className="profile-info">
                      <h3>@{userData.username || "username"}</h3>
                      <p>Trading Account ID</p>
                    </div>
                  </div>
                </div>

                <div className="profile-main-layout">
                  
                  {/* Left column: Profile info */}
                  <div className="profile-left-col">
                    <div className="settings-card-box read-only-card">
                      <div className="card-header-flex">
                        <h3>Personal Information</h3>
                        <button className="btn-edit-outline" onClick={openEditProfile}>
                          Edit <Edit2 size={14} />
                        </button>
                      </div>
                      <div className="info-grid">
                        <div className="info-item">
                          <span className="info-label">Full Name</span>
                          <span className="info-value">{userData.full_name || '-'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Phone</span>
                          <span className="info-value">{userData.phone || '-'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="settings-card-box read-only-card" style={{marginTop: '20px'}}>
                      <div className="card-header-flex">
                        <h3>Email Address</h3>
                        <button className="btn-edit-outline" onClick={openEditEmail}>
                          Edit <Edit2 size={14} />
                        </button>
                      </div>
                      <div className="info-grid">
                        <div className="info-item">
                          <span className="info-label">Email Address</span>
                          <span className="info-value">{userData.email || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right column: Donut chart */}
                  <div className="profile-right-col">
                    <div className="security-score-card">
                      <h3>Account Security</h3>
                      <p className="score-desc">Keep your account safe by completing all security steps.</p>
                      
                      <div className="donut-chart-container">
                        <svg width="180" height="180" viewBox="0 0 160 160">
                          <circle cx="80" cy="80" r={radius} stroke="var(--st-border-line)" strokeWidth="14" fill="none" />
                          <circle 
                            cx="80" cy="80" r={radius} 
                            stroke={donutColor} 
                            strokeWidth="14" fill="none"
                            strokeDasharray={circumference} 
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round" 
                            style={{ transition: "stroke-dashoffset 1.5s ease-in-out, stroke 0.5s" }}
                            transform="rotate(-90 80 80)" 
                          />
                        </svg>
                        <div className="donut-text">
                          <span className="donut-score" style={{ color: donutColor }}>{securityScore}%</span>
                          <span className="donut-label">Secured</span>
                        </div>
                      </div>

                      <div className="security-tips-section">
                        {securityScore === 100 ? (
                          <div className="security-perfect">
                            <CheckCircle size={20} color="#10B981" />
                            <span>Your account is fully secured!</span>
                          </div>
                        ) : (
                          <>
                            <h4 className="tips-title">Missing Steps:</h4>
                            <ul className="tips-list">
                              {securityTips.map((tip, idx) => (
                                <li key={idx}>
                                  <span className="tip-dot"></span> {tip}
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Security tab */}
            {activeTab === "security" && (
              <div className="fade-in">
                <div className="settings-card-box security-box">
                  
                  <div className="security-item divider" onClick={handleRequestOtp}>
                    <div className="sec-icon-circle"><Key size={20} /></div>
                    <div className="sec-text-content">
                      <h4>Change Password</h4>
                      <p>We'll send a code to your email: {userData.email || "No Email"}</p>
                    </div>
                  </div>

                  <div className="security-item divider" style={{cursor: !userData.email ? 'not-allowed' : 'default'}}>
                    <div className="sec-icon-circle" style={{opacity: !userData.email ? 0.5 : 1}}><Shield size={20} /></div>
                    <div className="sec-text-content" style={{opacity: !userData.email ? 0.5 : 1}}>
                      <h4>Two-Factor Authentication</h4>
                      <p>Add an extra layer of security to your account.</p>
                      {!userData.email && ( 
                        <span className="warning-text">
                          <AlertCircle size={12} style={{marginRight:'4px'}}/> Please set up Email first!
                        </span> 
                      )}
                    </div>
                    <label className="st-toggle-switch" style={{opacity: !userData.email ? 0.5 : 1}}>
                      <input type="checkbox" checked={userData.is_2fa_enabled} onChange={handleToggle2FA} disabled={!userData.email} />
                      <span className="st-slider"></span>
                    </label>
                  </div>

                  <div className="security-item divider" onClick={openLoginActivity}>
                    <div className="sec-icon-circle"><Lock size={20} /></div>
                    <div className="sec-text-content">
                      <h4>Login Activity</h4>
                      <p>See where you're logged in.</p>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Login activity tab */}
            {activeTab === "login_activity" && (
              <div className="fade-in">
                <div className="login-activity-layout">
                      
                  <div className="la-left-card">
                    <Smartphone className="la-huge-icon" size={140} strokeWidth={1} />
                    <h3>Your Device</h3>
                  </div>
                      
                  <div className="la-right-list">
                    {loginActivities.map(act => (
                      <div className="la-item-card" key={act.id}>
                        <div className="la-item-info">
                          <h4>{act.device_name}</h4>
                          <p>{act.location}</p>
                          {act.is_current ? (
                            <span className="current-session">
                              <input type="checkbox" checked readOnly className="current-checkbox" /> Your current session
                            </span>
                          ) : (
                            <span className="session-date">{act.timestamp}</span>
                          )}
                        </div>
                        <ChevronRight size={20} className="la-item-arrow" />
                      </div>
                    ))}
                    {loginActivities.length === 0 && (
                      <div className="text-center" style={{padding: '50px'}}>No records found</div>
                    )}
                  </div>
                      
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Modal: Edit personal information */}
      {showEditProfileModal && (
        <div className="st-modal-overlay">
          <div className="st-modal-box new-modal-style edit-modal-responsive">
            <div className="modal-header-new">
              <h3 className="st-modal-title-new" style={{textAlign: 'left'}}>Personal Information</h3>
              <button className="modal-close-btn" onClick={() => setShowEditProfileModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-form-new" style={{marginTop: '25px'}}>
              <div className="form-group" style={{textAlign: 'left', marginBottom: '20px'}}>
                <label style={{color: 'var(--st-text-primary)'}}>Full Name</label>
                <input 
                  type="text" 
                  className="st-input-plain" 
                  placeholder="e.g. Dave Matthews" 
                  value={editForm.full_name} 
                  onChange={(e) => setEditForm({...editForm, full_name: e.target.value})} 
                />
              </div>
              <div className="form-group" style={{textAlign: 'left', marginBottom: '30px'}}>
                <label style={{color: 'var(--st-text-primary)'}}>Phone</label>
                <input 
                  type="text" 
                  className="st-input-plain" 
                  placeholder="e.g. 081-234-5678" 
                  value={editForm.phone} 
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})} 
                />
              </div>

              <button className="btn-save-blue w-100" onClick={submitProfileUpdate} disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit email address */}
      {showEditEmailModal && (
        <div className="st-modal-overlay">
          <div className="st-modal-box new-modal-style edit-modal-responsive">
            <div className="modal-header-new">
              <h3 className="st-modal-title-new" style={{textAlign: 'left'}}>Email Address</h3>
              <button className="modal-close-btn" onClick={() => setShowEditEmailModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-form-new" style={{marginTop: '25px'}}>
              <div className="form-group" style={{textAlign: 'left', marginBottom: '30px'}}>
                <label style={{color: 'var(--st-text-primary)'}}>Email</label>
                <input 
                  type="email" 
                  className="st-input-plain" 
                  placeholder="name@company.com" 
                  value={editForm.email} 
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})} 
                />
              </div>

              <button className="btn-save-blue w-100" onClick={submitProfileUpdate} disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Change password */}
      {showOtpModal && (
        <div className="st-modal-overlay">
          <div className="st-modal-box new-modal-style">
            {isSendingOtp ? (
              <div className="st-modal-body">
                <div className="st-spinner"></div>
                <p className="mt-3">Sending OTP to {userData.email}...</p>
              </div>
            ) : passwordStep === 1 ? (
              <>
                <h3 className="st-modal-title-new" style={{textAlign: 'center', marginBottom: '10px'}}>Change Password</h3>
                <p className="st-modal-desc-new" style={{textAlign: 'center'}}>
                  Please enter the <b>6-digit code</b><br/>
                  sent to <b>{userData.email}</b>
                </p>

                <div className="forgot-icon-container" style={{margin: '30px 0'}}>
                  <Mail className="forgot-large-icon" size={80} color="var(--st-text-secondary)" style={{opacity: '0.4'}} />
                </div>

                <div className="modal-form-new">
                  <input 
                    type="text" 
                    className="st-otp-input-new" 
                    placeholder="••••••" 
                    maxLength={6} 
                    value={otpCode} 
                    onChange={(e) => setOtpCode(e.target.value.toUpperCase())} 
                  />
                  <div style={{textAlign: 'center', marginTop: '15px', marginBottom: '25px', fontSize: '13px', color: 'var(--st-btn-green)', fontWeight: '600'}}>
                    <span style={{cursor: 'pointer'}} onClick={handleRequestOtp}>Resend Code</span><br/>
                    <span style={{color: 'var(--st-text-secondary)', fontWeight: 'normal'}}>in {formatTime(timeLeft)} mins</span>
                  </div>

                  {timeLeft === 0 && (
                    <p className="timer-error" style={{textAlign: 'center'}}>Code Expired. Please request again.</p>
                  )}

                  <div className="modal-actions-new">
                    <button className="btn-cancel-gray" onClick={() => setShowOtpModal(false)}>Cancel</button>
                    <button 
                      className="btn-save-green" 
                      onClick={() => {
                        if(otpCode.length < 5) alert("Please enter a valid OTP code");
                        else setPasswordStep(2);
                      }} 
                      disabled={timeLeft === 0} 
                      style={{flex: 1}}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="modal-header-new">
                  <button className="modal-back-btn-new" onClick={() => setPasswordStep(1)}>
                    <div className="header-back-triangle" style={{marginRight: '0'}}></div>
                  </button>
                  <h3 className="st-modal-title-new">Change Password</h3>
                  <div style={{width: '24px'}}></div>
                </div>

                <p className="st-modal-desc-new" style={{textAlign: 'center'}}>
                  Your New Password Must Be Different<br/>
                  From Previously Used Password
                </p>

                <div className="forgot-icon-container" style={{margin: '30px 0'}}>
                  <FaSyncAlt className="forgot-large-icon" style={{fontSize: '70px', color: 'var(--st-text-secondary)', opacity: '0.4'}} />
                </div>

                <div className="modal-form-new">
                  <div className="form-group" style={{textAlign: 'left', marginBottom: '15px'}}>
                    <label style={{color: 'var(--st-text-primary)'}}>New Password</label>
                    <div className="st-input-with-icon">
                      <Lock size={16} className="input-icon-left" />
                      <input 
                        type="password" 
                        className="st-input-new" 
                        placeholder="Enter Password" 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{textAlign: 'left', marginBottom: '25px'}}>
                    <label style={{color: 'var(--st-text-primary)'}}>Confirm Password</label>
                    <div className="st-input-with-icon">
                      <Lock size={16} className="input-icon-left" />
                      <input 
                        type="password" 
                        className="st-input-new" 
                        placeholder="Enter Password" 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                      />
                    </div>
                  </div>

                  <button className="btn-save-green w-100" onClick={handleSubmitPassword} disabled={loading}>
                    {loading ? "Saving..." : "Change Password"}
                  </button>
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