import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../api/axios';
import { 
    FaLock, FaEnvelopeOpenText, FaSyncAlt, FaAngleLeft, 
    FaCheckCircle, FaEnvelope, FaSun, FaMoon 
} from 'react-icons/fa';
import '../css/ForgotPassword.css';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); 
    
    // States Theme (Light / Dark)
    const [theme, setTheme] = useState(localStorage.getItem('data-theme') || 'light');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('data-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    };

    // States for Forgot Password Flow
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const BASE_URL = "http://localhost:8000/auth";

    const handleRequestOtp = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            await axios.post(`${BASE_URL}/forgot-password`, { email });
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.detail || "Something went wrong.");
        } finally { setLoading(false); }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            await axios.post(`${BASE_URL}/verify-reset-otp`, { email, otp });
            setStep(3);
        } catch (err) {
            setError(err.response?.data?.detail || "Invalid or expired OTP.");
        } finally { setLoading(false); }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match."); return;
        }
        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters."); return;
        }
        setLoading(true); setError('');
        try {
            await axios.post(`${BASE_URL}/reset-password`, { email, otp, new_password: newPassword });
            setStep(4);
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to reset password.");
        } finally { setLoading(false); }
    };

    return (
        <div className="forgot-container">
            <div className="forgot-card">
                
                {/* Header */}
                <div className="forgot-header">
                    {step < 4 ? (
                        <button type="button" className="icon-btn" onClick={() => step === 1 ? navigate('/login') : setStep(step - 1)}>
                            <FaAngleLeft size={22} />
                        </button>
                    ) : <div className="icon-placeholder" />}
                    
                    <h2 className="forgot-title">
                        {step === 1 && "Forgot Password"}
                        {step === 2 && "Reset Password"}
                        {step === 3 && "Create New Password"}
                        {step === 4 && "All done!"}
                    </h2>

                    <button type="button" className="icon-btn" onClick={toggleTheme} title="Switch Theme">
                        {theme === 'light' ? <FaSun size={18} /> : <FaMoon size={18} />}
                    </button>
                </div>

                {/* Subtitle */}
                {step === 1 && <p className="forgot-subtitle">Please enter your email address<br/>to reset your password</p>}
                {step === 2 && <p className="forgot-subtitle">Please enter the 5-digit code<br/>sent to <b>{email}</b></p>}
                {step === 3 && <p className="forgot-subtitle">Your New Password Must Be Different<br/>From Previously Used Password</p>}
                {step === 4 && <p className="forgot-subtitle">Your password has been reset successfully.</p>}

                {step === 1 && <div className="forgot-icon-container"><FaLock className="forgot-large-icon" /></div>}
                {step === 2 && <div className="forgot-icon-container"><FaEnvelopeOpenText className="forgot-large-icon" /></div>}
                {step === 3 && <div className="forgot-icon-container"><FaSyncAlt className="forgot-large-icon" /></div>}
                {step === 4 && <div className="forgot-icon-container"><FaCheckCircle className="forgot-large-icon" style={{color: 'var(--fg-btn-green)'}} /></div>}

                {error && <div className="error-msg-forgot">⚠️ {error}</div>}

                {/* Request OTP */}
                {step === 1 && (
                    <form onSubmit={handleRequestOtp}>
                        <div className="input-group">
                            <label>Email Address</label>
                            <div className="input-wrapper-solid">
                                <FaEnvelope className="input-icon" />
                                <input 
                                    type="email" 
                                    placeholder="Enter email" 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    required 
                                />
                            </div>
                        </div>
                        <button type="submit" className="btn-forgot" disabled={loading}>
                            {loading ? 'Sending...' : 'Continue'}
                        </button>
                        <div className="forgot-footer-link">
                            Back to <Link to="/login">Sign In</Link>
                        </div>
                    </form>
                )}

                {/* Verify OTP */}
                {step === 2 && (
                    <form onSubmit={handleVerifyOtp}>
                        <div className="input-group">
                            <div className="otp-input-wrapper-solid">
                                <input 
                                    type="text" 
                                    className="otp-input-solid" 
                                    placeholder="•••••" 
                                    value={otp} 
                                    onChange={(e) => setOtp(e.target.value)} 
                                    maxLength={5} 
                                    autoFocus 
                                    required 
                                />
                            </div>
                        </div>
                        <div className="forgot-footer-link" style={{marginBottom: '20px'}}>
                            <a href="#" onClick={handleRequestOtp} style={{color: 'var(--fg-text-primary)'}}>Send Code</a>
                        </div>
                        <button type="submit" className="btn-forgot" disabled={loading}>
                            {loading ? 'Verifying...' : 'Verify'}
                        </button>
                        <div className="forgot-footer-link">
                            Back to <Link to="/login">Sign In</Link>
                        </div>
                    </form>
                )}

                {/* Create New Password */}
                {step === 3 && (
                    <form onSubmit={handleResetPassword}>
                        <div className="input-group">
                            <label>New Password</label>
                            <div className="input-wrapper-solid">
                                <FaLock className="input-icon" />
                                <input 
                                    type="password" 
                                    placeholder="Enter Password" 
                                    value={newPassword} 
                                    onChange={(e) => setNewPassword(e.target.value)} 
                                    minLength={8} 
                                    required 
                                />
                            </div>
                        </div>
                        <div className="input-group">
                            <label>Confirm Password</label>
                            <div className="input-wrapper-solid">
                                <FaLock className="input-icon" />
                                <input 
                                    type="password" 
                                    placeholder="Enter Password" 
                                    value={confirmPassword} 
                                    onChange={(e) => setConfirmPassword(e.target.value)} 
                                    minLength={8} 
                                    required 
                                />
                            </div>
                        </div>
                        <button type="submit" className="btn-forgot" disabled={loading}>
                            {loading ? 'Saving...' : 'Continue'}
                        </button>
                    </form>
                )}

                {/* Success */}
                {step === 4 && (
                    <div style={{textAlign: 'center'}}>
                        <Link to="/login" className="btn-forgot" style={{textDecoration: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                            Back to Sign In
                        </Link>
                    </div>
                )}

            </div>
        </div>
    );
};

export default ForgotPassword;