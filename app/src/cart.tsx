import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from './storage';

export interface CartLine { dishId: string; name: string; price: number; quantity: number }
interface Cart { cookId: string | null; cookName: string | null; lines: CartLine[] }
interface CartCtx extends Cart {
  count: number; subtotal: number;
  add(cook: { id: string; name: string }, line: Omit<CartLine, 'quantity'>, qty?: number): 'added' | 'other-cook';
  replaceWith(cook: { id: string; name: string }, line: Omit<CartLine, 'quantity'>, qty?: number): void;
  setQty(dishId: string, qty: number): void; clear(): void;
}
const Ctx = createContext<CartCtx | null>(null);
const KEY = 'maacrave.cart';
const EMPTY: Cart = { cookId: null, cookName: null, lines: [] };

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart>(EMPTY);
  useEffect(() => { storage.get(KEY).then((v) => { if (v) try { setCart(JSON.parse(v)); } catch { /* ignore corrupt cart */ } }); }, []);
  useEffect(() => { storage.set(KEY, JSON.stringify(cart)); }, [cart]);

  const value = useMemo<CartCtx>(() => ({
    ...cart,
    count: cart.lines.reduce((a, l) => a + l.quantity, 0),
    subtotal: cart.lines.reduce((a, l) => a + l.quantity * l.price, 0),
    add(cook, line, qty = 1) {
      if (cart.cookId && cart.cookId !== cook.id && cart.lines.length) return 'other-cook';
      setCart((c) => {
        const ex = c.lines.find((l) => l.dishId === line.dishId);
        const lines = ex ? c.lines.map((l) => (l.dishId === line.dishId ? { ...l, quantity: Math.min(50, l.quantity + qty) } : l)) : [...c.lines, { ...line, quantity: qty }];
        return { cookId: cook.id, cookName: cook.name, lines };
      });
      return 'added';
    },
    replaceWith(cook, line, qty = 1) { setCart({ cookId: cook.id, cookName: cook.name, lines: [{ ...line, quantity: qty }] }); },
    setQty(dishId, qty) {
      setCart((c) => {
        const lines = qty <= 0 ? c.lines.filter((l) => l.dishId !== dishId) : c.lines.map((l) => (l.dishId === dishId ? { ...l, quantity: Math.min(50, qty) } : l));
        return lines.length ? { ...c, lines } : EMPTY;
      });
    },
    clear() { setCart(EMPTY); },
  }), [cart]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useCart() { const v = useContext(Ctx); if (!v) throw new Error('useCart outside CartProvider'); return v; }
