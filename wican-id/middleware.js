const express = require('express');
// Middleware untuk log (hanya untuk API, bukan untuk file statis)
const requestLogger = (req, res, next) => {
    if (req.url.startsWith('/api/')) {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    }
    next();
};

// Middleware untuk parsing JSON body
const jsonParser = express.json();
const formParser = express.urlencoded({ extended: false });

// Gabungkan semua middleware
const middleware = [
    jsonParser,
    formParser,
    requestLogger,
];

module.exports = middleware;
