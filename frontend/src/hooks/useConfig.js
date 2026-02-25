import { useState, useEffect } from 'react';
import axios from '../api/axios';

export const useConfig = () => {
    // Initial State
    const [formData, setFormData] = useState({
        app_id: '',
        app_secret: '',
        broker_id: 'SANDBOX',
        app_code: 'SANDBOX',
        is_sandbox: true,
        webhook_token: '',
        account_no: '', 
        derivatives_account: '',
        active_symbols: '',
        pin: '', 
        trade_mode: 'AMOUNT', 
        budget_per_trade: 0,
        fixed_volume: 0, 
        telegram_bot_token: '', 
        telegram_chat_id: '',
        is_max_loss_active: false, 
        max_loss_amount: 0
    });
    
    const [showToast, setShowToast] = useState(false);
    const [testMsgStatus, setTestMsgStatus] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try { 
                const res = await axios.get('/api/settings');
                if (res.data) {
                    setFormData(prev => ({
                        ...prev,
                        ...res.data 
                    }));
                }
            } catch (e) { console.error("Load Config Error:", e); }
        };
        fetchSettings();
    }, []);

    // Input Config
    const handleChange = (e) => {
        // รองรับทั้ง Event จริง และ Mock Event จาก ApiConnectionForm
        const target = e.target || e; 
        const { name, value, type, checked } = target;

        if (type === 'checkbox') {
            setFormData(prev => ({...prev, [name]: checked}));
            return;
        }
        
        // จัดการตัวเลข
        if (['budget_per_trade', 'fixed_volume', 'max_loss_amount'].includes(name)) {
           let numValue = parseFloat(value);
           if (isNaN(numValue) || numValue < 0) numValue = 0;
           setFormData(prev => ({...prev, [name]: numValue}));
        } 
        // จัดการ Text และ Boolean (โหมด Sandbox)
        else {
           setFormData(prev => ({...prev, [name]: value}));
        }
    };

    // Save
    const saveSettings = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/settings', formData);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } catch (e) { console.error("Save Config Error:", e); }
    };

    const handleTestNotification = () => {
        setTestMsgStatus(true);
        setTimeout(() => setTestMsgStatus(false), 3000);
    };

    return { 
        formData, handleChange, saveSettings, 
        showToast, setShowToast, 
        testMsgStatus, handleTestNotification 
    };
};