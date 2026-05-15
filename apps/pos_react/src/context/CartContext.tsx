import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { API_BASE_URL } from '../config';

interface CartItem {
  id: number;
  name: string;
  price: number;
  image: string | null;
  quantity: number;
  notes?: string;
}

interface CartContextType {
  cart: CartItem[];
  editingOrder: any | null;
  loadOrderIntoCart: (order: any) => void;
  addToCart: (item: any) => void;
  removeFromCart: (id: number) => void;
  updateQuantity: (id: number, delta: number) => void;
  clearCart: () => void;
  subtotal: number;
  tax: number;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [editingOrder, setEditingOrder] = useState<any>(null);

  const loadOrderIntoCart = (order: any) => {
    setEditingOrder(order);
    setCart((order.items || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      price: parseFloat(item.price),
      quantity: item.quantity,
      image: item.image || null,
      notes: item.notes || ''
    })));
  };

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQty = Math.max(0, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const clearCart = () => {
    setCart([]);
    setEditingOrder(null);
  };

  const [settings, setSettings] = useState<any>(null);

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/settings?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (err) {
        console.error('Error fetching settings for cart:', err);
      }
    };
    fetchSettings();
    
    // Listen for settings updates
    window.addEventListener('settings-updated', fetchSettings);
    return () => window.removeEventListener('settings-updated', fetchSettings);
  }, []);

  const subtotal = useMemo(() => cart.reduce((sum, i) => sum + (i.price * i.quantity), 0), [cart]);
  
  const tax = useMemo(() => {
    if (!settings?.branch?.is_tax_enabled) return 0;
    const rate = parseFloat(settings.branch.tax_rate || 0) / 100;
    return subtotal * rate;
  }, [subtotal, settings]);

  const total = subtotal + tax;

  return (
    <CartContext.Provider value={{ 
      cart, editingOrder, loadOrderIntoCart, addToCart, removeFromCart, updateQuantity, clearCart,
      subtotal, tax, total
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
