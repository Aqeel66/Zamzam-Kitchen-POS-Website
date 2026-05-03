import { ShoppingCart, MapPin, Clock, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [activeCategory, setActiveCategory] = useState("All Items");
  const [menuData, setMenuData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/menu');
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
  
  // Get items for the grid
  const displayedItems = menuData
    .filter(cat => activeCategory === 'All Items' || activeCategory === cat.name)
    .flatMap(cat => cat.items)
    .slice(0, 4); // Show only top 4 on home
  
  return (
    <div className="home-page">
      {/* Hero Section - Matching Image */}
      <section className="hero-section">
        <div className="hero-overlay"></div>
        <div className="hero-content text-center">
            <h1 className="hero-title white">
                Delicious Dining <span className="text-orange">Delivered</span> <br/> to Your Door
            </h1>
            <p className="hero-subtitle white">
                Experience the finest local ingredients and artisanal recipes at Zamzam Kitchen. <br/>
                Order online for pickup or delivery within minutes.
            </p>
            <div className="hero-actions justify-center">
                <button className="btn-primary" onClick={() => navigate('/menu')}>Order Online Now</button>
                <button className="btn-outline white" onClick={() => navigate('/reservation')}>Book Table Now</button>
            </div>
        </div>
      </section>

      {/* Our Menu Section - Matching Image */}
      <section className="section-padding section-bg-light">
          <div className="section-header-row mb-5">
              <div className="header-left">
                  <h2 className="section-title">Our Menu</h2>
                  <p className="section-subtitle">Fresh ingredients, prepared daily by our master chefs.</p>
              </div>
              <div className="category-nav-pills">
                  {categories.map(cat => (
                      <button 
                        key={cat} 
                        className={`nav-pill ${activeCategory === cat ? 'active' : ''}`}
                        onClick={() => setActiveCategory(cat)}
                      >
                        {cat}
                      </button>
                  ))}
              </div>
          </div>

          <div className="menu-preview-grid">
              {isLoading ? (
                <div className="text-center py-10 w-full col-span-full">
                  <p className="text-gray-500">Loading featured items...</p>
                </div>
              ) : displayedItems.map(item => (
                  <div key={item.id} className="menu-card-premium">
                      <div className="card-img-large" style={{ 
                        backgroundImage: item.image ? `url(http://localhost:5000/${item.image.startsWith('assets/') ? item.image : `assets/${item.image}`})` : 'url(/placeholder-food.jpg)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}>
                          {item.badge && <span className={`card-badge ${item.badge === 'BEST SELLER' ? 'orange' : 'green'}`}>{item.badge}</span>}
                      </div>
                      <div className="card-body">
                          <div className="title-price-row">
                              <h4>{item.name}</h4>
                              <span className="price">${parseFloat(item.price).toFixed(2)}</span>
                          </div>
                          <p className="card-text">{item.description}</p>
                          <button 
                             className="btn-add-cart-outline" 
                             onClick={() => addToCart({ id: item.id, name: item.name, price: parseFloat(item.price), image: item.image })}
                          >
                             <ShoppingCart size={16}/> Add to Cart
                          </button>
                      </div>
                  </div>
              ))}
          </div>

          <div className="center-action mt-5">
              <button className="btn-primary" onClick={() => navigate('/menu')}>View Full Menu</button>
          </div>
      </section>

      {/* Our Story Section - Matching Image */}
      <section className="story-premium-section section-padding">
          <div className="grid-2 align-center gap-5">
              <div className="story-visuals">
                  <div className="main-story-img"></div>
                  <div className="experience-badge">
                      <strong className="text-3xl">15+</strong>
                      <p>Years of Culinary Excellence</p>
                  </div>
              </div>
              <div className="story-content">
                  <span className="overline text-orange">OUR STORY</span>
                  <h2 className="mb-4">Crafting Memories <br/> Through Fine Dining</h2>
                  <p className="mb-3 lead">Founded in 2008, Zamzam Kitchen began with a simple mission: to bring world-class culinary experiences to our local community.</p>
                  <p className="mb-4">We source only the freshest organic ingredients from regional farmers to ensure every dish tells a story of quality and passion. Whether you're dining in our elegant main hall or ordering for a cozy night at home, our commitment to excellence remains the same. Our kitchen merges traditional techniques with modern innovation.</p>
                  
                  <div className="chef-signature">
                      <div className="chef-avatar"></div>
                      <div className="chef-info">
                          <h5 className="mb-0">Abdur Rahman Farrah</h5>
                          <p className="text-muted mb-0">Executive Chef & Founder</p>
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* Find Us Section - Matching Image */}
      <section className="section-padding section-bg-light">
          <div className="grid-2 gap-5 align-center">
              <div className="contact-details-box">
                  <h2 className="mb-4">Find Us</h2>
                  <p className="mb-5">Located in the heart of the city's culinary district.</p>
                  
                  <div className="info-item mb-4">
                      <div className="icon-circle"><MapPin size={22}/></div>
                      <div className="text-col">
                          <strong>Address</strong>
                          <span>Racecourse Road VIC, Melbourne, Australia</span>
                      </div>
                  </div>
                  <div className="info-item mb-4">
                      <div className="icon-circle"><Clock size={22}/></div>
                      <div className="text-col">
                          <strong>Hours</strong>
                          <span>Opens Daily From: 12:00 PM - 11:00 PM</span>
                      </div>
                  </div>
                  <div className="info-item">
                      <div className="icon-circle"><Phone size={22}/></div>
                      <div className="text-col">
                          <strong>Contact</strong>
                          <span>+0 (000) 000-0000 <br/> hello@zamzamkitchen.com</span>
                      </div>
                  </div>
              </div>
               <div className="map-visual" style={{ height: '400px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.05)' }}>
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
      </section>
    </div>
  );
}
