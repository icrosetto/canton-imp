import { useState, useMemo } from "react";
import React from "react";
import { useSync } from "./useSync";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const RUBROS = ["Bazar", "Hogar y Deco", "Limpieza", "Organización", "Baño", "Juguetes", "Otros"];
const CONTAINER_20 = { cbm: 28, kg: 21000, label: "20'" };
const CONTAINER_40 = { cbm: 67, kg: 26000, label: "40'" };
function uid() { return Math.random().toString(36).substr(2, 9); }

function densidadValor(cbm, uxb, precio) {
  const c = parseFloat(cbm), u = parseFloat(uxb), p = parseFloat(precio);
  if (!c || !u || !p) return null;
  return (1 / c) * u * p;
}
function dColor(val) {
  if (val === null) return null;
  if (val <= 400) return { bg: "#3a1a1a", border: "#e05252", text: "#e05252", label: "Cubo mal" };
  if (val <= 600) return { bg: "#2e2500", border: "#d4a017", text: "#f5c842", label: "Medio" };
  return { bg: "#0f2a1a", border: "#52c97e", text: "#52c97e", label: "Cubo bien" };
}
const barColor = p => p > 95 ? "#e05252" : p > 75 ? "#f5a623" : "#52c97e";

// ─── EXCEL EXPORT ─────────────────────────────────────────────────────────────
function exportCargaExcel(carga, loadedArticles, items, suppliers) {
  const suppName = id => suppliers.find(s => s.id === id)?.name || "";

  // Build rows
  const rows = loadedArticles.map(a => {
    const bultos = items[a.id] || 0;
    const uxb = parseFloat(a.unidadesXBulto) || 1;
    const cbm = parseFloat(a.cbmBulto) || 0;
    const kg = parseFloat(a.kgBulto) || 0;
    const price = parseFloat(a.price) || 0;
    return {
      Proveedor: suppName(a.supplierId),
      Rubro: a.rubro || "",
      Familia: a.familia || "",
      Artículo: a.name,
      Descripción: a.description || "",
      [`Precio ${a.currency}`]: price,
      "Uds x Bulto": uxb,
      "CBM / Bulto": cbm,
      "Kg / Bulto": kg,
      "Bultos Pedidos": bultos,
      "Total Unidades": Math.round(uxb * bultos),
      "Total CBM": parseFloat((cbm * bultos).toFixed(4)),
      "Total USD": parseFloat((price * uxb * bultos).toFixed(2)),
    };
  });

  // Totals row
  const totalBultos = loadedArticles.reduce((acc, a) => acc + (items[a.id]||0), 0);
  const totalUnits  = loadedArticles.reduce((acc, a) => acc + (parseFloat(a.unidadesXBulto)||1) * (items[a.id]||0), 0);
  const totalCbm    = loadedArticles.reduce((acc, a) => acc + (parseFloat(a.cbmBulto)||0) * (items[a.id]||0), 0);
  const totalUsd    = loadedArticles.reduce((acc, a) => acc + (parseFloat(a.price)||0) * (parseFloat(a.unidadesXBulto)||1) * (items[a.id]||0), 0);

  rows.push({
    Proveedor: "TOTAL", Rubro:"", Familia:"", Artículo:"", Descripción:"",
    "Precio USD":"", "Uds x Bulto":"", "CBM / Bulto":"", "Kg / Bulto":"",
    "Bultos Pedidos": totalBultos,
    "Total Unidades": Math.round(totalUnits),
    "Total CBM": parseFloat(totalCbm.toFixed(4)),
    "Total USD": parseFloat(totalUsd.toFixed(2)),
  });

  // Build CSV (works everywhere without library)
  const headers = Object.keys(rows[0]);
  const csvRows = [
    headers.join(","),
    ...rows.map(r => headers.map(h => {
      const val = r[h] ?? "";
      const str = String(val).replace(/"/g, '""');
      return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str}"` : str;
    }).join(","))
  ];
  const csv = "\uFEFF" + csvRows.join("\n"); // BOM for Excel UTF-8

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${carga.name.replace(/\s+/g,"_")}_carga.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0e0e0e;--surface:#181818;--s2:#222;--s3:#2a2a2a;
  --border:#2e2e2e;--accent:#f5a623;--accent2:#e8890a;
  --text:#f0ede8;--muted:#7a7672;--danger:#e05252;--success:#52c97e;--warn:#f5c842;
  --fd:'Bebas Neue',sans-serif;--fb:'DM Sans',sans-serif;--fm:'JetBrains Mono',monospace;
}
.app{background:var(--bg);color:var(--text);font-family:var(--fb);min-height:100vh;max-width:900px;margin:0 auto;display:flex;flex-direction:column;}
/* HEADER */
.hdr{background:var(--surface);border-bottom:2px solid var(--accent);padding:10px 24px 10px;position:sticky;top:0;z-index:100;}
.hdr-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
.logo{font-family:var(--fd);font-size:24px;letter-spacing:2px;color:var(--accent);line-height:1;}
.logo span{color:var(--text);}
.hdr-stats{display:flex;gap:7px;}
.stat-chip{background:var(--s2);border:1px solid var(--border);border-radius:6px;padding:3px 8px;font-family:var(--fm);font-size:10px;color:var(--muted);display:flex;flex-direction:column;align-items:center;line-height:1.3;}
.stat-chip strong{color:var(--accent);font-size:12px;}
.feria-badge{display:flex;align-items:center;gap:8px;background:var(--s2);border:1px solid var(--border);border-radius:7px;padding:5px 10px;margin-bottom:8px;cursor:pointer;transition:border-color .15s;}
.feria-badge:hover{border-color:var(--accent);}
.feria-dot{width:7px;height:7px;background:var(--accent);border-radius:50%;flex-shrink:0;}
/* NAV — 4 tabs, small font */
.nav{display:flex;background:var(--s2);border-radius:8px;padding:3px;}
.nav-btn{flex:1;padding:6px 0;border:none;background:transparent;color:var(--muted);font-family:var(--fb);font-size:11px;font-weight:500;border-radius:6px;cursor:pointer;transition:all .15s;letter-spacing:.2px;}
.nav-btn.active{background:var(--accent);color:#0e0e0e;font-weight:700;}
/* CONTENT */
.content{flex:1;padding:20px 24px;}
@media(min-width:600px){.metrics{grid-template-columns:1fr 1fr 1fr 1fr;}.art-thumb{width:90px;min-width:90px;height:90px;}.modal{max-width:560px;margin:0 auto;border-radius:16px;align-self:center;max-height:90vh;}.overlay{align-items:center;justify-content:center;}}
.stitle{font-family:var(--fd);font-size:20px;letter-spacing:1.5px;color:var(--accent);margin-bottom:14px;display:flex;align-items:center;gap:8px;}
.stitle::after{content:'';flex:1;height:1px;background:var(--border);}
.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:14px;}
.card-sm{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:9px;}
/* FORM */
.fg{margin-bottom:11px;}
.flabel{display:block;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:4px;}
.fi{width:100%;background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text);font-family:var(--fb);font-size:14px;outline:none;transition:border-color .15s;}
.fi:focus{border-color:var(--accent);}
.fi::placeholder{color:var(--muted);}
textarea.fi{resize:vertical;min-height:60px;}
select.fi option{background:#181818;}
.frow2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.photo-up{border:2px dashed var(--border);border-radius:8px;padding:14px;text-align:center;cursor:pointer;transition:border-color .15s;position:relative;overflow:hidden;margin-bottom:11px;}
.photo-up:hover{border-color:var(--accent);}
.photo-up input{position:absolute;inset:0;opacity:0;cursor:pointer;}
.photo-prev{width:100%;max-height:130px;object-fit:cover;border-radius:6px;margin-top:6px;}
/* BUTTONS */
.btn{padding:10px 18px;border:none;border-radius:8px;font-family:var(--fb);font-size:14px;font-weight:600;cursor:pointer;transition:all .15s;}
.btn-primary{background:var(--accent);color:#0e0e0e;width:100%;font-size:14px;padding:12px;}
.btn-primary:hover{background:var(--accent2);}
.btn-ghost{background:transparent;border:1px solid var(--border);color:var(--muted);padding:6px 12px;font-size:12px;border-radius:7px;cursor:pointer;}
.btn-ghost:hover{border-color:var(--accent);color:var(--accent);}
.btn-sm{background:var(--s2);border:1px solid var(--border);color:var(--text);padding:5px 9px;font-size:11px;border-radius:6px;cursor:pointer;}
.btn-accent{background:var(--accent);color:#0e0e0e;border:none;border-radius:7px;padding:8px 16px;font-family:var(--fb);font-size:13px;font-weight:700;cursor:pointer;}
/* TAGS & BADGES */
.tag{background:var(--s2);border:1px solid var(--border);border-radius:4px;padding:1px 6px;font-size:10px;color:var(--muted);}
.dbadge{border-radius:6px;padding:3px 7px;font-family:var(--fm);font-size:11px;font-weight:700;border:1px solid;}
/* ARTICLE CARD */
.art-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;display:flex;position:relative;margin-bottom:9px;transition:border-color .15s;}
.art-thumb{width:74px;min-width:74px;height:74px;background:var(--s2);display:flex;align-items:center;justify-content:center;font-size:24px;color:var(--muted);}
.art-thumb img{width:100%;height:100%;object-fit:cover;}
.art-body{flex:1;padding:8px 10px;min-width:0;}
.art-supplier{font-size:10px;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:1px;}
.art-name{font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px;}
.art-tags{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:4px;}
.art-bottom{display:flex;align-items:center;gap:6px;}
.art-price{font-family:var(--fm);font-size:13px;font-weight:700;color:var(--success);}
.art-currency{font-size:9px;color:var(--muted);font-family:var(--fm);}
.art-actions{position:absolute;top:5px;right:5px;display:flex;gap:3px;}
/* QTY */
.qty{display:flex;align-items:center;gap:4px;background:var(--s2);border:1px solid var(--border);border-radius:6px;padding:2px 5px;}
.qty-btn{background:none;border:none;color:var(--accent);font-size:16px;cursor:pointer;padding:0;line-height:1;}
.qty-val{font-family:var(--fm);font-size:12px;font-weight:700;min-width:18px;text-align:center;}
/* SEARCH */
.search-wrap{position:relative;margin-bottom:10px;}
.search-wrap input{width:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:9px 12px 9px 34px;color:var(--text);font-family:var(--fb);font-size:13px;outline:none;}
.search-wrap input:focus{border-color:var(--accent);}
.search-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--muted);font-size:14px;}
/* CHIPS */
.chips{display:flex;gap:5px;overflow-x:auto;padding-bottom:3px;margin-bottom:9px;scrollbar-width:none;}
.chips::-webkit-scrollbar{display:none;}
.chip{white-space:nowrap;padding:4px 10px;border-radius:20px;background:var(--surface);border:1px solid var(--border);color:var(--muted);font-size:11px;cursor:pointer;transition:all .15s;font-weight:500;}
.chip.active{background:var(--accent);border-color:var(--accent);color:#0e0e0e;font-weight:700;}
/* SUPPLIER CARDS */
.supp-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:11px 13px;margin-bottom:8px;display:flex;align-items:center;gap:10px;cursor:pointer;transition:border-color .15s;}
.supp-card:hover{border-color:var(--accent);}
.supp-dot{width:30px;height:30px;border-radius:7px;background:var(--s2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;}
.supp-name{font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.supp-stand{font-size:11px;color:var(--accent);font-weight:600;}
.supp-desc{font-size:11px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
/* FERIA GROUP HEADER */
.feria-group-hdr{display:flex;align-items:center;gap:8px;margin-bottom:8px;margin-top:4px;}
.feria-group-label{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--accent);white-space:nowrap;}
.feria-group-line{flex:1;height:1px;background:var(--border);}
/* DAY GROUP */
.day-group-hdr{display:flex;align-items:center;gap:7px;margin:10px 0 7px;}
.day-dot{width:6px;height:6px;background:var(--muted);border-radius:50%;}
.day-label{font-size:10px;color:var(--muted);font-weight:600;letter-spacing:.5px;}
/* CONTAINER PANEL */
.cont-panel{background:var(--surface);border:1px solid var(--border);border-top:3px solid var(--accent);border-radius:12px;padding:13px;margin-bottom:14px;}
.cont-title{font-family:var(--fd);font-size:17px;letter-spacing:1px;color:var(--accent);margin-bottom:10px;}
.metrics{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:11px;}
.mbox{background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:8px 10px;}
.mlabel{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);font-weight:700;margin-bottom:2px;}
.mval{font-family:var(--fm);font-size:18px;font-weight:600;line-height:1.1;}
.mval.acc{color:var(--accent);}
.mval.suc{color:var(--success);}
.munit{font-size:10px;color:var(--muted);margin-top:1px;}
.bar-wrap{margin-bottom:7px;}
.bar-label{display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-bottom:4px;}
.bar-track{height:8px;background:var(--s2);border-radius:4px;overflow:hidden;border:1px solid var(--border);}
.bar-fill{height:100%;border-radius:4px;transition:width .4s;}
/* LOAD ITEM */
.load-item{display:flex;align-items:center;gap:8px;background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:8px 10px;margin-bottom:7px;}
.li-name{font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.li-meta{font-family:var(--fm);font-size:10px;color:var(--muted);}
/* CARGA CARDS */
.carga-card{background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:13px 14px;margin-bottom:9px;cursor:pointer;transition:border-color .15s;}
.carga-card:hover{border-color:var(--accent);}
.carga-name{font-family:var(--fd);font-size:19px;letter-spacing:1px;color:var(--text);margin-bottom:2px;}
.carga-meta{font-size:11px;color:var(--muted);font-family:var(--fm);margin-bottom:8px;}
.carga-bar-row{display:flex;gap:8px;align-items:center;margin-bottom:4px;}
.carga-bar-track{flex:1;height:6px;background:var(--s2);border-radius:3px;overflow:hidden;}
.carga-bar-fill{height:100%;border-radius:3px;transition:width .3s;}
.carga-bar-pct{font-family:var(--fm);font-size:10px;font-weight:700;min-width:30px;text-align:right;}
.carga-bar-label{font-size:10px;color:var(--muted);min-width:48px;}
/* PICKER */
.picker-art{display:flex;align-items:center;gap:9px;background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:8px 10px;margin-bottom:7px;cursor:pointer;transition:border-color .15s;}
.picker-art:hover{border-color:var(--accent);}
.picker-art.selected{border-color:var(--accent);background:var(--s3);}
.picker-thumb{width:44px;min-width:44px;height:44px;background:var(--surface);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:18px;overflow:hidden;}
.picker-thumb img{width:100%;height:100%;object-fit:cover;border-radius:6px;}
.picker-info{flex:1;min-width:0;}
.picker-name{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.picker-sub{font-size:10px;color:var(--muted);}
.picker-price{font-family:var(--fm);font-size:12px;font-weight:700;color:var(--success);white-space:nowrap;}
/* CHECKBOXES */
.cb-art{display:flex;align-items:center;gap:10px;background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:9px 11px;margin-bottom:7px;cursor:pointer;transition:border-color .15s;}
.cb-art:hover,.cb-art.checked{border-color:var(--accent);}
.cb-art.checked{background:var(--s3);}
.cb-box{width:18px;height:18px;border-radius:4px;border:2px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s;}
.cb-art.checked .cb-box{background:var(--accent);border-color:var(--accent);}
.cb-check{font-size:11px;color:#0e0e0e;font-weight:900;}
/* MODAL */
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:200;display:flex;align-items:flex-end;}
.modal{background:var(--surface);border-top:2px solid var(--accent);border-radius:16px 16px 0 0;padding:18px 16px 28px;width:100%;max-height:85vh;overflow-y:auto;}
.modal-title{font-family:var(--fd);font-size:20px;letter-spacing:1.5px;color:var(--accent);margin-bottom:14px;}
/* MISC */
.empty{text-align:center;padding:30px 20px;color:var(--muted);}
.empty-icon{font-size:40px;margin-bottom:9px;}
.empty-text{font-size:13px;line-height:1.6;}
.toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:var(--success);color:#0e0e0e;padding:8px 18px;border-radius:8px;font-weight:700;font-size:13px;z-index:999;animation:tin .25s ease;}
@keyframes tin{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
.back-btn{display:flex;align-items:center;gap:5px;background:none;border:none;color:var(--muted);font-family:var(--fb);font-size:13px;cursor:pointer;margin-bottom:14px;padding:0;}
.back-btn:hover{color:var(--accent);}
.divider{height:1px;background:var(--border);margin:12px 0;}
.density-preview{border-radius:7px;padding:8px 10px;display:flex;justify-content:space-between;align-items:center;margin-top:9px;border:1px solid;}
.familia-wrap{position:relative;}
/* ADD TO LOAD INLINE */
.atl-panel{background:var(--s3);border:1px solid var(--accent);border-radius:0 0 10px 10px;padding:10px 12px;margin-top:-2px;margin-bottom:9px;}
.atl-row{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
.atl-select{flex:1;background:var(--s2);border:1px solid var(--border);border-radius:7px;padding:7px 10px;color:var(--text);font-family:var(--fb);font-size:13px;outline:none;}
.atl-select:focus{border-color:var(--accent);}
.atl-select option{background:#181818;}
.atl-confirm{background:var(--accent);color:#0e0e0e;border:none;border-radius:7px;padding:7px 14px;font-family:var(--fb);font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;}
.atl-qty{display:flex;align-items:center;gap:5px;background:var(--s2);border:1px solid var(--border);border-radius:7px;padding:4px 8px;}
.art-card.expanded{border-color:var(--accent);border-radius:10px 10px 0 0;border-bottom:none;}
.familia-dropdown{position:absolute;top:100%;left:0;right:0;background:var(--surface);border:1px solid var(--accent);border-top:none;border-radius:0 0 8px 8px;z-index:50;max-height:160px;overflow-y:auto;}
.familia-option{padding:9px 12px;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;transition:background .1s;}
.familia-option:hover{background:var(--s2);}
.familia-option.new-tag{color:var(--accent);font-weight:600;}
`;

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function CantonImp({ onSignOut, userEmail }) {
  const { ferias, suppliers, articles, cargas, familias, loading, online, db } = useSync();

  // local UI state only (not persisted)
  const [activeCargaId, setActiveCargaId] = useState(null);

  // tab: 'ferias' | 'proveedores' | 'catalog' | 'carga'
  const [tab, setTab] = useState("ferias");
  const [activeFeria, setActiveFeria] = useState(null);

  // drill-down state
  const [drillSupplier, setDrillSupplier] = useState(null); // supplier obj being viewed
  const [drillFrom, setDrillFrom] = useState("catalog");   // which tab to go back to

  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);

  const emptyFeria = { name: "", location: "", date: "", notes: "" };
  const emptySupp  = { name: "", stand: "", description: "", day: "" };
  const emptyArt   = { name: "", rubro: "Bazar", familia: "", description: "", price: "", currency: "USD", cbmBulto: "", kgBulto: "", unidadesXBulto: "", minBultos: "", photo: "", supplierId: "" };

  const [ff, setFf] = useState(emptyFeria);
  const [sf, setSf] = useState(emptySupp);
  const [af, setAf] = useState(emptyArt);
  const [newCargaForm, setNewCargaForm] = useState({ name: "", containerType: "40" });

  // catalog search/filter
  const [search, setSearch]         = useState("");
  const [filterSupp, setFilterSupp] = useState("Todos");
  const [filterRubro, setFilterRubro] = useState("Todos");
  // global supplier search
  const [suppSearch, setSuppSearch] = useState("");
  // picker (carga)
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerSupp, setPickerSupp]     = useState("Todos");
  // bulk-add state: { supplierId, selectedIds: Set, cargaId }
  const [bulkState, setBulkState] = useState(null);

  const [toast, setToast] = useState("");
  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2400); }

  // ── DERIVED ──────────────────────────────────────────────────────────────────
  const feriaSuppliers  = useMemo(() => activeFeria ? suppliers.filter(s => s.feriaId === activeFeria.id) : suppliers, [suppliers, activeFeria]);
  const feriaArticles   = useMemo(() => activeFeria ? articles.filter(a => a.feriaId === activeFeria.id)  : articles,  [articles, activeFeria]);

  const filteredArticles = useMemo(() => feriaArticles.filter(a => {
    const s = search.toLowerCase();
    const supp = suppliers.find(x => x.id === a.supplierId);
    const ms = !s || [a.name, a.description, a.rubro, a.familia, supp?.name].some(v => v?.toLowerCase().includes(s));
    return ms && (filterSupp === "Todos" || a.supplierId === filterSupp) && (filterRubro === "Todos" || a.rubro === filterRubro);
  }), [feriaArticles, search, filterSupp, filterRubro, suppliers]);

  // global suppliers sorted by feria then day
  const allSuppliersFiltered = useMemo(() => {
    const s = suppSearch.toLowerCase();
    return suppliers.filter(x => !s || x.name?.toLowerCase().includes(s) || x.stand?.toLowerCase().includes(s) || x.description?.toLowerCase().includes(s));
  }, [suppliers, suppSearch]);

  // ferias that have suppliers in filtered list
  const suppFeriaGroups = useMemo(() => {
    const feriaIds = [...new Set(allSuppliersFiltered.map(s => s.feriaId))];
    return feriaIds.map(fid => ({
      feria: ferias.find(f => f.id === fid) || { id: fid, name: "Sin feria" },
      suppliers: allSuppliersFiltered.filter(s => s.feriaId === fid)
    })).sort((a, b) => a.feria.name.localeCompare(b.feria.name));
  }, [allSuppliersFiltered, ferias]);

  // Supplier drill articles
  const drillArticles = useMemo(() =>
    drillSupplier ? articles.filter(a => a.supplierId === drillSupplier.id) : [],
    [articles, drillSupplier]);

  // Carga helpers
  const activeCarga = cargas.find(c => c.id === activeCargaId) || null;
  const cargaItems  = activeCarga?.items || {};
  const cargaCont   = activeCarga?.containerType === "20" ? CONTAINER_20 : CONTAINER_40;
  const cargaLoaded = articles.filter(a => cargaItems[a.id] > 0);
  const cTotalCbm   = cargaLoaded.reduce((acc, a) => acc + (parseFloat(a.cbmBulto)||0) * (cargaItems[a.id]||0), 0);
  const cTotalKg    = cargaLoaded.reduce((acc, a) => acc + (parseFloat(a.kgBulto)||0)  * (cargaItems[a.id]||0), 0);
  const cTotalUnits = cargaLoaded.reduce((acc, a) => acc + (parseFloat(a.unidadesXBulto)||1) * (cargaItems[a.id]||0), 0);
  const cTotalUSD   = cargaLoaded.reduce((acc, a) => acc + (parseFloat(a.price)||0) * (parseFloat(a.unidadesXBulto)||1) * (cargaItems[a.id]||0), 0);
  const cbmPct = Math.min(100, (cTotalCbm / cargaCont.cbm) * 100);
  const kgPct  = Math.min(100, (cTotalKg  / cargaCont.kg)  * 100);

  const pickerArticles = useMemo(() => feriaArticles.filter(a => {
    const s = pickerSearch.toLowerCase();
    const supp = suppliers.find(x => x.id === a.supplierId);
    const ms = !s || [a.name, a.description, a.rubro, a.familia, supp?.name].some(v => v?.toLowerCase().includes(s));
    return ms && (pickerSupp === "Todos" || a.supplierId === pickerSupp);
  }), [feriaArticles, pickerSearch, pickerSupp, suppliers]);

  function setCargaQty(artId, qty)            { db.setCargaItem(activeCargaId, artId, qty); }
  function setCargaQtyOnId(cid, artId, qty)   { db.setCargaItem(cid, artId, qty); }
  function cargaQty(artId) { return cargaItems[artId] || 0; }

  function cargaSummary(c) {
    const its = articles.filter(a => c.items[a.id] > 0);
    const cont = c.containerType === "20" ? CONTAINER_20 : CONTAINER_40;
    const cbm = its.reduce((acc, a) => acc + (parseFloat(a.cbmBulto)||0) * (c.items[a.id]||0), 0);
    const usd = its.reduce((acc, a) => acc + (parseFloat(a.price)||0) * (parseFloat(a.unidadesXBulto)||1) * (c.items[a.id]||0), 0);
    return { cbm, usd, cbmPct: Math.min(100, cbm/cont.cbm*100), cont, refs: its.length };
  }

  // ── HANDLERS ─────────────────────────────────────────────────────────────────
  function saveFeria() {
    if (!ff.name) return showToast("⚠️ Ingresá un nombre");
    const payload = editId ? { id: editId, ...ff } : { id: uid(), ...ff };
    db.upsertFeria(payload);
    showToast(editId ? "✅ Feria actualizada" : "✅ Feria creada");
    setModal(null); setEditId(null); setFf(emptyFeria);
  }

  function saveSupplier() {
    if (!sf.name) return showToast("⚠️ Ingresá el nombre");
    if (!activeFeria) return showToast("⚠️ Seleccioná una feria primero");
    const payload = editId
      ? { id: editId, feriaId: activeFeria.id, ...sf }
      : { id: uid(), feriaId: activeFeria.id, ...sf };
    db.upsertSupplier(payload);
    showToast(editId ? "✅ Proveedor actualizado" : "✅ Proveedor agregado");
    setModal(null); setEditId(null); setSf(emptySupp);
  }

  function deleteSupplier(id) { db.deleteSupplier(id); }

  function saveArticle() {
    if (!af.name || !af.price) return showToast("⚠️ Nombre y precio son obligatorios");
    const suppId = drillSupplier?.id || af.supplierId;
    if (!suppId) return showToast("⚠️ Seleccioná un proveedor");
    const fid = suppliers.find(s => s.id === suppId)?.feriaId || activeFeria?.id;
    const payload = editId
      ? { id: editId, ...af, supplierId: suppId, feriaId: fid }
      : { id: uid(), ...af, supplierId: suppId, feriaId: fid };
    db.upsertArticle(payload);
    if (af.familia.trim() && !familias.includes(af.familia.trim()))
      db.addFamilia(af.familia.trim());
    showToast(editId ? "✅ Artículo actualizado" : "✅ Artículo guardado");
    setModal(null); setEditId(null); setAf(emptyArt);
  }

  function deleteArticle(id) { db.deleteArticle(id); }

  function openAddArticle(suppId) { setAf({ ...emptyArt, supplierId: suppId || "" }); setEditId(null); setModal("article"); }
  function openEditArticle(a) {
    setAf({ name: a.name, rubro: a.rubro, familia: a.familia||"", description: a.description||"", price: a.price, currency: a.currency, cbmBulto: a.cbmBulto||"", kgBulto: a.kgBulto||"", unidadesXBulto: a.unidadesXBulto||"", minBultos: a.minBultos||"", photo: a.photo||"", supplierId: a.supplierId });
    setEditId(a.id); setModal("article");
  }

  function suppName(id)  { return suppliers.find(s => s.id === id)?.name || ""; }
  function feriaName(id) { return ferias.find(f => f.id === id)?.name || ""; }

  function onAddToCarga(cargaId, artId, bultos) {
    db.setCargaItem(cargaId, artId, bultos);
    showToast(`✅ Agregado a ${cargas.find(c=>c.id===cargaId)?.name || "carga"}`);
  }

  function openSupplierDrill(s, fromTab) {
    setDrillSupplier(s);
    setDrillFrom(fromTab);
    setTab("suppDrill");
  }

  // ── BULK ADD ─────────────────────────────────────────────────────────────────
  function openBulk(supplierId) {
    const suppArts = articles.filter(a => a.supplierId === supplierId);
    setBulkState({ supplierId, selectedIds: new Set(suppArts.map(a => a.id)), cargaId: cargas[0]?.id || "" });
    setModal("bulk");
  }
  function bulkToggle(id) {
    setBulkState(b => {
      const s = new Set(b.selectedIds);
      s.has(id) ? s.delete(id) : s.add(id);
      return { ...b, selectedIds: s };
    });
  }
  function bulkSelectAll(ids) { setBulkState(b => ({ ...b, selectedIds: new Set(ids) })); }
  function bulkClearAll()     { setBulkState(b => ({ ...b, selectedIds: new Set() })); }
  function bulkApply() {
    if (!bulkState?.cargaId) return showToast("⚠️ Seleccioná una carga destino");
    if (bulkState.selectedIds.size === 0) return showToast("⚠️ Seleccioná al menos un artículo");
    db.bulkAddToCarga(bulkState.cargaId, [...bulkState.selectedIds]);
    showToast(`✅ ${bulkState.selectedIds.size} artículo(s) agregados a la carga`);
    setModal(null); setBulkState(null);
  }

  // ── RENDER ────────────────────────────────────────────────────────────────────
  const showDrill = tab === "suppDrill" && drillSupplier;

  if (loading) return (
    <>
      <style>{css}</style>
      <div className="app" style={{ alignItems:"center", justifyContent:"center", gap:16 }}>
        <div style={{ fontFamily:"var(--fd)", fontSize:32, letterSpacing:3, color:"var(--accent)" }}>CANTON<span style={{color:"var(--text)"}}>IMP</span></div>
        <div style={{ width:40, height:40, border:"3px solid var(--border)", borderTop:"3px solid var(--accent)", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
        <div style={{ fontSize:12, color:"var(--muted)" }}>Cargando datos...</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </>
  );

  return (
    <>
      <style>{css}</style>
      <div className="app">

        {/* ── HEADER ── */}
        <div className="hdr">
          <div className="hdr-top">
            <div className="logo">CANTON<span>IMP</span></div>
            <div className="hdr-stats">
              <div className="stat-chip"><strong>{suppliers.length}</strong>prov.</div>
              <div className="stat-chip"><strong>{articles.length}</strong>arts.</div>
              <div className="stat-chip"><strong>{cargas.length}</strong>cargas</div>
              <div title={online ? "Sincronizado" : "Sin conexión — datos locales"} style={{ width:8, height:8, borderRadius:"50%", background: online ? "var(--success)" : "var(--danger)", alignSelf:"center", flexShrink:0 }}/>
              {onSignOut && (
                <button
                  title={`Cerrar sesión (${userEmail})`}
                  onClick={onSignOut}
                  style={{ background:"transparent", border:"1px solid var(--border)", borderRadius:6, padding:"3px 7px", color:"var(--muted)", fontSize:13, cursor:"pointer", lineHeight:1 }}>
                  ↩
                </button>
              )}
            </div>
          </div>
          {/* Feria badge only relevant in catalog tab */}
          {(tab === "catalog" || tab === "suppDrill") && (
            <div className="feria-badge" onClick={() => setTab("ferias")} style={{ borderColor: activeFeria ? "var(--border)" : "var(--accent)" }}>
              {activeFeria
                ? <><div className="feria-dot"/><span style={{ fontSize:13, fontWeight:600, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>📍 {activeFeria.name}</span><span style={{ fontSize:11, color:"var(--accent)" }}>Cambiar ›</span></>
                : <span style={{ fontSize:12, color:"var(--accent)", fontWeight:600 }}>⚡ Seleccioná una feria para el catálogo</span>}
            </div>
          )}
          <div className="nav">
            <button className={`nav-btn ${tab==="ferias" ? "active":""}`} onClick={() => setTab("ferias")}>🏛 Ferias</button>
            <button className={`nav-btn ${tab==="proveedores" ? "active":""}`} onClick={() => { setDrillSupplier(null); setTab("proveedores"); }}>🏪 Proveed.</button>
            <button className={`nav-btn ${tab==="catalog" ? "active":""}`} onClick={() => { setDrillSupplier(null); setTab("catalog"); }}>📦 Catálogo</button>
            <button className={`nav-btn ${tab==="carga" ? "active":""}`} onClick={() => { setActiveCargaId(null); setTab("carga"); }}>🚢 Cargas</button>
          </div>
        </div>

        <div className="content">

          {/* ═══════ FERIAS ═══════ */}
          {tab === "ferias" && <>
            <div className="stitle">Mis Ferias</div>
            {ferias.length === 0 && <div className="empty"><div className="empty-icon">🌏</div><div className="empty-text">No tenés ferias aún.<br/>Creá una para empezar.</div></div>}
            {ferias.map(f => {
              const ac = articles.filter(a => a.feriaId === f.id).length;
              const sc = suppliers.filter(s => s.feriaId === f.id).length;
              return (
                <div key={f.id} className="card-sm" style={{ cursor:"pointer", borderColor: activeFeria?.id===f.id ? "var(--accent)":""}}
                  onClick={() => { setActiveFeria(f); setTab("catalog"); }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ fontSize:28 }}>🏭</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:15 }}>{f.name}</div>
                      {f.location && <div style={{ fontSize:11, color:"var(--accent)", fontWeight:600 }}>📍 {f.location}{f.date ? ` · ${f.date}`:""}</div>}
                      {f.notes && <div style={{ fontSize:11, color:"var(--muted)", marginTop:2 }}>{f.notes}</div>}
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontFamily:"var(--fm)", fontSize:11, color:"var(--muted)" }}>{sc} prov. · {ac} arts.</div>
                      <div style={{ display:"flex", gap:4, marginTop:6, justifyContent:"flex-end" }}>
                        <button className="btn-sm" onClick={e => { e.stopPropagation(); setFf({ name:f.name, location:f.location, date:f.date, notes:f.notes }); setEditId(f.id); setModal("feria"); }}>✏️</button>
                        <button className="btn-sm" style={{ color:"var(--danger)", borderColor:"var(--danger)" }} onClick={e => { e.stopPropagation(); if (activeFeria?.id===f.id) setActiveFeria(null); db.deleteFeria(f.id); }}>✕</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <button className="btn btn-primary" style={{ marginTop:4 }} onClick={() => { setFf(emptyFeria); setEditId(null); setModal("feria"); }}>+ Nueva Feria</button>
          </>}

          {/* ═══════ PROVEEDORES GLOBALES ═══════ */}
          {tab === "proveedores" && !showDrill && <>
            <div className="stitle">Todos los Proveedores</div>
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input placeholder="Buscar proveedor, stand, productos..." value={suppSearch} onChange={e => setSuppSearch(e.target.value)} />
            </div>
            {suppliers.length === 0
              ? <div className="empty"><div className="empty-icon">🏪</div><div className="empty-text">Todavía no cargaste proveedores.<br/>Entrá a una feria y agregá proveedores.</div></div>
              : suppFeriaGroups.length === 0
                ? <div className="empty"><div className="empty-text">Sin resultados.</div></div>
                : suppFeriaGroups.map(({ feria, suppliers: gs }) => {
                  // group by day within feria
                  const days = [...new Set(gs.map(s => s.day || ""))].sort();
                  return (
                    <div key={feria.id}>
                      <div className="feria-group-hdr">
                        <span className="feria-group-label">🏭 {feria.name}</span>
                        <div className="feria-group-line"/>
                      </div>
                      {days.map(day => {
                        const daySupps = gs.filter(s => (s.day||"") === day);
                        return (
                          <div key={day}>
                            {day && (
                              <div className="day-group-hdr">
                                <div className="day-dot"/>
                                <span className="day-label">DÍA {day}</span>
                              </div>
                            )}
                            {daySupps.map(s => {
                              const ac = articles.filter(a => a.supplierId === s.id).length;
                              return (
                                <div key={s.id} className="supp-card" onClick={() => openSupplierDrill(s, "proveedores")}>
                                  <div className="supp-dot">🏪</div>
                                  <div style={{ flex:1, minWidth:0 }}>
                                    <div className="supp-name">{s.name}</div>
                                    {s.stand && <div className="supp-stand">Stand {s.stand}</div>}
                                    {s.description && <div className="supp-desc">{s.description}</div>}
                                  </div>
                                  <div style={{ textAlign:"right", flexShrink:0 }}>
                                    <div style={{ fontFamily:"var(--fm)", fontSize:13, color:"var(--accent)", fontWeight:700 }}>{ac}</div>
                                    <div style={{ fontSize:10, color:"var(--muted)" }}>arts.</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                })
            }
          </>}

          {/* ═══════ CATÁLOGO (per feria o global) ═══════ */}
          {tab === "catalog" && !showDrill && <>
            <div className="stitle">{activeFeria ? `Proveedores — ${activeFeria.name}` : "Todos los Proveedores"}</div>
            {activeFeria && <div style={{ display:"flex", gap:8, marginBottom:13 }}>
              <button className="btn btn-primary" style={{ flex:1, padding:"9px 0", fontSize:13 }} onClick={() => { setSf(emptySupp); setEditId(null); setModal("supplier"); }}>+ Proveedor</button>
              <button className="btn btn-primary" style={{ flex:1, padding:"9px 0", fontSize:13, background:"var(--s2)", color:"var(--text)", border:"1px solid var(--border)" }} onClick={() => openAddArticle("")}>+ Artículo</button>
            </div>}
            {!activeFeria && <div style={{ background:"var(--s2)", border:"1px solid var(--border)", borderRadius:8, padding:"9px 12px", marginBottom:12, fontSize:12, color:"var(--muted)" }}>
              💡 Mostrando todos los artículos. Seleccioná una feria arriba para filtrar o agregar proveedores.
            </div>}
            {feriaSuppliers.length === 0
              ? <div className="empty" style={{ padding:"16px 0" }}><div className="empty-icon" style={{ fontSize:28 }}>🏪</div><div className="empty-text">{activeFeria ? "Agregá proveedores para organizar tus artículos." : "Todavía no cargaste proveedores."}</div></div>
              : (() => {
                  const days = [...new Set(feriaSuppliers.map(s => s.day||""))].sort();
                  return days.map(day => (
                    <div key={day}>
                      {day && <div className="day-group-hdr"><div className="day-dot"/><span className="day-label">DÍA {day}</span></div>}
                      {feriaSuppliers.filter(s => (s.day||"")=== day).map(s => {
                        const sc = articles.filter(a => a.supplierId === s.id).length;
                        return (
                          <div key={s.id} className="supp-card" onClick={() => openSupplierDrill(s, "catalog")}>
                            <div className="supp-dot">🏪</div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div className="supp-name">{s.name}</div>
                              {s.stand && <div className="supp-stand">Stand {s.stand}</div>}
                              {s.description && <div className="supp-desc">{s.description}</div>}
                              {!activeFeria && <div style={{ fontSize:10, color:"var(--accent)", fontWeight:600 }}>{feriaName(s.feriaId)}</div>}
                            </div>
                            <div style={{ textAlign:"right", flexShrink:0 }}>
                              <div style={{ fontFamily:"var(--fm)", fontSize:14, color:"var(--accent)", fontWeight:700 }}>{sc}</div>
                              <div style={{ fontSize:10, color:"var(--muted)" }}>arts.</div>
                              {activeFeria && <div style={{ display:"flex", gap:3, marginTop:5 }}>
                                <button className="btn-sm" onClick={e => { e.stopPropagation(); setSf({ name:s.name, stand:s.stand, description:s.description, day:s.day||"" }); setEditId(s.id); setModal("supplier"); }}>✏️</button>
                                <button className="btn-sm" style={{ color:"var(--danger)", borderColor:"var(--danger)" }} onClick={e => { e.stopPropagation(); db.deleteSupplier(s.id); }}>✕</button>
                              </div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()
            }

            <div className="divider"/>
            <div className="stitle">Artículos</div>
            <div className="search-wrap"><span className="search-icon">🔍</span><input placeholder="Buscar nombre, rubro, familia, proveedor..." value={search} onChange={e => setSearch(e.target.value)}/></div>
            <div className="chips">
              <span style={{ fontSize:10, color:"var(--muted)", paddingTop:5, whiteSpace:"nowrap" }}>Prov.:</span>
              {[{ id:"Todos", name:"Todos" }, ...feriaSuppliers].map(s => <button key={s.id} className={`chip ${filterSupp===s.id?"active":""}`} onClick={() => setFilterSupp(s.id)}>{s.name}</button>)}
            </div>
            <div className="chips">
              <span style={{ fontSize:10, color:"var(--muted)", paddingTop:5, whiteSpace:"nowrap" }}>Rubro:</span>
              {["Todos",...RUBROS].map(r => <button key={r} className={`chip ${filterRubro===r?"active":""}`} onClick={() => setFilterRubro(r)}>{r}</button>)}
            </div>
            {filteredArticles.length === 0
              ? <div className="empty" style={{ padding:"14px 0" }}><div className="empty-text">{feriaArticles.length===0?"No hay artículos cargados aún.":"Sin resultados."}</div></div>
              : filteredArticles.map(a => <ArticleCard key={a.id} a={a} sName={suppName(a.supplierId)} onEdit={() => openEditArticle(a)} onDelete={() => deleteArticle(a.id)} cargas={cargas} onAddToCarga={onAddToCarga}/>)
            }
          </>}

          {/* ═══════ SUPPLIER DRILL ═══════ */}
          {showDrill && <>
            <button className="back-btn" onClick={() => { setDrillSupplier(null); setTab(drillFrom); }}>← Volver</button>

            {/* Supplier header */}
            <div className="card" style={{ marginBottom:13 }}>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <div style={{ fontSize:30 }}>🏪</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:16 }}>{drillSupplier.name}</div>
                  {drillSupplier.stand && <div style={{ fontSize:12, color:"var(--accent)", fontWeight:600 }}>Stand {drillSupplier.stand}</div>}
                  {drillSupplier.day && <div style={{ fontSize:11, color:"var(--muted)" }}>Día {drillSupplier.day}</div>}
                  {drillSupplier.description && <div style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>{drillSupplier.description}</div>}
                  <div style={{ fontSize:11, color:"var(--accent)", marginTop:4, fontWeight:600 }}>📍 {feriaName(drillSupplier.feriaId)}</div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display:"flex", gap:8, marginBottom:14 }}>
              <button className="btn btn-primary" style={{ flex:1, padding:"9px 0", fontSize:13 }} onClick={() => openAddArticle(drillSupplier.id)}>+ Artículo</button>
              {cargas.length > 0 && (
                <button className="btn-accent" style={{ flex:1 }} onClick={() => openBulk(drillSupplier.id)}>
                  🚢 Agregar a carga
                </button>
              )}
            </div>

            {cargas.length === 0 && drillArticles.length > 0 && (
              <div style={{ background:"var(--s2)", border:"1px solid var(--border)", borderRadius:8, padding:"9px 12px", marginBottom:13, fontSize:12, color:"var(--muted)" }}>
                💡 Creá una carga en la sección 🚢 para poder agregar artículos.
              </div>
            )}

            {/* Articles list */}
            {drillArticles.length === 0
              ? <div className="empty"><div className="empty-icon">📭</div><div className="empty-text">No hay artículos para este proveedor.</div></div>
              : drillArticles.map(a => <ArticleCard key={a.id} a={a} sName={drillSupplier.name} onEdit={() => openEditArticle(a)} onDelete={() => deleteArticle(a.id)} cargas={cargas} onAddToCarga={onAddToCarga}/>)
            }
          </>}

          {/* ═══════ CARGAS LIST ═══════ */}
          {tab === "carga" && !activeCarga && <>
            <div className="stitle">Mis Cargas</div>
            {cargas.length === 0 && <div className="empty"><div className="empty-icon">🚢</div><div className="empty-text">No tenés cargas aún.<br/>Creá una y empezá a armarla.</div></div>}
            {cargas.map(c => {
              const s = cargaSummary(c);
              const bc = barColor(s.cbmPct);
              return (
                <div key={c.id} className="carga-card" onClick={() => { setActiveCargaId(c.id); }}>
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:4 }}>
                    <div>
                      <div className="carga-name">{c.name}</div>
                      <div className="carga-meta">Cont. {c.containerType}' · {s.refs} refs · USD {s.usd.toLocaleString("es-AR",{maximumFractionDigits:0})}</div>
                    </div>
                    <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                      <button className="btn-sm" onClick={e => { e.stopPropagation(); setNewCargaForm({ name:c.name, containerType:c.containerType }); setEditId(c.id); setModal("newcarga"); }}>✏️</button>
                      <button className="btn-sm" style={{ color:"var(--danger)", borderColor:"var(--danger)" }} onClick={e => { e.stopPropagation(); db.deleteCarga(c.id); if (activeCargaId===c.id) setActiveCargaId(null); }}>✕</button>
                    </div>
                  </div>
                  <div className="carga-bar-row">
                    <span className="carga-bar-label">Cubicaje</span>
                    <div className="carga-bar-track"><div className="carga-bar-fill" style={{ width:`${s.cbmPct}%`, background:bc }}/></div>
                    <span className="carga-bar-pct" style={{ color:bc }}>{s.cbmPct.toFixed(0)}%</span>
                  </div>
                  <div style={{ fontSize:10, color:"var(--muted)", fontFamily:"var(--fm)", marginTop:2 }}>{s.cbm.toFixed(3)} / {s.cont.cbm} m³</div>
                </div>
              );
            })}
            <button className="btn btn-primary" style={{ marginTop:4 }} onClick={() => { setNewCargaForm({ name:"", containerType:"40" }); setEditId(null); setModal("newcarga"); }}>+ Nueva Carga</button>
          </>}

          {/* ═══════ CARGA DETAIL ═══════ */}
          {tab === "carga" && activeCarga && <>
            <button className="back-btn" onClick={() => setActiveCargaId(null)}>← Mis Cargas</button>
            <div className="card" style={{ marginBottom:11 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                <div style={{ fontFamily:"var(--fd)", fontSize:22, letterSpacing:1, color:"var(--accent)" }}>{activeCarga.name}</div>
                <div style={{ display:"flex", gap:5 }}>
                  {["20","40"].map(t => (
                    <button key={t} className={`btn ${activeCarga.containerType===t?"btn-primary":"btn-ghost"}`}
                      style={{ padding:"4px 12px", width:"auto", fontSize:12 }}
                      onClick={() => db.upsertCarga({ ...activeCarga, containerType: t })}>{t}'</button>
                  ))}
                </div>
              </div>
              <div style={{ fontSize:10, color:"var(--muted)", fontFamily:"var(--fm)" }}>Cap.: {cargaCont.cbm} m³ | {cargaCont.kg.toLocaleString()} kg</div>
            </div>
            <div className="cont-panel">
              <div className="cont-title">📊 Resumen {cargaCont.label}</div>
              <div className="metrics">
                <div className="mbox"><div className="mlabel">Cubicaje</div><div className="mval acc" style={cbmPct>95?{color:"var(--danger)"}:{}}>{cTotalCbm.toFixed(3)}</div><div className="munit">de {cargaCont.cbm} m³ ({cbmPct.toFixed(0)}%)</div></div>
                <div className="mbox"><div className="mlabel">Peso</div><div className="mval">{cTotalKg.toFixed(0)}</div><div className="munit">de {cargaCont.kg.toLocaleString()} kg ({kgPct.toFixed(0)}%)</div></div>
                <div className="mbox"><div className="mlabel">Unidades</div><div className="mval acc">{Math.round(cTotalUnits).toLocaleString()}</div><div className="munit">{cargaLoaded.length} referencias</div></div>
                <div className="mbox"><div className="mlabel">Valor FOB</div><div className="mval suc">{cTotalUSD.toLocaleString("es-AR",{maximumFractionDigits:0})}</div><div className="munit">USD</div></div>
              </div>
              {[{l:"Cubicaje",p:cbmPct},{l:"Peso",p:kgPct}].map(b=>(
                <div className="bar-wrap" key={b.l}>
                  <div className="bar-label"><span>{b.l}</span><span style={{color:barColor(b.p)}}>{b.p.toFixed(1)}%</span></div>
                  <div className="bar-track"><div className="bar-fill" style={{width:`${b.p}%`,background:barColor(b.p)}}/></div>
                </div>
              ))}
            </div>
            <button className="btn btn-primary" style={{ marginBottom:14 }} onClick={() => { setPickerSearch(""); setPickerSupp("Todos"); setModal("picker"); }}>+ Agregar artículos</button>
            {cargaLoaded.length > 0 && (
              <button className="btn" style={{ width:"100%", marginBottom:14, background:"var(--s2)", border:"1px solid var(--border)", color:"var(--text)", fontSize:13 }}
                onClick={() => exportCargaExcel(activeCarga, cargaLoaded, cargaItems, suppliers)}>
                📊 Exportar a Excel
              </button>
            )}
            <div className="stitle">Artículos en carga</div>
            {cargaLoaded.length === 0
              ? <div className="empty"><div className="empty-icon">📭</div><div className="empty-text">Tocá "+ Agregar artículos" para empezar a armar esta carga.</div></div>
              : <>
                {cargaLoaded.map(a => {
                  const b = cargaQty(a.id);
                  const uxb = parseFloat(a.unidadesXBulto)||1;
                  const dv = densidadValor(a.cbmBulto, a.unidadesXBulto, a.price);
                  const dc = dColor(dv);
                  return (
                    <div key={a.id} className="load-item">
                      <div style={{ width:36, height:36, borderRadius:6, overflow:"hidden", flexShrink:0, background:"var(--surface)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
                        {a.photo ? <img src={a.photo} style={{ width:"100%",height:"100%",objectFit:"cover" }} alt=""/> : "📦"}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div className="li-name">{a.name}</div>
                        <div style={{ fontSize:10, color:"var(--accent)", fontWeight:700 }}>{suppName(a.supplierId)}</div>
                        <div className="li-meta">{((parseFloat(a.cbmBulto)||0)*b).toFixed(3)} m³ · {Math.round(uxb*b)} uds. · USD {((parseFloat(a.price)||0)*uxb*b).toLocaleString("es-AR",{maximumFractionDigits:0})}</div>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                        {dv!==null && dc && <div className="dbadge" style={{ background:dc.bg, borderColor:dc.border, color:dc.text, fontSize:10 }}>{dv.toFixed(0)}</div>}
                        <div className="qty">
                          <button className="qty-btn" onClick={() => setCargaQty(a.id, b-1)}>−</button>
                          <span className="qty-val">{b}</span>
                          <button className="qty-btn" onClick={() => setCargaQty(a.id, b+1)}>+</button>
                        </div>
                        <div style={{ fontSize:9, color:"var(--muted)" }}>bultos</div>
                      </div>
                    </div>
                  );
                })}
                <button className="btn" style={{ width:"100%", marginTop:6, background:"transparent", border:"1px solid var(--border)", color:"var(--muted)" }}
                  onClick={() => db.clearCarga(activeCarga.id)}>🗑 Vaciar carga</button>
              </>
            }
          </>}

        </div>{/* end content */}

        {/* ═══════════════ MODALS ═══════════════ */}

        {/* FERIA */}
        {modal==="feria" && <div className="overlay" onClick={()=>setModal(null)}><div className="modal" onClick={e=>e.stopPropagation()}>
          <div className="modal-title">{editId?"Editar Feria":"Nueva Feria"}</div>
          <div className="fg"><label className="flabel">Nombre *</label><input className="fi" placeholder="ej: Cantón Abril 2025" value={ff.name} onChange={e=>setFf(f=>({...f,name:e.target.value}))}/></div>
          <div className="frow2">
            <div className="fg"><label className="flabel">Ciudad</label><input className="fi" placeholder="Guangzhou" value={ff.location} onChange={e=>setFf(f=>({...f,location:e.target.value}))}/></div>
            <div className="fg"><label className="flabel">Fecha</label><input className="fi" type="date" value={ff.date} onChange={e=>setFf(f=>({...f,date:e.target.value}))}/></div>
          </div>
          <div className="fg"><label className="flabel">Notas</label><textarea className="fi" placeholder="Observaciones..." value={ff.notes} onChange={e=>setFf(f=>({...f,notes:e.target.value}))}/></div>
          <button className="btn btn-primary" onClick={saveFeria}>✅ Guardar Feria</button>
        </div></div>}

        {/* PROVEEDOR */}
        {modal==="supplier" && <div className="overlay" onClick={()=>setModal(null)}><div className="modal" onClick={e=>e.stopPropagation()}>
          <div className="modal-title">{editId?"Editar Proveedor":"Nuevo Proveedor"}</div>
          <div className="fg"><label className="flabel">Nombre *</label><input className="fi" placeholder="ej: Guangzhou Plastics Co." value={sf.name} onChange={e=>setSf(f=>({...f,name:e.target.value}))}/></div>
          <div className="frow2">
            <div className="fg"><label className="flabel">Stand / Hall</label><input className="fi" placeholder="Hall 10.1 · A23" value={sf.stand} onChange={e=>setSf(f=>({...f,stand:e.target.value}))}/></div>
            <div className="fg"><label className="flabel">Día de visita</label><input className="fi" placeholder="ej: 1, 2, 3..." value={sf.day} onChange={e=>setSf(f=>({...f,day:e.target.value}))}/></div>
          </div>
          <div className="fg"><label className="flabel">Reseña de productos</label><textarea className="fi" placeholder="¿Qué vende? Ej: Organizadores, bazar..." value={sf.description} onChange={e=>setSf(f=>({...f,description:e.target.value}))}/></div>
          <button className="btn btn-primary" onClick={saveSupplier}>✅ Guardar Proveedor</button>
        </div></div>}

        {/* ARTÍCULO */}
        {modal==="article" && <div className="overlay" onClick={()=>setModal(null)}><div className="modal" onClick={e=>e.stopPropagation()}>
          <div className="modal-title">{editId?"Editar Artículo":"Nuevo Artículo"}</div>
          {!drillSupplier && <div className="fg"><label className="flabel">Proveedor *</label>
            <select className="fi" value={af.supplierId} onChange={e=>setAf(f=>({...f,supplierId:e.target.value}))}>
              <option value="">— Seleccioná un proveedor —</option>
              {(activeFeria ? feriaSuppliers : suppliers).map(s=><option key={s.id} value={s.id}>{s.name}{s.stand?` · ${s.stand}`:""}</option>)}
            </select></div>}
          <div className="photo-up">
            <input type="file" accept="image/*" capture="environment" onChange={e=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=ev=>setAf(f=>({...f,photo:ev.target.result}));r.readAsDataURL(file);}}/>
            {af.photo?<img src={af.photo} className="photo-prev" alt="preview"/>:<><div style={{fontSize:22}}>📸</div><div style={{fontSize:12,color:"var(--muted)"}}>Foto del producto</div></>}
          </div>
          <div className="fg"><label className="flabel">Nombre *</label><input className="fi" placeholder="ej: Organizador apilable mediano" value={af.name} onChange={e=>setAf(f=>({...f,name:e.target.value}))}/></div>
          <div className="frow2">
            <div className="fg"><label className="flabel">Rubro</label>
              <select className="fi" value={af.rubro} onChange={e=>setAf(f=>({...f,rubro:e.target.value}))}>
                {RUBROS.map(r=><option key={r}>{r}</option>)}
              </select></div>
            <div className="fg"><label className="flabel">Familia</label><FamiliaInput value={af.familia} onChange={v=>setAf(f=>({...f,familia:v}))} familias={familias}/></div>
          </div>
          <div className="fg"><label className="flabel">Descripción</label><textarea className="fi" placeholder="Material, colores, código..." value={af.description} onChange={e=>setAf(f=>({...f,description:e.target.value}))}/></div>
          <div className="frow2">
            <div className="fg"><label className="flabel">Precio unit. *</label><input className="fi" type="number" placeholder="0.00" value={af.price} onChange={e=>setAf(f=>({...f,price:e.target.value}))}/></div>
            <div className="fg"><label className="flabel">Moneda</label>
              <select className="fi" value={af.currency} onChange={e=>setAf(f=>({...f,currency:e.target.value}))}>
                <option>USD</option><option>CNY</option><option>EUR</option>
              </select></div>
          </div>
          <div style={{ background:"var(--s2)", border:"1px solid var(--border)", borderRadius:9, padding:"11px 12px", marginBottom:11 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:1, color:"var(--accent)", textTransform:"uppercase", marginBottom:9 }}>📦 Datos del Bulto</div>
            <div className="frow2">
              <div className="fg" style={{marginBottom:8}}><label className="flabel">CBM / bulto</label><input className="fi" type="number" placeholder="0.000" value={af.cbmBulto} onChange={e=>setAf(f=>({...f,cbmBulto:e.target.value}))}/></div>
              <div className="fg" style={{marginBottom:8}}><label className="flabel">Kg / bulto</label><input className="fi" type="number" placeholder="0.0" value={af.kgBulto} onChange={e=>setAf(f=>({...f,kgBulto:e.target.value}))}/></div>
            </div>
            <div className="frow2">
              <div className="fg" style={{marginBottom:0}}><label className="flabel">Uds. x bulto</label><input className="fi" type="number" placeholder="1" value={af.unidadesXBulto} onChange={e=>setAf(f=>({...f,unidadesXBulto:e.target.value}))}/></div>
              <div className="fg" style={{marginBottom:0}}><label className="flabel">Mín. bultos</label><input className="fi" type="number" placeholder="1" value={af.minBultos} onChange={e=>setAf(f=>({...f,minBultos:e.target.value}))}/></div>
            </div>
            {(()=>{ const dv=densidadValor(af.cbmBulto,af.unidadesXBulto,af.price); if(!dv)return null; const dc=dColor(dv); return <div className="density-preview" style={{background:dc.bg,borderColor:dc.border}}><div style={{fontSize:10,color:dc.text,fontWeight:700,textTransform:"uppercase",letterSpacing:.5}}>Densidad de valor</div><div style={{fontFamily:"var(--fm)",fontSize:14,fontWeight:700,color:dc.text}}>{dv.toFixed(0)} · {dc.label}</div></div>; })()}
          </div>
          <button className="btn btn-primary" onClick={saveArticle}>✅ Guardar artículo</button>
        </div></div>}

        {/* NUEVA CARGA */}
        {modal==="newcarga" && <div className="overlay" onClick={()=>setModal(null)}><div className="modal" onClick={e=>e.stopPropagation()}>
          <div className="modal-title">{editId?"Editar Carga":"Nueva Carga"}</div>
          <div className="fg"><label className="flabel">Nombre *</label><input className="fi" placeholder="ej: M1630" value={newCargaForm.name} onChange={e=>setNewCargaForm(f=>({...f,name:e.target.value}))}/></div>
          <div className="fg"><label className="flabel">Tipo de contenedor</label>
            <div style={{display:"flex",gap:8}}>
              {["20","40"].map(t=>(
                <button key={t} className={`btn ${newCargaForm.containerType===t?"btn-primary":"btn-ghost"}`} style={{flex:1,padding:"10px 0"}}
                  onClick={()=>setNewCargaForm(f=>({...f,containerType:t}))}>
                  Cont. {t}'<div style={{fontSize:10,fontWeight:400,marginTop:2}}>{t==="20"?"28 m³ · 21.000 kg":"67 m³ · 26.000 kg"}</div>
                </button>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => {
            if (!newCargaForm.name.trim()) return showToast("⚠️ Ingresá un nombre para la carga");
            if (editId) {
              db.upsertCarga({ id: editId, name: newCargaForm.name, containerType: newCargaForm.containerType, items: cargas.find(c=>c.id===editId)?.items||{} });
              showToast("✅ Carga actualizada");
            } else {
              const nc = { id: uid(), name: newCargaForm.name.trim(), containerType: newCargaForm.containerType, items: {} };
              db.upsertCarga(nc);
              setActiveCargaId(nc.id);
              setTab("carga");
              showToast("✅ Carga creada");
            }
            setModal(null); setEditId(null);
          }}>✅ {editId?"Guardar cambios":"Crear carga"}</button>
        </div></div>}

        {/* PICKER */}
        {modal==="picker" && activeCarga && <div className="overlay" onClick={()=>setModal(null)}><div className="modal" onClick={e=>e.stopPropagation()}>
          <div className="modal-title">Agregar artículos</div>
          <div style={{fontSize:12,color:"var(--muted)",marginBottom:12,marginTop:-8}}>Tocá para agregar. Ajustá bultos desde el detalle de la carga.</div>
          <div className="search-wrap" style={{marginBottom:8}}><span className="search-icon">🔍</span><input placeholder="Buscar..." value={pickerSearch} onChange={e=>setPickerSearch(e.target.value)}/></div>
          <div className="chips">
            {[{id:"Todos",name:"Todos"},...feriaSuppliers].map(s=><button key={s.id} className={`chip ${pickerSupp===s.id?"active":""}`} onClick={()=>setPickerSupp(s.id)}>{s.name}</button>)}
          </div>
          {pickerArticles.length===0
            ? <div className="empty" style={{padding:"16px 0"}}><div className="empty-text">{feriaArticles.length===0?"No hay artículos en esta feria.":"Sin resultados."}</div></div>
            : pickerArticles.map(a=>{
              const inLoad=cargaQty(a.id)>0;
              const dv=densidadValor(a.cbmBulto,a.unidadesXBulto,a.price);
              const dc=dColor(dv);
              return (
                <div key={a.id} className={`picker-art ${inLoad?"selected":""}`} onClick={()=>{ if(!inLoad) setCargaQty(a.id,1); else setCargaQty(a.id,0); }}>
                  <div className="picker-thumb">{a.photo?<img src={a.photo} alt=""/>:"📦"}</div>
                  <div className="picker-info">
                    <div className="picker-name">{a.name}</div>
                    <div className="picker-sub">{suppName(a.supplierId)}{a.familia?` · ${a.familia}`:""}</div>
                    {a.cbmBulto && <div className="picker-sub">{a.cbmBulto} m³/b · {a.unidadesXBulto||"?"} u/b</div>}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                    <div className="picker-price">{a.currency} {parseFloat(a.price).toFixed(2)}</div>
                    {dv!==null&&dc&&<div className="dbadge" style={{background:dc.bg,borderColor:dc.border,color:dc.text,fontSize:10}}>{dv.toFixed(0)}</div>}
                    <div style={{fontSize:11,fontWeight:700,color:inLoad?"var(--success)":"var(--muted)"}}>{inLoad?`✓ ${cargaQty(a.id)}b`:"+"}</div>
                  </div>
                </div>
              );
            })
          }
          <div style={{height:8}}/>
          <button className="btn btn-primary" onClick={()=>setModal(null)}>✅ Listo — {Object.keys(cargaItems).length} art. en carga</button>
        </div></div>}

        {/* BULK ADD desde proveedor */}
        {modal==="bulk" && bulkState && <div className="overlay" onClick={()=>setModal(null)}><div className="modal" onClick={e=>e.stopPropagation()}>
          <div className="modal-title">Agregar a carga</div>

          {/* Carga selector */}
          <div className="fg">
            <label className="flabel">Carga destino</label>
            <select className="fi" value={bulkState.cargaId} onChange={e=>setBulkState(b=>({...b,cargaId:e.target.value}))}>
              <option value="">— Seleccioná una carga —</option>
              {cargas.map(c=>{
                const s=cargaSummary(c);
                return <option key={c.id} value={c.id}>{c.name} · {c.containerType}' · {s.cbmPct.toFixed(0)}% lleno</option>;
              })}
            </select>
          </div>

          {/* Select all / clear */}
          {(() => {
            const suppArts = articles.filter(a => a.supplierId === bulkState.supplierId);
            const allSelected = suppArts.every(a => bulkState.selectedIds.has(a.id));
            return (
              <>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{fontSize:11,color:"var(--muted)",fontWeight:600}}>{bulkState.selectedIds.size} de {suppArts.length} seleccionados</span>
                  <div style={{display:"flex",gap:8}}>
                    <button className="btn-sm" onClick={()=>bulkSelectAll(suppArts.map(a=>a.id))}>Todos</button>
                    <button className="btn-sm" onClick={bulkClearAll}>Ninguno</button>
                  </div>
                </div>
                {suppArts.map(a=>{
                  const checked = bulkState.selectedIds.has(a.id);
                  const dv=densidadValor(a.cbmBulto,a.unidadesXBulto,a.price);
                  const dc=dColor(dv);
                  return (
                    <div key={a.id} className={`cb-art ${checked?"checked":""}`} onClick={()=>bulkToggle(a.id)}>
                      <div className="cb-box">{checked&&<span className="cb-check">✓</span>}</div>
                      <div style={{width:36,height:36,borderRadius:6,overflow:"hidden",flexShrink:0,background:"var(--surface)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>
                        {a.photo?<img src={a.photo} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>:"📦"}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</div>
                        <div style={{fontSize:10,color:"var(--muted)"}}>{a.rubro}{a.familia?` · ${a.familia}`:""}</div>
                        {a.cbmBulto && <div style={{fontSize:10,color:"var(--muted)",fontFamily:"var(--fm)"}}>{a.cbmBulto} m³/b · {a.unidadesXBulto||"?"} u/b</div>}
                      </div>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
                        <div style={{fontFamily:"var(--fm)",fontSize:12,fontWeight:700,color:"var(--success)"}}>{a.currency} {parseFloat(a.price).toFixed(2)}</div>
                        {dv!==null&&dc&&<div className="dbadge" style={{background:dc.bg,borderColor:dc.border,color:dc.text,fontSize:10}}>{dv.toFixed(0)}</div>}
                      </div>
                    </div>
                  );
                })}
              </>
            );
          })()}
          <div style={{height:8}}/>
          <button className="btn btn-primary" onClick={bulkApply}>🚢 Agregar {bulkState.selectedIds.size} artículo(s) a la carga</button>
        </div></div>}

        {toast && <div className="toast">{toast}</div>}
      </div>
    </>
  );
}

// ─── FAMILIA INPUT ────────────────────────────────────────────────────────────
function FamiliaInput({ value, onChange, familias }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef();
  const suggestions = familias.filter(f => f.toLowerCase().includes(value.toLowerCase()) && f.toLowerCase() !== value.toLowerCase());
  const showNew = value.trim() && !familias.map(f=>f.toLowerCase()).includes(value.trim().toLowerCase());
  React.useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const showDrop = open && (suggestions.length > 0 || showNew);
  return (
    <div className="familia-wrap" ref={ref}>
      <input className="fi" placeholder="ej: Cajas, Organizadores..." value={value}
        onChange={e=>{ onChange(e.target.value); setOpen(true); }}
        onFocus={()=>setOpen(true)}
        style={{ borderRadius: showDrop?"8px 8px 0 0":"8px" }}/>
      {showDrop && (
        <div className="familia-dropdown">
          {suggestions.map(f=>(
            <div key={f} className="familia-option" onMouseDown={()=>{ onChange(f); setOpen(false); }}>
              <span>{f}</span><span style={{fontSize:10,color:"var(--muted)"}}>usar</span>
            </div>
          ))}
          {showNew && (
            <div className="familia-option new-tag" onMouseDown={()=>{ onChange(value.trim()); setOpen(false); }}>
              <span>+ Crear "{value.trim()}"</span><span style={{fontSize:10}}>nueva</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ARTICLE CARD ─────────────────────────────────────────────────────────────
function ArticleCard({ a, sName, onEdit, onDelete, cargas, onAddToCarga }) {
  const dv = densidadValor(a.cbmBulto, a.unidadesXBulto, a.price);
  const dc = dColor(dv);
  const [expanded, setExpanded] = React.useState(false);
  const [selCarga, setSelCarga] = React.useState("");
  const [bultos, setBultos] = React.useState(1);

  // auto-select first carga
  React.useEffect(() => {
    if (cargas && cargas.length > 0 && !selCarga) setSelCarga(cargas[0].id);
  }, [cargas]);

  function handleAdd() {
    if (!selCarga || bultos < 1) return;
    onAddToCarga(selCarga, a.id, bultos);
    setExpanded(false);
    setBultos(1);
  }

  return (
    <>
      <div className={`art-card ${expanded ? "expanded" : ""}`}>
        <div className="art-thumb">{a.photo?<img src={a.photo} alt={a.name}/>:"📦"}</div>
        <div className="art-body">
          <div className="art-supplier">{sName}</div>
          <div className="art-name">{a.name}</div>
          <div className="art-tags">
            <span className="tag">{a.rubro}</span>
            {a.familia && <span className="tag">{a.familia}</span>}
            {a.cbmBulto && <span className="tag">{a.cbmBulto}m³/b</span>}
            {a.unidadesXBulto && <span className="tag">{a.unidadesXBulto}u/b</span>}
            {a.minBultos && <span className="tag">mín {a.minBultos}b</span>}
          </div>
          <div className="art-bottom">
            <div>
              <div className="art-currency">{a.currency}</div>
              <div className="art-price">{parseFloat(a.price).toLocaleString("es-AR",{minimumFractionDigits:2})}</div>
            </div>
            {dv!==null&&dc&&<div className="dbadge" style={{background:dc.bg,borderColor:dc.border,color:dc.text}}>{dv.toFixed(0)}</div>}
            {cargas && cargas.length > 0 && (
              <button
                onClick={() => setExpanded(e => !e)}
                style={{marginLeft:"auto", background: expanded?"var(--accent)":"var(--s2)", border:`1px solid ${expanded?"var(--accent)":"var(--border)"}`, color: expanded?"#0e0e0e":"var(--accent)", borderRadius:7, padding:"4px 10px", fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap"}}>
                {expanded ? "✕" : "🚢 + Carga"}
              </button>
            )}
          </div>
        </div>
        <div className="art-actions">
          <button className="btn-sm" onClick={onEdit}>✏️</button>
          <button className="btn-sm" style={{color:"var(--danger)",borderColor:"var(--danger)"}} onClick={onDelete}>✕</button>
        </div>
      </div>
      {expanded && cargas && cargas.length > 0 && (
        <div className="atl-panel">
          <div className="atl-row">
            <select className="atl-select" value={selCarga} onChange={e => setSelCarga(e.target.value)}>
              {cargas.map(c => <option key={c.id} value={c.id}>{c.name} ({c.containerType}')</option>)}
            </select>
          </div>
          <div className="atl-row">
            <span style={{fontSize:12, color:"var(--muted)", whiteSpace:"nowrap"}}>Bultos:</span>
            <div className="atl-qty">
              <button className="qty-btn" onClick={() => setBultos(b => Math.max(1, b-1))}>−</button>
              <span className="qty-val">{bultos}</span>
              <button className="qty-btn" onClick={() => setBultos(b => b+1)}>+</button>
            </div>
            {a.unidadesXBulto && <span style={{fontSize:11, color:"var(--muted)", fontFamily:"var(--fm)"}}>{bultos * parseFloat(a.unidadesXBulto)} uds.</span>}
            <button className="atl-confirm" onClick={handleAdd}>✅ Agregar</button>
          </div>
        </div>
      )}
    </>
  );
}
