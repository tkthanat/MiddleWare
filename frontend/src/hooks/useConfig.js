import { useState, useEffect } from 'react';
import axios from 'axios';

export const useConfig = () => {
    const [formData, setFormData] = useState({
        account_no: '', pin: '', trade_mode: 'AMOUNT', budget_per_trade: 0,
        fixed_volume: 0, telegram_bot_token: '', telegram_chat_id: '',
        is_max_loss_active: false, max_loss_amount: 0
    });
    
    const [showToast, setShowToast] = useState(false);
    const [testMsgStatus, setTestMsgStatus] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try { 
                const res = await axios.get('http://localhost:8000/api/settings'); 
                setFormData(res.data); 
            } catch (e) { console.error(e); }
        };
        fetchSettings();
    }, []);

    // Input Config
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({...prev, [name]: checked}));
            return;
        }
        if (['budget_per_trade', 'fixed_volume', 'max_loss_amount'].includes(name)) {
           let numValue = parseFloat(value);
           if (isNaN(numValue) || numValue < 0) numValue = 0;
           setFormData(prev => ({...prev, [name]: numValue}));
        } else {
           setFormData(prev => ({...prev, [name]: value}));
        }
    };

    // Save
    const saveSettings = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:8000/api/settings', formData);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } catch (e) { console.error(e); }
    };

    // Test Notification
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