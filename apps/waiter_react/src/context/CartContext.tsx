import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  variantId?: number;
  variantName?: string;
  extras?: Array<{ id: number; name: string; price: number }>;
}

interface CartContextType {
  cart: CartItem[];
  tableId: number | null;
  setTableId: (id: number | null) => void;
  addItem: (item: CartItem) => void;
  removeItem: (itemId: number, variantId?: number) => void;
  updateQuantity: (itemId: number, delta: number, variantId?: number) => void;
  clearCart: () => void;
  loadOrderIntoCart: (order: any) => void;
  editingOrderId: number | null;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableId, setTableId] = useState<number | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);

  const addItem = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id && i.variantId === item.variantId);
      if (existing) {
        return prev.map(i => i === existing ? { ...i, quantity: i.quantity + item.quantity } : i);
      }
      return [...prev, item];
    });
  };

  const removeItem = (itemId: number, variantId?: number) => {
    setCart(prev => prev.filter(i => !(i.id === itemId && i.variantId === variantId)));
  };

  const updateQuantity = (itemId: number, delta: number, variantId?: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === itemId && i.variantId === variantId) {
        const newQty = Math.max(0, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const clearCart = () => {
    setCart([]);
    setTableId(null);
    setEditingOrderId(null);
  };

  const loadOrderIntoCart = (order: any) => {
    setEditingOrderId(order.id);
    setTableId(order.table_id);
    setCart((order.items || []).map((item: any) => ({
      id: item.menu_item_id || item.id,
      name: item.name,
      price: parseFloat(item.price || item.unit_price),
      quantity: item.quantity,
      variantId: item.variant_id,
      extras: item.extras || []
    })));
  };

  const total = cart.reduce((sum, item) => {
    const extrasTotal = item.extras?.reduce((s, e: any) => s + (e.price || 0), 0) || 0;
    return sum + (item.price + extrasTotal) * item.quantity;
  }, 0);

  return (
    <CartContext.Provider value={{ 
      cart, tableId, setTableId, addItem, removeItem, updateQuantity, clearCart, 
      loadOrderIntoCart, editingOrderId, total 
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
