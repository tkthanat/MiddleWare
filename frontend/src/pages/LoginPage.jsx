import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { FaLock, FaTimes, FaUser, FaSun, FaMoon } from 'react-icons/fa';
import Logo from '../assets/Logo.png';
import '../css/LoginPage.css';

const LoginPage = () => {
    const navigate = useNavigate();

    // State
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // State for Modal 2FA
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otp, setOtp] = useState('');
    const [otpError, setOtpError] = useState('');
    const [otpLoading, setOtpLoading] = useState(false);

    // State สำหรับ Theme (Light / Dark)
    const [theme, setTheme] = useState(localStorage.getItem('data-theme') || 'light');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('data-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    };

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

            if (res.data.status === 'success') {
                handleLoginSuccess(res.data);
            } 
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
        <div className="login-page-wrapper">
            
            {/* Modal Popup 2FA */}
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

            {/* Main Login Card */}
            <div className={`login-main-card ${showOtpModal ? 'blur-bg' : ''}`}>
                
                {/* Left Side : Branding */}
                <div className="login-left-side">
                    <img src={Logo} alt="Idea Trade Plus" className="ba-brand-logo" />
                </div>

                {/* Right Side : Login Form */}
                <div className="login-right-side">
                    {/* Theme Toggle */}
                    <button type="button" className="ba-theme-toggle" onClick={toggleTheme}>
                        {theme === 'light' ? <FaSun size={18} /> : <FaMoon size={18} />}
                    </button>

                    <div className="ba-form-header">
                        <h2>Sign In</h2>
                        <p>Welcome Back! Please enter your<br/>details to sign in.</p>
                    </div>

                    {error && <div className="error-msg">⚠️ {error}</div>}

                    <form onSubmit={handleLogin} className="ba-login-form">
                        
                        {/* Username Input */}
                        <div className="ba-input-group">
                            <label>Username</label>
                            <div className="ba-input-box">
                                <FaUser className="ba-input-icon" />
                                <input 
                                    type="text" 
                                    placeholder="Enter Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div className="ba-input-group">
                            <label>Password</label>
                            <div className="ba-input-box">
                                <FaLock className="ba-input-icon" />
                                <input 
                                    type="password" 
                                    placeholder="Enter Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    maxLength={50}
                                />
                            </div>
                        </div>

                        {/* Checkbox & Forgot Password */}
                        <div className="ba-form-options">
                            <label className="ba-checkbox-label">
                                <input type="checkbox" /> 
                                <span>Remember Me</span>
                            </label>
                            <Link to="/forgot-password" className="ba-forgot-link">
                                Forgot Password?
                            </Link>
                        </div>

                        {/* Sign In Button*/}
                        <button type="submit" className="ba-btn-submit" disabled={loading}>
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>

                        <div className="ba-register-prompt">
                            Don't have an account? 
                            <Link to="/register" className="ba-signup-link"> Sign Up</Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;