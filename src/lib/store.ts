import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { customerInputSchema, type CustomerInput } from "@/lib/customer-fields";
import { saveCustomerRecord } from "@/lib/customer.functions";

export type Product = {
  id: string;
  name: string;
  category: string;
  photo?: string | null;
  stock: number;
  minStock: number;
  cost: number; // custo da nota (unitário)
  purchaseExtra: number; // frete/embalagem da compra (total)
  purchaseQty: number; // unidades dessa compra
  realCost: number; // custo unitário real
  price: number;
};
export type Payment = "Pix" | "Dinheiro" | "Débito" | "Crédito" | "Parcelado";
export const PAYMENTS: Payment[] = ["Pix", "Dinheiro", "Débito", "Crédito", "Parcelado"];
export type Channel = "Loja física" | "WhatsApp" | "Instagram" | "Site";
export const CHANNELS: Channel[] = ["Loja física", "WhatsApp", "Instagram", "Site"];
export type Sale = {
  id: string;
  productId: string | null;
  productName: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
  payment: Payment;
  installments: number;
  channel: Channel;
  feeValue: number;
  shippingCost: number;
  shippingPaidBy: "cliente" | "loja" | null;
  date: string;
  customerId: string | null;
};
export type Customer = { id: string; name: string; whatsapp: string | null; birthday: string | null; address: string | null; street: string | null; addressNumber: string | null; addressComplement: string | null; city: string | null; state: string | null; postalCode: string | null; notes: string | null };
const customerColumns = "id,name,whatsapp,birthday,address,street,address_number,address_complement,city,state,postal_code,notes";
const toCustomer = (r: any): Customer => ({
  id: r.id, name: r.name, whatsapp: r.whatsapp, birthday: r.birthday, address: r.address,
  street: r.street, addressNumber: r.address_number, addressComplement: r.address_complement,
  city: r.city, state: r.state, postalCode: r.postal_code, notes: r.notes,
});
export function customerAddress(c: Customer) {
  const street = [c.street, c.addressNumber].filter(Boolean).join(", ");
  const parts = [street, c.addressComplement, [c.city, c.state].filter(Boolean).join(" - "), c.postalCode].filter(Boolean);
  return [...parts, c.address].filter(Boolean).join(" · ");
}
export type Fees = { pix: number; debit: number; credit: number; installmentBase: number; installmentPer: number };

export const CATEGORIES = ["Aromatizadores", "Velas", "Vasos", "Decoração", "Presentes", "Outros"];

export type Role = "admin" | "vendedor";
type State = { products: Product[]; sales: Sale[]; customers: Customer[]; fees: Fees; ready: boolean; role: Role | null };
const defaultFees: Fees = { pix: 0, debit: 1.99, credit: 3.49, installmentBase: 4.99, installmentPer: 1.5 };
const empty: State = { products: [], sales: [], customers: [], fees: defaultFees, ready: false, role: null };
let state: State = empty;
let started = false;
let poll: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();
const emit = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const n = (v: any) => Number(v) || 0;
const toProduct = (r: any): Product => ({
  id: r.id, name: r.name, category: r.category, photo: r.photo, stock: r.stock, minStock: r.min_stock,
  cost: n(r.cost), purchaseExtra: n(r.purchase_extra), purchaseQty: r.purchase_qty ?? 1, realCost: n(r.real_cost), price: n(r.price),
});
const toSale = (r: any): Sale => ({
  id: r.id, productId: r.product_id ?? null, productName: r.product_name, qty: r.qty, unitPrice: n(r.unit_price),
  unitCost: n(r.unit_cost), payment: r.payment, installments: r.installments, channel: r.channel,
  feeValue: n(r.fee_value), shippingCost: n(r.shipping_cost), shippingPaidBy: r.shipping_paid_by ?? null, date: r.created_at, customerId: r.customer_id ?? null,
});

async function loadProducts() {
  if (state.role === "vendedor") {
    const { data } = await supabase.rpc("catalog" as any);
    if (data) emit({ products: (data as any[]).map(toProduct) });
    return;
  }
  const { data } = await supabase.from("products").select("*").order("name");
  if (data) emit({ products: data.map(toProduct) });
}
async function loadSales() {
  if (state.role === "vendedor") {
    const { data } = await supabase.rpc("today_sales" as any);
    if (data) emit({ sales: (data as any[]).map(toSale) });
    return;
  }
  const { data } = await supabase.from("sales").select("*").order("created_at", { ascending: false });
  if (data) emit({ sales: data.map(toSale) });
}
async function loadCustomers() {
  const { data } = await supabase.from("customers").select(customerColumns).order("name");
  if (data) emit({ customers: data.map(toCustomer) });
}
async function loadFees() {
  if (state.role !== "admin") return;
  const { data } = await supabase.from("fee_settings").select("*").eq("id", 1).maybeSingle();
  if (data) emit({ fees: { pix: n(data.pix), debit: n(data.debit), credit: n(data.credit), installmentBase: n(data.installment_base), installmentPer: n(data.installment_per) } });
}

