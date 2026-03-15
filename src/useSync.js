// src/useSync.js
import { useState, useEffect, useRef } from "react";
import { supabase, dbToFeria, dbToSupplier, dbToArticle, dbToCarga,
         feriaToDb, supplierToDb, articleToDb } from "./supabase";

const LS_KEY = "cantonimp_data";
function loadLocal() {
  try { const r = localStorage.getItem(LS_KEY); if (r) return JSON.parse(r); } catch {}
  return null;
}
function saveLocal(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
}

// Re-fetch all data from Supabase
async function fetchAll(set) {
  const [fRes, sRes, aRes, cRes, ciRes, famRes] = await Promise.all([
    supabase.from("ferias").select("*").order("created_at"),
    supabase.from("suppliers").select("*").order("created_at"),
    supabase.from("articles").select("*").order("created_at"),
    supabase.from("cargas").select("*").order("created_at"),
    supabase.from("carga_items").select("*"),
    supabase.from("familias").select("*").order("name"),
  ]);
  set.ferias((fRes.data||[]).map(dbToFeria));
  set.suppliers((sRes.data||[]).map(dbToSupplier));
  set.articles((aRes.data||[]).map(dbToArticle));
  set.cargas((cRes.data||[]).map(r => dbToCarga(r, ciRes.data||[])));
  set.familias((famRes.data||[]).map(r => r.name));
}

export function useSync() {
  const [ferias,    setFerias]    = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [articles,  setArticles]  = useState([]);
  const [cargas,    setCargas]    = useState([]);
  const [familias,  setFamilias]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [online,    setOnline]    = useState(!!supabase);

  const setters = { ferias: setFerias, suppliers: setSuppliers, articles: setArticles, cargas: setCargas, familias: setFamilias };

  // Persist to localStorage
  useEffect(() => {
    saveLocal({ ferias, suppliers, articles, cargas, familias });
  }, [ferias, suppliers, articles, cargas, familias]);

  // Initial load
  useEffect(() => {
    if (!supabase) {
      const local = loadLocal();
      if (local) {
        setFerias(local.ferias||[]);
        setSuppliers(local.suppliers||[]);
        setArticles(local.articles||[]);
        setCargas(local.cargas||[]);
        setFamilias(local.familias||[]);
      }
      setLoading(false);
      return;
    }
    fetchAll(setters).then(() => setLoading(false)).catch(() => {
      setOnline(false);
      const local = loadLocal();
      if (local) {
        setFerias(local.ferias||[]);
        setSuppliers(local.suppliers||[]);
        setArticles(local.articles||[]);
        setCargas(local.cargas||[]);
        setFamilias(local.familias||[]);
      }
      setLoading(false);
    });
  }, []);

  // Helper: write then re-fetch
  async function write(fn) {
    await fn();
    await fetchAll(setters);
  }

  const db = {
    upsertFeria: (f) => write(() => supabase.from("ferias").upsert(feriaToDb(f))),
    deleteFeria: (id) => write(() => supabase.from("ferias").delete().eq("id", id)),

    upsertSupplier: (s) => write(() => supabase.from("suppliers").upsert(supplierToDb(s))),
    deleteSupplier: (id) => write(() => supabase.from("suppliers").delete().eq("id", id)),

    upsertArticle: (a) => write(() => supabase.from("articles").upsert(articleToDb(a))),
    deleteArticle: (id) => write(() => supabase.from("articles").delete().eq("id", id)),

    upsertCarga: (c) => write(() => supabase.from("cargas").upsert({ id:c.id, name:c.name, container_type:c.containerType })),
    deleteCarga: (id) => write(() => supabase.from("cargas").delete().eq("id", id)),

    setCargaItem: async (cargaId, articleId, bultos) => {
      // optimistic update
      setCargas(p => p.map(c => {
        if (c.id !== cargaId) return c;
        const items = { ...c.items };
        if (bultos <= 0) delete items[articleId]; else items[articleId] = bultos;
        return { ...c, items };
      }));
      if (bultos <= 0) {
        await supabase.from("carga_items").delete().eq("carga_id", cargaId).eq("article_id", articleId);
      } else {
        await supabase.from("carga_items").upsert({ carga_id: cargaId, article_id: articleId, bultos });
      }
    },

    clearCarga: async (cargaId) => {
      setCargas(p => p.map(c => c.id === cargaId ? { ...c, items: {} } : c));
      await supabase.from("carga_items").delete().eq("carga_id", cargaId);
    },

    bulkAddToCarga: async (cargaId, articleIds) => {
      setCargas(p => p.map(c => {
        if (c.id !== cargaId) return c;
        const items = { ...c.items };
        articleIds.forEach(id => { if (!items[id]) items[id] = 1; });
        return { ...c, items };
      }));
      const rows = articleIds.map(id => ({ carga_id: cargaId, article_id: id, bultos: 1 }));
      await supabase.from("carga_items").upsert(rows, { ignoreDuplicates: true });
    },

    addFamilia: (name) => write(() => supabase.from("familias").upsert({ name })),
  };

  // offline fallback for db
  if (!supabase) {
    return {
      ferias, suppliers, articles, cargas, familias, loading, online: false,
      db: {
        upsertFeria: (f) => setFerias(p => p.find(x=>x.id===f.id) ? p.map(x=>x.id===f.id?f:x) : [...p,f]),
        deleteFeria: (id) => setFerias(p => p.filter(x=>x.id!==id)),
        upsertSupplier: (s) => setSuppliers(p => p.find(x=>x.id===s.id) ? p.map(x=>x.id===s.id?s:x) : [...p,s]),
        deleteSupplier: (id) => { setSuppliers(p=>p.filter(x=>x.id!==id)); setArticles(p=>p.filter(x=>x.supplierId!==id)); },
        upsertArticle: (a) => setArticles(p => p.find(x=>x.id===a.id) ? p.map(x=>x.id===a.id?a:x) : [...p,a]),
        deleteArticle: (id) => { setArticles(p=>p.filter(x=>x.id!==id)); setCargas(p=>p.map(c=>{const items={...c.items};delete items[id];return{...c,items};})); },
        upsertCarga: (c) => setCargas(p => p.find(x=>x.id===c.id) ? p.map(x=>x.id===c.id?c:x) : [...p,c]),
        deleteCarga: (id) => setCargas(p=>p.filter(x=>x.id!==id)),
        setCargaItem: (cid, aid, b) => setCargas(p=>p.map(c=>{if(c.id!==cid)return c;const items={...c.items};if(b<=0)delete items[aid];else items[aid]=b;return{...c,items};})),
        clearCarga: (cid) => setCargas(p=>p.map(c=>c.id===cid?{...c,items:{}}:c)),
        bulkAddToCarga: (cid, ids) => setCargas(p=>p.map(c=>{if(c.id!==cid)return c;const items={...c.items};ids.forEach(id=>{if(!items[id])items[id]=1;});return{...c,items};})),
        addFamilia: (name) => setFamilias(p=>[...p,name].sort()),
      }
    };
  }

  return { ferias, suppliers, articles, cargas, familias, loading, online, db };
}
