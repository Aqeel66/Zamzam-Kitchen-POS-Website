import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useState, useEffect } from 'react';
import { CreditCard, Banknote, Store, Car, Package, Heart, MapPin } from 'lucide-react';
import { API_BASE_URL, resolveImageUrl } from '../config';

export default function Checkout() {
  const { totalPrice, items, clearCart, tableId, tableNumber, clearTableContext } = useCart();
  const navigate = useNavigate();

  // For QR-Menu orders, we always force Dine-In
  const isQrOrder = !!tableId;

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'counter'>('card');
  const [orderType, setOrderType] = useState<'delivery' | 'pickup' | 'dine-in'>(
    isQrOrder ? 'dine-in' : 'delivery'
  );
  const [branchSettings, setBranchSettings] = useState<any>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/settings`)
      .then(res => res.json())
      .then(data => {
        setBranchSettings(data.branch);
        if (!isQrOrder) {
          if (data.branch.allow_delivery === 0 && data.branch.allow_pickup !== 0) {
            setOrderType('pickup');
          } else if (data.branch.allow_pickup === 0 && data.branch.allow_delivery !== 0) {
            setOrderType('delivery');
          }
        }
      });
  }, [isQrOrder]);

  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [tipPercentage, setTipPercentage] = useState(0);
  const [guestName, setGuestName] = useState('');

  const applyPromo = () => {
     if (promoCode.trim().toUpperCase() === 'ZAMZAM10') {
        setDiscount(totalPrice * 0.10);
     } else {
        alert('Invalid Promo Code');
        setDiscount(0);
     }
  };

  const deliveryFee = orderType === 'delivery' ? 5.00 : 0.00;
  const tipAmount = (totalPrice - discount) * (tipPercentage / 100);
  const finalTotal = totalPrice - discount + deliveryFee + tipAmount;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    let apiOrderType = 'Delivery';
    if (orderType === 'pickup') apiOrderType = 'Takeaway';
    if (orderType === 'dine-in') apiOrderType = 'Dine-In';

    const orderData: Record<string, any> = {
      items: [...items],
      subtotal: totalPrice,
      discount: discount,
      discount_amount: discount,
      tip: tipAmount,
      tip_amount: tipAmount,
      deliveryFee: deliveryFee,
      total: finalTotal,
      order_type: apiOrderType,
      payment_method: paymentMethod === 'card' ? 'Credit/Debit' : (paymentMethod === 'cash' ? 'Cash' : 'Counter'),
      status: paymentMethod === 'card' ? 'Paid' : 'Pending',
      date: new Date().toISOString(),
      origin: isQrOrder ? 'QR-Menu' : 'Website',
    };

    // Attach table info for QR orders
    if (isQrOrder && tableId) {
      orderData.table_id = tableId;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      
      if (response.ok) {
        clearCart();
        if (isQrOrder) clearTableContext();
        navigate(`/success?type=order&method=${paymentMethod}`, { state: { orderData } });
      } else {
        alert("Failed to process order. Please try again.");
      }
    } catch (err) {
      console.error("Order error:", err);
      alert("Could not connect to server.");
    }
  };

  if (items.length === 0) {
     return (
        <div style={{ textAlign: 'center', padding: '5rem' }}>
           <h3>Your cart is empty</h3>
           <button className="btn-primary" onClick={() => navigate('/menu')} style={{ marginTop: '1.5rem', padding: '1rem 2rem', border: 'none', background: 'var(--primary-orange)', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Back to Menu</button>
        </div>
     );
  }

  return (
    <div className="section-padding checkout-container">
       <h1 className="checkout-title mb-3">Checkout</h1>

       {/* QR Table Banner */}
       {isQrOrder && tableNumber && (
         <div style={{
           display: 'inline-flex',
           alignItems: 'center',
           gap: '0.6rem',
           background: 'linear-gradient(135deg, #ff6b35 0%, #f5a623 100%)',
           color: 'white',
           borderRadius: '30px',
           padding: '0.5rem 1.1rem',
           fontSize: '0.88rem',
           fontWeight: 700,
           marginBottom: '1.75rem',
           boxShadow: '0 4px 12px rgba(255,107,53,0.3)',
         }}>
           <MapPin size={14} />
           Table {tableNumber} · Dine-In Order
         </div>
       )}
       
       <form onSubmit={handleCheckout} className="checkout-grid">
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Order Type — hidden for QR dine-in orders */}
              {!isQrOrder && (
                <div className="checkout-type-btns" style={{ display: 'flex', gap: '1rem' }}>
                   {(branchSettings?.allow_delivery !== 0) && (
                     <button 
                        type="button" 
                        onClick={() => { setOrderType('delivery'); if(paymentMethod === 'counter') setPaymentMethod('card'); }}
                        style={{ flex: 1, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: `2px solid ${orderType === 'delivery' ? 'var(--primary-orange)' : '#e5e7eb'}`, background: orderType === 'delivery' ? '#fff6f3' : 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: orderType === 'delivery' ? 'var(--primary-orange)' : '#4b5563' }}
                     >
                        <Car size={20}/> Delivery
                     </button>
                   )}
                   {(branchSettings?.allow_pickup !== 0) && (
                     <button 
                        type="button" 
                        onClick={() => { setOrderType('pickup'); if(paymentMethod === 'cash') setPaymentMethod('card'); }}
                        style={{ flex: 1, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: `2px solid ${orderType === 'pickup' ? 'var(--primary-orange)' : '#e5e7eb'}`, background: orderType === 'pickup' ? '#fff6f3' : 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: orderType === 'pickup' ? 'var(--primary-orange)' : '#4b5563' }}
                     >
                        <Package size={20}/> Pick-Up
                     </button>
                   )}
                </div>
              )}

             {/* Details */}
             <div className="checkout-details-card" style={{ background: '#f9fafb', padding: '2.5rem', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: '1.4rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem', marginBottom: '1.5rem' }}>Your Details</h3>
                <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                   <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                     {isQrOrder ? 'Your Name (Optional)' : 'Full Name'}
                   </label>
                   <input
                     type="text"
                     required={!isQrOrder}
                     placeholder={isQrOrder ? 'So we can call your name when ready' : 'John Doe'}
                     value={guestName}
                     onChange={(e) => setGuestName(e.target.value)}
                     style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white' }}
                   />
                </div>
                {orderType === 'delivery' && (
                   <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>Delivery Address</label>
                      <input required type="text" placeholder="123 Main St, Melbourne" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white' }}/>
                   </div>
                )}
                <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                   <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>Phone / WhatsApp Number</label>
                   <input required type="tel" placeholder="+61 000 000 000" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white' }}/>
                   <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.5rem', fontStyle: 'italic' }}>We will send your invoice tracker to this WhatsApp number.</p>
                </div>
                <div className="input-group">
                   <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>Email Address</label>
                   <input required type="email" placeholder="john@example.com" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white' }}/>
                </div>
             </div>
          </div>

          {/* Payment & Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
             <div className="checkout-summary-card" style={{ background: '#111827', color: 'white', padding: '2.5rem', borderRadius: '16px' }}>
                <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1.5rem', fontSize: '1.4rem' }}>Order Summary</h3>

                {/* Table info row for QR orders */}
                {isQrOrder && tableNumber && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{ color: '#f5a623', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MapPin size={14}/> Table {tableNumber}
                    </span>
                    <span style={{ color: '#f5a623', fontWeight: 600 }}>Dine-In</span>
                  </div>
                )}

                <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                   {items.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#e5e7eb', backgroundImage: `url(${resolveImageUrl(item.image)})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                            <div>
                               <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>{item.name}</p>
                               <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.8rem' }}>Qty: {item.quantity}</p>
                            </div>
                         </div>
                         <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                   ))}
                </div>
                
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                   <span style={{ color: '#9ca3af' }}>Subtotal ({items.length} items)</span>
                   <span style={{ fontWeight: 600 }}>${totalPrice.toFixed(2)}</span>
                </div>

                {/* Promo Code Input */}
                <div className="checkout-flex-mobile-col" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                   <input 
                      type="text" 
                      placeholder="Promo Code (Try ZAMZAM10)" 
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: 'none', color: 'black' }}
                   />
                   <button type="button" onClick={applyPromo} style={{ padding: '0 1.5rem', background: '#374151', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: '0.2s' }}>Apply</button>
                </div>

                {discount > 0 && (
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: '#10b981', fontWeight: 600 }}>
                      <span>Discount Applied</span>
                      <span>-${discount.toFixed(2)}</span>
                   </div>
                )}

                {orderType === 'delivery' && (
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', marginTop: '1rem' }}>
                      <span style={{ color: '#9ca3af' }}>Standard Delivery</span>
                      <span style={{ fontWeight: 600 }}>$5.00</span>
                   </div>
                )}

                {/* Tip Option */}
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                   <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem', color: '#9ca3af' }}>
                      <Heart size={16} /> Add a Tip (Optional)
                   </p>
                   <div className="checkout-flex-mobile-col" style={{ display: 'flex', gap: '0.5rem' }}>
                      {[0, 10, 15, 20].map(pct => (
                         <button 
                            type="button" 
                            key={pct}
                            onClick={() => setTipPercentage(pct)}
                            style={{ flex: 1, padding: '0.5rem', background: tipPercentage === pct ? 'var(--primary-orange)' : '#374151', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: '0.2s', fontWeight: 600 }}
                         >
                            {pct === 0 ? 'None' : `${pct}%`}
                         </button>
                      ))}
                   </div>
                </div>

                {tipAmount > 0 && (
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                      <span style={{ color: '#9ca3af' }}>Tip Amount</span>
                      <span style={{ fontWeight: 600 }}>${tipAmount.toFixed(2)}</span>
                   </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.4rem', fontWeight: 700, paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '1rem' }}>
                   <span>Total</span>
                   <span style={{ color: 'var(--primary-orange)' }}>${finalTotal.toFixed(2)}</span>
                </div>
             </div>

             <div className="checkout-payment-card" style={{ background: '#f9fafb', padding: '2.5rem', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
                 <h3 style={{ marginBottom: '1.5rem', fontSize: '1.4rem' }}>Payment Method</h3>
                 
                 <div className="checkout-flex-mobile-col" style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
                    <button type="button" onClick={() => setPaymentMethod('card')} style={{ flex: 1, padding: '0.8rem 0.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: `2px solid ${paymentMethod === 'card' ? 'var(--primary-orange)' : '#e5e7eb'}`, background: paymentMethod === 'card' ? '#fff6f3' : 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: paymentMethod === 'card' ? 'var(--primary-orange)' : '#4b5563' }}>
                       <CreditCard size={18}/> Card
                    </button>
                    {/* Cash at table option for QR orders */}
                    {isQrOrder && (
                      <button type="button" onClick={() => setPaymentMethod('cash')} style={{ flex: 1, padding: '0.8rem 0.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: `2px solid ${paymentMethod === 'cash' ? 'var(--primary-orange)' : '#e5e7eb'}`, background: paymentMethod === 'cash' ? '#fff6f3' : 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: paymentMethod === 'cash' ? 'var(--primary-orange)' : '#4b5563' }}>
                         <Banknote size={18}/> Cash
                      </button>
                    )}
                    {!isQrOrder && orderType === 'delivery' && (
                       <button type="button" onClick={() => setPaymentMethod('cash')} style={{ flex: 1, padding: '0.8rem 0.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: `2px solid ${paymentMethod === 'cash' ? 'var(--primary-orange)' : '#e5e7eb'}`, background: paymentMethod === 'cash' ? '#fff6f3' : 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: paymentMethod === 'cash' ? 'var(--primary-orange)' : '#4b5563' }}>
                          <Banknote size={18}/> Cash
                       </button>
                    )}
                    {!isQrOrder && orderType === 'pickup' && (
                       <button type="button" onClick={() => setPaymentMethod('counter')} style={{ flex: 1, padding: '0.8rem 0.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: `2px solid ${paymentMethod === 'counter' ? 'var(--primary-orange)' : '#e5e7eb'}`, background: paymentMethod === 'counter' ? '#fff6f3' : 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: paymentMethod === 'counter' ? 'var(--primary-orange)' : '#4b5563' }}>
                          <Store size={18}/> Counter
                       </button>
                    )}
                 </div>

                 {paymentMethod === 'card' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                       <div className="input-group">
                          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                             Card Number
                             <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 400 }}>Powered by Stripe</span>
                          </label>
                          <input required type="text" placeholder="0000 0000 0000 0000" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white' }}/>
                       </div>
                       <div className="checkout-grid-mobile-1" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1rem' }}>
                          <input required type="text" placeholder="MM/YY" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white' }}/>
                          <input required type="text" placeholder="CVC" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white' }}/>
                       </div>
                    </div>
                 )}
                 {paymentMethod === 'cash' && isQrOrder && (
                    <div style={{ padding: '1.5rem', background: '#f3f4f6', borderRadius: '8px', textAlign: 'center' }}>
                       <p style={{ color: '#4b5563', margin: 0, fontWeight: 500 }}>A server will collect your cash payment at your table. Your order will be placed immediately.</p>
                    </div>
                 )}
                 {paymentMethod === 'cash' && !isQrOrder && (
                    <div style={{ padding: '1.5rem', background: '#f3f4f6', borderRadius: '8px', textAlign: 'center' }}>
                       <p style={{ color: '#4b5563', margin: 0, fontWeight: 500 }}>Please have exact change ready. You will pay the driver upon arrival.</p>
                    </div>
                 )}
                 {paymentMethod === 'counter' && (
                    <div style={{ padding: '1.5rem', background: '#f3f4f6', borderRadius: '8px', textAlign: 'center' }}>
                       <p style={{ color: '#4b5563', margin: 0, fontWeight: 500 }}>Please proceed to the register to complete your payment when picking up your food.</p>
                    </div>
                 )}
             </div>

             <button type="submit" className="btn-primary" style={{ padding: '1.4rem', fontSize: '1.1rem', marginTop: '1rem', border: 'none', borderRadius: '8px', background: 'var(--primary-orange)', color: 'white', fontWeight: 700, cursor: 'pointer', transition: 'transform 0.2s' }}>
                {isQrOrder ? `Place Order · Table ${tableNumber} · $${finalTotal.toFixed(2)}` : `Confirm Order for $${finalTotal.toFixed(2)}`}
             </button>
          </div>
       </form>
    </div>
  );
}
