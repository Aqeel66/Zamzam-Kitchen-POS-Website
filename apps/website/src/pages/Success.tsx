import { CheckCircle, Printer, MessageCircle, Mail, Share2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Success.css';

export default function Success() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const type = queryParams.get('type') || 'order';
  const method = queryParams.get('method');
  const orderData = location.state?.orderData;

  const messages = {
    order: {
       title: "Order Confirmed!",
       desc: "Your delicious meal from Zamzam Kitchen is being prepared."
    },
    reservation: {
       title: "Table Booked!",
       desc: "Your reservation at Zamzam Kitchen is confirmed. We look forward to serving you."
    }
  };

  const content = type === 'reservation' ? messages.reservation : messages.order;

  // Generate Notifications
  const waText = orderData 
    ? `Hello! Your order from Zamzam Kitchen is confirmed. Total: $${orderData.total.toFixed(2)}. We will notify you when it is ready.`
    : `Hello! Your Table Reservation at Zamzam Kitchen is confirmed. We look forward to providing you an amazing dining experience!`;
    
  const waLink = `https://wa.me/?text=${encodeURIComponent(waText)}`;
  const mailLink = `mailto:?subject=Zamzam Kitchen Confirmation&body=${encodeURIComponent(waText)}`;

  const shareReceipt = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Zamzam Kitchen Statement',
          text: waText,
          url: window.location.href,
        });
      } else {
        alert("Web Share API is not supported in this browser.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
    <div className="success-page section-padding no-print">
       <CheckCircle size={90} color="#ff6b35" style={{ marginBottom: '2rem' }} />
       <h1 style={{ fontSize: '3.5rem', marginBottom: '1rem', color: '#111827' }}>{content.title}</h1>
       <p style={{ color: '#4b5563', fontSize: '1.25rem', maxWidth: '600px', marginBottom: '2rem', lineHeight: 1.6 }}>
          {content.desc}
       </p>
       
       <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '2rem', marginBottom: '3rem', width: '100%', maxWidth: '500px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '1.5rem', color: '#111827' }}>Simulate real-time notifications (Backend Required):</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem' }}>
             <a href={waLink} target="_blank" rel="noreferrer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: '#25D366', textDecoration: 'none' }}>
                <MessageCircle size={32} />
                <span style={{ fontWeight: 600, color: '#374151' }}>Test WhatsApp</span>
             </a>
             <a href={mailLink} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: '#3b82f6', textDecoration: 'none' }}>
                <Mail size={32} />
                <span style={{ fontWeight: 600, color: '#374151' }}>Test Email</span>
             </a>
          </div>
          
          {method === 'counter' && type === 'order' && (
             <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb', color: '#ef4444', fontWeight: 600 }}>
                Please proceed to the register upon arrival to complete your payment via Cash or Terminal.
             </div>
          )}
          {method === 'cash' && type === 'order' && (
             <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb', color: '#111827', fontWeight: 500 }}>
                Your order will be shipped shortly. Please pay the driver with exact cash.
             </div>
          )}
       </div>

       <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="btn-primary" onClick={() => navigate('/')} style={{ background: 'var(--primary-orange)', color: 'white', border: 'none', padding: '1rem 2.5rem', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 600, cursor: 'pointer' }}>Return to Home</button>
          
          {orderData && (
             <>
                <button className="btn-outline" onClick={() => window.print()} style={{ background: 'white', color: '#374151', border: '2px solid #e5e7eb', padding: '1rem 2.5rem', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <Printer size={20} /> Download PDF Invoice
                </button>
                <button className="btn-outline" onClick={shareReceipt} style={{ background: 'white', color: '#3b82f6', border: '2px solid #bfdbfe', padding: '1rem 2.5rem', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <Share2 size={20} /> Share Invoice
                </button>
             </>
          )}
       </div>
    </div>

    {/* Printable Invoice Layout (Hidden normally, shown on Print) */}
    {orderData && (
       <div className="print-only invoice-container">
          <div className="invoice-header">
             <h2>ZAMZAM KITCHEN</h2>
             <p>Racecourse Road, VIC, Melbourne</p>
             <p>Ph: (000) 000-0000</p>
             <p>Date: {orderData.date}</p>
             <p><strong>Order Type: {orderData.order_type.toUpperCase()}</strong></p>
             <p><strong>Payment: {orderData.payment_method.toUpperCase()}</strong></p>
          </div>
          <hr className="dashed" />
          <table className="invoice-items">
             <thead>
                <tr>
                   <th style={{textAlign:'left'}}>Item</th>
                   <th style={{textAlign:'center'}}>Qty</th>
                   <th style={{textAlign:'right'}}>Price</th>
                </tr>
             </thead>
             <tbody>
                {orderData.items.map((item: any, i: number) => (
                   <tr key={i}>
                      <td>{item.name}</td>
                      <td style={{textAlign:'center'}}>{item.quantity}</td>
                      <td style={{textAlign:'right'}}>${(item.price * item.quantity).toFixed(2)}</td>
                   </tr>
                ))}
             </tbody>
          </table>
          <hr className="dashed" />
          <div className="invoice-totals">
             <div className="row">
                <span>Subtotal:</span>
                <span>${orderData.subtotal.toFixed(2)}</span>
             </div>
             {orderData.discount > 0 && (
                <div className="row" style={{ color: '#4b5563' }}>
                   <span>Discount:</span>
                   <span>-${orderData.discount.toFixed(2)}</span>
                </div>
             )}
             {orderData.order_type === 'Delivery' && (
                <div className="row">
                   <span>Delivery Fee:</span>
                   <span>${orderData.deliveryFee.toFixed(2)}</span>
                </div>
             )}
             {orderData.tip > 0 && (
                <div className="row">
                   <span>Tip Amount:</span>
                   <span>${orderData.tip.toFixed(2)}</span>
                </div>
             )}
             <div className="row total">
                <span>TOTAL:</span>
                <span>${orderData.total.toFixed(2)}</span>
             </div>
          </div>
          <hr className="dashed" />
          <div className="invoice-footer">
             <p>Thank you for choosing Zamzam Kitchen!</p>
             <p>100% Halal Certified</p>
          </div>
       </div>
    )}
    </>
  );
}
