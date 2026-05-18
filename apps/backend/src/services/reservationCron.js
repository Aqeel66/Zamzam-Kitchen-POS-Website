const db = require('../db');

async function checkAndVacateNoShowReservations() {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Find all reservations that have passed their grace period (15 minutes past reservation_time today, or any past dates)
    // and are still 'Pending' or 'Confirmed'
    const [noShowReservations] = await connection.execute(`
      SELECT id, table_id 
      FROM reservations 
      WHERE status IN ('Pending', 'Confirmed')
        AND (
          reservation_date < CURDATE()
          OR (
            reservation_date = CURDATE()
            AND ADDTIME(reservation_time, '00:15:00') < CURTIME()
          )
        )
    `);

    if (noShowReservations.length > 0) {
      console.log(`⏰ [CRON] Found ${noShowReservations.length} reservations past grace period. Marking as No-Show...`);
      
      const idsToUpdate = noShowReservations.map(r => r.id);
      
      // Update their status to 'No-Show'
      // We can use placeholders dynamically
      const placeholders = idsToUpdate.map(() => '?').join(',');
      await connection.execute(`
        UPDATE reservations 
        SET status = 'No-Show' 
        WHERE id IN (${placeholders})
      `, idsToUpdate);

      // 2. Release tables associated with these reservations
      // We must only release a table if there are no OTHER active dine-in orders or reservations on it
      for (const res of noShowReservations) {
        const [resTables] = await connection.execute('SELECT table_id FROM reservation_tables WHERE reservation_id = ?', [res.id]);
        const releaseTableIds = resTables.length > 0 ? resTables.map(rt => rt.table_id) : (res.table_id ? [res.table_id] : []);

        for (const tId of releaseTableIds) {
          const [activeOrders] = await connection.execute(
            'SELECT o.id FROM orders o LEFT JOIN order_tables ot ON o.id = ot.order_id WHERE (ot.table_id = ? OR (o.table_id = ? AND ot.table_id IS NULL)) AND o.status NOT IN ("Paid", "Cancelled", "Rejected")',
            [tId, tId]
          );
          if (activeOrders.length === 0) {
            await connection.execute(
              'UPDATE restaurant_tables SET status = "Available" WHERE id = ?',
              [tId]
            );
          }
        }
      }
      console.log(`✅ [CRON] Successfully updated ${noShowReservations.length} reservations to No-Show.`);
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    console.error('❌ [CRON] Error in checkAndVacateNoShowReservations:', err);
  } finally {
    connection.release();
  }
}

function startReservationCron() {
  console.log('⏰ [CRON] Reservation auto-no-show background worker initialized (Grace period: 15 mins, Interval: 5 mins)');
  // Run immediately on boot
  checkAndVacateNoShowReservations();
  // Run every 5 minutes
  setInterval(checkAndVacateNoShowReservations, 5 * 60 * 1000);
}

module.exports = {
  checkAndVacateNoShowReservations,
  startReservationCron
};
