import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../api/axios';
import '../css/RegisterPage.css';

const RegisterPage = () => {
    const navigate = useNavigate();
    
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
        <div className="register-container">
            <div className="register-card">
                
                {/* Form (Left) */}
                <div className="register-form-section">
                    <div className="welcome-header">
                        <h2 className="welcome-title">Create Account</h2>
                        <p className="welcome-subtitle">Join us to start automated trading.</p>
                    </div>

                    {error && <div className="error-msg">⚠️ {error}</div>}

                    <form onSubmit={handleSubmit}>
                        {/* Full Name */}
                        <div className="input-group">
                            <label className="input-label">Full Name</label>
                            <input 
                                type="text" 
                                className="input-field" 
                                placeholder="Enter your name"
                                value={formData.full_name}
                                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                            />
                        </div>

                        {/* Username */}
                        <div className="input-group">
                            <label className="input-label">Username</label>
                            <input 
                                type="text" 
                                className="input-field" 
                                placeholder="Enter your username"
                                value={formData.username}
                                onChange={(e) => setFormData({...formData, username: e.target.value})}
                                required
                            />
                        </div>

                        {/* Email */}
                        <div className="input-group">
                            <label className="input-label">Email Address</label>
                            <input 
                                type="email" 
                                className="input-field" 
                                placeholder="name@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                required
                            />
                        </div>

                        {/* Phone Number */}
                        <div className="input-group">
                            <label className="input-label">Phone Number</label>
                            <input 
                                type="tel" 
                                className="input-field" 
                                placeholder="08X-XXX-XXXX"
                                value={formData.phone}
                                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            />
                        </div>

                        {/* Password & Confirm */}
                        <div style={{display: 'flex', gap: '20px'}}>
                            <div className="input-group" style={{flex: 1}}>
                                <label className="input-label">Password</label>
                                <input 
                                    type="password" 
                                    className="input-field" 
                                    placeholder="••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="input-group" style={{flex: 1}}>
                                <label className="input-label">Confirm</label>
                                <input 
                                    type="password" 
                                    className="input-field" 
                                    placeholder="••••••"
                                    value={formData.confirm_password}
                                    onChange={(e) => setFormData({...formData, confirm_password: e.target.value})}
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" className="btn-login-ref" disabled={loading}>
                            {loading ? 'Creating Account...' : 'Register Now'}
                        </button>

                        <div style={{textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#6b7280'}}>
                            Already have an account? 
                            <Link to="/login" style={{color: '#2563eb', fontWeight: '600', textDecoration: 'none', marginLeft: '5px'}}>
                                Sign In
                            </Link>
                        </div>
                    </form>
                </div>

                {/* IMG (Right) */}
                <div className="register-image-section">
                    <div className="brand-logo">
                        <div className="brand-circle"></div>
                        MIDDLEWARE
                    </div>
                    <img 
                        src="https://cdn.dribbble.com/users/1660738/screenshots/15467471/media/2e5e485a676b745437996c9c61453256.jpg?compress=1&resize=800x600" 
                        alt="Register Cover" 
                        className="register-bg-image"
                    />
                </div>

            </div>
        </div>
    );
};

export default RegisterPage;