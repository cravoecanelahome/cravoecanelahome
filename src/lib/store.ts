import { useSyncExternalStore } from "react";

export type Product = {
  id: string;
  name: string;
  category: string;
  photo?: string;
  stock: number;
  minStock: number;
  cost: number;
  price: number;
};
export type Payment = "Pix" | "Cartão" | "Dinheiro";
export type Sale = {
  id: string;
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
  payment: Payment;
  date: string;
};

export const CATEGORIES = ["Aromatizadores", "Velas", "Vasos", "Decoração", "Presentes", "Outros"];

type State = { products: Product[]; sales: Sale[] };
const KEY = "cravo-canela-v1";
const empty: State = { products: [], sales: [] };
let state: State = empty;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = JSON.parse(raw);
  } catch {}
}
function save(next: State) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    alert("Memória cheia: tente usar fotos menores.");
  }
  listeners.forEach((l) => l());
}

export function useStore() {
  return useSyncExternalStore(
    (l) => {
      load();
      listeners.add(l);
      l();
      return () => listeners.delete(l);
    },
    () => {
      load();
      return state;
    },
    () => empty,
  );
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export function saveProduct(p: Omit<Product, "id"> & { id?: string }) {
  load();
  if (p.id) save({ ...state, products: state.products.map((x) => (x.id === p.id ? (p as Product) : x)) });
  else save({ ...state, products: [...state.products, { ...p, id: uid() }] });
}
export function deleteProduct(id: string) {
  load();
  save({ ...state, products: state.products.filter((x) => x.id !== id) });
}
export function registerSale(productId: string, qty: number, payment: Payment) {
  load();
  const p = state.products.find((x) => x.id === productId);
  if (!p || qty < 1 || qty > p.stock) return false;
  const sale: Sale = {
    id: uid(),
    productId,
    productName: p.name,
    qty,
    unitPrice: p.price,
    unitCost: p.cost,
    payment,
    date: new Date().toISOString(),
  };
  save({
    products: state.products.map((x) => (x.id === productId ? { ...x, stock: x.stock - qty } : x)),
    sales: [sale, ...state.sales],
  });
  return true;
}

export type Status = "ok" | "low" | "out";
export function stockStatus(p: Product): Status {
  if (p.stock <= 0) return "out";
  if (p.stock <= p.minStock) return "low";
  return "ok";
}
export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export function margin(cost: number, price: number) {
  const value = price - cost;
  const pct = price > 0 ? (value / price) * 100 : 0;
  return { value, pct };
}

export function resizeImage(file: File, max = 480): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const r = new FileReader();
    r.onload = () => {
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = img.width * s;
        c.height = img.height * s;
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = reject;
      img.src = r.result as string;
    };
    r.readAsDataURL(file);
  });
}
