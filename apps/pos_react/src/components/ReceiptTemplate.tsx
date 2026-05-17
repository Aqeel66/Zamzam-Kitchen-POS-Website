import React from 'react';
import { resolveImageUrl } from '../config';

interface ReceiptProps {
  order: any;
  branch: any;
}

export const ReceiptTemplate = React.forwardRef<HTMLDivElement, ReceiptProps>(({ order, branch }, ref) => {
  const subtotal = (order?.items || []).reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.10; // Assuming 10% tax for display

  return (
    <div ref={ref} className="bg-white p-4 w-[80mm] text-slate-900 font-mono text-xs leading-tight">
      {/* Header */}
      <div className="text-center mb-6 space-y-4">
        <div className="flex flex-col items-center gap-4 mb-4">
          <div className="flex justify-center items-center gap-8 w-full">
            {branch.logo_url && (
              <img 
                src={resolveImageUrl(branch.logo_url)} 
                alt="Logo" 
                className="h-20 w-20 object-contain"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            )}
            {branch.secondary_logo_url && (
              <img 
                src={resolveImageUrl(branch.secondary_logo_url)} 
                alt="Secondary Logo" 
                className="h-20 w-20 object-contain"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            )}
          </div>
        </div>
        <h1 className="text-xl font-bold uppercase tracking-tighter">{branch.restaurant_name || 'Zamzam Kitchen'}</h1>
        {branch.receipt_header ? (
          <div className="text-[10px] whitespace-pre-line leading-tight opacity-80">
            {branch.receipt_header}
          </div>
        ) : (
          <>
            {branch.business_name && branch.business_name !== branch.restaurant_name && (
              <p className="font-bold text-[10px]">{branch.business_name}</p>
            )}
            <p>{branch.business_address || 'Dubai, UAE'}</p>
            <p>Tel: {branch.business_phone || '+971 50 000 0000'}</p>
            {branch.business_email && (
              <p>Email: {branch.business_email}</p>
            )}
          </>
        )}
        <div className="border-t border-dashed border-slate-300 my-2" />
        <p className="font-bold uppercase tracking-widest">Tax Invoice</p>
      </div>

      {/* Order Info */}
      <div className="mb-4 space-y-1">
        <div className="flex justify-between">
          <span>Order #:</span>
          <span className="font-bold">
            {(order?.orderNumber || order?.order_number || '').toString() || 'N/A'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{order?.order_time ? new Date(order.order_time).toLocaleString() : new Date().toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Type:</span>
          <span className="font-bold uppercase">{order?.order_type || 'Dine-In'}</span>
        </div>
        {order?.order_type === 'Dine-In' && (
          <>
            {(order?.table_number || order?.table_id) && (
              <div className="flex justify-between">
                <span>Table:</span>
                <span className="font-bold">Table {order.table_number || order.table_id}</span>
              </div>
            )}
            {order?.waiter_name && (
              <div className="flex justify-between">
                <span>Waiter:</span>
                <span className="font-bold">{order.waiter_name}</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-t border-dashed border-slate-300 my-2" />

      {/* Items */}
      <table className="w-full mb-4">
        <thead className="text-left">
          <tr className="border-b border-slate-100">
            <th className="py-2">Item</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {(order?.items || []).map((item: any, idx: number) => (
            <tr key={idx} className="align-top">
              <td className="py-2 pr-2">
                <span className="font-bold">{item.name}</span>
                {item.notes && <p className="text-[10px] italic text-slate-500">Note: {item.notes}</p>}
              </td>
              <td className="py-2 text-right">{item.quantity}</td>
              <td className="py-2 text-right">{(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-dashed border-slate-300 my-2" />

      {/* Totals */}
      <div className="space-y-2 mb-6">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{subtotal.toFixed(2)}</span>
        </div>
        {order?.promo_discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Promo Discount:</span>
            <span>-{order.promo_discount.toFixed(2)}</span>
          </div>
        )}
        {order?.manual_discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Manual Discount:</span>
            <span>-{order.manual_discount.toFixed(2)}</span>
          </div>
        )}
        {order?.reservation_fee > 0 && (
          <div className="flex justify-between text-orange-600">
            <span>Reservation Credit:</span>
            <span>-{order.reservation_fee.toFixed(2)}</span>
          </div>
        )}
        {!(order?.promo_discount > 0 || order?.manual_discount > 0 || order?.reservation_fee > 0) && order?.discount_amount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount:</span>
            <span>-{order.discount_amount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Tax (10%):</span>
          <span>{tax.toFixed(2)}</span>
        </div>
        {order?.tip_amount > 0 && (
          <div className="flex justify-between text-slate-600">
            <span>Tip:</span>
            <span>+{order.tip_amount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold border-t border-slate-200 pt-2">
          <span>TOTAL:</span>
          <span>{(order?.total_amount || (subtotal + tax - (order?.discount_amount || 0) + (order?.tip_amount || 0))).toFixed(2)} {branch?.currency || 'USD'}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center space-y-2">
        {branch.receipt_footer ? (
          <p className="font-bold italic whitespace-pre-line text-[10px]">{branch.receipt_footer}</p>
        ) : (
          <p className="font-bold italic">Thank you for visiting Zamzam!</p>
        )}
        <p className="text-[10px] text-slate-400">TRN: 100349283400003</p>
        {branch.show_qr_on_receipt === 1 && (
          <div className="mt-4 flex justify-center opacity-50">
             {/* Placeholder for QR code */}
             <div className="w-16 h-16 border border-slate-300 flex items-center justify-center text-[8px] text-slate-300">QR CODE</div>
          </div>
        )}
      </div>
    </div>
  );
});
