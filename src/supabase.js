// src/supabase.js
import { createClient } from "@supabase/supabase-js";

const URL  = import.meta.env.VITE_SUPABASE_URL;
const KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!URL || !KEY) {
  console.warn("⚠️  Supabase env vars missing. Running in offline mode.");
}

export const supabase = (URL && KEY) ? createClient(URL, KEY) : null;

// ── helpers: mappers DB ↔ app ─────────────────────────────────

export function dbToFeria(r) {
  return { id: r.id, name: r.name, location: r.location||"", date: r.date||"", notes: r.notes||"" };
}
export function dbToSupplier(r) {
  return { id: r.id, feriaId: r.feria_id, name: r.name, stand: r.stand||"", description: r.description||"", day: r.day||"" };
}
export function dbToArticle(r) {
  return {
    id: r.id, feriaId: r.feria_id, supplierId: r.supplier_id,
    name: r.name, rubro: r.rubro||"Bazar", familia: r.familia||"",
    description: r.description||"", price: r.price||"", currency: r.currency||"USD",
    cbmBulto: r.cbm_bulto||"", kgBulto: r.kg_bulto||"",
    unidadesXBulto: r.unidades_x_bulto||"", minBultos: r.min_bultos||"",
    photo: r.photo||"",
    codProv: r.cod_prov||"", codBYC: r.cod_byc||""
  };
}
export function dbToCarga(r, itemRows) {
  const items = {};
  (itemRows||[]).filter(i => i.carga_id === r.id).forEach(i => { items[i.article_id] = i.bultos; });
  return { id: r.id, name: r.name, containerType: r.container_type||"40", items };
}

export function feriaToDb(f)    { return { id:f.id, name:f.name, location:f.location, date:f.date, notes:f.notes }; }
export function supplierToDb(s) { return { id:s.id, feria_id:s.feriaId, name:s.name, stand:s.stand, description:s.description, day:s.day }; }
export function articleToDb(a)  {
  return {
    id:a.id, feria_id:a.feriaId, supplier_id:a.supplierId,
    name:a.name, rubro:a.rubro, familia:a.familia, description:a.description,
    price:a.price, currency:a.currency, cbm_bulto:a.cbmBulto, kg_bulto:a.kgBulto,
    unidades_x_bulto:a.unidadesXBulto, min_bultos:a.minBultos, photo:a.photo,
    cod_prov:a.codProv||null, cod_byc:a.codBYC||null
  };
}
