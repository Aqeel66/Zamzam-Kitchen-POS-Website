import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config';

interface CartItem {
  cartItemId: string; // Unique ID for the cart entry
  id: number;
  name: string;
  price: number;
  image: string | null;
  quantity: number;
  notes?: string;
  variant?: any;
  extras?: any[];
  sale_price?: number | null;
}

interface CartContextType {
  cart: CartItem[];
  editingOrder: any | null;
  loadOrderIntoCart: (order: any) => void;
  addToCart: (item: any, variant?: any, extras?: any[]) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  clearCart: () => void;
  subtotal: number;
  tax: number;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [editingOrder, setEditingOrder] = useState<any>(null);

  const loadOrderIntoCart = useCallback((order: any) => {
    setEditingOrder(order);
    setCart((order.items || []).map((item: any) => {
      if (!item) return null;
      // Create a unique cartItemId if not present
      const cartItemId = item.cartItemId || `${item.id || item.product_id}-${Date.now()}-${Math.random()}`;
      return {
        cartItemId,
        id: item.product_id || item.id,
        name: item.name || 'Unknown Item',
        price: parseFloat(item.price || 0),
        quantity: parseInt(item.quantity || 1),
        image: item.image || null,
        notes: item.notes || '',
        variant: item.variant || null,
        extras: item.extras || []
      };
    }).filter(Boolean));
  }, []);

  const addToCart = useCallback((item: any, variant?: any, extras: any[] = []) => {
    // Generate a unique ID based on item, variant, and extras
    const variantStr = variant ? `-${variant.id || variant.name}` : '';
    const extrasStr = extras.length > 0 ? `-${extras.map(e => e.id || e.name).sort().join('-')}` : '';
    const cartItemId = `${item.id}${variantStr}${extrasStr}`;

    // Calculate total price for this specific configuration
    let itemPrice: number = 0;
    
    if (variant) {
      // If variant has sale price offset, use it. Otherwise use variant price offset.
      const sPrice = variant.sale_price_offset !== undefined ? variant.sale_price_offset : variant.sale_price_adjustment;
      const rPrice = variant.price_offset !== undefined ? variant.price_offset : (variant.price_adjustment || 0);

      itemPrice = (sPrice !== null && parseFloat(sPrice) > 0)
        ? parseFloat(sPrice)
        : parseFloat(rPrice);
    } else {
      // Use item sale_price if available, otherwise regular price
      itemPrice = (item.sale_price && parseFloat(item.sale_price) > 0) 
        ? parseFloat(item.sale_price) 
        : parseFloat(item.price);
    }
    
    // Extras are always added on top. Check if extra has sale price.
    extras.forEach(e => {
      const sPrice = e.sale_price !== undefined ? e.sale_price : e.sale_price_adjustment;
      const rPrice = e.price !== undefined ? e.price : (e.price_adjustment || 0);

      const extraPrice = (sPrice !== null && parseFloat(sPrice) > 0)
        ? parseFloat(sPrice)
        : parseFloat(rPrice);
      itemPrice += extraPrice;
    });

    setCart(prev => {
      const existing = prev.find(i => i.cartItemId === cartItemId);
      if (existing) {
        return prev.map(i => i.cartItemId === cartItemId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { 
        ...item, 
        cartItemId, 
        price: itemPrice, 
        quantity: 1,
        variant,
        extras
      }];
    });
  }, []);

  const removeFromCart = useCallback((cartItemId: string) => {
    setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
  }, []);

  const updateQuantity = useCallback((cartItemId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.cartItemId === cartItemId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setEditingOrder(null);
  }, []);

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
