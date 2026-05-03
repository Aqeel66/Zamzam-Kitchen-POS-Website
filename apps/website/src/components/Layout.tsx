import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, ShoppingCart, Share2, Heart, Globe } from 'lucide-react';
import { useCart } from '../context/CartContext';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { totalItems } = useCart();
  const [branding, setBranding] = useState({
    logo_url: '',
    secondary_logo_url: '',
    restaurant_name: 'ZAMZAM KITCHEN'
  });

  useEffect(() => {
    fetch('http://localhost:5000/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.tenant) {
          setBranding({
            logo_url: data.tenant.logo_url || '',
            secondary_logo_url: data.tenant.secondary_logo_url || '',
            restaurant_name: data.tenant.restaurant_name || 'ZAMZAM KITCHEN'
          });
        }
      })
      .catch(err => console.error('Error fetching branding:', err));
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const resolveImageUrl = (path: string) => {
    if (!path) return '/logo.png';
    if (path.startsWith('http')) return path;
    // Remove leading slashes/assets if present to match backend serve logic
    let cleanPath = path.replace(/^\/?(assets\/)?/, '');
    return `http://localhost:5000/assets/${cleanPath}`;
  };

  return (
    <div className="layout">
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
                  src={resolveImageUrl(branding.secondary_logo_url)} 
                  alt="Secondary Logo" 
                  style={{ height: '56px', width: 'auto', display: 'block' }} 
                />
              )}
            </div>
            <div className="brand-text" style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="restaurant-name" style={{ color: 'var(--text-main)', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '1px', lineHeight: 1 }}>{branding.restaurant_name.toUpperCase()}</span>
              <span className="restaurant-tagline" style={{ color: 'var(--primary-orange)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>Authentic Flavors</span>
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
            <Link to="/menu" className="btn-primary">Order Online</Link>
            <Link to="/auth" className="icon-btn" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none'}}>
              <User size={20} />
            </Link>
            <Link to="/cart" className="icon-btn cart-btn" style={{position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none'}}>
              <ShoppingCart size={20} />
              {totalItems > 0 && (
                <span className="cart-badge" style={{position: 'absolute', top: '-5px', right: '-5px', background: 'var(--primary-orange)', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{totalItems}</span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <main className="main-content">
        {children}
      </main>

      <footer className="site-footer">
        <div className="footer-container">
          <div className="footer-brand">
            <div className="footer-brand-logo" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div className="logo-images" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <img 
                  src={resolveImageUrl(branding.logo_url)} 
                  alt={branding.restaurant_name} 
                  style={{ height: '40px', width: 'auto', display: 'block' }} 
                  onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
                />
                {branding.secondary_logo_url && (
                  <img 
                    src={resolveImageUrl(branding.secondary_logo_url)} 
                    alt="Secondary Logo" 
                    style={{ height: '40px', width: 'auto', display: 'block' }} 
                  />
                )}
              </div>
              <span style={{ color: 'white', fontSize: '1.2rem', fontWeight: 700, letterSpacing: '1px' }}>{branding.restaurant_name.toUpperCase()}</span>
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
            <p>Racecourse Road</p>
            <p>VIC, Melbourne, Australia</p>
            <p>(000) 000-0000</p>
            <p>hello@Zamzamkitchen.com</p>
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
