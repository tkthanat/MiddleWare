import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../api/axios';
import { FaUser, FaLock, FaEnvelope, FaPhone, FaIdCard, FaSun, FaMoon } from 'react-icons/fa';
import Logo from '../assets/Logo.png';
import '../css/RegisterPage.css';

const RegisterPage = () => {
    const navigate = useNavigate();
    
    // State
    const [formData, setFormData] = useState({ 
        full_name: '', 
        username: '', 
        email: '', 
        phone: '', 
        password: '', 
        confirm_password: '' 
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // State สำหรับ Theme (Light / Dark)
    const [theme, setTheme] = useState(localStorage.getItem('data-theme') || 'light');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('data-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    };

    // Function Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirm_password) {
            setError("Passwords do not match!");
            return;
        }

        setLoading(true);
        try {
            await axios.post('/auth/register', {
                username: formData.username,
                password: formData.password,
                full_name: formData.full_name,
                email: formData.email,
                phone: formData.phone
            });

            alert("Registration Successful! Please Login.");
            navigate('/login');

        } catch (err) {
            setError(err.response?.data?.detail || "Registration Failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-page-wrapper">
            <div className="register-main-card">
                
                {/* ฝั่งซ้าย: การ์ดสีขาวสำหรับฟอร์ม (ลอยอยู่ด้านใน) */}
                <div className="reg-form-panel">
                    
                    {/* ปุ่ม Theme Toggle อยู่มุมขวาบนของการ์ดขาว */}
                    <button type="button" className="reg-theme-toggle" onClick={toggleTheme}>
                        {theme === 'light' ? <FaSun size={18} /> : <FaMoon size={18} />}
                    </button>

                    <div className="reg-form-header">
                        <h2>Sign Up</h2>
                        <p>Join us! to start automated<br/>trading.</p>
                    </div>

                    {error && <div className="reg-error-msg">⚠️ {error}</div>}

                    <form onSubmit={handleSubmit} className="reg-form">
                        
                        <div className="reg-input-group">
                            <label>Full Name</label>
                            <div className="reg-input-box">
                                <FaIdCard className="reg-input-icon" />
                                <input 
                                    type="text" 
                                    placeholder="Enter Full Name"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                                    required
                                />
                            </div>
                        </div>

                        <div className="reg-input-group">
                            <label>Username</label>
                            <div className="reg-input-box">
                                <FaUser className="reg-input-icon" />
                                <input 
                                    type="text" 
                                    placeholder="Enter Username"
                                    value={formData.username}
                                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                                    required
                                />
                            </div>
                        </div>

                        <div className="reg-input-group">
                            <label>Email Address</label>
                            <div className="reg-input-box">
                                <FaEnvelope className="reg-input-icon" />
                                <input 
                                    type="email" 
                                    placeholder="Enter email" /* เป๊ะตามภาพ Ref (e เล็ก) */
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    required
                                />
                            </div>
                        </div>

                        <div className="reg-input-group">
                            <label>Phone Number</label>
                            <div className="reg-input-box">
                                <FaPhone className="reg-input-icon" style={{transform: 'scaleX(-1)'}} />
                                <input 
                                    type="tel" 
                                    placeholder="Enter Phone Number"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                />
                            </div>
                        </div>

                        {/* Password & Confirm Password แบบแบ่งครึ่งซ้ายขวา */}
                        <div className="reg-row-inputs">
                            <div className="reg-input-group">
                                <label>Password</label>
                                <div className="reg-input-box">
                                    <FaLock className="reg-input-icon" />
                                    <input 
                                        type="password" 
                                        placeholder="Enter Password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                                        required
                                        maxLength={50}
                                    />
                                </div>
                            </div>

                            <div className="reg-input-group">
                                <label>Confirm Password</label>
                                <div className="reg-input-box">
                                    <FaLock className="reg-input-icon" />
                                    <input 
                                        type="password" 
                                        placeholder="Enter Password"
                                        value={formData.confirm_password}
                                        onChange={(e) => setFormData({...formData, confirm_password: e.target.value})}
                                        required
                                        maxLength={50}
                                    />
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="reg-btn-submit" disabled={loading}>
                            {loading ? 'Signing Up...' : 'Sign Up'}
                        </button>

                        <div className="reg-login-prompt">
                            Already have an account? <Link to="/login" className="reg-signin-link">Sign In</Link>
                        </div>
                    </form>
                </div>

                {/* ฝั่งขวา: พื้นที่วางโลโก้ */}
                <div className="reg-logo-panel">
                    <img src={Logo} alt="Idea Trade Plus" className="reg-brand-logo" />
                </div>

            </div>
        </div>
    );
};

export default RegisterPage;