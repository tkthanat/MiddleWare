import { useState, useEffect } from 'react';
import axios from '../api/axios';

export const useSystemStatus = () => {
    const [isSystemOnline, setIsSystemOnline] = useState(false);
    const [isSystemActive, setIsSystemActive] = useState(true);

    const checkHealth = async () => {
        try {
            // Check Connection
            await axios.get('/health/settrade');
            setIsSystemOnline(true);
            
            // Check System Active Status
            const statusRes = await axios.get('/api/system/status');
            setIsSystemActive(statusRes.data.is_active);
        } catch (e) {
            setIsSystemOnline(false);
        }
    };

    const toggleSystem = async () => {
        try {
            const newStatus = !isSystemActive;
            const res = await axios.post('/api/system/status', { 
                is_active: newStatus 
            });
            if (res.data.status === 'success') {
                setIsSystemActive(res.data.is_active);
                return true;
            }
        } catch (e) {
            console.error("Error toggling system:", e);
            alert("Cannot connect to server or Unauthorized.");
            return false;
        }
    };

    useEffect(() => {
        checkHealth();
        const interval = setInterval(checkHealth, 5000);
        return () => clearInterval(interval);
    }, []);

    return { isSystemOnline, isSystemActive, toggleSystem };
};