import { useState } from 'react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="auth-page section-padding section-bg-light" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
       <div className="auth-card" style={{ background: 'white', padding: '3rem', borderRadius: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          
          <form className="auth-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
             {!isLogin && (
                <div className="input-group">
                   <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Full Name</label>
                   <input type="text" placeholder="John Doe" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}/>
                </div>
             )}
             <div className="input-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Email Address</label>
                <input type="email" placeholder="hello@example.com" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}/>
             </div>
             <div className="input-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Password</label>
                <input type="password" placeholder="••••••••" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}/>
             </div>

             <button type="button" className="btn-primary" style={{ width: '100%', padding: '1rem', marginTop: '1rem', border: 'none', borderRadius: '8px', background: 'var(--primary-orange)', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                {isLogin ? 'Sign In' : 'Register'}
             </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#6b7280', fontSize: '0.9rem' }}>
             {isLogin ? "Don't have an account? " : "Already have an account? "}
             <button onClick={() => setIsLogin(!isLogin)} style={{ background: 'none', border: 'none', color: 'var(--primary-orange)', fontWeight: 600, cursor: 'pointer' }}>
                {isLogin ? 'Sign Up' : 'Log In'}
             </button>
          </p>
       </div>
    </div>
  );
}
