const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const {log} = require('../sharedFunctions/logFunction')
dotenv.config();

const pool = mysql.createPool({
    connectionLimit: 10,
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
});

pool.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    log('Connected to MYSQL database!', 'info');
    connection.release();
});



module.exports = { pool };
