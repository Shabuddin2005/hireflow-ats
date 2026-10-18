const mysql = require('mysql2');

const db = mysql.createConnection({
    host : "localhost",
    user : "root",
    password : "shabuddindb",
    database : "ats_db"
});

db.connect((err) => {
    if(err) {
        console.error("MYSQL connection failed:",err.message);
        return;
    }
    console.log("MYSQL connected successfully");
});

module.exports = db;