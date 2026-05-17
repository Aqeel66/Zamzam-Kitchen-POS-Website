import { useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  Mail, 
  MessageSquare, 
  Smartphone, 
  Download, 
  Send, 
  Loader2, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

interface ShareSplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  splitOrderIds: number[];
  currency: string;
  apiBaseUrl: string;
}

export default function ShareSplitModal({ 
  isOpen, 
  onClose, 
  splitOrderIds, 
  currency = 'AUD', 
  apiBaseUrl 
}: ShareSplitModalProps) {
  const [ordersDetails, setOrdersDetails] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [sharingStates, setSharingStates] = useState<Record<string, 'idle' | 'sending' | 'success' | 'error'>>({});
  const [recipientInputs, setRecipientInputs] = useState<Record<string, string>>({});
  const [activeShareChannel, setActiveShareChannel] = useState<Record<number, 'email' | 'sms' | 'whatsapp' | null>>({});
  const [expandedOrders, setExpandedOrders] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (isOpen && splitOrderIds.length > 0) {
      fetchOrdersDetails();
      // Initialize states
      setSharingStates({});
      setRecipientInputs({});
      setExpandedOrders({});
      const channels: Record<number, 'email' | 'sms' | 'whatsapp' | null> = {};
      splitOrderIds.forEach(id => {
        channels[id] = null;
      });
      setActiveShareChannel(channels);
    }
  }, [isOpen, splitOrderIds]);

  const fetchOrdersDetails = async () => {
    setLoadingOrders(true);
    try {
      const fetched: any[] = [];
      for (const id of splitOrderIds) {
        try {
          const res = await fetch(`${apiBaseUrl}/orders/${id}`);
          if (res.ok) {
            const data = await res.json();
            fetched.push(data);
          } else {
            fetched.push({ id, order_number: `ZK-${id}`, total_amount: 0, customer_name: 'Split share' });
          }
        } catch (err) {
          fetched.push({ id, order_number: `ZK-${id}`, total_amount: 0, customer_name: 'Split share' });
        }
      }
      setOrdersDetails(fetched);
    } catch (err) {
      console.error('Error fetching split orders details:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handlePrint = async (orderId: number) => {
    try {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Sending to thermal printer...', type: 'success' } }));
      const res = await fetch(`${apiBaseUrl}/orders/${orderId}/print`);
      if (!res.ok) throw new Error('Print failed');
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Thermal printer offline or failed to respond', type: 'error' } }));
    }
  };

  const handleDownloadPDF = async (order: any) => {
    try {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Generating invoice PDF...', type: 'success' } }));
      const res = await fetch(`${apiBaseUrl}/orders/${order.id}/pdf`);
      if (!res.ok) throw new Error('Failed to generate PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Zamzam_Invoice_${order.order_number || order.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Failed to download invoice PDF', type: 'error' } }));
    }
  };

  const executeShare = async (orderId: number, type: 'email' | 'sms' | 'whatsapp') => {
    const key = `${orderId}-${type}`;
    const value = recipientInputs[key]?.trim();

    if (!value) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: `Please enter a valid ${type}`, type: 'error' } }));
      return;
    }

    setSharingStates(prev => ({ ...prev, [key]: 'sending' }));

    try {
      const res = await fetch(`${apiBaseUrl}/orders/${orderId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          recipient: value
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSharingStates(prev => ({ ...prev, [key]: 'success' }));
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: data.message || 'Shared successfully!', type: 'success' } }));
      } else {
        throw new Error(data.error || 'Sharing failed');
      }
    } catch (err: any) {
      console.error(err);
      setSharingStates(prev => ({ ...prev, [key]: 'error' }));
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: err.message || `Failed to share via ${type}`, type: 'error' } }));
    }
  };

  // Instant direct Web WhatsApp link (completely free frontend integration)
  const openDirectWhatsApp = (order: any, phone: string) => {
    if (!phone) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Please enter a phone number', type: 'error' } }));
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const message = `Hello, here is your digital receipt summary from Zamzam Kitchen:\n\nOrder No: ${order.order_number || order.id}\nAmount: AUD ${parseFloat(order.total_amount).toFixed(2)}\n\nThank you for dining with us!`;
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden bg-white border border-slate-100 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-50 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <span className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg">✓</span>
              Split Billing success
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Choose digital channels to share split invoices or print receipts physically
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 rounded-full transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-5 bg-slate-50/30">
          {loadingOrders ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              <p className="text-xs text-slate-500 font-semibold tracking-wide">Loading Split Order details...</p>
            </div>
          ) : (
            ordersDetails.map((order, idx) => {
              const formattedTotal = parseFloat(order.total_amount || 0).toFixed(2);
              const activeChannel = activeShareChannel[order.id];

              return (
                <div 
                  key={order.id}
                  className="bg-white border border-slate-100/90 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  {/* Share info row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md tracking-wider">
                          SHARE {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          ID: #{order.id}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-800 mt-1">
                        Order {order.order_number || `ZK-${order.id}`}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        Guest: <span className="text-slate-600 font-bold">{order.customer_name || 'Walk-in Guest'}</span>
                      </p>
                    </div>

                    <div className="flex flex-col items-end sm:text-right">
                      <span className="text-[10px] font-bold text-slate-400 tracking-wider">TOTAL DUE</span>
                      <span className="text-lg font-black text-emerald-600">
                        {currency} {formattedTotal}
                      </span>
                      <button
                        onClick={() => {
                          setExpandedOrders(prev => ({ ...prev, [order.id]: !prev[order.id] }));
                        }}
                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 underline mt-1.5 cursor-pointer transition-colors duration-150"
                      >
                        {expandedOrders[order.id] ? 'Hide Details' : 'View Bill Details'}
                      </button>
                    </div>
                  </div>

                  {/* Items List (Collapsible) */}
                  {expandedOrders[order.id] && (
                    <div className="mb-4 bg-slate-50/70 border border-slate-100/80 rounded-xl p-4 animate-in slide-in-from-top-2 duration-150">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                        Items on this Split Bill
                      </h4>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                        {order.items && order.items.length > 0 ? (
                          order.items.map((item: any) => (
                            <div key={item.id} className="flex justify-between items-start text-xs border-b border-slate-100/50 pb-1.5 last:border-0 last:pb-0">
                              <div className="text-slate-700">
                                <span className="font-bold text-slate-800">{item.quantity}x</span> {item.name}
                                {item.customizations && item.customizations.length > 0 && (
                                  <span className="text-[10px] text-slate-400 block font-normal leading-normal mt-0.5">
                                    + {item.customizations.map((c: any) => c.customization_name).join(', ')}
                                  </span>
                                )}
                              </div>
                              <span className="text-slate-900 font-bold ml-4">
                                {currency} {parseFloat(item.subtotal || 0).toFixed(2)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-400 italic">No items found in this share.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Operational Action Buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {/* Local Printer (Physical Receipt) */}
                    <button
                      onClick={() => handlePrint(order.id)}
                      className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all duration-150 shadow-sm active:scale-95"
                      title="Print Receipt via Small Thermal Printer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Receipt</span>
                    </button>

                    {/* Email Invoice */}
                    <button
                      onClick={() => {
                        setActiveShareChannel(prev => ({ 
                          ...prev, 
                          [order.id]: prev[order.id] === 'email' ? null : 'email' 
                        }));
                      }}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-150 border active:scale-95 ${
                        activeChannel === 'email' 
                          ? 'bg-blue-50 border-blue-200 text-blue-600' 
                          : 'bg-white border-slate-200/90 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Mail className="w-4 h-4" />
                      <span>Email Invoice</span>
                    </button>

                    {/* WhatsApp */}
                    <button
                      onClick={() => {
                        setActiveShareChannel(prev => ({ 
                          ...prev, 
                          [order.id]: prev[order.id] === 'whatsapp' ? null : 'whatsapp' 
                        }));
                      }}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-150 border active:scale-95 ${
                        activeChannel === 'whatsapp' 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                          : 'bg-white border-slate-200/90 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>WhatsApp</span>
                    </button>

                    {/* SMS */}
                    <button
                      onClick={() => {
                        setActiveShareChannel(prev => ({ 
                          ...prev, 
                          [order.id]: prev[order.id] === 'sms' ? null : 'sms' 
                        }));
                      }}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-150 border active:scale-95 ${
                        activeChannel === 'sms' 
                          ? 'bg-violet-50 border-violet-200 text-violet-600' 
                          : 'bg-white border-slate-200/90 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>SMS Receipt</span>
                    </button>

                    {/* Download PDF Invoice */}
                    <button
                      onClick={() => handleDownloadPDF(order)}
                      className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download PDF</span>
                    </button>
                  </div>

                  {/* Share Input Drawers */}
                  {activeChannel && (
                    <div className="mt-3.5 bg-slate-50/50 border border-slate-100 rounded-xl p-3 animate-in slide-in-from-top-2 duration-150">
                      {/* EMAIL INPUT DRAWER */}
                      {activeChannel === 'email' && (
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Customer Email Address
                          </label>
                          <div className="flex gap-2">
                            <input 
                              type="email"
                              placeholder="customer@domain.com"
                              value={recipientInputs[`${order.id}-email`] || ''}
                              onChange={(e) => setRecipientInputs(prev => ({ 
                                ...prev, 
                                [`${order.id}-email`]: e.target.value 
                              }))}
                              className="flex-1 bg-white border border-slate-200/80 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
                            />
                            <button
                              onClick={() => executeShare(order.id, 'email')}
                              disabled={sharingStates[`${order.id}-email`] === 'sending'}
                              className="px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                            >
                              {sharingStates[`${order.id}-email`] === 'sending' ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                              <span>Send</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* SMS INPUT DRAWER */}
                      {activeChannel === 'sms' && (
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Customer Mobile Number
                          </label>
                          <div className="flex gap-2">
                            <input 
                              type="tel"
                              placeholder="+61 400 000 000"
                              value={recipientInputs[`${order.id}-sms`] || ''}
                              onChange={(e) => setRecipientInputs(prev => ({ 
                                ...prev, 
                                [`${order.id}-sms`]: e.target.value 
                              }))}
                              className="flex-1 bg-white border border-slate-200/80 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
                            />
                            <button
                              onClick={() => executeShare(order.id, 'sms')}
                              disabled={sharingStates[`${order.id}-sms`] === 'sending'}
                              className="px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                            >
                              {sharingStates[`${order.id}-sms`] === 'sending' ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                              <span>Send</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* WHATSAPP INPUT DRAWER */}
                      {activeChannel === 'whatsapp' && (
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Customer WhatsApp Mobile Number
                          </label>
                          <div className="flex gap-2">
                            <input 
                              type="tel"
                              placeholder="+61400000000"
                              value={recipientInputs[`${order.id}-whatsapp`] || ''}
                              onChange={(e) => setRecipientInputs(prev => ({ 
                                ...prev, 
                                [`${order.id}-whatsapp`]: e.target.value 
                              }))}
                              className="flex-1 bg-white border border-slate-200/80 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
                            />
                            <button
                              onClick={() => openDirectWhatsApp(order, recipientInputs[`${order.id}-whatsapp`])}
                              className="px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 active:scale-95"
                              title="Open WhatsApp Web to share instantly for free"
                            >
                              <ExternalLinkIcon className="w-3.5 h-3.5" />
                              <span>Free Chat Share</span>
                            </button>
                            <button
                              onClick={() => executeShare(order.id, 'whatsapp')}
                              disabled={sharingStates[`${order.id}-whatsapp`] === 'sending'}
                              className="px-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 active:scale-95"
                              title="Send WhatsApp via server Twilio API"
                            >
                              {sharingStates[`${order.id}-whatsapp`] === 'sending' ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                              <span>API Send</span>
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 font-semibold leading-normal">
                            💡 Use **Free Chat Share** to open standard WhatsApp Web on this computer without messaging costs. Use **API Send** for Twilio automated messages.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-5 bg-slate-50/50 border-t border-slate-50 gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all duration-150 active:scale-95"
          >
            Done & Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Inline fallback for ExternalLink icon
function ExternalLinkIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className || "w-4 h-4"}
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}
