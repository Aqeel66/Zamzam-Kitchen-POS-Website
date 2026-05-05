const fs = require('fs');
const path = 'd:/Anti-Gravity Projects/RMS/apps/backend/src/routes/reservations.js';
let content = fs.readFileSync(path, 'utf8');

const newSql = `SELECT t.*, 
        (SELECT COALESCE(SUM(o.party_size), 0) 
         FROM orders o 
         WHERE o.table_id = t.id 
         AND o.status NOT IN ('Paid', 'Cancelled', 'Rejected')) as current_occupancy
      FROM restaurant_tables t
      WHERE t.id NOT IN (
        SELECT table_id FROM reservations 
        WHERE reservation_date = ? 
        AND table_id IS NOT NULL
        AND status NOT IN ('Cancelled', 'No-Show')
        AND (
          (reservation_time <= ? AND ADDTIME(reservation_time, '01:59:00') > ?)
          OR (reservation_time < ADDTIME(?, '01:59:00') AND reservation_time >= ?)
        )
      )
      AND (
        -- If the reservation is for TODAY and the time is CLOSE to now (within 2 hours), 
        -- check if the table is already full from live orders
        NOT (
          ? = CURDATE() 
          AND ? >= SUBTIME(CURTIME(), '02:00:00') 
          AND ? <= ADDTIME(CURTIME(), '02:00:00')
          AND (SELECT COALESCE(SUM(o.party_size), 0) FROM orders o WHERE o.table_id = t.id AND o.status NOT IN ('Paid', 'Cancelled', 'Rejected')) >= t.capacity
        )
      )`;

// We need to pass more parameters now
const oldLine = /const \[tables\] = await db\.execute\(`[\s\S]*?`, \[date, time, time, time, time\]\);/;
const newLine = `const [tables] = await db.execute(\`${newSql}\`, [date, time, time, time, time, date, time, time]);`;

content = content.replace(oldLine, newLine);
fs.writeFileSync(path, content);
console.log('✅ reservations.js refined successfully');
