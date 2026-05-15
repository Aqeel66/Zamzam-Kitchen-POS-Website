import { CheckCircle, Printer, MessageCircle, Mail, Share2, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { API_BASE_URL, resolveImageUrl } from '../config';
import './Success.css';

export default function Success() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const type = queryParams.get('type') || 'order';
  const method = queryParams.get('method');
  const orderData = location.state?.orderData;

  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/settings`)
      .then(res => res.json())
      .then(data => {
        setSettings(data);
      })
      .catch(err => console.error("Error fetching settings:", err));
  }, []);

  const tenant = settings?.tenant || {};
  const branch = settings?.branch || {};
  const rawCurrency = tenant.currency || '$';
  const currencyDisplay = rawCurrency === '$' ? 'AUD' : rawCurrency;

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

  // Generate Action Links
  const orderSummaryText = orderData 
    ? `Hello! My order #${orderData.order_number || orderData.id} from Zamzam Kitchen is confirmed. Total: ${currencyDisplay}${orderData.total.toFixed(2)}. Check it here: ${window.location.href}`
    : `Hello! My Table Reservation at Zamzam Kitchen is confirmed. Looking forward to it!`;
    
  const waLink = `https://wa.me/?text=${encodeURIComponent(orderSummaryText)}`;
  const mailLink = `mailto:?subject=Zamzam Kitchen Invoice #${orderData?.order_number || 'Order'}&body=${encodeURIComponent(orderSummaryText)}`;

  const shareReceipt = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Zamzam Kitchen Invoice',
          text: orderSummaryText,
          url: window.location.href,
        });
      } else {
        alert("Sharing is not supported on this browser.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = () => {
    const element = document.querySelector('.invoice-container');
    if (!element) return;

    // Direct download using html2pdf if available, else fallback to print
    const orderNum = orderData?.order_number || orderData?.id || 'Order';
    const finalFilename = orderNum.startsWith('#') ? orderNum : `#${orderNum}`;

    const opt = {
      margin:       [0, 0],
      filename:     `${finalFilename}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false, scrollX: 0, scrollY: 0 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' },
      pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };

    const generate = () => {
      (window as any).html2pdf().from(element).set(opt).save();
    };

    // Check if html2pdf is already loaded
    if (window.hasOwnProperty('html2pdf')) {
      generate();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = generate;
      document.head.appendChild(script);
    }
  };

  return (
    <>
    <div className="success-page section-padding no-print">
       <CheckCircle size={70} color="#ff6b35" className="success-icon" />
       <h1 className="success-title">{content.title}</h1>
       <p className="success-desc">{content.desc}</p>
       
       <div className="invoice-actions-bar">
          <button className="action-btn download" onClick={handleDownload}>
            <Printer size={20} />
            <span>Download PDF</span>
          </button>
          
          <a href={waLink} target="_blank" rel="noreferrer" className="action-btn whatsapp">
            <MessageCircle size={20} />
            <span>WhatsApp</span>
          </a>

          <a href={mailLink} className="action-btn email">
            <Mail size={20} />
            <span>Email</span>
          </a>

          <button className="action-btn share" onClick={shareReceipt}>
            <Share2 size={20} />
            <span>Share</span>
          </button>
       </div>

       {method === 'counter' && type === 'order' && (
          <div className="payment-notice">
             <p>Please proceed to the register upon arrival to complete your payment.</p>
          </div>
       )}

       <div className="success-footer" style={{ marginTop: '1rem' }}>
          <button className="btn-primary home-btn" onClick={() => navigate('/')} style={{ padding: '0.75rem 2rem' }}>
             <ArrowLeft size={18} />
             Return to Home
          </button>
       </div>
    </div>

    {/* Live Invoice Preview (Centralized Unified Format) */}
    {orderData && (
       <div className="invoice-preview-wrapper">
          <div className="invoice-container" id="professional-invoice">
             <header className="invoice-header">
            <div className="header-top">
              <div className="brand-section">
                {tenant.logo_url ? (
                  <div className="invoice-logo">
                    <img src={resolveImageUrl(tenant.logo_url)} alt={tenant.restaurant_name} />
                  </div>
                ) : (
                  <h1 className="business-name-fallback">{tenant.restaurant_name || 'ZAMZAM KITCHEN'}</h1>
                )}
                <div className="business-info">
                  <h2 className="business-name-caps">{(tenant.business_name || tenant.restaurant_name || 'Zamzam Kitchen').toUpperCase()}</h2>
                  {tenant.business_address && <p className="business-detail">{tenant.business_address}</p>}
                  <p className="business-detail">
                    {tenant.business_phone && <span>Tel: {tenant.business_phone}</span>}
                    {tenant.business_phone && tenant.business_email ? ' | ' : ''}
                    {tenant.business_email && <span>Email: {tenant.business_email}</span>}
                  </p>
                </div>
              </div>

              <div className="header-right">
                {(branch.secondary_logo_url || tenant.secondary_logo_url) && (
                  <div className="invoice-secondary-logo">
                    <img src={resolveImageUrl(branch.secondary_logo_url || tenant.secondary_logo_url)} alt="Halal Certification" />
                  </div>
                )}
                <div className="invoice-meta">
                  <h1 className="invoice-title">{type === 'reservation' ? 'BOOKING RECEIPT' : 'INVOICE'}</h1>
                  <div className="badge-container">
                    <span className="origin-badge">WEBSITE SYSTEM</span>
                    <span className={`status-badge-alt ${(orderData.status || 'PAID').toUpperCase()}`}>{(orderData.status || 'PAID').toUpperCase()}</span>
                  </div>
                  <p className="meta-row"><strong>Order No:</strong> {orderData.order_number?.startsWith('#') ? orderData.order_number : `#${orderData.order_number || orderData.id}`}</p>
                  <p className="meta-row"><strong>Date:</strong> {new Date(orderData.date || orderData.order_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            </div>
            
            <div className="invoice-divider-main"></div>
          </header>

          <section className="bill-to-section">
            <h3 className="section-title">BILL TO:</h3>
            <p className="customer-name">{orderData.customer_name || 'Valued Customer'}</p>
            <p className="order-type">Order Type: {orderData.order_type || (type === 'reservation' ? 'Reservation' : 'Takeaway')}</p>
            {orderData.table_number && <p className="order-type">Table: {orderData.table_number}</p>}
          </section>

          <table className="invoice-table">
            <thead>
              <tr>
                <th>DESCRIPTION</th>
                <th>QTY</th>
                <th>UNIT PRICE</th>
                <th>SUBTOTAL</th>
              </tr>
            </thead>
            <tbody>
              {orderData.items.map((item: any, i: number) => (
                <tr key={i}>
                  <td>
                    <div className="item-name" style={{ fontWeight: 700 }}>{item.name}</div>
                    {item.variants && item.variants.map((v: any, vi: number) => (
                      <div key={vi} className="item-modifier">- {v.name}</div>
                    ))}
                    {item.variant && !item.variants && (
                       <div className="item-modifier">- {item.variant.name}</div>
                    )}
                    {item.extras && item.extras.map((e: any, ei: number) => (
                      <div key={ei} className="item-modifier">+ {e.name}</div>
                    ))}
                  </td>
                  <td>{item.quantity}</td>
                  <td>{currencyDisplay}{(item.price || item.unit_price || 0).toFixed(2)}</td>
                  <td>{currencyDisplay}{((item.price || item.unit_price || 0) * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="invoice-footer-section">
            <div className="totals-area">
              <div className="total-row">
                <span>Subtotal:</span>
                <span>{currencyDisplay}{(orderData.subtotal || orderData.total_amount || 0).toFixed(2)}</span>
              </div>
              {(orderData.discount || orderData.discount_amount) > 0 && (
                <div className="total-row discount">
                  <span>Discount:</span>
                  <span>-{currencyDisplay}{(orderData.discount || orderData.discount_amount || 0).toFixed(2)}</span>
                </div>
              )}
              {(orderData.tip || orderData.tip_amount) > 0 && (
                <div className="total-row">
                  <span>Tip:</span>
                  <span>{currencyDisplay}{(orderData.tip || orderData.tip_amount || 0).toFixed(2)}</span>
                </div>
              )}
              <div className="invoice-divider-sub"></div>
              <div className="total-row grand-total">
                <span>GRAND TOTAL:</span>
                <span>{currencyDisplay}{(orderData.total || orderData.total_amount || 0).toFixed(2)}</span>
              </div>
              {orderData.payment_method && (
                 <div className="payment-info" style={{ textAlign: 'right', fontSize: '12px', color: '#666', marginTop: '5px' }}>
                    Paid via: <strong>{orderData.payment_method}</strong>
                 </div>
              )}
            </div>
          </div>

          <footer className="invoice-bottom">
            <div className="footer-divider"></div>
            <div className="footer-content">
              <p className="thank-you-msg italic">Thank you for choosing {tenant.restaurant_name || 'Zamzam Kitchen'}!</p>
              <p className="system-tag">Generated by Zamzam Kitchen Unified System v2.5.0</p>
            </div>
          </footer>
       </div>
    </div>
    )}
    </>
  );
}
