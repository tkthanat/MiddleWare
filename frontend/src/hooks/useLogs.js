import { useState, useEffect } from 'react';
import axios from '../api/axios';

export const useLogs = () => {
    const [logs, setLogs] = useState([]);
    const [filterType, setFilterType] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [summaryFilter, setSummaryFilter] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 3000);
        return () => clearInterval(interval);
    }, []);

    const fetchLogs = async () => {
        try {
            const res = await axios.get('/api/system/logs');
            setLogs(res.data);
        } catch (error) { 
            console.error("Fetch Logs Error:", error); 
        }
    };

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

    const logsForSummary = dateFilteredLogs; 

    const summary = {
        total: logsForSummary.length,
        success: logsForSummary.filter(l => {
            const s = (l.status || '').toUpperCase();
            return s === 'SUCCESS' || s === 'MATCHED';
        }).length,
        failed: logsForSummary.filter(l => {
            const s = (l.status || '').toUpperCase();
            return s === 'ERROR' || s === 'REJECTED' || s === 'FAILED';
        }).length,
        skipped: logsForSummary.filter(l => {
            const s = (l.status || '').toUpperCase();
            return s === 'SKIPPED' || s === 'CANCELLED' || s === 'SUBMITTED' || s === 'QUEUED';
        }).length
    };

    // Summary Card Filter & Search Logic
    const finalLogs = dateFilteredLogs.filter(log => {
        if (summaryFilter !== 'ALL') {
            const s = (log.status || '').toUpperCase();
            if (summaryFilter === 'SUCCESS' && !(s === 'SUCCESS' || s === 'MATCHED')) return false;
            if (summaryFilter === 'FAILED' && !(s === 'ERROR' || s === 'REJECTED' || s === 'FAILED')) return false;
            if (summaryFilter === 'SKIPPED' && !(s === 'SKIPPED' || s === 'CANCELLED' || s === 'SUBMITTED' || s === 'QUEUED')) return false;
        }

        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return log.timestamp.includes(term) || log.symbol.toLowerCase().includes(term);
    });

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

    const handleSummaryFilter = (type) => {
        setSummaryFilter(type);
        setCurrentPage(1);
    };

    const exportCSV = () => {
        if (finalLogs.length === 0) return alert("No data to export!");
        const headers = ["Date", "Time", "Symbol", "Action", "Volume", "Price", "Status", "Reason"];
        const csvRows = finalLogs.map(log => {
            const [datePart, timePart] = log.timestamp.split(' ');
            return [
                datePart,
                timePart,
                log.symbol,
                log.action,
                log.volume,
                log.price,
                log.status,
                `"${(log.detail || '').replace(/"/g, '""')}"` 
            ].join(',');
        });
        
        const csvContent = [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Trade_Logs_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
        handleFilterChange,
        summaryFilter,
        handleSummaryFilter,
        refreshLogs: fetchLogs,
        exportCSV
    };
};