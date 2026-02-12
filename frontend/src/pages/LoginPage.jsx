import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { FaLock, FaTimes } from 'react-icons/fa';
import '../css/LoginPage.css';

const LoginPage = () => {
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // State for Modal 2FA
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otp, setOtp] = useState('');
    const [otpError, setOtpError] = useState('');
    const [otpLoading, setOtpLoading] = useState(false);

    // URL Backend
    const BASE_URL = "http://localhost:8000/auth";

    const handleLoginSuccess = (data) => {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user_data', JSON.stringify(data));
        
        window.location.href = '/'; 
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await axios.post(`${BASE_URL}/login`, { username, password });

            // Status success
            if (res.data.status === 'success') {
                handleLoginSuccess(res.data);
            } 
            // Status 2fa_required
            else if (res.data.status === '2fa_required') {
                setShowOtpModal(true);
                setLoading(false);
            }

        } catch (err) {
            setError(err.response?.data?.detail || "Login failed");
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setOtpLoading(true);
        setOtpError('');

        try {
            const res = await axios.post(`${BASE_URL}/verify-login-otp`, { username, otp });
            
            if (res.data.status === 'success') {
                setShowOtpModal(false);
                handleLoginSuccess(res.data);
            }
        } catch (err) {
            setOtpError(err.response?.data?.detail || "Invalid OTP Code");
            setOtpLoading(false);
        }
    };

    return (
        <div className="login-container">
            
            {/* --- Modal Popup --- */}
            {showOtpModal && (
                <div className="modal-overlay">
                    <div className="modal-content-otp">
                        <button className="modal-close-btn" onClick={() => setShowOtpModal(false)}>
                            <FaTimes />
                        </button>
                        
                        <div className="modal-icon-header">
                            <div className="icon-circle">
                                <FaLock size={24} />
                            </div>
                        </div>

                        <h3 className="modal-title">Two-Factor Authentication</h3>
                        <p className="modal-desc">
                            We've sent a <b>5-digit code</b> to your email.<br/>
                            It expires in <b>1:30 minutes.</b>
                        </p>

                        {otpError && <div className="error-msg-sm">{otpError}</div>}

                        <form onSubmit={handleVerifyOtp}>
                            <div className="otp-input-wrapper">
                                <input 
                                    type="text" 
                                    className="otp-input-field" 
                                    placeholder="• • • • •"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    maxLength={5}
                                    autoFocus
                                />
                            </div>

                            <button type="submit" className="btn-verify" disabled={otpLoading}>
                                {otpLoading ? 'Verifying...' : 'Verify & Login'}
                            </button>
                        </form>
                        
                        <div className="resend-link">
                            Didn't receive code? <span>Resend</span>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Login Card --- */}
            <div className={`login-card ${showOtpModal ? 'blur-bg' : ''}`}>
                <div className="login-image-section">
                    <div className="brand-logo">
                        <div className="brand-circle"></div>
                        MIDDLEWARE
                    </div>
                    <img 
                        src="https://cdn.dribbble.com/users/1660738/screenshots/15467471/media/2e5e485a676b745437996c9c61453256.jpg?compress=1&resize=800x600" 
                        alt="Login Cover" 
                        className="login-bg-image"
                    />
                </div>

                <div className="login-form-section">
                    <div className="welcome-header">
                        <h2 className="welcome-title">Welcome Back</h2>
                        <p className="welcome-subtitle">Please enter your details to sign in.</p>
                    </div>

                    {error && <div className="error-msg">⚠️ {error}</div>}

                    <form onSubmit={handleLogin}>
                        <div className="input-group">
                            <label className="input-label">Username</label>
                            <input 
                                type="text" 
                                className="input-field" 
                                placeholder="Enter your username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Password</label>
                            <input 
                                type="password" 
                                className="input-field" 
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-options">
                            <label style={{display:'flex', gap:'8px', cursor:'pointer', alignItems:'center'}}>
                                <input type="checkbox" style={{cursor:'pointer'}} /> 
                                <span>Remember me</span>
                            </label>
                            <span className="register-link">Forgot Password?</span>
                        </div>

                        <button type="submit" className="btn-login-ref" disabled={loading}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>

                        <div style={{textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#6b7280'}}>
                            Don't have an account? 
                            <Link to="/register" style={{color: '#2563eb', fontWeight: '600', textDecoration: 'none', marginLeft: '5px'}}>
                                Create Account
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;