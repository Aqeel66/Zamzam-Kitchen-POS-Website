import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Heart, Info, MapPin, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { API_BASE_URL, ASSETS_BASE_URL } from '../config';
import './Menu.css';

export default function Menu() {
  const { addToCart, setTableContext, tableId, tableNumber } = useCart();
  const [menuData, setMenuData] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('All Items');
  const [isLoading, setIsLoading] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [searchParams] = useSearchParams();

  // On mount, detect QR table params
  useEffect(() => {
    const table = searchParams.get('table');
    const tid = searchParams.get('tid');
    if (table && tid) {
      setTableContext(parseInt(tid), table);
      setBannerDismissed(false);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/menu`);
        const data = await response.json();
        setMenuData(data);
      } catch (error) {
        console.error('Error fetching menu:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMenu();
  }, []);

  const categories = ["All Items", ...menuData.map(cat => cat.name)];

  const renderSection = (category: string, items: any[], isLarge = false) => (
    <section key={category} className="mb-5">
      <div className="section-title-container">
        <h3 className="section-title">{category}</h3>
        <div className="title-line"></div>
      </div>
      <div className={`menu-grid ${isLarge ? 'grid-large' : 'grid-standard'}`}>
        {items.map(item => {
          const isAvailable = item.is_available !== 0 && item.is_available !== false && item.is_available !== null;
          return (
            <div key={item.id} className={`menu-card-premium ${isLarge ? 'card-large' : ''} ${!isAvailable ? 'unavailable' : ''}`}>
               <div className="card-img-container" style={{ 
                  backgroundImage: item.image ? `url(${ASSETS_BASE_URL}/${item.image.startsWith('assets/') ? item.image.replace('assets/', '') : item.image})` : 'url(/placeholder-food.jpg)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
               }}>
                  <span className="price-tag">${parseFloat(item.price).toFixed(2)}</span>
                  {!isAvailable && (
                    <div className="out-of-stock-overlay">
                      <span>OUT OF STOCK</span>
                    </div>
                  )}
               </div>
               <div className="card-content">
                  <div className="card-header-row">
                     <h4>{item.name}</h4>
                     <button className="wishlist-btn"><Heart size={18}/></button>
                  </div>
                  <p className="card-desc">{item.description}</p>
                  <div className="card-actions">
                     <button 
                        className="btn-quick-add" 
                        onClick={() => isAvailable && addToCart({ ...item, price: parseFloat(item.price) })}
                        disabled={!isAvailable}
                     >
                        <Plus size={18}/> {isAvailable ? 'Add to Cart' : 'Out of Stock'}
                     </button>
                     <button className="btn-details-icon"><Info size={18}/></button>
                  </div>
               </div>
            </div>
          );
        })}
      </div>
    </section>
  );

  return (
    <div className="menu-page">
      {/* QR Table Banner */}
      {tableId && tableNumber && !bannerDismissed && (
        <div style={{
          background: 'linear-gradient(135deg, #ff6b35 0%, #f5a623 100%)',
          color: 'white',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          boxShadow: '0 4px 20px rgba(255, 107, 53, 0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '50%',
              width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <MapPin size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.01em' }}>
                📍 Table {tableNumber} — Dine-In Order
              </div>
              <div style={{ fontSize: '0.78rem', opacity: 0.9 }}>
                Add items to your cart and we'll bring it to your table
              </div>
            </div>
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <header className="common-hero menu-hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <span className="badge mb-3" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '0.4rem 1rem', borderRadius: '30px', fontSize: '0.85rem', fontWeight: 600 }}>FRESH &amp; HALAL</span>
          <h1 className="white text-5xl font-bold mb-3">Explore <span className="text-orange">Our Menu</span></h1>
          <p className="white opacity-90 text-lg max-w-2xl mx-auto">Fresh ingredients, prepared daily with passion and the finest local spices.</p>
        </div>
      </header>

      <div className="section-padding">
        {isLoading ? (
          <div className="text-center py-20">
            <div className="spinner-border text-orange" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-4 text-gray-500">Loading deliciousness...</p>
          </div>
        ) : (
          <>
            <nav className="category-nav-pills mb-5">
              {categories.map(cat => (
                <button 
                  key={cat} 
                  className={`nav-pill ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </nav>

            <div className="menu-content-area">
               {menuData.filter(cat => activeCategory === 'All Items' || activeCategory === cat.name).map(category => (
                 renderSection(category.name, category.items, category.name === 'Mandi')
               ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
