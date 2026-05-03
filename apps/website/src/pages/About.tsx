import { Users, Award, Heart } from 'lucide-react';
import './About.css';

export default function About() {
  return (
    <div className="about-page">
      {/* Hero Header */}
      <section className="common-hero about-hero">
          <div className="hero-overlay"></div>
          <div className="hero-content">
              <span className="badge mb-3">OUR STORY</span>
              <h1 className="white text-5xl font-bold">About <span className="text-orange">Zamzam Kitchen</span></h1>
              <p className="white opacity-90 text-xl max-w-2xl mx-auto mt-4">Redefining the Halal dining experience in Melbourne with tradition, quality, and a passion for premium ingredients.</p>
          </div>
      </section>

      <section className="section-padding">
          <div className="grid-2 align-center gap-5">
              <div className="about-content">
                  <h2 className="mb-4">Our Culinary Journey</h2>
                  <p className="mb-4 lead">Since 2008, we have been at the forefront of authentic Halal cuisine, merging traditional flavors with contemporary culinary techniques.</p>
                  <p className="mb-5">Our story began with a small family kitchen and a big dream: to serve food that warms the soul and celebrates the rich heritage of our ancestors. Today, we continue that tradition in every dish we serve.</p>
                  
                  <div className="grid-2 gap-4">
                      <div className="milestone">
                          <strong className="text-3xl text-orange">15+</strong>
                          <p className="text-sm font-bold">Years Experience</p>
                      </div>
                      <div className="milestone">
                          <strong className="text-3xl text-orange">50k+</strong>
                          <p className="text-sm font-bold">Happy Customers</p>
                      </div>
                  </div>
              </div>
              <div className="about-visual-collage">
                  <div className="collage-box">
                      <div className="collage-img-1"></div>
                      <div className="collage-img-2"></div>
                      <div className="collage-img-2"></div>
                  </div>
              </div>
          </div>
      </section>

      {/* Values Section */}
      <section className="section-padding section-bg-light">
          <div className="text-center mb-5">
              <h2 className="mb-3">Our Core Values</h2>
              <p className="text-muted">The principles that guide our kitchen and service every single day.</p>
          </div>
          
          <div className="values-cards-grid">
              <div className="value-item-box">
                  <div className="icon-p-circle"><Award size={32}/></div>
                  <h4 className="mb-3">Premium Quality</h4>
                  <p className="text-muted">We source only the finest organic ingredients and 100% certified Halal meats.</p>
              </div>
              <div className="value-item-box">
                   <div className="icon-p-circle"><Heart size={32}/></div>
                  <h4 className="mb-3">Made with Love</h4>
                  <p className="text-muted">Every recipe is a labor of love, passed down through generations and perfected.</p>
              </div>
              <div className="value-item-box">
                   <div className="icon-p-circle"><Users size={32}/></div>
                  <h4 className="mb-3">Community First</h4>
                  <p className="text-muted">We celebrate our roots and give back to the community that has supported us.</p>
              </div>
          </div>
      </section>

      {/* CTA Section */}
      <section className="cta-banner section-padding text-center">
          <div className="cta-content">
               <h2 className="white mb-4">Ready to Experience Fine Dining?</h2>
               <p className="white opacity-80 mb-5">Join us for an unforgettable meal or order your favorites online today.</p>
               <div className="hero-actions justify-center">
                  <button className="btn-primary" onClick={() => window.location.href='/reservation'}>Book Your Table</button>
                  <button className="btn-outline white" onClick={() => window.location.href='/menu'}>Explore Menu</button>
               </div>
          </div>
      </section>
    </div>
  );
}
