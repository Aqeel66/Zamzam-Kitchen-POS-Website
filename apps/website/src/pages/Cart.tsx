import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Trash2, ArrowLeft, MapPin } from 'lucide-react';
import { resolveImageUrl } from '../config';

export default function Cart() {
  const { items, removeFromCart, updateQuantity, totalPrice, tableId, tableNumber } = useCart();
  const navigate = useNavigate();

  return (
    <div className="cart-page section-padding cart-container" style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
      <button onClick={() => navigate('/menu')} style={{ background: 'none', border: 'none', color: '#ff6b35', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '2rem', cursor: 'pointer' }}>
         <ArrowLeft size={18}/> Back to Menu
      </button>



      {/* Table chip for QR orders */}
      {tableId && tableNumber && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'linear-gradient(135deg, #ff6b35 0%, #f5a623 100%)',
          color: 'white',
          borderRadius: '30px',
          padding: '0.45rem 1rem',
          fontSize: '0.85rem',
          fontWeight: 700,
          marginBottom: '1.5rem',
          boxShadow: '0 4px 12px rgba(255,107,53,0.3)',
        }}>
          <MapPin size={14} />
          Table {tableNumber} · Dine-In
        </div>
      )}

      {items.length === 0 ? (
         <div style={{ textAlign: 'center', padding: '4rem 0', background: '#f9fafb', borderRadius: '16px' }}>
            <h1 className="mb-8">Your Shopping Cart</h1>
            <h3 style={{ color: '#6b7280', marginBottom: '1rem' }}>Your cart is currently empty.</h3>
            <button className="btn-primary" onClick={() => navigate('/menu')}>Explore Menu</button>
         </div>
      ) : (
         <div className="cart-content">
            <h1 className="mb-8">Your Shopping Cart</h1>
            <div className="cart-items" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
               {items.map(item => (
                  <div key={item.id} className="cart-item">
                     <div className="cart-item-image" style={{ width: '65px', height: '65px', borderRadius: '10px', background: '#e5e7eb', backgroundImage: `url(${resolveImageUrl(item.image)})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                     <div style={{ flex: 1 }}>
                        <h4 className="mb-2">{item.name}</h4>
                        <span style={{ color: '#ff6b35', fontWeight: 700 }}>${item.price.toFixed(2)}</span>
                     </div>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f9fafb', padding: '0.5rem', borderRadius: '8px' }}>
                        <button onClick={() => updateQuantity(item.id, -1)} style={{ width: '30px', height: '30px', border: 'none', background: 'white', borderRadius: '4px', cursor: 'pointer' }}>-</button>
                        <span style={{ fontWeight: 600, minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} style={{ width: '30px', height: '30px', border: 'none', background: 'white', borderRadius: '4px', cursor: 'pointer' }}>+</button>
                     </div>
                     <button onClick={() => removeFromCart(item.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem' }}>
                        <Trash2 size={20}/>
                     </button>
                  </div>
               ))}
            </div>

            <div className="cart-summary">
                <div>
                   <p style={{ color: '#9ca3af', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Total Amount</p>
                   <h2>${totalPrice.toFixed(2)}</h2>
                   {tableId && tableNumber && (
                     <p style={{ color: '#f5a623', fontSize: '0.75rem', margin: '0.25rem 0 0', fontWeight: 600 }}>
                       📍 Table {tableNumber} · Dine-In
                     </p>
                   )}
                </div>
                <button className="btn-primary" onClick={() => navigate('/checkout')} style={{ padding: '0.8rem 2rem' }}>Proceed to Checkout</button>
            </div>
         </div>
      )}
    </div>
  );
}
