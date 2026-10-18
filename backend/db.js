const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
    ca: fs.readFileSync(
        fs.existsSync('/etc/secrets/ca.pem')
            ? '/etc/secrets/ca.pem'
            : path.join(__dirname, 'ca.pem'),
        'utf8'
    ),
    rejectUnauthorized: true
}
});

db.connect((err) => {
    if (err) {
        console.error("MYSQL connection failed:", err.message);
        return;
    }

    console.log("MYSQL connected successfully");
});

module.exports = db;
