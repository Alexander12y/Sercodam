// test-db.js
const db = require('./src/config/database');
db.raw('SELECT 1').then(res => {
  console.log('Conexión OK:', res.rows);
  process.exit(0);
}).catch(err => {
  console.error('Error conexión:', err);
  process.exit(1);
});