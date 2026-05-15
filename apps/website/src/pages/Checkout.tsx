import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useState, useEffect } from 'react';
import { CreditCard, Banknote, Store, Car, Package, Heart, MapPin, User, Phone, Mail, ShoppingBag, ShieldCheck } from 'lucide-react';
import { API_BASE_URL, resolveImageUrl } from '../config';
import './Checkout.css';

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

  const [promoError, setPromoError] = useState<string | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<any>(null);

  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [tipPercentage, setTipPercentage] = useState(0);
  const [customTip, setCustomTip] = useState('');
  const [tipType, setTipType] = useState<'percent' | 'amount'>('percent');
  const [guestName, setGuestName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const applyPromo = async () => {
    setPromoError(null);
    if (!promoCode.trim()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/promotions/validate/${promoCode.trim()}`);
      if (response.ok) {
        const data = await response.json();
        const promo = data.promo;
        const minSpend = parseFloat(promo.min_spend) || 0;
        
        // Validate minimum spend
        if (totalPrice < minSpend) {
          setPromoError(`Minimum spend of $${minSpend.toFixed(2)} required for this code.`);
          setDiscount(0);
          setAppliedPromo(null);
          return;
        }

        let disc = 0;
        const discountValue = parseFloat(promo.discount_value) || 0;
        const dType = promo.discount_type?.toString().toLowerCase();
        
        if (dType === 'fixed') {
          disc = discountValue;
        } else {
          disc = totalPrice * (discountValue / 100);
        }
        
        setDiscount(disc);
        setAppliedPromo(promo);
      } else {
        const err = await response.json();
        setPromoError(err.message || 'Invalid Promo Code');
        setDiscount(0);
        setAppliedPromo(null);
      }
    } catch (err) {
      console.error("Promo validation error:", err);
      setPromoError('Error connecting to validation service');
    }
  };

  const removePromo = () => {
    setPromoCode('');
    setDiscount(0);
    setAppliedPromo(null);
    setPromoError(null);
  };

  const deliveryFee = orderType === 'delivery' ? 5.00 : 0.00;
  
  const taxAmount = useMemo(() => {
    if (branchSettings?.is_tax_enabled === 0) return 0;
    const rate = parseFloat(branchSettings?.tax_rate || 0) / 100;
    return (totalPrice - discount) * rate;
  }, [totalPrice, discount, branchSettings]);
  
  const calculatedTip = tipPercentage > 0 
    ? (totalPrice - discount) * (tipPercentage / 100)
    : (tipType === 'percent' 
        ? (totalPrice - discount) * (Number(customTip) / 100) 
        : Number(customTip));
  
  const tipAmount = isNaN(calculatedTip) ? 0 : calculatedTip;
  const finalTotal = totalPrice - discount + taxAmount + deliveryFee + tipAmount;

  useEffect(() => {
    const fetchGateways = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/payment-gateways/active`);
        if (response.ok) {
          // const data = await response.json();
          // setActiveGateways(data);
        }
      } catch (err) {
        console.error("Error fetching gateways:", err);
      }
    };
    fetchGateways();
  }, []);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    let apiOrderType = 'Delivery';
    if (orderType === 'pickup') apiOrderType = 'Takeaway';
    if (orderType === 'dine-in') apiOrderType = 'Dine-In';

    const orderData: Record<string, any> = {
      items: [...items],
      subtotal: totalPrice,
      discount_amount: discount,
      promo_id: appliedPromo?.id || null,
      promo_discount: appliedPromo ? discount : 0,
      manual_discount: 0, // No manual discount on website
      tax_amount: taxAmount,
      tip_amount: tipAmount,
      delivery_fee: deliveryFee,
      total_amount: finalTotal,
      order_type: apiOrderType,
      payment_method: paymentMethod === 'card' ? 'Credit/Debit' : (paymentMethod === 'cash' ? 'Cash' : 'Counter'),
      status: paymentMethod === 'card' ? 'Paid' : 'Pending',
      date: new Date().toISOString(),
      origin: isQrOrder ? 'QR-Menu' : 'Website',
    };

    if (isQrOrder && tableId) {
      orderData.table_id = tableId;
    }

    if (paymentMethod === 'card') {
      setIsProcessing(true);
      // Simulate real Stripe processing time
      await new Promise(resolve => setTimeout(resolve, 2500));
    }

    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      
      if (response.ok) {
        const result = await response.json();
        const finalOrderData = {
          ...orderData,
          order_number: result.orderNumber || result.orderId,
          id: result.orderId
        };
        
        clearCart();
        if (isQrOrder) clearTableContext();
        navigate(`/success?type=order&method=${paymentMethod}`, { state: { orderData: finalOrderData } });
      } else {
        alert("Failed to process order. Please try again.");
      }
    } catch (err) {
      console.error("Order error:", err);
      alert("Could not connect to server.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
     return (
        <div className="empty-cart-container">
           <ShoppingBag size={80} className="empty-cart-icon" />
           <h3 className="empty-cart-title">Your cart is empty</h3>
           <p className="empty-cart-text">Looks like you haven't added anything to your cart yet.</p>
           <button className="btn-primary" onClick={() => navigate('/menu')} style={{ padding: '1.25rem 3rem', border: 'none', background: 'var(--primary-orange)', color: 'white', borderRadius: '16px', cursor: 'pointer', fontWeight: 700, fontSize: '1.1rem', boxShadow: '0 10px 20px rgba(255,107,53,0.3)' }}>Start Ordering</button>
        </div>
     );
  }

  return (
    <div className="checkout-container">
       <div className="checkout-steps">
          <div className="step active">
             <div className="step-circle">1</div>
             <span className="step-label">Details</span>
          </div>
          <div className="step active">
             <div className="step-circle">2</div>
             <span className="step-label">Payment</span>
          </div>
          <div className="step">
             <div className="step-circle">3</div>
             <span className="step-label">Success</span>
          </div>
       </div>

       <h1 className="checkout-title">Complete Your Order</h1>

       {isQrOrder && tableNumber && (
         <div style={{
           display: 'inline-flex',
           alignItems: 'center',
           gap: '0.6rem',
           background: 'linear-gradient(135deg, #ff6b35 0%, #f5a623 100%)',
           color: 'white',
           borderRadius: '30px',
           padding: '0.6rem 1.25rem',
           fontSize: '0.9rem',
           fontWeight: 700,
           marginBottom: '2rem',
           boxShadow: '0 8px 16px rgba(255,107,53,0.25)',
         }}>
           <MapPin size={16} />
           Dining at Table {tableNumber}
         </div>
       )}
       
       <form onSubmit={handleCheckout} className="checkout-grid">
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {!isQrOrder && (
                <div style={{ display: 'flex', gap: '1.25rem' }}>
                   {(branchSettings?.allow_delivery !== 0) && (
                     <button 
                        type="button" 
                        onClick={() => { setOrderType('delivery'); if(paymentMethod === 'counter') setPaymentMethod('card'); }}
                        className={`payment-method-btn ${orderType === 'delivery' ? 'active' : ''}`}
                        style={{ flex: 1, height: 'auto', padding: '1.5rem' }}
                     >
                        <Car size={24}/> 
                        <span>Delivery</span>
                     </button>
                   )}
                   {(branchSettings?.allow_pickup !== 0) && (
                     <button 
                        type="button" 
                        onClick={() => { setOrderType('pickup'); if(paymentMethod === 'cash') setPaymentMethod('card'); }}
                        className={`payment-method-btn ${orderType === 'pickup' ? 'active' : ''}`}
                        style={{ flex: 1, height: 'auto', padding: '1.5rem' }}
                     >
                        <Package size={24}/>
                        <span>Pick-Up</span>
                     </button>
                   )}
                </div>
              )}

             <div className="checkout-card">
                <h3 className="checkout-section-title"><User size={20} /> Personal Information</h3>
                
                <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                   <label className="label-text">
                     {isQrOrder ? 'Guest Name (Optional)' : 'Full Name'}
                   </label>
                   <input
                     type="text"
                     className="checkout-input"
                     required={!isQrOrder}
                     placeholder={isQrOrder ? 'How should we address you?' : 'Enter your full name'}
                     value={guestName}
                     onChange={(e) => setGuestName(e.target.value)}
                   />
                </div>

                <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                   <label className="label-text">Phone Number</label>
                   <div style={{ position: 'relative' }}>
                      <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                      <input 
                        required 
                        type="tel" 
                        placeholder="+61 000 000 000" 
                        className="checkout-input"
                        style={{ paddingLeft: '3rem' }}
                      />
                   </div>
                   <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <ShieldCheck size={14} /> We'll send order updates via WhatsApp
                   </p>
                </div>

                <div className="input-group" style={{ marginBottom: orderType === 'delivery' ? '1.5rem' : '0' }}>
                   <label className="label-text">Email Address</label>
                   <div style={{ position: 'relative' }}>
                      <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                      <input 
                        required 
                        type="email" 
                        placeholder="your@email.com" 
                        className="checkout-input"
                        style={{ paddingLeft: '3rem' }}
                      />
                   </div>
                </div>

                {orderType === 'delivery' && (
                   <div className="input-group">
                      <label className="label-text">Delivery Address</label>
                      <div style={{ position: 'relative' }}>
                        <MapPin size={18} style={{ position: 'absolute', left: '1rem', top: '1rem', color: '#9ca3af' }} />
                        <textarea 
                          required 
                          placeholder="Complete address including street, suburb, and any special instructions" 
                          className="checkout-input"
                          style={{ paddingLeft: '3rem', minHeight: '100px', resize: 'vertical' }}
                        />
                      </div>
                   </div>
                )}
             </div>

             <div className="checkout-card">
                <h3 className="checkout-section-title"><CreditCard size={20} /> Payment Details</h3>
                
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                   <button type="button" onClick={() => setPaymentMethod('card')} className={`payment-method-btn ${paymentMethod === 'card' ? 'active' : ''}`}>
                      <CreditCard size={20}/> <span>Online Card</span>
                   </button>
                   
                   {isQrOrder && (
                     <button type="button" onClick={() => setPaymentMethod('cash')} className={`payment-method-btn ${paymentMethod === 'cash' ? 'active' : ''}`}>
                        <Banknote size={20}/> <span>Cash at Table</span>
                     </button>
                   )}

                   {!isQrOrder && orderType === 'delivery' && (
                      <button type="button" onClick={() => setPaymentMethod('cash')} className={`payment-method-btn ${paymentMethod === 'cash' ? 'active' : ''}`}>
                         <Banknote size={20}/> <span>Cash on Delivery</span>
                      </button>
                   )}

                   {!isQrOrder && orderType === 'pickup' && (
                      <button type="button" onClick={() => setPaymentMethod('counter')} className={`payment-method-btn ${paymentMethod === 'counter' ? 'active' : ''}`}>
                         <Store size={20}/> <span>Pay at Counter</span>
                      </button>
                   )}
                </div>

                {paymentMethod === 'card' && (
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem', background: '#f9fafb', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
                      <div className="input-group">
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <label className="label-text" style={{ marginBottom: 0 }}>Card Number</label>
                            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png" alt="Visa" style={{ height: '12px', opacity: 0.6 }} />
                         </div>
                         <input required type="text" placeholder="0000 0000 0000 0000" className="checkout-input" />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                         <div className="input-group">
                            <label className="label-text">Expiry Date</label>
                            <input required type="text" placeholder="MM/YY" className="checkout-input" />
                         </div>
                         <div className="input-group">
                            <label className="label-text">CVV</label>
                            <input required type="text" placeholder="123" className="checkout-input" />
                         </div>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center', marginTop: '0.5rem' }}>
                         🔒 Your payment information is encrypted and secure.
                      </p>
                   </div>
                )}

                {(paymentMethod === 'cash' || paymentMethod === 'counter') && (
                   <div style={{ padding: '2rem', background: '#f0fdf4', borderRadius: '16px', border: '1px solid #dcfce7', textAlign: 'center' }}>
                      <div style={{ width: '48px', height: '48px', background: '#22c55e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: 'white' }}>
                         {paymentMethod === 'cash' ? <Banknote size={24} /> : <Store size={24} />}
                      </div>
                      <p style={{ color: '#166534', margin: 0, fontWeight: 600 }}>
                         {paymentMethod === 'cash' 
                           ? (isQrOrder ? 'A server will collect payment at your table.' : 'Please pay the driver in cash upon arrival.')
                           : 'Please pay at the register when collecting your order.'}
                      </p>
                   </div>
                )}
             </div>
          </div>

          <div className="summary-card">
             <h3 className="checkout-section-title" style={{ color: 'white' }}><ShoppingBag size={20} /> Order Summary</h3>

             <div style={{ margin: '1.5rem 0', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {items.map(item => (
                   <div key={item.id} className="order-item">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                         <div className="item-thumb" style={{ backgroundImage: `url(${resolveImageUrl(item.image)})` }}></div>
                         <div>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>{item.name}</p>
                            <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.85rem' }}>{item.quantity} × ${item.price.toFixed(2)}</p>
                         </div>
                      </div>
                      <span style={{ fontWeight: 600 }}>${(item.price * item.quantity).toFixed(2)}</span>
                   </div>
                ))}
             </div>
             
             <div className="promo-input-group">
                <input 
                   type="text" 
                   placeholder="Promo Code" 
                   className="promo-input"
                   value={promoCode}
                   onChange={(e) => {
                      setPromoCode(e.target.value);
                      if (promoError) setPromoError(null);
                   }}
                   onKeyPress={(e) => e.key === 'Enter' && applyPromo()}
                />
                {appliedPromo ? (
                   <button type="button" onClick={removePromo} style={{ padding: '0 1.25rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}>Clear</button>
                ) : (
                   <button type="button" onClick={applyPromo} style={{ padding: '0 1.25rem', background: '#374151', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}>Apply</button>
                )}
             </div>
             
             {promoError && (
                <div className="promo-error">{promoError}</div>
             )}

             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="summary-row">
                   <span style={{ color: '#9ca3af' }}>Subtotal</span>
                   <span>${totalPrice.toFixed(2)}</span>
                </div>

                {discount > 0 && (
                   <div className="summary-row" style={{ color: '#10b981', fontWeight: 600 }}>
                      <span>Discount ({appliedPromo?.code || 'Promo'})</span>
                      <span>-${discount.toFixed(2)}</span>
                   </div>
                )}

                {orderType === 'delivery' && (
                   <div className="summary-row">
                      <span style={{ color: '#9ca3af' }}>Delivery Fee</span>
                      <span>$5.00</span>
                   </div>
                )}
                
                <div style={{ margin: '1rem 0', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
                   <p style={{ fontSize: '0.9rem', color: '#9ca3af', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Heart size={16} /> Add a tip for the staff
                   </p>
                   <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {[0, 10, 15, 20].map(pct => (
                         <button 
                            type="button" 
                            key={pct}
                            onClick={() => {
                               setTipPercentage(pct);
                               setCustomTip('');
                            }}
                            className={`tip-btn ${tipPercentage === pct && !customTip ? 'active' : ''}`}
                         >
                            {pct === 0 ? 'None' : `${pct}%`}
                         </button>
                      ))}
                   </div>
                   
                   <div className="tip-input-group">
                      <input 
                         type="number"
                         step="0.01"
                         placeholder="Custom Amount"
                         className="tip-custom-input"
                         value={customTip}
                         onChange={(e) => {
                            setCustomTip(e.target.value);
                            setTipPercentage(0);
                         }}
                      />
                      <button 
                         type="button" 
                         className="tip-type-toggle"
                         onClick={() => setTipType(tipType === 'percent' ? 'amount' : 'percent')}
                      >
                         {tipType === 'percent' ? '%' : '$'}
                      </button>
                   </div>
                </div>

                <div className="summary-row">
                   <span style={{ color: '#9ca3af' }}>Tax (10%)</span>
                   <span>${taxAmount.toFixed(2)}</span>
                </div>

                {tipAmount > 0 && (
                   <div className="summary-row" style={{ color: '#ec4899', fontWeight: 600 }}>
                      <span>Tip</span>
                      <span>+${tipAmount.toFixed(2)}</span>
                   </div>
                )}

                <div className="summary-total">
                   <div className="summary-row">
                      <span style={{ fontSize: '1.1rem', color: 'white', fontWeight: 600 }}>Total</span>
                      <span>${finalTotal.toFixed(2)}</span>
                   </div>
                </div>
             </div>

             <button type="submit" className="place-order-btn" style={{ marginTop: '2rem' }}>
                {isQrOrder 
                  ? `Place Order · $${finalTotal.toFixed(2)}` 
                  : `Confirm & Pay · $${finalTotal.toFixed(2)}`}
             </button>
             
             <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#6b7280', marginTop: '1.5rem' }}>
                By clicking "Place Order", you agree to our Terms of Service.
             </p>
          </div>
       </form>

       {isProcessing && (
         <div className="payment-processing-overlay">
           <div className="processing-card">
             <div className="spinner"></div>
             <svg width="80" height="33" viewBox="0 0 60 25" fill="none" xmlns="http://www.w3.org/2000/svg" className="stripe-logo-loading" style={{ marginBottom: '1.5rem' }}>
               <path d="M59.642 12.181c0-4.034-2.1-6.19-5.59-6.19-3.468 0-5.748 2.29-5.748 6.305 0 4.544 2.457 6.31 5.918 6.31 1.637 0 2.94-.3 3.968-1.018l-.946-1.92c-.841.511-1.892.83-2.915.83-1.892 0-3.15-.751-3.23-2.603h7.458c.03-.639.085-1.164.085-1.713zm-8.48-1.503c0-1.743.916-2.583 2.656-2.583 1.548 0 2.508.84 2.508 2.583h-5.164zm-8.835 1.503c0-3.155-1.637-6.19-5.02-6.19-1.397 0-2.358.556-2.94 1.157l-.105-.886h-2.569v17.43l2.84-.602v-5.22c.6.511 1.487.886 2.7.886 3.424 0 5.094-3.41 5.094-6.575zm-2.79 0c0 2.373-.87 4.091-2.686 4.091-.945 0-1.666-.36-2.222-1.006v-6.223c.51-.66 1.29-1.035 2.191-1.035 1.77 0 2.717 1.621 2.717 4.173zm-10.742-9.615c0-1.187-.855-2.013-2.115-2.013-1.29 0-2.146.826-2.146 2.013 0 1.202.855 2.028 2.146 2.028 1.26 0 2.115-.826 2.115-2.028zm-2.115 3.424h-2.84v12.212l2.84-.601v-11.611zm-5.748-3.424c0-1.187-.855-2.013-2.115-2.013-1.29 0-2.146.826-2.146 2.013 0 1.202.855 2.028 2.146 2.028 1.26 0 2.115-.826 2.115-2.028zm-2.115 3.424h-2.84v12.212l2.84-.601v-11.611zm-5.064 0h-2.568l-.105.886c-.585-.601-1.547-1.157-2.943-1.157-3.383 0-5.02 3.035-5.02 6.19 0 3.165 1.67 6.575 5.094 6.575 1.213 0 2.1-.375 2.7-.886v5.22l2.84.602V5.99zm-2.79 6.19c0 2.552-.947 4.173-2.717 4.173-.901 0-1.681-.375-2.191-1.035v6.223c.556.646 1.277 1.006 2.222 1.006 1.816 0 2.686-1.718 2.686-4.091 0-2.552-.947-4.275-2.717-4.275-.901 0-1.681.375-2.191-1.035v6.223c.556.646 1.277 1.006 2.222 1.006 1.816 0 2.686-1.718 2.686-4.091zm-7.608-2.618c0-2.2-.841-3.573-3.123-3.573-1.006 0-1.921.375-2.507 1.018V6.14h-2.841v15.228l2.841-.601V12.78c.556-.556 1.352-.855 2.252-.855 1.157 0 1.532.555 1.532 1.636v7.712l2.84-.602v-11.1zm-10.457-3.573c-2.313 0-3.874 1.141-3.874 3.035 0 4.159 5.674 3.514 5.674 5.375 0 .736-.676 1.036-1.637 1.036-1.216 0-2.642-.511-3.664-1.126l-.886 2.146c1.111.66 2.822 1.186 4.545 1.186 2.508 0 4.484-1.171 4.484-3.23 0-4.46-5.67-3.769-5.67-5.361 0-.616.556-1.02 1.516-1.02.946 0 2.29.375 3.197.87l.87-2.115c-1.021-.57-2.433-.826-3.395-.826z" fill="#6366F1"/>
             </svg>
             <h3>Securely Processing...</h3>
             <p>Please do not refresh the page or close your browser.</p>
             <div className="encryption-badge">
               <ShieldCheck size={14} /> 256-bit SSL Encryption
             </div>
           </div>
         </div>
       )}
    </div>
  );
}
