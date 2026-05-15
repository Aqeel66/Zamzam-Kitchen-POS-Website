import { MapPin, Clock, Phone, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { API_BASE_URL, resolveImageUrl } from '../config';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [activeCategory, setActiveCategory] = useState("All Items");
  const [menuData, setMenuData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [branding, setBranding] = useState({
    email: 'info@zamzamkitchen.com',
    phone: '+61 3 9939 2479',
    address: '329 Racecourse Road, VIC, Melbourne, Australia',
    name: 'Zamzam Kitchen',
    heroBg: null as string | null
  });
  const [businessHours, setBusinessHours] = useState({
    openingTime: '12:00 PM',
    closingTime: '11:00 PM'
  });

  const formatTime12hr = (timeStr: string) => {
    if (!timeStr || timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
    try {
      const [hours, minutes] = timeStr.split(':');
      const h = parseInt(hours);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${minutes} ${ampm}`;
    } catch (e) {
      return timeStr;
    }
  };

  useEffect(() => {
    fetch(`${API_BASE_URL}/settings/branch/1?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.opening_time && data.closing_time) {
          setBusinessHours({
            openingTime: formatTime12hr(data.opening_time),
            closingTime: formatTime12hr(data.closing_time)
          });
        }
      })
      .catch(err => console.error('Error fetching timings:', err));

    fetch(`${API_BASE_URL}/settings/branding?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (data) {
          setBranding(prev => ({
            ...prev,
            email: data.email || prev.email,
            phone: data.phone || prev.phone,
            address: data.address || prev.address,
            name: data.restaurant_name || prev.name,
            heroBg: data.hero_background_url ? resolveImageUrl(data.hero_background_url) : prev.heroBg
          }));
        }
      })
      .catch(err => console.error('Error fetching branding:', err));
  }, []);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/menu?v=${Date.now()}`);
        const data = await response.json();
        if (Array.isArray(data)) setMenuData(data);
      } catch (err) {
        console.error('Failed to fetch menu:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMenu();
  }, []);

  const categories = ["All Items", ...new Set(menuData.map(item => item.category_name))];
  const filteredMenu = activeCategory === "All Items" 
    ? menuData 
    : menuData.filter(item => item.category_name === activeCategory);

  return (
    <div className="home-page">
      <section className="hero" style={{ 
        backgroundImage: branding.heroBg ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${branding.heroBg})` : undefined 
      }}>
        <div className="hero-content">
          <h1>Experience Authentic Halal Flavors</h1>
          <p>Hand-crafted dishes made with passion and the finest traditional ingredients.</p>
          <div className="hero-btns">
            <button className="btn btn-primary" onClick={() => navigate('/menu')}>Order Online Now</button>
            <button className="btn btn-outline" onClick={() => navigate('/reservation')}>Book a Table</button>
          </div>
        </div>
      </section>

      <section className="quick-info">
        <div className="info-grid">
          <div className="info-item">
            <div className="info-icon"><MapPin size={24} /></div>
            <div className="info-text">
              <h3>Our Location</h3>
              <p>{branding.address}</p>
            </div>
          </div>
          <div className="info-item">
            <div className="info-icon"><Clock size={24} /></div>
            <div className="info-text">
              <h3>Opening Hours</h3>
              <p>Daily: {businessHours.openingTime} - {businessHours.closingTime}</p>
            </div>
          </div>
          <div className="info-item">
            <div className="info-icon"><Phone size={24} /></div>
            <div className="info-text">
              <h3>Call Us</h3>
              <p>{branding.phone}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="featured-menu">
        <div className="section-header">
          <h2>Our Popular Dishes</h2>
          <div className="category-tabs">
            {categories.map(cat => (
              <button 
                key={cat} 
                className={`category-tab ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="loading-state">Loading delicious food...</div>
        ) : (
          <div className="menu-grid">
            {filteredMenu.slice(0, 8).map((item: any) => (
              <div key={item.id} className="menu-card">
                <div className="card-image">
                  <img src={resolveImageUrl(item.image_url)} alt={item.name} />
                  <button className="add-to-cart-btn" onClick={() => addToCart(item)}>
                    <Plus size={20} />
                  </button>
                </div>
                <div className="card-body">
                  <div className="card-header">
                    <h3>{item.name}</h3>
                    <span className="price">${item.price}</span>
                  </div>
                  <p className="description">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="view-all-container">
          <button className="btn btn-primary" onClick={() => navigate('/menu')}>View Full Menu</button>
        </div>
      </section>
    </div>
  );
}
