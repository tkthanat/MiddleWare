import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
    FaLock, FaEnvelopeOpenText, FaSyncAlt, 
    FaArrowLeft, FaCheckCircle, FaEnvelope, FaKey 
} from 'react-icons/fa';
import '../css/ForgotPassword.css';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); 
    
    // States
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
                
                {/* Top Bar (Back Button) */}
                {step < 4 && (
                    <div className="forgot-top-bar">
                        <button className="back-btn" onClick={() => step === 1 ? navigate('/login') : setStep(step - 1)}>
                            <FaArrowLeft />
                        </button>
                    </div>
                )}

                {/* Request OTP */}
                {step === 1 && (
                    <>
                        <div className="forgot-icon-container">
                            <FaLock className="forgot-large-icon" />
                        </div>
                        <h2 className="forgot-title">Forgot Password</h2>
                        <p className="forgot-subtitle">Please enter your email address<br/>to reset your password</p>
                        
                        {error && <div className="error-msg-forgot">⚠️ {error}</div>}
                        
                        <form onSubmit={handleRequestOtp}>
                            <div className="input-wrapper-solid">
                                <FaEnvelope color="#9ca3af" />
                                <input 
                                    type="email" 
                                    placeholder="Email Address" 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    required 
                                />
                            </div>
                            <button type="submit" className="btn-forgot" disabled={loading}>
                                {loading ? 'Sending...' : 'Continue'}
                            </button>
                        </form>
                        <div className="forgot-footer-link">
                            <Link to="/login">Back to Sign in</Link>
                        </div>
                    </>
                )}

                {/* Verify OTP */}
                {step === 2 && (
                    <>
                        <div className="forgot-icon-container">
                            <FaEnvelopeOpenText className="forgot-large-icon" />
                        </div>
                        <h2 className="forgot-title">Reset Password</h2>
                        <p className="forgot-subtitle">Please enter the 5-digit code<br/>sent to <b>{email}</b></p>
                        
                        {error && <div className="error-msg-forgot">⚠️ {error}</div>}
                        
                        <form onSubmit={handleVerifyOtp}>
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
                            <div className="forgot-footer-link" style={{marginBottom: '20px', fontSize: '13px'}}>
                                <a href="#" onClick={handleRequestOtp}>Send Code Again</a>
                            </div>
                            <button type="submit" className="btn-forgot" disabled={loading}>
                                {loading ? 'Verifying...' : 'Verify'}
                            </button>
                        </form>
                    </>
                )}

                {/* Create New Password */}
                {step === 3 && (
                    <>
                        <div className="forgot-icon-container">
                            <FaSyncAlt className="forgot-large-icon" />
                        </div>
                        <h2 className="forgot-title">Create New Password</h2>
                        <p className="forgot-subtitle">Your New Password Must Be Different<br/>From Previously Used Password</p>
                        
                        {error && <div className="error-msg-forgot">⚠️ {error}</div>}
                        
                        <form onSubmit={handleResetPassword}>
                            <div className="input-wrapper-solid">
                                <FaKey color="#9ca3af" />
                                <input 
                                    type="password" 
                                    placeholder="New Password" 
                                    value={newPassword} 
                                    onChange={(e) => setNewPassword(e.target.value)} 
                                    minLength={8} 
                                    required 
                                />
                            </div>
                            <div className="input-wrapper-solid">
                                <FaLock color="#9ca3af" />
                                <input 
                                    type="password" 
                                    placeholder="Confirm Password" 
                                    value={confirmPassword} 
                                    onChange={(e) => setConfirmPassword(e.target.value)} 
                                    minLength={8} 
                                    required 
                                />
                            </div>
                            <button type="submit" className="btn-forgot" disabled={loading}>
                                {loading ? 'Saving...' : 'Continue'}
                            </button>
                        </form>
                    </>
                )}

                {/* Success */}
                {step === 4 && (
                    <div style={{textAlign: 'center', padding: '20px 0'}}>
                        <div className="forgot-icon-container" style={{marginBottom: '30px'}}>
                            <FaCheckCircle style={{fontSize: '80px', color: '#16a34a'}} />
                        </div>
                        <h2 className="forgot-title mb-2">All done!</h2>
                        <p className="forgot-subtitle" style={{marginBottom: '40px'}}>Your password has been reset successfully.</p>
                        <Link to="/login" className="btn-forgot" style={{textDecoration: 'none', display: 'inline-block', boxSizing: 'border-box'}}>
                            Back to Sign in
                        </Link>
                    </div>
                )}

            </div>
        </div>
    );
};

export default ForgotPassword;