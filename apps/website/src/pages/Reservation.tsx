import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '../config';
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
  const [paymentMethod] = useState<'card' | 'counter'>('card');
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
        const response = await fetch(`${API_BASE_URL}/settings`);
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
          const response = await fetch(`${API_BASE_URL}/reservations/availability/${date}`);
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
      const apiUrl = `${API_BASE_URL}/reservations/available-tables?date=${date}&time=${time}:00`;
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

      const response = await fetch(`${API_BASE_URL}/reservations`, {
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
        // Create a structured data object for the Professional Invoice
        const reservationInvoice = {
          id: data.reservationId,
          order_number: `RES-${String(data.reservationId).padStart(4, '0')}`,
          customer_name: formData.name,
          order_type: 'Reservation',
          date: new Date().toLocaleDateString('en-GB'),
          items: [
            { 
              name: `Table Reservation (Table ${selectedTable.table_number})`, 
              quantity: 1, 
              price: isFeeEnabled ? feeAmount : 0 
            },
            { 
              name: `Guests: ${guests} People`, 
              quantity: 0, 
              price: 0 
            },
            { 
              name: `Booking Slot: ${date} @ ${time}`, 
              quantity: 0, 
              price: 0 
            }
          ],
          subtotal: isFeeEnabled ? feeAmount : 0,
          discount: 0,
          tip: 0,
          total: isFeeEnabled ? feeAmount : 0,
          status: isFeeEnabled && paymentMethod === 'card' ? 'PAID' : 'PENDING'
        };

        navigate('/success?type=reservation', { state: { orderData: reservationInvoice } });
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
          <span className="badge mb-3">PREMIUM DINING</span>
          <h1 className="white mb-3">Book Your <span className="text-orange">Table</span></h1>
          <p className="white opacity-90 max-w-2xl mx-auto">Fine dining, intimate evenings, and family celebrations – reserve your spot at Zamzam Kitchen.</p>
        </div>
      </section>

      <div className="section-padding res-container-layout">
       <div className="res-layout-grid">
          <div className="res-main-form">
             {/* Selection Trigger - The "Popup" Entry Point */}
             <h2 className="mb-4">Book Your Table</h2>
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
                          <div className="summary-section-divider my-4"></div>
                          <div className="summary-row highlighted">
                             <span className="label">Booking Fee</span>
                             <span className="value">${feeAmount.toFixed(2)}</span>
                          </div>
                          <p className="fee-note">* This fee will be adjusted against your food bill when you arrive. Otherwise it is non-refundable.</p>
                        </>
                      )}

                      {/* Guest Info Section */}
                      <div className="summary-section-divider my-4"></div>
                      
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
                <div className="modal-processing-overlay">
                   <div className="loading-spinner-orange mb-4"></div>
                   <h3 className="text-xl font-bold text-gray-800">Processing Payment</h3>
                   <p className="text-gray-500">Securing your reservation...</p>
                </div>
              )}

              <div className="modal-header">
                 <div className="step-indicator">
                    <h2 className="text-xl font-extrabold">
                       {currentStep === 1 && '1. Pick Slot'}
                       {currentStep === 2 && '2. Select Table'}
                       {currentStep === 3 && '3. Party Size'}
                       {currentStep === 4 && (isFeeEnabled ? '4. Online Payment' : '4. Final Review')}
                    </h2>
                    <p className="step-text">Step {currentStep} of 4</p>
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
                                       <strong>Note:</strong> This fee will be <strong>adjusted against your food bill</strong> when you arrive. Otherwise it is <strong>non-refundable</strong>.
                                    </p>
                                 </div>
                             </div>

                              {/* Payment Method - Card Only */}
                              <div className="payment-method-card">
                                 <div className="payment-header">
                                    <h3 className="payment-title">Payment Method</h3>
                                    <div className="payment-badge">
                                       <CreditCard size={16}/> Credit / Debit Card
                                    </div>
                                 </div>
                                 
                                 <div className="payment-fields">
                                    <div className="input-group">
                                       <label className="card-label">
                                          Card Number
                                          <span className="stripe-text">Powered by Stripe</span>
                                       </label>
                                       <input 
                                          type="text" 
                                          placeholder="0000 0000 0000 0000" 
                                          className="card-input"
                                          value={paymentData.cardNumber}
                                          onChange={e => setPaymentData({...paymentData, cardNumber: e.target.value})}
                                       />
                                    </div>
                                    <div className="card-row">
                                       <input 
                                          type="text" 
                                          placeholder="MM/YY" 
                                          className="card-input"
                                          value={paymentData.expiry}
                                          onChange={e => setPaymentData({...paymentData, expiry: e.target.value})}
                                       />
                                       <input 
                                          type="password" 
                                          placeholder="CVC" 
                                          className="card-input"
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

               <div className="modal-footer">
                  {currentStep === 4 ? (
                    <button 
                       type="button"
                       className="btn-confirm-booking"
                       onClick={confirmBooking}
                       disabled={isProcessingPayment || (isFeeEnabled !== false && paymentMethod === 'card' && (!paymentData.cardNumber || !paymentData.expiry || !paymentData.cvc))}
                    >
                       {isProcessingPayment ? 'Processing...' : isFeeEnabled !== false ? `Confirm Booking · Pay $${feeAmount.toFixed(2)}` : 'Confirm Booking'}
                    </button>
                  ) : (
                    <div className="modal-footer-actions">
                       {currentStep > 1 && (
                          <button className="btn-secondary" onClick={() => setCurrentStep(prev => prev - 1)} disabled={isProcessingPayment}>
                             Back
                          </button>
                       )}
                       <button 
                          className="btn-primary-modal" 
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

      {isProcessingPayment && (
         <div className="payment-processing-overlay">
           <div className="processing-card">
             <div className="spinner"></div>
             <svg width="80" height="33" viewBox="0 0 60 25" fill="none" xmlns="http://www.w3.org/2000/svg" className="stripe-logo-loading" style={{ marginBottom: '1.5rem' }}>
                <path d="M59.642 12.181c0-4.034-2.1-6.19-5.59-6.19-3.468 0-5.748 2.29-5.748 6.305 0 4.544 2.457 6.31 5.918 6.31 1.637 0 2.94-.3 3.968-1.018l-.946-1.92c-.841.511-1.892.83-2.915.83-1.892 0-3.15-.751-3.23-2.603h7.458c.03-.639.085-1.164.085-1.713zm-8.48-1.503c0-1.743.916-2.583 2.656-2.583 1.548 0 2.508.84 2.508 2.583h-5.164zm-8.835 1.503c0-3.155-1.637-6.19-5.02-6.19-1.397 0-2.358.556-2.94 1.157l-.105-.886h-2.569v17.43l2.84-.602v-5.22c.6.511 1.487.886 2.7.886 3.424 0 5.094-3.41 5.094-6.575zm-2.79 0c0 2.373-.87 4.091-2.686 4.091-.945 0-1.666-.36-2.222-1.006v-6.223c.51-.66 1.29-1.035 2.191-1.035 1.77 0 2.717 1.621 2.717 4.173zm-10.742-9.615c0-1.187-.855-2.013-2.115-2.013-1.29 0-2.146.826-2.146 2.013 0 1.202.855 2.028 2.146 2.028 1.26 0 2.115-.826 2.115-2.028zm-2.115 3.424h-2.84v12.212l2.84-.601v-11.611zm-5.748-3.424c0-1.187-.855-2.013-2.115-2.013-1.29 0-2.146.826-2.146 2.013 0 1.202.855 2.028 2.146 2.028 1.26 0 2.115-.826 2.115-2.028zm-2.115 3.424h-2.84v12.212l2.84-.601v-11.611zm-5.064 0h-2.568l-.105.886c-.585-.601-1.547-1.157-2.943-1.157-3.383 0-5.02 3.035-5.02 6.19 0 3.165 1.67 6.575 5.094 6.575 1.213 0 2.1-.375 2.7-.886v5.22l2.84.602V5.99zm-2.79 6.19c0 2.552-.947 4.173-2.717 4.173-.901 0-1.681-.375-2.191-1.035v6.223c.556.646 1.277 1.006 2.222 1.006 1.816 0 2.686-1.718 2.686-4.091 0-2.552-.947-4.275-2.717-4.275-.901 0-1.681.375-2.191-1.035v6.223c.556.646 1.277 1.006 2.222 1.006 1.816 0 2.686-1.718 2.686-4.091zm-7.608-2.618c0-2.2-.841-3.573-3.123-3.573-1.006 0-1.921.375-2.507 1.018V6.14h-2.841v15.228l2.841-.601V12.78c.556-.556 1.352-.855 2.252-.855 1.157 0 1.532.555 1.532 1.636v7.712l2.84-.602v-11.1zm-10.457-3.573c-2.313 0-3.874 1.141-3.874 3.035 0 4.159 5.674 3.514 5.674 5.375 0 .736-.676 1.036-1.637 1.036-1.216 0-2.642-.511-3.664-1.126l-.886 2.146c1.111.66 2.822 1.186 4.545 1.186 2.508 0 4.484-1.171 4.484-3.23 0-4.46-5.67-3.769-5.67-5.361 0-.616.556-1.02 1.516-1.02.946 0 2.29.375 3.197.87l.87-2.115c-1.021-.57-2.433-.826-3.395-.826z" fill="#6366F1"/>
             </svg>
             <h3>Securely Processing...</h3>
             <p>Please do not refresh the page or close your browser.</p>
             <div className="encryption-badge">
                <ShieldCheck size={14} /> 256-bit SSL Encryption
             </div>
           </div>
         </div>
       )}
    </div>
  );
}
