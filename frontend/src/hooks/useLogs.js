import { useState, useEffect } from 'react';
import axios from 'axios';

export const useLogs = () => {
    const [logs, setLogs] = useState([]);
    const [filterType, setFilterType] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 3000);
        return () => clearInterval(interval);
    }, []);

    const fetchLogs = async () => {
        try {
            const res = await axios.get('http://localhost:8000/api/logs');
            setLogs(res.data);
        } catch (error) { console.error(error); }
    };

    // Date Utility
    const isSameDate = (date1, date2) => {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    };

    // Date Filter Logic
    const dateFilteredLogs = logs.filter(log => {
        const logDate = new Date(log.timestamp.replace(' ', 'T'));
        const today = new Date();
        
        if (filterType === 'ALL') return true;
        
        if (filterType === 'TODAY') {
            return isSameDate(logDate, today);
        }

        if (filterType === 'YESTERDAY') {
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            return isSameDate(logDate, yesterday);
        }

        if (filterType === 'LAST_7_DAYS') {
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(today.getDate() - 7);
            return logDate >= sevenDaysAgo && logDate <= today; 
        }

        return true;
    });

    // Search Filter Logic
    const finalLogs = dateFilteredLogs.filter(log => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return log.timestamp.includes(term) || log.symbol.toLowerCase().includes(term);
    });

    // Summary Calculation
    const logsForSummary = dateFilteredLogs; 

    const summary = {
        total: logsForSummary.length,
        success: logsForSummary.filter(l => l.status === 'SUCCESS').length,
        failed: logsForSummary.filter(l => l.status === 'ERROR' || l.status === 'REJECTED').length,
        skipped: logsForSummary.filter(l => l.status === 'SKIPPED').length
    };

    // Pagination Logic
    const totalPages = Math.ceil(finalLogs.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentLogs = finalLogs.slice(indexOfFirstItem, indexOfLastItem);
    const emptyRows = itemsPerPage - currentLogs.length;

    const handleSearch = (term) => {
        setSearchTerm(term);
        setCurrentPage(1);
    };

    const handleFilterChange = (type) => {
        setFilterType(type);
        setCurrentPage(1);
    };

    return {
        summary,
        currentLogs,
        emptyRows,
        currentPage,
        setCurrentPage,
        totalPages,
        searchTerm,
        handleSearch,
        filterType,
        handleFilterChange
    };
};