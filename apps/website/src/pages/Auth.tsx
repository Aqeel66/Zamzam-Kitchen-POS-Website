import { useState, useEffect } from 'react';
import { API_BASE_URL, resolveImageUrl } from '../config';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [bgImage, setBgImage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/settings?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (data.tenant?.login_background_url) {
          setBgImage(resolveImageUrl(data.tenant.login_background_url));
        }
      })
      .catch(err => console.error('Error fetching auth bg:', err));
  }, []);

  return (
    <div className="auth-page section-padding" style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      background: bgImage ? `url(${bgImage}) center/cover no-repeat` : 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)'
    }}>
        {/* Overlay to ensure readability */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)',
          zIndex: 1
        }}></div>

        <div className="auth-card" style={{ 
          background: 'white', 
          padding: '3.5rem', 
          borderRadius: '32px', 
          width: '100%', 
          maxWidth: '450px', 
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          position: 'relative',
          zIndex: 10,
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(255, 255, 255, 0.95)'
        }}>
           <h2 style={{ textAlign: 'center', marginBottom: '0.5rem', fontSize: '2rem', fontWeight: 800 }}>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
           <p style={{ textAlign: 'center', color: '#666', marginBottom: '2.5rem' }}>
             {isLogin ? 'Enter your details to access your account' : 'Join us for a premium dining experience'}
           </p>
           
           <form className="auth-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {!isLogin && (
                 <div className="input-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Full Name</label>
                    <input type="text" placeholder="John Doe" style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #ddd', outline: 'none', transition: 'border-color 0.2s' }}/>
                 </div>
              )}
              <div className="input-group">
                 <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Email Address</label>
                 <input type="email" placeholder="hello@example.com" style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #ddd', outline: 'none' }}/>
              </div>
              <div className="input-group">
                 <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Password</label>
                 <input type="password" placeholder="••••••••" style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #ddd', outline: 'none' }}/>
              </div>

              <button type="button" className="btn-primary" style={{ 
                width: '100%', 
                padding: '1.1rem', 
                marginTop: '1.5rem', 
                border: 'none', 
                borderRadius: '12px', 
                background: 'linear-gradient(135deg, #f15a24 0%, #ff8c00 100%)', 
                color: 'white', 
                fontWeight: 700, 
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 10px 15px -3px rgba(241, 90, 36, 0.3)'
              }}>
                 {isLogin ? 'Sign In' : 'Register'}
              </button>
           </form>

           <p style={{ textAlign: 'center', marginTop: '2rem', color: '#444', fontSize: '0.95rem' }}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button onClick={() => setIsLogin(!isLogin)} style={{ background: 'none', border: 'none', color: '#f15a24', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
                 {isLogin ? 'Sign Up' : 'Log In'}
              </button>
           </p>
        </div>
    </div>
  );
}
