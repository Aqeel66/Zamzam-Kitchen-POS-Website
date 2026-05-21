import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageClass?: string;
  image?: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  totalPrice: number;
  totalItems: number;
  // QR Table context
  tableId: number | null;
  tableNumber: string | null;
  setTableContext: (id: number, number: string) => void;
  clearTableContext: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const cleanTableNum = (num: string | number) => {
    if (!num) return '';
    const clean = num.toString().trim().replace(/^[t\s\-_–—]+/i, '');
    return 'T-' + clean;
  };

  // Restore table context from sessionStorage (survives page navigation in same tab)
  const [tableId, setTableId] = useState<number | null>(() => {
    const stored = sessionStorage.getItem('qr_table_id');
    return stored ? parseInt(stored) : null;
  });
  const [tableNumber, setTableNumber] = useState<string | null>(() => {
    const stored = sessionStorage.getItem('qr_table_number');
    return stored ? cleanTableNum(stored) : null;
  });

  useEffect(() => {
    if (tableId !== null && tableNumber !== null) {
      sessionStorage.setItem('qr_table_id', tableId.toString());
      sessionStorage.setItem('qr_table_number', tableNumber);
    }
  }, [tableId, tableNumber]);

  const setTableContext = (id: number, number: string) => {
    const cleaned = cleanTableNum(number);
    setTableId(id);
    setTableNumber(cleaned);
    sessionStorage.setItem('qr_table_id', id.toString());
    sessionStorage.setItem('qr_table_number', cleaned);
  };

  const clearTableContext = () => {
    setTableId(null);
    setTableNumber(null);
    sessionStorage.removeItem('qr_table_id');
    sessionStorage.removeItem('qr_table_number');
  };

  const addToCart = (newItem: Omit<CartItem, 'quantity'>) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === newItem.id);
      if (existing) {
        return prev.map(i => i.id === newItem.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...newItem, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems(prev => prev.map(i => {
      if (i.id === id) {
        const nextQty = Math.max(0, i.quantity + delta);
        return { ...i, quantity: nextQty };
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const clearCart = () => setItems([]);

  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      items, addToCart, removeFromCart, updateQuantity, clearCart,
      totalPrice, totalItems,
      tableId, tableNumber, setTableContext, clearTableContext
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
