const path = require('path');

async function handleRequest(req, res) {
    try {
        const now = new Date();
        
        const timeData = {
            seconds: now.getSeconds(),
            minutes: now.getMinutes(),
            hours: now.getHours(),
            day: now.getDate(),
            month: now.getMonth() + 1, // JavaScript month is 0-indexed
            year: now.getFullYear(),
            fullDate: now.toISOString(),
            timestamp: now.getTime()
        };
        
        res.json(timeData);
    } catch (error) {
        console.error('Error in time-date API:', error);
        res.status(500).json({ error: 'Failed to get time data' });
    }
}

module.exports = {
    handleRequest,
    getCurrentTime: () => new Date().toISOString()
};