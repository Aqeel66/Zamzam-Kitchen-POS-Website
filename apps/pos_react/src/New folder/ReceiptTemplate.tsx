import { resolveImageUrl } from '../config';

export default function ReceiptTemplate({ order, settings }: any) {
  if (!order) return null;

  // --- GLOBAL CURRENCY ---
  const currency = settings?.tenant?.currency || 'USD';

  const subtotal = order.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.05;
  const discount = order.discount_amount || 0;
  
  return (
    <div className="receipt-container p-8 bg-white text-slate-900 font-sans max-w-[400px] mx-auto border border-slate-100 shadow-xl rounded-xl">
      <div className="text-center mb-8">
        {settings?.tenant?.logo_url && (
          <img src={resolveImageUrl(settings.tenant.logo_url)} className="h-16 mx-auto mb-4 object-contain" />
        )}
        <h1 className="text-xl font-black uppercase tracking-widest">{settings?.tenant?.restaurant_name || 'Zamzam Kitchen'}</h1>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{settings?.tenant?.address || 'Premium Dining Experience'}</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{settings?.tenant?.phone || '+971 00 000 0000'}</p>
      </div>

      <div className="border-y-2 border-dashed border-slate-100 py-4 mb-6">
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
          <span>Order {order.id}</span>
          <span>{new Date(order.created_at || Date.now()).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
          <span>Table</span>
          <span>{order.table_id || 'TAKEAWAY'}</span>
        </div>
      </div>

      <div className="space-y-4 mb-8">
        {order.items.map((item: any, i: number) => (
          <div key={i} className="flex justify-between items-start">
            <div className="flex-1">
              <p className="text-[11px] font-black uppercase tracking-tight">{item.name}</p>
              <p className="text-[9px] font-bold text-slate-400">{item.quantity} x {item.price.toFixed(2)}</p>
            </div>
            <p className="text-[11px] font-black">{(item.price * item.quantity).toFixed(2)}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 pt-6 space-y-2">
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <span>Subtotal</span>
          <span>{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <span>Tax (5%)</span>
          <span>{tax.toFixed(2)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-red-500">
            <span>Discount</span>
            <span>-{discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-black uppercase tracking-tight pt-4 mt-2 border-t-2 border-slate-900">
          <span>Total</span>
          <span>{(order.total_amount || (subtotal + tax - discount)).toFixed(2)} {currency}</span>
        </div>
      </div>

      <div className="text-center mt-10">
        <div className="w-16 h-16 mx-auto bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 mb-4 border border-slate-100">
           <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2m4-4H8m4 4v2a2 2 0 01-2 2H8a2 2 0 01-2-2v-2m4-4V4"></path></svg>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1">Thank You!</p>
        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.1em]">Visit us again at {settings?.tenant?.restaurant_name || 'Zamzam'}</p>
      </div>
    </div>
  );
}
