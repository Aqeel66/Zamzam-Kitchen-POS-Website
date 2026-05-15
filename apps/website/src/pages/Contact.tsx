import { useState, useEffect } from 'react';
import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react';
import { API_BASE_URL } from '../config';
import './Contact.css';

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [branding, setBranding] = useState({
    email: 'info@zamzamkitchen.com',
    phone: '+61 3 9939 2479',
    address: '329 Racecourse Road, VIC, Melbourne, Australia'
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
      .catch(err => console.error('Error fetching settings:', err));

    fetch(`${API_BASE_URL}/settings/branding?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (data) {
          setBranding({
            email: data.email || 'info@zamzamkitchen.com',
            phone: data.phone || '+61 3 9939 2479',
            address: data.address || '329 Racecourse Road, VIC, Melbourne, Australia'
          });
        }
      })
      .catch(err => console.error('Error fetching branding:', err));
  }, []);

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
      <section className="contact-hero">
        <h1>Contact Us</h1>
        <p>We'd love to hear from you. Get in touch with our team.</p>
      </section>

      <section className="contact-content">
        <div className="contact-container">
          <div className="contact-grid">
            <div className="contact-info">
              <h2>Get In Touch</h2>
              <p className="contact-intro">Have a question or feedback? Our team is here to help you.</p>
              
              <div className="info-list">
                <div className="info-card">
                  <div className="card-icon"><MapPin size={24} /></div>
                  <div className="card-text">
                    <h3>Address</h3>
                    <p>{branding.address}</p>
                  </div>
                </div>
                <div className="info-card">
                  <div className="card-icon"><Phone size={24} /></div>
                  <div className="card-text">
                    <h3>Phone</h3>
                    <p>{branding.phone}</p>
                  </div>
                </div>
                <div className="info-card">
                  <div className="card-icon"><Mail size={24} /></div>
                  <div className="card-text">
                    <h3>Email</h3>
                    <p>{branding.email}</p>
                  </div>
                </div>
                <div className="info-card">
                  <div className="card-icon"><Clock size={24} /></div>
                  <div className="card-text">
                    <h3>Opening Hours</h3>
                    <p>Daily: {businessHours.openingTime} - {businessHours.closingTime}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="contact-form-container">
              <form className="contact-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Enter your name" 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input 
                    type="email" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    placeholder="Enter your email" 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Subject</label>
                  <input 
                    type="text" 
                    value={formData.subject} 
                    onChange={e => setFormData({...formData, subject: e.target.value})}
                    placeholder="How can we help?" 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Message</label>
                  <textarea 
                    rows={5} 
                    value={formData.message} 
                    onChange={e => setFormData({...formData, message: e.target.value})}
                    placeholder="Your message here..." 
                    required
                  ></textarea>
                </div>
                <button type="submit" className="btn btn-primary submit-btn" disabled={status === 'loading'}>
                  {status === 'loading' ? 'Sending...' : (
                    <>
                      <span>Send Message</span>
                      <Send size={18} />
                    </>
                  )}
                </button>
                {status === 'success' && <p className="status-msg success">Message sent successfully!</p>}
                {status === 'error' && <p className="status-msg error">Failed to send message. Please try again.</p>}
              </form>
            </div>
          </div>
        </div>
      </section>

      <section className="contact-map">
        <iframe 
          title="Zamzam Kitchen Location"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3153.250495818461!2d144.92546417666248!3d-37.78421033230193!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6ad65d1667d4f61b%3A0x6e9a7a9a7a9a7a9a!2sZamzam%20Kitchen!5e0!3m2!1sen!2sau!4v1715432123456!5m2!1sen!2sau" 
          width="100%" 
          height="450" 
          style={{ border: 0 }} 
          allowFullScreen 
          loading="lazy"
        ></iframe>
      </section>
    </div>
  );
}
