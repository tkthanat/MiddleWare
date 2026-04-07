import { useState, useEffect } from 'react';
import axios from '../api/axios';
import Swal from 'sweetalert2';

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
        const target = e.target || e; 
        const { name, value, type, checked } = target;

        if (type === 'checkbox') {
            setFormData(prev => ({...prev, [name]: checked}));
            return;
        }
        
        if (['budget_per_trade', 'fixed_volume', 'max_loss_amount'].includes(name)) {
           let numValue = parseFloat(value);
           if (isNaN(numValue) || numValue < 0) numValue = 0;
           setFormData(prev => ({...prev, [name]: numValue}));
        } 
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
        } catch (e) { 
            console.error("Save Config Error:", e); 
            let errorMsg = "เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง";
            if (e.response && e.response.data && e.response.data.detail) {
                errorMsg = e.response.data.detail;
            }
            
            Swal.fire({
                icon: 'error',
                title: 'System Rejected!',
                html: errorMsg,
                width: 600,
                confirmButtonColor: '#0d6efd',
                confirmButtonText: 'รับทราบ',
                customClass: { popup: 'rounded-4 shadow' }
            });
        }
    };

    const handleTestNotification = async () => {
        if (!formData.telegram_bot_token || !formData.telegram_chat_id) {
            Swal.fire({
                icon: 'warning',
                title: 'ข้อมูลไม่ครบ',
                text: 'กรุณากรอก Bot Token และ Chat ID ก่อนกดทดสอบครับ',
                confirmButtonColor: '#0d6efd'
            });
            return;
        }

        try {
            await axios.post('/api/test-telegram', {
                telegram_bot_token: formData.telegram_bot_token,
                telegram_chat_id: formData.telegram_chat_id
            });
            
            setTestMsgStatus(true);
            setTimeout(() => setTestMsgStatus(false), 3000);
            
        } catch (e) {
            Swal.fire({
                icon: 'error',
                title: 'Test Failed!',
                text: 'ไม่สามารถส่งข้อความได้ กรุณาตรวจสอบ Token และ Chat ID อีกครั้ง',
                confirmButtonColor: '#0d6efd'
            });
        }
    };

    return { 
        formData, handleChange, saveSettings, 
        showToast, setShowToast, 
        testMsgStatus, handleTestNotification 
    };
};