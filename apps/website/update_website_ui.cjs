const fs = require('fs');
const path = 'd:/Anti-Gravity Projects/RMS/apps/website/src/pages/Reservation.tsx';
let content = fs.readFileSync(path, 'utf8');

const newBlock = `<div className="table-number">Table {t.table_number}</div>
                                    <div className="table-capacity">
                                       <span className={\`status-dot \${t.current_occupancy >= t.capacity ? 'full' : t.current_occupancy > 0 ? 'partial' : 'available'}\`}></span>
                                       {t.capacity - (t.current_occupancy || 0)} / {t.capacity} Avail
                                    </div>
                                    <div className="table-icons" style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '8px' }}>
                                       {[...Array(Math.min(t.capacity, 6))].map((_, i) => (
                                          <i key={i} className={\`fas fa-chair \${i < (t.current_occupancy || 0) ? 'occupied' : ''}\`} style={{ fontSize: '10px', color: i < (t.current_occupancy || 0) ? '#ff6b6b' : '#dee2e6' }}></i>
                                       ))}
                                    </div>`;

// Try with more flexible matching (ignoring some whitespace)
const regex = /<div className="table-number">\{t\.table_number\}<\/div>\s*<div className="table-capacity">Seats \{t\.capacity\}<\/div>/;

if (regex.test(content)) {
    content = content.replace(regex, newBlock);
    fs.writeFileSync(path, content);
    console.log('✅ Reservation.tsx updated successfully');
} else {
    console.error('❌ Could not find target block in Reservation.tsx');
    // Try a simpler replace for the capacity part
    const simpleOld = '<div className="table-capacity">Seats {t.capacity}</div>';
    if (content.includes(simpleOld)) {
        content = content.replace(simpleOld, `<div className="table-capacity">
                                       <span className={\`status-dot \${t.current_occupancy >= t.capacity ? 'full' : t.current_occupancy > 0 ? 'partial' : 'available'}\`}></span>
                                       {t.capacity - (t.current_occupancy || 0)} / {t.capacity} Avail
                                    </div>`);
        fs.writeFileSync(path, content);
        console.log('✅ Updated capacity line only');
    }
}
