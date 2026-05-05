const fs = require('fs');
const path = 'd:/Anti-Gravity Projects/RMS/apps/backend/src/routes/reservations.js';
let content = fs.readFileSync(path, 'utf8');

const oldSql = /SELECT \* FROM restaurant_tables/g;
const newSql = `SELECT t.*, 
        (SELECT COALESCE(SUM(o.party_size), 0) 
         FROM orders o 
         WHERE o.table_id = t.id 
         AND o.status NOT IN ('Paid', 'Cancelled', 'Rejected')) as current_occupancy
      FROM restaurant_tables t`;

content = content.replace(oldSql, newSql);
fs.writeFileSync(path, content);
console.log('✅ reservations.js updated successfully');
