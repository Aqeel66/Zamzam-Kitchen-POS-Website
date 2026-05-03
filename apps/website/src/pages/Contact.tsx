import { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react';
import { API_BASE_URL } from '../config';
import './Contact.css';

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const resp = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (resp.ok) {
        setStatus('success');
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setStatus('error');
      }
    } catch (err) {
      setStatus('error');
    }
  };
  return (
    <div className="contact-page">
      <div className="common-hero contact-hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1 className="white text-5xl font-bold mb-3">Contact <span className="text-orange">Us</span></h1>
          <p className="white opacity-90 text-lg max-w-2xl mx-auto">Have a question about our menu, need to book a large event, or just want to say hello? We'd love to hear from you.</p>
        </div>
      </div>

      <div className="section-padding container-simple">
        {/* Contact info Side - Now TOP */}
        <div className="contact-info-side mb-12">
          <div className="info-grid-simple" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
             <div className="info-box-item">
                <div className="icon-wrap" style={{ color: 'var(--primary-orange)', marginBottom: '1rem' }}><MapPin size={28}/></div>
                <h4 className="font-bold">Visit Us</h4>
                <p className="text-muted text-sm">329 Racecourse Road. VIC,<br/>Melbourne Australia</p>
             </div>
             <div className="info-box-item">
                <div className="icon-wrap" style={{ color: 'var(--primary-orange)', marginBottom: '1rem' }}><Phone size={28}/></div>
                <h4 className="font-bold">Call Us</h4>
                <p className="text-muted text-sm">Main: +0 (000) 000-0000<br/>Reservations: +0 (000) 000-0000</p>
             </div>
             <div className="info-box-item">
                <div className="icon-wrap" style={{ color: 'var(--primary-orange)', marginBottom: '1rem' }}><Mail size={28}/></div>
                <h4 className="font-bold">Email Us</h4>
                <p className="text-muted text-sm">hello@zamzamkitchen.com<br/>events@zamzamkitchen.com</p>
             </div>
             <div className="info-box-item">
                <div className="icon-wrap" style={{ color: 'var(--primary-orange)', marginBottom: '1rem' }}><Clock size={28}/></div>
                <h4 className="font-bold">Business Hours</h4>
                <p className="text-muted text-sm">Opens Daily From:<br/>12PM - 11PM</p>
             </div>
          </div>
        </div>

        {/* Action Row: Map & Form - Now Together in a grid below */}
        <div className="grid-2 gap-10">
          <div className="map-side">
            <div className="map-simple" style={{ height: '100%', minHeight: '450px', background: '#eee', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
               <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3153.83296030999!2d144.912!3d-37.7853756!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6ad65d7c3d2d0b55%3A0x2a04561a355f342b!2s329%20Racecourse%20Rd%2C%20Flemington%20VIC%203031%2C%20Australia!5e0!3m2!1sen!2sau!4v1711555555555!5m2!1sen!2sau" 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen={true} 
                  loading="lazy">
               </iframe>
            </div>
          </div>

          {/* Contact Form Side - Now effectively 'one row down' if stacked or part of a 2nd section */}
          <div className="contact-form-side">
            <h2 className="section-title mb-8">Send us a Message</h2>
            <form className="cf-form-simple" onSubmit={handleSubmit}>
              <div className="form-row-2 mb-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Name</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="Your name" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }}
                  />
                </div>
                <div className="input-group">
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Email</label>
                  <input 
                    required 
                    type="email" 
                    placeholder="yourname@email.com" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }}
                  />
                </div>
              </div>
              
              <div className="input-group mb-4">
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Subject</label>
                <input 
                  required 
                  type="text" 
                  placeholder="How can we help?" 
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }}
                />
              </div>

              <div className="input-group mb-5">
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Message</label>
                <textarea 
                  required 
                  placeholder="Your message..." 
                  rows={6} 
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }}
                ></textarea>
              </div>

              {status === 'success' && <p style={{ color: 'green', marginBottom: '1rem' }}>Message sent successfully!</p>}
              {status === 'error' && <p style={{ color: 'red', marginBottom: '1rem' }}>Failed to send message. Please try again.</p>}

              <button 
                type="submit" 
                disabled={status === 'loading'}
                className="btn-primary w-full py-4 font-bold flex items-center justify-center gap-2"
              >
                 {status === 'loading' ? 'Sending...' : <><Send size={18}/> Send Message</>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
