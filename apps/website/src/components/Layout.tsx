import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, ShoppingCart, Share2, Heart, Globe, Menu as MenuIcon, X, Mail, Phone, Clock } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { API_BASE_URL, resolveImageUrl } from '../config';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { totalItems } = useCart();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [branding, setBranding] = useState({
    logo_url: '',
    secondary_logo_url: '',
    restaurant_name: 'ZAMZAM KITCHEN',
    tagline: 'AUTHENTIC FLAVORS',
    email: 'info@zamzamkitchen.com',
    phone: '+61 3 9939 2479',
    address: 'Racecourse Road, VIC, Melbourne, Australia',
    opening_time: '12:00:00',
    closing_time: '23:00:00'
  });

  useEffect(() => {
    // Close mobile menu on route change
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/settings`)
      .then(res => res.json())
      .then(data => {
        if (data.tenant) {
          setBranding({
            logo_url: data.tenant.logo_url || '',
            secondary_logo_url: data.tenant.secondary_logo_url || '',
            restaurant_name: data.tenant.restaurant_name || 'ZAMZAM KITCHEN',
            tagline: data.tenant.tagline || 'AUTHENTIC FLAVORS',
            email: data.tenant.business_email || 'info@zamzamkitchen.com',
            phone: data.tenant.business_phone || '+61 3 9939 2479',
            address: data.tenant.business_address || 'Racecourse Road, VIC, Melbourne, Australia',
            opening_time: data.branch?.opening_time || '12:00:00',
            closing_time: data.branch?.closing_time || '23:00:00'
          });
        }
      })
      .catch(err => console.error('Error fetching branding:', err));
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };


  return (
    <div className="layout">
      <div className="top-bar">
        <div className="top-bar-left">
          <div className="top-bar-item">
            <Clock size={14} />
            <span>Opens Daily: {formatTime(branding.opening_time)} - {formatTime(branding.closing_time)}</span>
          </div>
        </div>
        <div className="top-bar-right">
          <a href={`mailto:${branding.email}`} className="top-bar-item" style={{ color: 'inherit', textDecoration: 'none' }}>
            <Mail size={14} />
            <span>{branding.email}</span>
          </a>
          <a href={`tel:${branding.phone}`} className="top-bar-item" style={{ color: 'inherit', textDecoration: 'none' }}>
            <Phone size={14} />
            <span>{branding.phone}</span>
          </a>
        </div>
      </div>
      <header className="glass-header">
        <div className="header-container">
          <Link to="/" className="brand-logo" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="logo-images" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <img 
                src={resolveImageUrl(branding.logo_url)} 
                alt={branding.restaurant_name} 
                style={{ height: '56px', width: 'auto', display: 'block' }} 
                onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
              />
              {branding.secondary_logo_url && (
                <img 
                  src={resolveImageUrl(branding.secondary_logo_url, '/logo.png')} 
                  alt="Secondary Logo" 
                  style={{ height: '56px', width: 'auto', display: 'block' }} 
                />
              )}
            </div>
            <div className="brand-text" style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="restaurant-name" style={{ color: 'var(--text-main)', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '1px', lineHeight: 1 }}>{branding.restaurant_name.toUpperCase()}</span>
              <span className="restaurant-tagline" style={{ color: 'var(--primary-orange)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>{branding.tagline}</span>
            </div>
          </Link>

          <nav className="desktop-nav">
            <Link to="/" className={isActive('/') ? 'active' : ''}>Home</Link>
            <Link to="/about" className={isActive('/about') ? 'active' : ''}>About</Link>
            <Link to="/menu" className={isActive('/menu') ? 'active' : ''}>Menu</Link>
            <Link to="/reservation" className={isActive('/reservation') ? 'active' : ''}>Reservation</Link>
            <Link to="/contact" className={isActive('/contact') ? 'active' : ''}>Contact</Link>
          </nav>

          <div className="header-actions">
            <Link to="/menu" className="btn-primary hide-mobile">Order Online</Link>
            <Link to="/auth" className="icon-btn" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none'}}>
              <User size={20} />
            </Link>
            <Link to="/cart" className="icon-btn cart-btn" style={{ textDecoration: 'none' }}>
              <ShoppingCart size={18} />
              <span className="cart-text hide-mobile">Cart</span>
              {totalItems > 0 && (
                <span className="cart-badge">{totalItems}</span>
              )}
            </Link>
            <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X size={24} /> : <MenuIcon size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className={`mobile-nav ${isMobileMenuOpen ? 'open' : ''}`}>
          <Link to="/" className={isActive('/') ? 'active' : ''}>Home</Link>
          <Link to="/about" className={isActive('/about') ? 'active' : ''}>About</Link>
          <Link to="/menu" className={isActive('/menu') ? 'active' : ''}>Menu</Link>
          <Link to="/reservation" className={isActive('/reservation') ? 'active' : ''}>Reservation</Link>
          <Link to="/contact" className={isActive('/contact') ? 'active' : ''}>Contact</Link>
          <Link to="/menu" className="btn-primary" style={{ textAlign: 'center', marginTop: '1rem' }}>Order Online Now</Link>
        </div>
      </header>

      <main className="main-content">
        {children}
      </main>

      <footer className="site-footer">
        <div className="footer-container">
          <div className="footer-brand">
            <div className="footer-brand-logo">
              <div className="logo-images">
                <img 
                  src={resolveImageUrl(branding.logo_url, '/logo.png')} 
                  alt={branding.restaurant_name} 
                  style={{ height: '56px', width: 'auto', display: 'block' }} 
                  onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
                />
                {branding.secondary_logo_url && (
                  <img 
                    src={resolveImageUrl(branding.secondary_logo_url, '/logo.png')} 
                    alt="Secondary Logo" 
                    style={{ height: '56px', width: 'auto', display: 'block' }} 
                  />
                )}
              </div>
              <span className="footer-brand-name">{branding.restaurant_name.toUpperCase()}</span>
            </div>
            <p className="footer-desc">
              The destination for food lovers who value quality, taste, and exceptional service.
            </p>
            <div className="social-links">
              <Share2 size={18} />
              <Heart size={18} />
              <Globe size={18} />
            </div>
          </div>

          <div className="footer-links">
            <h4>Quick Links</h4>
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
            <Link to="/menu" className="highlight">Menu</Link>
            <Link to="/reservation">Reservation</Link>
            <Link to="/contact">Contact</Link>
          </div>

          <div className="footer-links">
            <h4>Privacy & Legal</h4>
            <Link to="#">Privacy Policy</Link>
            <Link to="#">Terms of Service</Link>
            <Link to="#">Refund Policy</Link>
            <Link to="#">Accessibility</Link>
          </div>

          <div className="footer-contact">
            <h4>Contact</h4>
            <p>{branding.address}</p>
            <p>{branding.phone}</p>
            <p>{branding.email}</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} {branding.restaurant_name}. All rights reserved.</p>
          <p className="powered-by">Powered by: Techsoft</p>
        </div>
      </footer>
    </div>
  );
}