async function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  const { data: role } = await supabase.rpc("current_app_role" as any);
  emit({ role: (role as Role | null) ?? null });
  if (!role) return emit({ ready: true });
  await Promise.all([loadProducts(), loadSales(), loadFees(), loadCustomers()]);
  emit({ ready: true });
  supabase.channel("customers-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, loadCustomers)
    .subscribe();
  if (role === "admin") {
    supabase
      .channel("store-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, loadProducts)
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, loadSales)
      .on("postgres_changes", { event: "*", schema: "public", table: "fee_settings" }, loadFees)
      .subscribe();
  } else {
    poll = setInterval(() => { loadProducts(); loadSales(); }, 20000);
  }
}
export function resetStore() {
  supabase.removeAllChannels();
  if (poll) clearInterval(poll);
  poll = null;
  started = false;
  state = empty;
  listeners.forEach((l) => l());
}

export function useStore() {
  return useSyncExternalStore(
    (l) => {
      start();
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => empty,
  );
}

export const realUnitCost = (cost: number, extra: number, qty: number) => cost + (qty > 0 ? extra / qty : 0);

export async function saveProduct(p: Omit<Product, "id" | "realCost"> & { id?: string }) {
  const row = {
    name: p.name, category: p.category, photo: p.photo ?? null, stock: p.stock, min_stock: p.minStock,
    cost: p.cost, purchase_extra: p.purchaseExtra, purchase_qty: Math.max(1, p.purchaseQty),
    real_cost: realUnitCost(p.cost, p.purchaseExtra, p.purchaseQty), price: p.price,
  };
  const { error } = p.id ? await supabase.from("products").update(row).eq("id", p.id) : await supabase.from("products").insert(row);
  if (error) throw error;
  await loadProducts();
}
export async function deleteProduct(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
  await loadProducts();
}

export function feeRate(pay: Payment, installments: number, f: Fees) {
  switch (pay) {
    case "Pix": return f.pix;
    case "Débito": return f.debit;
    case "Crédito": return f.credit;
    case "Parcelado": return f.installmentBase + f.installmentPer * Math.max(0, installments - 2);
    default: return 0;
  }
}

export async function registerSale(input: {
  productId: string; qty: number; payment: Payment; installments: number; channel: Channel;
  shippingCost: number; shippingPaidBy: "cliente" | "loja" | null; customerId?: string | null;
}) {
  const { error } = await supabase.rpc("register_sale", {
    _product_id: input.productId, _qty: input.qty, _payment: input.payment,
    _installments: input.payment === "Parcelado" ? input.installments : 1, _channel: input.channel,
    _fee_rate: feeRate(input.payment, input.installments, state.fees),
    _shipping_cost: input.shippingPaidBy ? input.shippingCost : 0, _shipping_paid_by: input.shippingPaidBy ?? "",
    ...(input.customerId ? { _customer_id: input.customerId } : {}),
  });
  if (error) throw error;
  await Promise.all([loadProducts(), loadSales()]);
}

export async function saveFees(f: Fees) {
  const { error } = await supabase.from("fee_settings").update({
    pix: f.pix, debit: f.debit, credit: f.credit, installment_base: f.installmentBase, installment_per: f.installmentPer,
  }).eq("id", 1);
  if (error) throw error;
  await loadFees();
}

/** Lucro líquido de uma venda: receita − custo real − taxa − frete absorvido pela loja. */
export const saleNet = (s: Sale) =>
  s.qty * s.unitPrice - s.qty * s.unitCost - s.feeValue - (s.shippingPaidBy === "loja" ? s.shippingCost : 0);

export type Status = "ok" | "low" | "out";
export function stockStatus(p: Product): Status {
  if (p.stock <= 0) return "out";
  if (p.stock <= p.minStock) return "low";
  return "ok";
}
export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

export async function saveCustomer(input: CustomerInput): Promise<Customer> {
  const c = customerInputSchema.parse(input);
  const row = await saveCustomerRecord({ data: c });
  await loadCustomers();
  return toCustomer(row);
}
export async function deleteCustomer(id: string) {
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw error;
  await loadCustomers();
}
export type HistoryItem = { id: string; product_name: string; qty: number; unit_price: number; payment: string; channel: string; created_at: string };
export async function customerHistory(id: string): Promise<HistoryItem[]> {
  const { data, error } = await supabase.rpc("customer_history" as any, { _customer_id: id } as any);
  if (error) throw error;
  return (data as HistoryItem[]) ?? [];
}
export const onlyDigits = (v: string) => v.replace(/\D/g, "");
