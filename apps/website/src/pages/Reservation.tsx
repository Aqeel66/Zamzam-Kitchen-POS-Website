import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Store } from 'lucide-react';
import './Reservation.css';

export default function Reservation() {
  const navigate = useNavigate();
    const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', 
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
    '21:00', '21:30', '22:00', '22:30'
  ]);
  const [guests, setGuests] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [availableTables, setAvailableTables] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [loadingTables, setLoadingTables] = useState(false);
  const [formData, setFormData] = useState({
      name: '',
      phone: '',
      email: '',
      notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Dynamic Booking Fee Settings
  const [isFeeEnabled, setIsFeeEnabled] = useState(true);
  const [feeAmount, setFeeAmount] = useState(10.00);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'counter'>('card');
  const [paymentData, setPaymentData] = useState({
     cardNumber: '',
     expiry: '',
     cvc: ''
  });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Fetch branch settings for booking fee
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/settings');
        const data = await response.json();
        if (data.branch) {
          // Treat null as enabled (default on) — only disable if explicitly set to 0
          setIsFeeEnabled(data.branch.is_booking_fee_enabled !== 0);
          if (data.branch.booking_fee_amount !== null && data.branch.booking_fee_amount !== undefined) {
            setFeeAmount(parseFloat(data.branch.booking_fee_amount));
          }
        }
      } catch (error) {
        console.error('Settings Fetch Error:', error);
      }
    };
    fetchSettings();
  }, []);

  // Real availability fetching for time slots
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!date) return;
      
      try {
        const allSlots = [
          '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', 
          '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
          '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
          '21:00', '21:30', '22:00', '22:30'
        ];

        let bookedSlots = [];
        try {
          const response = await fetch(`http://127.0.0.1:5000/api/reservations/availability/${date}`);
          const data = await response.json();
          bookedSlots = data.bookedSlots || [];
        } catch (err) {
          console.error('Fetch error:', err);
        }
        
        const today = new Date();
        const localToday = today.getFullYear() + '-' + 
                           String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                           String(today.getDate()).padStart(2, '0');
        
        const isToday = date === localToday;
        const currentHour = today.getHours();
        const currentMin = today.getMinutes();

        const filtered = allSlots.filter(t => {
          if (bookedSlots.includes(t)) return false;
          if (isToday) {
             const [h, m] = t.split(':').map(Number);
             if (h < currentHour || (h === currentHour && m <= currentMin)) return false;
          }
          return true;
        });

        setAvailableSlots(filtered);
      } catch (error) {
        console.error('Processing Error:', error);
      }
    };

    fetchAvailability();
  }, [date]);

  const fetchAvailableTables = async () => {
    if (!date || !time) return;
    setLoadingTables(true);
    try {
      const apiUrl = `http://127.0.0.1:5000/api/reservations/available-tables?date=${date}&time=${time}:00`;
      console.log('Fetching from:', apiUrl);
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`Server responded with ${response.status}`);
      const data = await response.json();
      console.log('Tables Data:', data);
      setAvailableTables(data.tables || []);
    } catch (error: any) {
      console.error('Table Fetch Error:', error);
      alert(`Connection Error: ${error.message}\nCheck if backend is running on port 5000.`);
    } finally {
      setLoadingTables(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!date || !time) {
        alert("Please select a date and time slot.");
        return;
      }
      fetchAvailableTables();
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!selectedTable) {
        alert("Please select a table to proceed.");
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!guests) {
        alert("Please select party size.");
        return;
      }
      setCurrentStep(4);
    }
  };

  const confirmBooking = async () => {
    if (!date || !time || !guests || !selectedTable) {
        alert("Incomplete reservation details. Please check your selection.");
        return;
    }
    if (!formData.name || !formData.phone || !formData.email) {
        alert("Please fill in your contact details to proceed.");
        return;
    }
    if (isFeeEnabled && paymentMethod === 'card' && (!paymentData.cardNumber || !paymentData.expiry || !paymentData.cvc)) {
        alert("Please provide valid card details for the booking fee payment.");
        return;
    }

    setIsSubmitting(true);
    if (isFeeEnabled) setIsProcessingPayment(true);

    try {
      // Simulate Payment Processing Delay
      if (isFeeEnabled) {
          await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const response = await fetch('http://localhost:5000/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          date,
          time: `${time}:00`,
          guests,
          tableId: selectedTable.id,
          bookingFee: isFeeEnabled ? feeAmount : 0,
          paymentMethod,
          branchId: 1,
          origin: 'Website'
        })
      });

      const data = await response.json();

      if (data.success) {
        navigate('/success?type=reservation');
      } else {
        alert(data.message || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error('Booking Error:', error);
      alert('Could not connect to the server. Please check your connection.');
    } finally {
      setIsSubmitting(false);
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="reservation-page">
      <section className="common-hero reservation-hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <span className="badge mb-3" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '0.4rem 1rem', borderRadius: '30px', fontSize: '0.85rem', fontWeight: 600 }}>PREMIUM DINING</span>
          <h1 className="white text-5xl font-bold mb-3">Book <span className="text-orange">Your Table</span></h1>
          <p className="white opacity-90 text-lg max-w-2xl mx-auto">Fine dining, intimate evenings, and family celebrations – reserve your spot at Zamzam Kitchen.</p>
        </div>
      </section>

      <div className="section-padding res-container-layout">
       <div className="res-layout-grid">
          <div className="res-main-form">
             {/* Selection Trigger - The "Popup" Entry Point */}
             <div className="res-selection-trigger mb-10" onClick={() => { setShowModal(true); setCurrentStep(1); }}>
                <div className="trigger-item">
                  <span className="label">Date & Time</span>
                  <div className="value-box">
                    {date ? (
                      <>
                        <span className="value">{new Date(date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                        {time && <><span className="dot"></span><span className="value">{time}</span></>}
                      </>
                    ) : (
                      <span className="value placeholder">Select Date & Time</span>
                    )}
                  </div>
                </div>
                <div className="trigger-item border-left">
                  <span className="label">Table & Guests</span>
                  <div className="value-box">
                    <span className="value">
                      {selectedTable ? `Table ${selectedTable.table_number}` : 'Select Table'} 
                      {guests ? ` • ${guests} People` : ''}
                    </span>
                  </div>
                </div>
                <button className="btn-change">{!date || !time || !guests || !selectedTable ? 'Select' : 'Change'}</button>
             </div>

             <div className="res-section">
                <div className="res-section-header">
                   <div className="res-number">1</div>
                   <h3>Guest Information</h3>
                </div>
                <div className="guest-form-grid mt-6">
                   <div className="input-field full-width">
                       <label>Full Name</label>
                       <input 
                         type="text" 
                         placeholder="Enter your full name" 
                         value={formData.name}
                         onChange={e => setFormData({...formData, name: e.target.value})}
                         required
                       />
                   </div>
                   <div className="input-field full-width">
                       <label>WhatsApp / Phone Number</label>
                       <input 
                         type="tel" 
                         placeholder="e.g. +61 400 000 000" 
                         value={formData.phone}
                         onChange={e => setFormData({...formData, phone: e.target.value})}
                         required
                       />
                   </div>
                   <div className="input-field full-width">
                       <label>Email Address</label>
                       <input 
                         type="email" 
                         placeholder="yourname@example.com" 
                         value={formData.email}
                         onChange={e => setFormData({...formData, email: e.target.value})}
                         required
                       />
                   </div>
                   <div className="input-field full-width">
                       <label>Special Occasion / Requests (Optional)</label>
                       <textarea 
                         placeholder="Birthday, anniversary, or dietary requirements..." 
                         rows={4}
                         value={formData.notes}
                         onChange={e => setFormData({...formData, notes: e.target.value})}
                       ></textarea>
                   </div>
                </div>
             </div>
          </div>

          <aside className="res-sidebar-premium">
             <div className="sticky-sidebar">
                <div className="reservation-summary-card">
                   <h3>Reservation Summary</h3>
                   <div className="summary-list">
                      <div className="summary-row">
                         <span className="label">Date</span>
                         <span className="value">{date || 'Not selected'}</span>
                      </div>
                      <div className="summary-row">
                         <span className="label">Time</span>
                         <span className="value">{time || 'Not selected'}</span>
                      </div>
                      <div className="summary-row">
                         <span className="label">Table</span>
                         <span className="value">{selectedTable ? `Table ${selectedTable.table_number}` : 'Not selected'}</span>
                      </div>
                      <div className="summary-row">
                         <span className="label">Guests</span>
                         <span className="value">{guests ? `${guests} People` : 'Not selected'}</span>
                      </div>
                      
                      {/* Booking Fee Section */}
                      {isFeeEnabled && (
                        <>
                          <div className="summary-section-divider my-4 h-[1px] bg-white/10"></div>
                          <div className="summary-row">
                             <span className="label text-orange font-bold">Booking Fee</span>
                             <span className="value text-orange font-bold">${feeAmount.toFixed(2)}</span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1 italic">* This fee is to prevent fake bookings and will be adjusted in your final bill.</p>
                        </>
                      )}

                      {/* Guest Info Section */}
                      <div className="summary-section-divider my-4 h-[1px] bg-white/10"></div>
                      
                      <div className="summary-row">
                         <span className="label">Name</span>
                         <span className="value">{formData.name || 'Not provided'}</span>
                      </div>
                      <div className="summary-row">
                         <span className="label">Phone</span>
                         <span className="value">{formData.phone || 'Not provided'}</span>
                      </div>
                      <div className="summary-row">
                         <span className="label">Email</span>
                         <span className="value font-medium text-xs break-all text-right">{formData.email || 'Not provided'}</span>
                      </div>
                   </div>
                   <button 
                      className="btn-primary w-full mt-6 flex items-center justify-center gap-2" 
                      onClick={confirmBooking}
                      disabled={isSubmitting || !selectedTable || !date || !time || !guests || (isFeeEnabled && paymentMethod === 'card' && (!paymentData.cardNumber || !paymentData.expiry || !paymentData.cvc))}
                    >
                       {isProcessingPayment ? 'Processing Payment...' : (isSubmitting ? 'Finalizing Booking...' : 'Book Table Now')} &rarr;
                   </button>
                   <p className="summary-note text-center mt-3">
                      You will receive an email/WhatsApp confirmation immediately after booking.
                   </p>
                </div>
                <div className="location-info-card mt-4">
                   <div className="location-img-mini"></div>
                   <div className="location-text">
                       <strong>Zamzam Kitchen</strong>
                       <p>329 Racecourse Road, VIC, Melbourne <br/> Australia. (000) 000-0000</p>
                       <a href="#" className="link-directions">Get Directions &rarr;</a>
                   </div>
                </div>
             </div>
          </aside>
       </div>
      </div>

      {/* Enhanced Reservation Modal - 4 Steps matching POS */}
      {showModal && (
        <div className="res-modal-overlay" onClick={() => setShowModal(false)}>
           <div className="res-modal-content" onClick={e => e.stopPropagation()}>
              {/* Processing Overlay */}
              {isProcessingPayment && (
                <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl">
                   <div className="loading-spinner-orange mb-4"></div>
                   <h3 className="text-xl font-bold text-gray-800">Processing Payment</h3>
                   <p className="text-gray-500">Securing your reservation...</p>
                </div>
              )}

              <div className="modal-header">
                 <div className="flex flex-col">
                    <h2 className="text-xl font-extrabold">
                       {currentStep === 1 && '1. Pick Slot'}
                       {currentStep === 2 && '2. Select Table'}
                       {currentStep === 3 && '3. Party Size'}
                       {currentStep === 4 && (isFeeEnabled ? '4. Online Payment' : '4. Final Review')}
                    </h2>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Step {currentStep} of 4</p>
                 </div>
                 <button className="close-modal" onClick={() => setShowModal(false)}>&times;</button>
              </div>
              
              <div className="modal-body-scroll">
                 {currentStep === 1 && (
                    <div className="step-1-layout">
                      {/* Step 1: Calendar */}
                      <div className="calendar-section">
                         <div className="flex justify-between items-center mb-4">
                            <h4 className="flex items-center gap-2 font-bold text-gray-700">Select Date</h4>
                            <div className="month-selector-wrap">
                               <select 
                                 value={`${selectedMonth}-${selectedYear}`} 
                                 onChange={(e) => {
                                    const [m, y] = e.target.value.split('-').map(Number);
                                    setSelectedMonth(m);
                                    setSelectedYear(y);
                                 }}
                                 className="month-dropdown-premium"
                               >
                                  {[...Array(12)].map((_, i) => {
                                     const mDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
                                     return (
                                        <option key={i} value={`${mDate.getMonth()}-${mDate.getFullYear()}`}>
                                           {mDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                        </option>
                                     );
                                  })}
                               </select>
                            </div>
                         </div>
                         
                         <div className="calendar-widget-mini">
                            <div className="calendar-grid">
                               {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => <div key={d} className="cal-day-label">{d}</div>)}
                               {[...Array(new Date(selectedYear, selectedMonth + 1, 0).getDate())].map((_, i) => {
                                   const dayNum = i + 1;
                                   const dateString = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
                                   const isActive = date === dateString;
                                   const cellDate = new Date(selectedYear, selectedMonth, dayNum);
                                   const isPast = cellDate.getTime() < new Date().setHours(0,0,0,0);
                                   
                                   return (
                                       <button 
                                         key={i} 
                                         disabled={isPast}
                                         className={`cal-date-btn ${isActive ? 'active' : ''} ${isPast ? 'disabled' : ''}`}
                                         onClick={() => setDate(dateString)}
                                       >
                                           {dayNum}
                                       </button>
                                   );
                               })}
                            </div>
                         </div>
                      </div>

                      {/* Step 1: Time Slots */}
                      <div className="time-section">
                         <h4 className="flex items-center gap-2 mb-4 font-bold text-gray-700">Select Time</h4>
                         <div className="modal-time-grid">
                            {[
                              '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', 
                              '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
                              '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
                              '21:00', '21:30', '22:00', '22:30'
                            ].map(t => {
                               const isAvailable = availableSlots.includes(t);
                               return (
                                  <button 
                                     key={t} 
                                     disabled={!isAvailable}
                                     className={`pill-btn ${time === t ? 'active' : ''} ${!isAvailable ? 'booked' : ''}`}
                                     onClick={() => setTime(t)}
                                  >
                                     {t}
                                  </button>
                               );
                            })}
                         </div>
                      </div>
                    </div>
                 )}

                 {currentStep === 2 && (
                    <div className="table-selection-section">
                       <h4 className="flex items-center gap-2 mb-4 font-bold text-gray-700">Available Tables for {date} @ {time}</h4>
                       {loadingTables ? (
                          <div className="flex justify-center py-12">
                             <div className="loading-spinner-orange"></div>
                          </div>
                       ) : availableTables.length === 0 ? (
                          <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                             <p className="text-gray-500 font-medium">No tables available for this slot. Please try another time.</p>
                          </div>
                       ) : (
                          <div className="modal-tables-grid">
                             {availableTables.map(t => (
                                <button 
                                   key={t.id}
                                   className={`table-btn ${selectedTable?.id === t.id ? 'active' : ''}`}
                                   onClick={() => setSelectedTable(t)}
                                >
                                   <div className="table-number">{t.table_number}</div>
                                   <div className="table-capacity">Seats {t.capacity}</div>
                                </button>
                             ))}
                          </div>
                       )}
                    </div>
                 )}

                 {currentStep === 3 && (
                    <div className="guests-section">
                       <h4 className="flex items-center gap-2 mb-4 font-bold text-gray-700">How many guests?</h4>
                       <div className="modal-guests-grid">
                          {[1, 2, 3, 4, 5, 6, 8, 10, '12+'].map(num => (
                             <button 
                                key={num}
                                className={`pill-btn ${guests?.toString() === (num === '12+' ? '12' : num.toString()) ? 'active' : ''}`}
                                onClick={() => setGuests(num === '12+' ? 12 : Number(num))}
                             >
                                {num} People
                             </button>
                          ))}
                       </div>
                    </div>
                 )}

                 {currentStep === 4 && (
                    <div className="review-section">
                       {isFeeEnabled ? (
                          <>
                             <div className="fee-notice-card mb-6">
                                <div className="mb-2">
                                   <h5 className="font-bold text-gray-800">Booking Advance Fee</h5>
                                </div>
                                <div className="text-3xl font-black text-orange-600 my-4">${feeAmount.toFixed(2)}</div>
                                <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 mb-4">
                                    <p className="text-[11px] text-orange-800 leading-tight">
                                       <strong>Note:</strong> This fee will be <strong>adjusted against your food bill</strong> when you arrive.
                                    </p>
                                 </div>
                             </div>

                              {/* Payment Method - Card Only */}
                              <div style={{ background: '#f9fafb', padding: '2.5rem', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
                                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1.4rem', color: '#111827', fontWeight: 700, margin: 0 }}>Payment Method</h3>
                                    <div style={{ padding: '0.4rem 0.8rem', background: '#fff6f3', border: '1px solid var(--primary-orange)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-orange)', fontWeight: 600, fontSize: '0.9rem' }}>
                                       <CreditCard size={16}/> Credit / Debit Card
                                    </div>
                                 </div>
                                 
                                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div className="input-group">
                                       <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                                          Card Number
                                          <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 400 }}>Powered by Stripe</span>
                                       </label>
                                       <input 
                                          type="text" 
                                          placeholder="0000 0000 0000 0000" 
                                          style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white' }}
                                          value={paymentData.cardNumber}
                                          onChange={e => setPaymentData({...paymentData, cardNumber: e.target.value})}
                                       />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1rem' }}>
                                       <input 
                                          type="text" 
                                          placeholder="MM/YY" 
                                          style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white' }}
                                          value={paymentData.expiry}
                                          onChange={e => setPaymentData({...paymentData, expiry: e.target.value})}
                                       />
                                       <input 
                                          type="password" 
                                          placeholder="CVC" 
                                          style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white' }}
                                          value={paymentData.cvc}
                                          onChange={e => setPaymentData({...paymentData, cvc: e.target.value})}
                                       />
                                    </div>
                                 </div>
                              </div>
                          </>
                       ) : (
                          <div className="bg-green-50 p-6 rounded-2xl border border-green-100 text-center">
                             <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto mb-3">
                                <i className="fas fa-check"></i>
                             </div>
                             <h5 className="font-bold text-green-800">No Booking Fee Required</h5>
                             <p className="text-sm text-green-600">Your reservation can be confirmed immediately.</p>
                          </div>
                       )}
                       
                       <div className="summary-review-mini mt-6">
                          <h6 className="uppercase text-[10px] font-bold text-gray-400 tracking-widest mb-3">Final Selection</h6>
                          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                             <div className="review-item">
                                <span className="label block text-[10px] text-gray-500 font-bold uppercase">Arrival</span>
                                <span className="value font-bold text-gray-800">{date} @ {time}</span>
                             </div>
                             <div className="review-item">
                                <span className="label block text-[10px] text-gray-500 font-bold uppercase">Table</span>
                                <span className="value font-bold text-gray-800">Table {selectedTable?.table_number}</span>
                             </div>
                              <div className="review-item">
                                 <span className="label block text-[10px] text-gray-500 font-bold uppercase">Payment</span>
                                 <span className="value font-bold text-gray-800 uppercase">{paymentMethod}</span>
                              </div>
                          </div>
                       </div>
                    </div>
                 )}
              </div>

               <div className="modal-footer p-6" style={{ background: 'white', borderTop: '1px solid #f3f4f6' }}>
                  {currentStep === 4 ? (
                    <button 
                       type="button"
                       className="w-full"
                       style={{ padding: '1.4rem', fontSize: '1.1rem', border: 'none', borderRadius: '8px', background: 'var(--primary-orange)', color: 'white', fontWeight: 700, cursor: 'pointer', transition: 'transform 0.2s' }}
                       onClick={confirmBooking}
                       disabled={isProcessingPayment || (isFeeEnabled !== false && paymentMethod === 'card' && (!paymentData.cardNumber || !paymentData.expiry || !paymentData.cvc))}
                    >
                       {isProcessingPayment ? 'Processing...' : isFeeEnabled !== false ? `Confirm Booking · Pay $${feeAmount.toFixed(2)}` : 'Confirm Booking'}
                    </button>
                  ) : (
                    <div className="flex items-center justify-between gap-4 w-full">
                       {currentStep > 1 && (
                          <button className="btn-secondary" onClick={() => setCurrentStep(prev => prev - 1)} disabled={isProcessingPayment}>
                             Back
                          </button>
                       )}
                       <button 
                          className="btn-primary flex-1 flex items-center justify-center gap-2" 
                          onClick={handleNext}
                          disabled={isProcessingPayment}
                       >
                          Next Step &rarr;
                       </button>
                    </div>
                  )}
               </div>
           </div>
        </div>
      )}
    </div>
  );
}
