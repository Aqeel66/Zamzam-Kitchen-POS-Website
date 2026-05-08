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
  removeItem: (itemId: number) => void;
  clearCart: () => void;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableId, setTableId] = useState<number | null>(null);

  const addItem = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id && i.variantId === item.variantId);
      if (existing) {
        return prev.map(i => i === existing ? { ...i, quantity: i.quantity + item.quantity } : i);
      }
      return [...prev, item];
    });
  };

  const removeItem = (itemId: number) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
    setTableId(null);
  };

  const total = cart.reduce((sum, item) => {
    const extrasTotal = item.extras?.reduce((s, e) => s + e.price, 0) || 0;
    return sum + (item.price + extrasTotal) * item.quantity;
  }, 0);

  return (
    <CartContext.Provider value={{ cart, tableId, setTableId, addItem, removeItem, clearCart, total }}>
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
