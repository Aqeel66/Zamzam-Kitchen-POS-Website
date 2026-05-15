import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Phone, 
  Mail, 
  Clock, 
  MapPin, 
  Share2, 
  Heart, 
  Globe, 
  Menu as MenuIcon, 
  X, 
  ShoppingCart, 
  User 
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { resolveImageUrl, API_BASE_URL } from '../config';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { items } = useCart();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [branding, setBranding] = useState({
    logo_url: '',
    secondary_logo_url: '',
    restaurant_name: 'ZAMZAM KITCHEN',
    tagline: 'AUTHENTIC HALAL FLAVOURS',
    email: 'info@zamzamkitchen.com',
    phone: '+61 3 9939 2479',
    address: 'Racecourse Road, VIC, Melbourne, Australia'
  });
  const [businessHours, setBusinessHours] = useState({
    openingTime: '12:00:00',
    closingTime: '23:00:00'
  });

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const formatTime12hr = (timeStr: string) => {
    if (!timeStr) return '';
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
    window.scrollTo(0, 0);
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    // Fetch branch settings (for opening/closing times)
    fetch(`${API_BASE_URL}/settings/branch/1?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.opening_time && data.closing_time) {
          setBusinessHours({
            openingTime: data.opening_time,
            closingTime: data.closing_time
          });
        }
      })
      .catch(err => console.error('Error fetching settings:', err));

    // Fetch branding info
    fetch(`${API_BASE_URL}/settings/branding?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (data) {
          setBranding(prev => ({
            ...prev,
            ...data
          }));
        }
      })
      .catch(err => console.error('Error fetching branding:', err));
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="layout">
      <div className="top-bar">
        <div className="top-bar-left">
          <div className="top-bar-item">
            <Clock size={14} />
            <span>Opens Daily: {formatTime12hr(businessHours.openingTime)} - {formatTime12hr(businessHours.closingTime)}</span>
          </div>
        </div>
        <div className="top-bar-right">
          <a href={`mailto:${branding.email}`} className="top-bar-item" style={{ color: 'inherit', textDecoration: 'none' }}>
            <Mail size={14} />
            <span>{branding.email}</span>
          </a>
          <a href={`tel:${branding.phone.replace(/\s+/g, '')}`} className="top-bar-item" style={{ color: 'inherit', textDecoration: 'none' }}>
            <Phone size={14} />
            <span>{branding.phone}</span>
          </a>
        </div>
      </div>

      <header className="header">
        <div className="header-container">
          <Link to="/" className="logo">
            {branding.logo_url ? (
              <img src={resolveImageUrl(branding.logo_url)} alt={branding.restaurant_name} />
            ) : (
              <div className="logo-text">
                <span className="logo-main">{branding.restaurant_name.toUpperCase()}</span>
                <span className="logo-sub">{branding.tagline}</span>
              </div>
            )}
          </Link>

          <nav className={`nav ${isMobileMenuOpen ? 'nav-open' : ''}`}>
            <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>Home</Link>
            <Link to="/about" className={`nav-link ${isActive('/about') ? 'active' : ''}`}>About</Link>
            <Link to="/menu" className={`nav-link ${isActive('/menu') ? 'active' : ''}`}>Menu</Link>
            <Link to="/reservation" className={`nav-link ${isActive('/reservation') ? 'active' : ''}`}>Reservation</Link>
            <Link to="/contact" className={`nav-link ${isActive('/contact') ? 'active' : ''}`}>Contact</Link>
          </nav>

          <div className="header-actions">
            <Link to="/menu" className="btn btn-primary order-btn">ORDER ONLINE</Link>
            <Link to="/login" className="action-icon">
              <User size={20} />
            </Link>
            <Link to="/cart" className="action-icon cart-icon">
              <ShoppingCart size={20} />
              {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
            </Link>
            <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X size={24} /> : <MenuIcon size={24} />}
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {children}
      </main>

      <footer className="footer">
        <div className="footer-top">
          <div className="footer-container">
            <div className="footer-grid">
              <div className="footer-col about-col">
                <Link to="/" className="footer-logo">
                  <img 
                    src={resolveImageUrl(branding.logo_url, '/logo.png')} 
                    alt={branding.restaurant_name} 
                    style={{ height: '56px', width: 'auto' }}
                  />
                </Link>
                <p className="footer-about-text">
                  Experience the true essence of Halal cuisine at {branding.restaurant_name}. 
                  We bring you authentic flavors prepared with the freshest ingredients and traditional recipes.
                </p>
                <div className="social-links">
                  <span className="social-link"><Share2 size={18} /></span>
                  <span className="social-link"><Heart size={18} /></span>
                  <span className="social-link"><Globe size={18} /></span>
                </div>
              </div>

              <div className="footer-col links-col">
                <h3 className="footer-title">Quick Links</h3>
                <ul className="footer-links">
                  <li><Link to="/">Home</Link></li>
                  <li><Link to="/about">About Us</Link></li>
                  <li><Link to="/menu">Our Menu</Link></li>
                  <li><Link to="/reservation">Reservation</Link></li>
                  <li><Link to="/contact">Contact Us</Link></li>
                </ul>
              </div>

              <div className="footer-col contact-col">
                <h3 className="footer-title">Contact Info</h3>
                <ul className="contact-info-list">
                  <li>
                    <MapPin size={18} className="contact-icon" />
                    <span>{branding.address}</span>
                  </li>
                  <li>
                    <Phone size={18} className="contact-icon" />
                    <span>{branding.phone}</span>
                  </li>
                  <li>
                    <Mail size={18} className="contact-icon" />
                    <span>{branding.email}</span>
                  </li>
                  <li>
                    <Clock size={18} className="contact-icon" />
                    <span>Daily: {formatTime12hr(businessHours.openingTime)} - {formatTime12hr(businessHours.closingTime)}</span>
                  </li>
                </ul>
              </div>

              <div className="footer-col newsletter-col">
                <h3 className="footer-title">Newsletter</h3>
                <p>Subscribe to get the latest updates and offers.</p>
                <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
                  <input type="email" placeholder="Your Email Address" required />
                  <button type="submit" className="btn btn-primary">Subscribe</button>
                </form>
              </div>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="footer-container">
            <p className="copyright">
              &copy; {new Date().getFullYear()} {branding.restaurant_name}. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
