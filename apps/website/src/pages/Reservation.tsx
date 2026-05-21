import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, ShieldCheck, Clock, Calendar, Users, ChevronRight, Check } from 'lucide-react';
import { API_BASE_URL } from '../config';
import './Reservation.css';

const formatTableNumber = (num: string | number) => {
  if (!num) return '';
  const str = num.toString().trim();
  const clean = str.replace(/^[t\s\-_–—]+/i, '');
  return 'T-' + clean;
};

const STAY_DURATIONS = [30, 45, 60, 90, 120, 150, 180, 240];

export default function Reservation() {
  const navigate = useNavigate();
  const now = new Date();

  // ── Step tracking ──────────────────────────────────
  const [step, setStep] = useState(1); // 1–5

  // ── Settings ───────────────────────────────────────
  const [openingTime, setOpeningTime] = useState('12:00:00');
  const [closingTime, setClosingTime] = useState('22:30:00');
  const [isFeeEnabled, setIsFeeEnabled] = useState(true);
  const [feeAmount, setFeeAmount] = useState(10.00);
  const [currency, setCurrency] = useState('$');

  // ── Step 1 ─────────────────────────────────────────
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [stayDuration, setStayDuration] = useState(60);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  // ── Step 2 ─────────────────────────────────────────
  const [availableTables, setAvailableTables] = useState<any[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [selectedSeating, setSelectedSeating] = useState<{ [tableId: number]: number[] }>({});

  // ── Step 3 ─────────────────────────────────────────
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', notes: '' });

  // ── Step 4 ─────────────────────────────────────────
  const [paymentData, setPaymentData] = useState({ cardholderName: '', cardNumber: '', expiry: '', cvc: '' });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handleCardholderNameChange = (val: string) => {
    setPaymentData(prev => ({ ...prev, cardholderName: val }));
  };

  const handleCardNumberChange = (val: string) => {
    const clean = val.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    let formatted = '';
    for (let i = 0; i < clean.length && i < 16; i++) {
      if (i > 0 && i % 4 === 0) formatted += ' ';
      formatted += clean[i];
    }
    setPaymentData(prev => ({ ...prev, cardNumber: formatted }));
  };

  const handleCardExpiryChange = (val: string) => {
    const clean = val.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    let formatted = '';
    if (clean.length > 0) {
      formatted += clean.substring(0, 2);
      if (clean.length > 2) {
        formatted += '/' + clean.substring(2, 4);
      }
    }
    setPaymentData(prev => ({ ...prev, expiry: formatted }));
  };

  const handleCardCvvChange = (val: string) => {
    const clean = val.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    setPaymentData(prev => ({ ...prev, cvc: clean.substring(0, 4) }));
  };

  // ── Submit ─────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Derived ────────────────────────────────────────
  const guests = Object.values(selectedSeating).reduce((sum, seats) => sum + seats.length, 0);

  const formatSelectedSeating = () => {
    const entries = Object.entries(selectedSeating);
    if (entries.length === 0) return 'Select Table';
    return entries.map(([tId, seats]) => {
      const tbl = availableTables.find(t => t.id === Number(tId));
      const tNum = tbl ? tbl.table_number : tId;
      return `${formatTableNumber(tNum)} — Seats ${seats.join(', ')}`;
    }).join(' • ');
  };

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // ── Fetch Settings ─────────────────────────────────
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/settings`);
        const data = await res.json();
        if (data.branch) {
          setIsFeeEnabled(data.branch.is_booking_fee_enabled !== 0);
          if (data.branch.booking_fee_amount != null) setFeeAmount(parseFloat(data.branch.booking_fee_amount));
          setOpeningTime(data.branch.opening_time || '12:00:00');
          setClosingTime(data.branch.closing_time || '22:30:00');
        }
        if (data.tenant?.currency_symbol) setCurrency(data.tenant.currency_symbol);
      } catch {}
    };
    fetchSettings();
  }, []);

  // ── Generate time slots ────────────────────────────
  useEffect(() => {
    if (!date) return;
    const generateSlots = (start: string, end: string) => {
      const slots: string[] = [];
      let [h, m] = start.split(':').map(Number);
      const [endH, endM] = end.split(':').map(Number);
      while (h < endH || (h === endH && m <= endM)) {
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        m += 30;
        if (m >= 60) { m = 0; h += 1; }
      }
      return slots;
    };
    const fetchAvailability = async () => {
      const allSlots = generateSlots(openingTime, closingTime);
      let bookedSlots: string[] = [];
      try {
        const res = await fetch(`${API_BASE_URL}/reservations/availability/${date}`);
        const data = await res.json();
        bookedSlots = data.bookedSlots || [];
      } catch {}
      const today = getTodayStr();
      const isToday = date === today;
      const now = new Date();
      const filtered = allSlots.filter(t => {
        if (bookedSlots.includes(t)) return false;
        if (isToday) {
          const [h, m] = t.split(':').map(Number);
          if (h < now.getHours() || (h === now.getHours() && m <= now.getMinutes())) return false;
        }
        return true;
      });
      setAvailableSlots(filtered);
    };
    fetchAvailability();
  }, [date, openingTime, closingTime]);

  // ── Fetch Tables ───────────────────────────────────
  const fetchAvailableTables = async () => {
    if (!date || !time) return;
    setLoadingTables(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reservations/available-tables?date=${date}&time=${time}:00`);
      const data = await res.json();
      setAvailableTables(data.tables || []);
    } catch { setAvailableTables([]); }
    finally { setLoadingTables(false); }
  };

  // ── Seat toggles ───────────────────────────────────
  const toggleTableChecked = (t: any) => {
    setSelectedSeating(prev => {
      const next = { ...prev };
      if (next[t.id] !== undefined) delete next[t.id];
      else next[t.id] = [];
      return next;
    });
  };
  const toggleSeat = (tableId: number, seatNum: number) => {
    setSelectedSeating(prev => {
      const next = { ...prev };
      const cur = next[tableId] || [];
      next[tableId] = cur.includes(seatNum) ? cur.filter(s => s !== seatNum) : [...cur, seatNum];
      return next;
    });
  };

  // ── Navigation ─────────────────────────────────────
  const handleNext = () => {
    if (step === 1) {
      if (!date || !time) { alert('Please select a date and time slot.'); return; }
      fetchAvailableTables();
      setStep(2);
    } else if (step === 2) {
      if (Object.keys(selectedSeating).length === 0) { alert('Please select at least one table.'); return; }
      if (guests === 0) { alert('Please select at least one seat.'); return; }
      setStep(3);
    } else if (step === 3) {
      if (!formData.name || !formData.phone || !formData.email) { alert('Please fill in all contact details.'); return; }
      setStep(isFeeEnabled ? 4 : 5);
    } else if (step === 4) {
      if (isFeeEnabled && (!paymentData.cardholderName || !paymentData.cardNumber || !paymentData.expiry || !paymentData.cvc)) {
        alert('Please enter your complete card details.'); return;
      }
      setStep(5);
    }
  };
  const handleBack = () => {
    if (step === 5 && !isFeeEnabled) setStep(3);
    else setStep(s => Math.max(1, s - 1));
  };

  // ── Submit ─────────────────────────────────────────
  const confirmBooking = async () => {
    setIsSubmitting(true);
    if (isFeeEnabled) setIsProcessingPayment(true);
    try {
      if (isFeeEnabled) await new Promise(r => setTimeout(r, 1800));
      const selectedTableIds = Object.keys(selectedSeating).map(Number);
      const res = await fetch(`${API_BASE_URL}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          date,
          time: `${time}:00`,
          guests,
          tableId: selectedTableIds[0],
          table_ids: selectedTableIds,
          tables: Object.entries(selectedSeating).map(([tId, seats]) => ({
            id: Number(tId),
            allocated_seats: seats.length,
            selected_seats: seats.join(',')
          })),
          bookingFee: isFeeEnabled ? feeAmount : 0,
          paymentMethod: isFeeEnabled ? 'card' : 'counter',
          branchId: 1,
          origin: 'Website'
        })
      });
      const data = await res.json();
      if (data.success) {
        const invoice = {
          id: data.reservationId,
          order_number: `RES-${String(data.reservationId).padStart(4, '0')}`,
          customer_name: formData.name,
          order_type: 'Reservation',
          date: new Date().toISOString(),
          items: [
            { name: `Table Reservation (${formatSelectedSeating()})`, quantity: 1, price: isFeeEnabled ? feeAmount : 0 },
            { name: `Guests: ${guests} People`, quantity: 0, price: 0 },
            { name: `Booking Slot: ${date} @ ${time}`, quantity: 0, price: 0 }
          ],
          subtotal: isFeeEnabled ? feeAmount : 0,
          discount: 0, tip: 0,
          total: isFeeEnabled ? feeAmount : 0,
          status: isFeeEnabled ? 'PAID' : 'PENDING'
        };
        navigate('/success?type=reservation', { state: { orderData: invoice } });
      } else {
        alert(data.message || 'Something went wrong.');
      }
    } catch { alert('Connection error. Please try again.'); }
    finally { setIsSubmitting(false); setIsProcessingPayment(false); }
  };

  // ── Step Labels ────────────────────────────────────
  const stepLabels = ['Pick Slot', 'Select Table', 'Guest Info', 'Payment', 'Review'];
  const getStepLabel = () => {
    if (step === 4 && !isFeeEnabled) return 'Review';
    return stepLabels[step - 1];
  };
  const effectiveStep = (!isFeeEnabled && step === 5) ? 4 : step;
  const effectiveTotalSteps = isFeeEnabled ? 5 : 4;

  return (
    <div className="res-page-v2">
      {/* Hero */}
      <section className="common-hero reservation-hero">
        <div className="hero-overlay" />
        <div className="hero-content">
          <span className="badge mb-3">PREMIUM DINING</span>
          <h1 className="white mb-3">Book Your <span className="text-orange">Table</span></h1>
          <p className="white opacity-90 max-w-2xl mx-auto">Fine dining, intimate evenings, and family celebrations – reserve your spot at Zamzam Kitchen.</p>
        </div>
      </section>

      {/* Main Form Container */}
      <div className="res-v2-wrapper">
        <div className="res-v2-card">

          {/* Progress Header */}
          <div className="res-v2-header">
            <div className="res-v2-step-icon">
              {step === 1 && <Clock size={20} />}
              {step === 2 && <Users size={20} />}
              {step === 3 && <Calendar size={20} />}
              {step === 4 && <CreditCard size={20} />}
              {step === 5 && <Check size={20} />}
            </div>
            <div>
              <h2 className="res-v2-step-title">{effectiveStep}. {getStepLabel()}</h2>
              <p className="res-v2-step-sub">Step {effectiveStep} of {effectiveTotalSteps}</p>
            </div>
            {/* Step dots */}
            <div className="res-v2-dots">
              {Array.from({ length: effectiveTotalSteps }).map((_, i) => (
                <div key={i} className={`res-v2-dot ${i < effectiveStep ? 'active' : ''}`} />
              ))}
            </div>
          </div>

          {/* ── STEP 1: Pick Slot ── */}
          {step === 1 && (
            <div className="res-v2-body res-v2-step1">
              {/* Calendar */}
              <div className="res-v2-col">
                <div className="res-v2-section-label">
                  <Calendar size={14} /> Select Date
                </div>
                {/* Month selector */}
                <div className="res-v2-month-row">
                  <select
                    className="res-v2-month-select"
                    value={`${selectedMonth}-${selectedYear}`}
                    onChange={e => {
                      const [m, y] = e.target.value.split('-').map(Number);
                      setSelectedMonth(m); setSelectedYear(y);
                    }}
                  >
                    {[...Array(12)].map((_, i) => {
                      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
                      return (
                        <option key={i} value={`${d.getMonth()}-${d.getFullYear()}`}>
                          {d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </option>
                      );
                    })}
                  </select>
                </div>
                {/* Calendar grid */}
                <div className="res-v2-calendar">
                  {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => (
                    <div key={d} className="res-v2-cal-label">{d}</div>
                  ))}
                  {/* Empty cells for first day offset */}
                  {Array.from({ length: new Date(selectedYear, selectedMonth, 1).getDay() }).map((_, i) => (
                    <div key={`e${i}`} />
                  ))}
                  {Array.from({ length: new Date(selectedYear, selectedMonth + 1, 0).getDate() }).map((_, i) => {
                    const dayNum = i + 1;
                    const ds = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const isPast = new Date(selectedYear, selectedMonth, dayNum).getTime() < new Date().setHours(0,0,0,0);
                    return (
                      <button
                        key={i}
                        disabled={isPast}
                        onClick={() => { setDate(ds); setTime(''); }}
                        className={`res-v2-cal-day ${date === ds ? 'active' : ''} ${isPast ? 'past' : ''}`}
                      >
                        {dayNum}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots */}
              <div className="res-v2-col">
                <div className="res-v2-section-label">
                  <Clock size={14} /> Select Time
                </div>
                <div className="res-v2-time-grid">
                  {!date ? (
                    <p className="res-v2-placeholder">Select a date first</p>
                  ) : availableSlots.length === 0 ? (
                    <p className="res-v2-placeholder">No slots available for this date</p>
                  ) : availableSlots.map(t => (
                    <button
                      key={t}
                      onClick={() => setTime(t)}
                      className={`res-v2-time-pill ${time === t ? 'active' : ''}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stay Duration — full width below */}
              <div className="res-v2-full-col">
                <div className="res-v2-section-label">
                  <Clock size={14} /> Estimated Stay Duration
                </div>
                <div className="res-v2-duration-grid">
                  {STAY_DURATIONS.map(d => (
                    <button
                      key={d}
                      onClick={() => setStayDuration(d)}
                      className={`res-v2-duration-pill ${stayDuration === d ? 'active' : ''}`}
                    >
                      {d < 60 ? `${d}m` : d === 60 ? '60m' : `${d}m`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Select Table ── */}
          {step === 2 && (
            <div className="res-v2-body">
              <div className="res-v2-table-header">
                <h3>Multiple Table &amp; Seat Selection</h3>
                <p>Check a table on the left, then select its seats on the right</p>
              </div>
              {loadingTables ? (
                <div className="res-v2-loading"><div className="res-v2-spinner" /></div>
              ) : availableTables.length === 0 ? (
                <div className="res-v2-empty">No tables available for this slot. Please try another time.</div>
              ) : (
                <>
                  <div className="res-v2-table-grid">
                    {availableTables.map(t => {
                      const isChecked = selectedSeating[t.id] !== undefined;
                      const selSeats = selectedSeating[t.id] || [];
                      return (
                        <div className="res-v2-table-row" key={t.id}>
                          {/* Checkbox */}
                          <button
                            type="button"
                            className={`res-v2-checkbox ${isChecked ? 'checked' : ''}`}
                            onClick={() => toggleTableChecked(t)}
                          >
                            {isChecked && <Check size={14} />}
                          </button>
                          {/* Table card */}
                          <div className={`res-v2-table-card ${isChecked ? 'checked' : ''}`} onClick={() => toggleTableChecked(t)}>
                            <span className="res-v2-table-name">{formatTableNumber(t.table_number)}</span>
                            <span className="res-v2-table-count">{selSeats.length}/{t.capacity} Seats</span>
                          </div>
                          {/* Arrow */}
                          <div className="res-v2-arrow">{isChecked ? <ChevronRight size={18} strokeWidth={3} /> : <span>—</span>}</div>
                          {/* Seat grid */}
                          <div className="res-v2-seats">
                            {isChecked ? (
                              Array.from({ length: t.capacity }, (_, idx) => idx + 1).map(seatNum => {
                                const isOccupied = t.occupied_seats?.includes(seatNum);
                                const isSel = selSeats.includes(seatNum);
                                return (
                                  <button
                                    key={seatNum}
                                    type="button"
                                    disabled={isOccupied}
                                    onClick={() => toggleSeat(t.id, seatNum)}
                                    className={`res-v2-seat ${isOccupied ? 'occupied' : isSel ? 'selected' : 'available'}`}
                                  >
                                    <div className="res-v2-seat-check">{isOccupied ? '✕' : isSel ? '✓' : ''}</div>
                                    <span>Seat {seatNum}</span>
                                    {isOccupied && <span className="res-v2-seat-badge">TAKEN</span>}
                                  </button>
                                );
                              })
                            ) : (
                              <span className="res-v2-unselected">TABLE UNSELECTED</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="res-v2-table-footer">
                    <span>Total Assigned</span>
                    <strong>{Object.keys(selectedSeating).length} {Object.keys(selectedSeating).length === 1 ? 'Table' : 'Tables'} · {guests} {guests === 1 ? 'Seat' : 'Seats'} Selected</strong>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── STEP 3: Guest Info ── */}
          {step === 3 && (
            <div className="res-v2-body res-v2-guest-body">
              <div className="res-v2-section-label"><Users size={14} /> Guest Information</div>
              <div className="res-v2-guest-grid">
                <div className="res-v2-field">
                  <label>Full Name</label>
                  <input type="text" placeholder="Enter your full name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="res-v2-field">
                  <label>WhatsApp / Phone Number</label>
                  <input type="tel" placeholder="e.g. +61 400 000 000" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} required />
                </div>
                <div className="res-v2-field">
                  <label>Email Address</label>
                  <input type="email" placeholder="yourname@example.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                </div>
                <div className="res-v2-field">
                  <label>Special Occasion / Requests <span className="optional">(Optional)</span></label>
                  <textarea placeholder="Birthday, anniversary, or dietary requirements..." rows={3} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4: Payment ── */}
          {step === 4 && isFeeEnabled && (
            <div className="res-v2-body res-v2-payment-body">
              <div className="res-v2-fee-card">
                <h4>Booking Advance Fee</h4>
                <div className="res-v2-fee-amount">{currency}{feeAmount.toFixed(2)}</div>
                <p className="res-v2-fee-note">This fee will be adjusted against your food bill when you arrive. Otherwise it is non-refundable.</p>
              </div>
              <div className="res-v2-payment-card">
                <div className="res-v2-payment-header">
                  <span className="res-v2-payment-title">CARD DETAILS</span>
                  <div className="res-v2-payment-logos">
                    <img 
                      src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png" 
                      alt="Visa" 
                      className="res-v2-card-logo" 
                    />
                    <img 
                      src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png" 
                      alt="MasterCard" 
                      className="res-v2-card-logo" 
                    />
                  </div>
                </div>
                
                <div className="res-v2-field">
                  <label className="res-v2-card-label">CARDHOLDER NAME</label>
                  <input 
                    type="text" 
                    placeholder="John Doe" 
                    value={paymentData.cardholderName} 
                    onChange={e => handleCardholderNameChange(e.target.value)} 
                    className="card-input" 
                  />
                </div>

                <div className="res-v2-field">
                  <label className="res-v2-card-label">CARD NUMBER</label>
                  <input 
                    type="text" 
                    placeholder="0000 0000 0000 0000" 
                    value={paymentData.cardNumber} 
                    onChange={e => handleCardNumberChange(e.target.value)} 
                    className="card-input" 
                  />
                </div>

                <div className="res-v2-card-row">
                  <div className="res-v2-field">
                    <label className="res-v2-card-label">EXPIRY DATE</label>
                    <input 
                      type="text" 
                      placeholder="MM/YY" 
                      value={paymentData.expiry} 
                      onChange={e => handleCardExpiryChange(e.target.value)} 
                      className="card-input" 
                    />
                  </div>
                  <div className="res-v2-field">
                    <label className="res-v2-card-label">CVV</label>
                    <input 
                      type="text" 
                      placeholder="123" 
                      value={paymentData.cvc} 
                      onChange={e => handleCardCvvChange(e.target.value)} 
                      className="card-input" 
                    />
                  </div>
                </div>
              </div>
              <div className="res-v2-secure-badge"><ShieldCheck size={14} /> 256-bit SSL Secured</div>
            </div>
          )}

          {/* ── STEP 5: Review & Confirm ── */}
          {(step === 5 || (step === 4 && !isFeeEnabled)) && (
            <div className="res-v2-body res-v2-review-body">
              <div className="res-v2-section-label"><Check size={14} /> Final Review</div>
              <div className="res-v2-review-grid">
                <div className="res-v2-review-item">
                  <span className="rev-label">Date &amp; Time</span>
                  <span className="rev-value">{date} @ {time}</span>
                </div>
                <div className="res-v2-review-item">
                  <span className="rev-label">Stay Duration</span>
                  <span className="rev-value">{stayDuration} minutes</span>
                </div>
                <div className="res-v2-review-item">
                  <span className="rev-label">Table &amp; Seats</span>
                  <span className="rev-value">{formatSelectedSeating()}</span>
                </div>
                <div className="res-v2-review-item">
                  <span className="rev-label">Total Guests</span>
                  <span className="rev-value">{guests} {guests === 1 ? 'Person' : 'People'}</span>
                </div>
                <div className="res-v2-review-divider" />
                <div className="res-v2-review-item">
                  <span className="rev-label">Name</span>
                  <span className="rev-value">{formData.name}</span>
                </div>
                <div className="res-v2-review-item">
                  <span className="rev-label">Phone</span>
                  <span className="rev-value">{formData.phone}</span>
                </div>
                <div className="res-v2-review-item">
                  <span className="rev-label">Email</span>
                  <span className="rev-value">{formData.email}</span>
                </div>
                {formData.notes && (
                  <div className="res-v2-review-item full">
                    <span className="rev-label">Notes</span>
                    <span className="rev-value">{formData.notes}</span>
                  </div>
                )}
                {isFeeEnabled && (
                  <>
                    <div className="res-v2-review-divider" />
                    <div className="res-v2-review-item highlighted">
                      <span className="rev-label">Booking Fee</span>
                      <span className="rev-value">{currency}{feeAmount.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Footer Navigation ── */}
          <div className="res-v2-footer">
            {(step === 5 || (step === 4 && !isFeeEnabled)) ? (
              <div className="res-v2-footer-row">
                <button className="res-v2-btn-back" onClick={handleBack}>BACK</button>
                <button
                  className="res-v2-btn-confirm"
                  onClick={confirmBooking}
                  disabled={isSubmitting || isProcessingPayment}
                >
                  {isProcessingPayment ? 'Processing Payment...' : isSubmitting ? 'Finalizing Booking...' : isFeeEnabled ? `Confirm & Pay ${currency}${feeAmount.toFixed(2)}` : 'Confirm Booking'}
                </button>
              </div>
            ) : (
              <div className="res-v2-footer-row">
                {step > 1 && (
                  <button className="res-v2-btn-back" onClick={handleBack}>BACK</button>
                )}
                <button className="res-v2-btn-next" onClick={handleNext}>
                  {step === 4 ? 'NEXT' : 'NEXT STEP'} <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mini Summary Pill */}
        {(date || Object.keys(selectedSeating).length > 0) && (
          <div className="res-v2-summary-pill">
            {date && <span><Calendar size={12} /> {date}{time ? ` · ${time}` : ''}</span>}
            {Object.keys(selectedSeating).length > 0 && <span><Users size={12} /> {guests} {guests === 1 ? 'Guest' : 'Guests'}</span>}
          </div>
        )}
      </div>

      {/* Payment Processing Overlay */}
      {isProcessingPayment && (
        <div className="res-v2-processing-overlay">
          <div className="res-v2-processing-card">
            <div className="res-v2-spinner large" />
            <h3>Securing Your Reservation</h3>
            <p>Please do not close or refresh this page.</p>
            <div className="res-v2-secure-badge"><ShieldCheck size={14} /> 256-bit SSL Encryption</div>
          </div>
        </div>
      )}
    </div>
  );
}
