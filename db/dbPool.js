let mysql = require('mysql');
let dbConfig = require('../db/DBConfig');
let pool = mysql.createPool(dbConfig.mysql);

module.exports = pool;
