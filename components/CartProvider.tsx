"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
export type CartItem = { sku: string; qty: number };
export const CART_KEY = "lb-cart-v1";
type Ctx = { items: CartItem[]; count: number; ready: boolean; add: (sku: string, qty: number) => void; setQty: (sku: string, qty: number) => void; remove: (sku: string) => void; clear: () => void };
const C = createContext<Ctx | null>(null);
function load(): CartItem[] {
  try { const v = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]"); return Array.isArray(v) ? v.filter((i) => typeof i?.sku === "string" && Number.isInteger(i?.qty) && i.qty > 0) : []; } catch { return []; }
}
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate: hydrate from localStorage after mount (SSR-safe)
  useEffect(() => { setItems(load()); setReady(true); }, []);
  useEffect(() => { if (ready) try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch { /* storage unavailable: cart works for this session only */ } }, [items, ready]);
  const add = useCallback((sku: string, qty: number) => setItems((cur) => cur.some((i) => i.sku === sku) ? cur.map((i) => i.sku === sku ? { ...i, qty: i.qty + qty } : i) : [...cur, { sku, qty }]), []);
  const setQty = useCallback((sku: string, qty: number) => setItems((cur) => qty <= 0 ? cur.filter((i) => i.sku !== sku) : cur.map((i) => i.sku === sku ? { ...i, qty } : i)), []);
  const remove = useCallback((sku: string) => setItems((cur) => cur.filter((i) => i.sku !== sku)), []);
  const clear = useCallback(() => setItems([]), []);
  const value = useMemo(() => ({ items, count: items.reduce((s, i) => s + i.qty, 0), ready, add, setQty, remove, clear }), [items, ready, add, setQty, remove, clear]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
export function useCart() { const c = useContext(C); if (!c) throw new Error("useCart must be used inside CartProvider"); return c; }
