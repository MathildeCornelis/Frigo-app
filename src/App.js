import { useState, useEffect } from "react";

const STORAGE_KEY = "frigoItems_v2";

const CATEGORIES = [
  { id: "laitier", label: "Laitier", icon: "🥛" },
  { id: "viande", label: "Viande", icon: "🥩" },
  { id: "poisson", label: "Poisson", icon: "🐟" },
  { id: "legume", label: "Légume", icon: "🥦" },
  { id: "fruit", label: "Fruit", icon: "🍎" },
  { id: "boisson", label: "Boisson", icon: "🧃" },
  { id: "plat", label: "Plat cuisiné", icon: "🍱" },
  { id: "autre", label: "Autre", icon: "🫙" },
];

const getCategoryIcon = (catId) => CATEGORIES.find(c => c.id === catId)?.icon || "🫙";

const style = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --cream: #F5E4D1;
    --terracotta: #BA826A;
    --terracotta-dark: #9B6A54;
    --terracotta-light: #E8C4AD;
    --brown: #5C3D2E;
    --text: #2C1810;
    --text-muted: #8B6355;
    --white: #FEFAF7;
    --shadow: 0 4px 24px rgba(92,61,46,0.12);
    --shadow-lg: 0 12px 40px rgba(92,61,46,0.18);
  }

  body {
    font-family: 'DM Sans', sans-serif;
    background-color: var(--cream);
    color: var(--text);
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }

  .page-home {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .page-home::before {
    content: '';
    position: absolute;
    width: 500px; height: 500px;
    border-radius: 50%;
    background: radial-gradient(circle, var(--terracotta-light) 0%, transparent 70%);
    top: -150px; right: -150px;
    opacity: 0.4;
    pointer-events: none;
  }
  .page-home::after {
    content: '';
    position: absolute;
    width: 350px; height: 350px;
    border-radius: 50%;
    background: radial-gradient(circle, var(--terracotta-light) 0%, transparent 70%);
    bottom: -80px; left: -100px;
    opacity: 0.3;
    pointer-events: none;
  }
  .home-emoji {
    font-size: 5rem;
    margin-bottom: 1.5rem;
    animation: float 4s ease-in-out infinite;
    position: relative;
    z-index: 1;
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-12px); }
  }
  .home-title {
    font-family: 'DM Serif Display', serif;
    font-size: clamp(2rem, 6vw, 3rem);
    line-height: 1.15;
    color: var(--brown);
    margin-bottom: 1rem;
    position: relative;
    z-index: 1;
  }
  .home-title em { font-style: italic; color: var(--terracotta); }
  .home-subtitle {
    font-size: 1.05rem;
    color: var(--text-muted);
    font-weight: 300;
    line-height: 1.6;
    margin-bottom: 2.5rem;
    position: relative;
    z-index: 1;
  }
  .btn-primary {
    font-family: 'DM Sans', sans-serif;
    font-size: 1rem;
    font-weight: 600;
    color: var(--white);
    background: var(--terracotta);
    border: none;
    border-radius: 100px;
    padding: 0.85rem 2.2rem;
    cursor: pointer;
    box-shadow: 0 6px 20px rgba(186,130,106,0.45);
    transition: all 0.2s ease;
    position: relative;
    z-index: 1;
  }
  .btn-primary:hover {
    background: var(--terracotta-dark);
    transform: translateY(-2px);
    box-shadow: 0 10px 28px rgba(186,130,106,0.55);
  }

  .page-app {
    min-height: 100vh;
    max-width: 480px;
    margin: 0 auto;
    padding: 0 1.25rem 6rem;
  }
  .app-header {
    padding: 2rem 0 1.25rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .app-header h1 {
    font-family: 'DM Serif Display', serif;
    font-size: 1.8rem;
    color: var(--brown);
  }
  .btn-back {
    font-family: 'DM Sans', sans-serif;
    font-size: 0.85rem;
    color: var(--text-muted);
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.4rem 0.75rem;
    border-radius: 100px;
    transition: background 0.15s;
  }
  .btn-back:hover { background: rgba(186,130,106,0.1); }
  .btn-notif {
    position: relative;
    font-size: 1.1rem;
    background: var(--white);
    border: none;
    border-radius: 100px;
    width: 38px; height: 38px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    box-shadow: var(--shadow);
    transition: transform 0.15s;
  }
  .btn-notif:hover { transform: scale(1.08); }
  .notif-badge {
    position: absolute;
    top: -4px; right: -4px;
    background: #E74C3C;
    color: white;
    font-size: 0.65rem;
    font-weight: 700;
    min-width: 16px; height: 16px;
    border-radius: 100px;
    display: flex; align-items: center; justify-content: center;
    padding: 0 3px;
  }
  .notif-list { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 0.5rem; }
  .notif-empty { text-align: center; padding: 2rem 1rem; color: var(--text-muted); }
  .notif-empty span { font-size: 2.5rem; display: block; margin-bottom: 0.75rem; }
  .notif-empty p { font-size: 0.9rem; line-height: 1.6; }

  .stats-row { display: flex; gap: 0.75rem; margin-bottom: 1.25rem; }
  .stat-card {
    flex: 1;
    background: var(--white);
    border-radius: 14px;
    padding: 0.9rem;
    text-align: center;
    box-shadow: var(--shadow);
  }
  .stat-num {
    font-family: 'DM Serif Display', serif;
    font-size: 1.6rem;
    color: var(--brown);
    line-height: 1;
  }
  .stat-label { font-size: 0.72rem; color: var(--text-muted); margin-top: 0.25rem; font-weight: 500; }

  .toolbar { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem; }
  .filters {
    flex: 1;
    display: flex;
    gap: 0.5rem;
    background: rgba(255,255,255,0.55);
    padding: 0.3rem;
    border-radius: 100px;
    backdrop-filter: blur(8px);
  }
  .filter-btn {
    flex: 1;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.85rem;
    font-weight: 500;
    padding: 0.55rem 0.5rem;
    border: none;
    border-radius: 100px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }
  .filter-btn.active {
    background: var(--white);
    color: var(--brown);
    font-weight: 600;
    box-shadow: 0 2px 10px rgba(92,61,46,0.12);
  }
  .sort-dropdown { position: relative; flex-shrink: 0; }
  .btn-sort {
    font-family: 'DM Sans', sans-serif;
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--text-muted);
    background: rgba(255,255,255,0.55);
    border: none;
    border-radius: 100px;
    padding: 0.55rem 0.75rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    white-space: nowrap;
    backdrop-filter: blur(8px);
    transition: all 0.15s;
  }
  .btn-sort:hover, .btn-sort.open { background: var(--white); color: var(--brown); box-shadow: var(--shadow); }
  .sort-menu {
    position: absolute;
    top: calc(100% + 0.4rem);
    right: 0;
    background: var(--white);
    border-radius: 12px;
    box-shadow: var(--shadow-lg);
    padding: 0.4rem;
    z-index: 100;
    min-width: 170px;
    animation: fadeIn 0.15s ease;
  }
  .sort-option {
    width: 100%;
    text-align: left;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-muted);
    background: none;
    border: none;
    border-radius: 8px;
    padding: 0.55rem 0.75rem;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .sort-option:hover { background: rgba(186,130,106,0.1); color: var(--brown); }
  .sort-option.active { color: var(--terracotta); font-weight: 600; }

  .cat-filter-wrap {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    padding-bottom: 0.5rem;
    margin-bottom: 0.75rem;
    scrollbar-width: none;
  }
  .cat-filter-wrap::-webkit-scrollbar { display: none; }
  .cat-chip {
    flex-shrink: 0;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.78rem;
    font-weight: 500;
    padding: 0.35rem 0.8rem;
    border-radius: 100px;
    border: 1.5px solid transparent;
    background: rgba(255,255,255,0.6);
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    white-space: nowrap;
  }
  .cat-chip:hover { background: var(--white); color: var(--brown); }
  .cat-chip.active { background: var(--terracotta); color: white; border-color: var(--terracotta); }

  .search-wrap {
    position: relative;
    margin-bottom: 1.25rem;
    display: flex;
    align-items: center;
  }
  .search-icon { position: absolute; left: 0.9rem; font-size: 0.9rem; pointer-events: none; }
  .search-input {
    width: 100%;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.92rem;
    color: var(--text);
    background: var(--white);
    border: 1.5px solid transparent;
    border-radius: 12px;
    padding: 0.75rem 2.5rem 0.75rem 2.4rem;
    outline: none;
    box-shadow: var(--shadow);
    transition: border-color 0.15s;
  }
  .search-input:focus { border-color: var(--terracotta); }
  .search-input::placeholder { color: var(--text-muted); }
  .search-clear {
    position: absolute;
    right: 0.75rem;
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 0.8rem;
    cursor: pointer;
    padding: 0.2rem 0.4rem;
    border-radius: 100px;
    transition: background 0.15s;
  }
  .search-clear:hover { background: rgba(92,61,46,0.08); }

  .add-btn-wrap { margin-bottom: 1.25rem; }
  .btn-add {
    width: 100%;
    font-family: 'DM Sans', sans-serif;
    font-size: 1rem;
    font-weight: 600;
    color: var(--white);
    background: var(--terracotta);
    border: none;
    border-radius: 14px;
    padding: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 16px rgba(186,130,106,0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
  .btn-add:hover {
    background: var(--terracotta-dark);
    transform: translateY(-1px);
    box-shadow: 0 8px 22px rgba(186,130,106,0.45);
  }

  .items-list { display: flex; flex-direction: column; gap: 0.75rem; list-style: none; }
  .item-card {
    background: var(--white);
    border-radius: 16px;
    padding: 1rem 1.1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    box-shadow: var(--shadow);
    border-left: 4px solid transparent;
    transition: transform 0.15s, box-shadow 0.15s;
    animation: slideIn 0.25s ease;
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .item-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
  .item-card.fresh   { border-color: #2ecc71; }
  .item-card.medium  { border-color: #f39c12; }
  .item-card.soon    { border-color: #e67e22; }
  .item-card.expired { border-color: #e74c3c; }
  .item-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .fresh  .item-dot  { background: #2ecc71; }
  .medium .item-dot  { background: #f39c12; }
  .soon   .item-dot  { background: #e67e22; }
  .expired .item-dot { background: #e74c3c; }
  .item-cat-icon { font-size: 1.3rem; flex-shrink: 0; }
  .item-info { flex: 1; min-width: 0; }
  .item-name {
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .item-badge {
    display: inline-block;
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.15rem 0.5rem;
    border-radius: 100px;
    margin-left: 0.4rem;
  }
  .fresh   .item-badge { background: #e8f8ec; color: #27ae60; }
  .medium  .item-badge { background: #fef3e2; color: #d68910; }
  .soon    .item-badge { background: #fdeede; color: #ca6f1e; }
  .expired .item-badge { background: #fde8e8; color: #cb4335; }
  .item-qty { font-size: 0.78rem; color: var(--text-muted); margin-top: 0.15rem; }
  .item-meta { font-size: 0.78rem; color: var(--text-muted); margin-top: 0.2rem; }
  .item-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.4rem;
    flex-shrink: 0;
  }
  .item-action-row { display: flex; gap: 0.35rem; align-items: center; }
  .item-location {
    font-size: 0.72rem;
    color: var(--text-muted);
    background: rgba(92,61,46,0.07);
    padding: 0.2rem 0.5rem;
    border-radius: 100px;
  }
  .btn-edit {
    background: none; border: none; font-size: 0.85rem; cursor: pointer;
    padding: 0.2rem 0.3rem; border-radius: 6px; opacity: 0.45;
    transition: opacity 0.15s, background 0.15s;
  }
  .btn-edit:hover { opacity: 1; background: #FEF9C3; }
  .btn-delete {
    background: none; border: none; font-size: 0.85rem; cursor: pointer;
    padding: 0.2rem 0.3rem; border-radius: 6px; opacity: 0.45;
    transition: opacity 0.15s, background 0.15s;
  }
  .btn-delete:hover { opacity: 1; background: #FEE2E2; }
  .qty-controls { display: flex; align-items: center; gap: 0.4rem; }
  .btn-consume {
    font-family: 'DM Sans', sans-serif;
    font-size: 1rem; font-weight: 600;
    color: var(--terracotta);
    background: rgba(186,130,106,0.1);
    border: none; border-radius: 100px;
    width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.15s; flex-shrink: 0;
  }
  .btn-consume:hover { background: var(--terracotta); color: white; }
  .qty-value { font-size: 0.85rem; font-weight: 600; color: var(--text); min-width: 1.5rem; text-align: center; }

  .empty-state { text-align: center; padding: 3rem 1rem; color: var(--text-muted); }
  .empty-state .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
  .empty-state p { font-size: 0.9rem; line-height: 1.6; }

  .alert-box {
    background: #FFF3E0; border: 1.5px solid #FFCC80;
    border-radius: 14px; padding: 1rem 1.1rem; margin-bottom: 1.25rem;
    display: flex; gap: 0.75rem; align-items: flex-start;
  }
  .alert-box.danger { background: #FEE2E2; border-color: #FCA5A5; }
  .alert-box.danger .alert-body strong { color: #B91C1C; }
  .alert-box.danger .alert-body li { color: #7F1D1D; }
  .alert-box.danger .alert-body li::before { color: #EF4444; }
  .alert-icon { font-size: 1.2rem; flex-shrink: 0; margin-top: 1px; }
  .alert-body strong { font-size: 0.85rem; font-weight: 600; color: #B45309; display: block; margin-bottom: 0.4rem; }
  .alert-body ul { list-style: none; display: flex; flex-direction: column; gap: 0.2rem; }
  .alert-body li { font-size: 0.82rem; color: #92400E; display: flex; align-items: center; gap: 0.4rem; }
  .alert-body li::before { content: '·'; font-weight: 700; color: #D97706; }

  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(44,24,16,0.45);
    backdrop-filter: blur(4px);
    display: flex; align-items: flex-end; justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .modal {
    background: var(--white);
    border-radius: 24px 24px 0 0;
    padding: 1.5rem 1.5rem 2.5rem;
    width: 100%; max-width: 480px;
    animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    max-height: 92vh; overflow-y: auto;
  }
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  .modal-handle {
    width: 36px; height: 4px;
    background: rgba(92,61,46,0.15);
    border-radius: 100px;
    margin: 0 auto 1.5rem;
  }
  .modal h2 {
    font-family: 'DM Serif Display', serif;
    font-size: 1.4rem; color: var(--brown); margin-bottom: 1.25rem;
  }
  .field { margin-bottom: 1.1rem; }
  .field label {
    display: block; font-size: 0.8rem; font-weight: 600;
    color: var(--text-muted); text-transform: uppercase;
    letter-spacing: 0.05em; margin-bottom: 0.4rem;
  }
  .field input, .field select {
    width: 100%; font-family: 'DM Sans', sans-serif;
    font-size: 0.95rem; color: var(--text);
    background: rgba(92,61,46,0.05);
    border: 1.5px solid transparent; border-radius: 10px;
    padding: 0.7rem 0.9rem; outline: none;
    transition: border-color 0.15s, background 0.15s; appearance: none;
  }
  .field input:focus, .field select:focus { border-color: var(--terracotta); background: white; }
  .field-row { display: flex; gap: 0.75rem; }
  .field-row .field { flex: 1; }
  .date-row { display: flex; gap: 0.5rem; }
  .date-row select {
    flex: 1; font-family: 'DM Sans', sans-serif; font-size: 0.9rem;
    color: var(--text); background: rgba(92,61,46,0.05);
    border: 1.5px solid transparent; border-radius: 10px;
    padding: 0.7rem 0.4rem; outline: none;
    transition: border-color 0.15s, background 0.15s;
    appearance: none; text-align: center; cursor: pointer;
  }
  .date-row select:focus { border-color: var(--terracotta); background: white; }

  .cat-picker { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .cat-pick-btn {
    font-family: 'DM Sans', sans-serif; font-size: 0.8rem; font-weight: 500;
    padding: 0.35rem 0.7rem; border-radius: 100px;
    border: 1.5px solid rgba(92,61,46,0.12);
    background: rgba(92,61,46,0.04); color: var(--text-muted);
    cursor: pointer; transition: all 0.15s;
    display: flex; align-items: center; gap: 0.3rem;
  }
  .cat-pick-btn:hover { border-color: var(--terracotta); color: var(--brown); }
  .cat-pick-btn.active { background: var(--terracotta); border-color: var(--terracotta); color: white; }

  .modal-footer { display: flex; gap: 0.75rem; margin-top: 1.5rem; }
  .btn-cancel {
    flex: 1; font-family: 'DM Sans', sans-serif; font-size: 1rem; font-weight: 500;
    color: var(--text-muted); background: rgba(92,61,46,0.07);
    border: none; border-radius: 12px; padding: 0.9rem; cursor: pointer; transition: background 0.15s;
  }
  .btn-cancel:hover { background: rgba(92,61,46,0.12); }
  .btn-submit {
    flex: 2; font-family: 'DM Sans', sans-serif; font-size: 1rem; font-weight: 600;
    color: white; background: var(--terracotta); border: none; border-radius: 12px;
    padding: 0.9rem; cursor: pointer;
    box-shadow: 0 4px 14px rgba(186,130,106,0.4); transition: all 0.15s;
  }
  .btn-submit:hover { background: var(--terracotta-dark); transform: translateY(-1px); }
`;

const daysLeft = (date) => {
  const today = new Date();
  today.setHours(0,0,0,0);
  const expiry = new Date(date);
  expiry.setHours(0,0,0,0);
  return Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
};

const getStatus = (remaining) => {
  if (remaining < 0) return "expired";
  if (remaining <= 3) return "soon";
  if (remaining <= 5) return "medium";
  return "fresh";
};

const getBadgeLabel = (remaining) => {
  if (remaining < 0) return `Périmé (${Math.abs(remaining)}j)`;
  if (remaining === 0) return "Aujourd'hui !";
  if (remaining === 1) return "Demain !";
  return `${remaining}j`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
};

const defaultForm = {
  name: "", quantity: 1, unit: "pièce", location: "Frigo", expiry: "", category: "autre"
};

const SORT_OPTIONS = [
  { id: "expiry", label: "Date d'expiration", icon: "📅" },
  { id: "name", label: "Nom", icon: "🔤" },
  { id: "quantity", label: "Quantité", icon: "🔢" },
];

function ItemForm({ initial, onSave, onCancel, title }) {
  const [form, setForm] = useState(initial);

  const handleChange = (e) => {
    let value = e.target.value;
    if (e.target.name === "name" && value.length > 0) {
      value = value.charAt(0).toUpperCase() + value.slice(1);
    }
    setForm({ ...form, [e.target.name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name) return;
    onSave({ ...form, quantity: Number(form.quantity) });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label>Nom du produit</label>
        <input name="name" value={form.name} onChange={handleChange} placeholder="ex: Yaourts nature" autoFocus />
      </div>

      <div className="field">
        <label>Catégorie</label>
        <div className="cat-picker">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              className={`cat-pick-btn ${form.category === cat.id ? "active" : ""}`}
              onClick={() => setForm({ ...form, category: cat.id })}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>Quantité</label>
          <input type="number" name="quantity" min="1" value={form.quantity} onChange={handleChange} />
        </div>
        <div className="field">
          <label>Unité</label>
          <select name="unit" value={form.unit} onChange={handleChange}>
            <option>pièce</option>
            <option>g</option>
            <option>kg</option>
            <option>ml</option>
            <option>L</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label>Localisation</label>
        <select name="location" value={form.location} onChange={handleChange}>
          <option>Frigo</option>
          <option>Congélateur</option>
        </select>
      </div>

      <div className="field">
        <label>Date de péremption</label>
        <div className="date-row">
          <select
            value={form.expiry ? form.expiry.split("-")[2] : ""}
            onChange={e => {
              const parts = form.expiry ? form.expiry.split("-") : [new Date().getFullYear().toString(), "01", ""];
              setForm({ ...form, expiry: `${parts[0]}-${parts[1]}-${e.target.value}` });
            }}
          >
            <option value="">Jour</option>
            {Array.from({length:31},(_,i)=>String(i+1).padStart(2,"0")).map(d=>(
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            value={form.expiry ? form.expiry.split("-")[1] : ""}
            onChange={e => {
              const parts = form.expiry ? form.expiry.split("-") : [new Date().getFullYear().toString(), "", "01"];
              setForm({ ...form, expiry: `${parts[0]}-${e.target.value}-${parts[2]}` });
            }}
          >
            <option value="">Mois</option>
            {["Janv","Févr","Mars","Avr","Mai","Juin","Juil","Août","Sept","Oct","Nov","Déc"].map((m,i)=>(
              <option key={i} value={String(i+1).padStart(2,"0")}>{m}</option>
            ))}
          </select>
          <select
            value={form.expiry ? form.expiry.split("-")[0] : ""}
            onChange={e => {
              const parts = form.expiry ? form.expiry.split("-") : ["", "01", "01"];
              setForm({ ...form, expiry: `${e.target.value}-${parts[1]}-${parts[2]}` });
            }}
          >
            <option value="">Année</option>
            {Array.from({length:6},(_,i)=>new Date().getFullYear()+i).map(y=>(
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="modal-footer">
        <button type="button" className="btn-cancel" onClick={onCancel}>Annuler</button>
        <button type="submit" className="btn-submit">{title}</button>
      </div>
    </form>
  );
}

function HomePage({ onOpen }) {
  return (
    <div className="page-home">
      <div className="home-emoji">🧊</div>
      <h1 className="home-title">Tout ce que tu as,<br /><em>au même endroit</em></h1>
      <p className="home-subtitle">Garde toujours un œil<br />sur ce qu'il y a dans ton frigo.</p>
      <button className="btn-primary" onClick={onOpen}>Ouvrir mon frigo</button>
    </div>
  );
}

function FridgeApp({ onBack }) {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [filter, setFilter] = useState("Tous");
  const [catFilter, setCatFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("expiry");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  useEffect(() => {
    if (!showSortMenu) return;
    const handler = () => setShowSortMenu(false);
    setTimeout(() => document.addEventListener("click", handler), 0);
    return () => document.removeEventListener("click", handler);
  }, [showSortMenu]);

  const addItem = (data) => {
    setItems([...items, { id: Date.now(), ...data }]);
    setShowForm(false);
  };

  const saveEdit = (data) => {
    setItems(items.map(i => i.id === editingItem.id ? { ...editingItem, ...data } : i));
    setEditingItem(null);
  };

  const increaseQuantity = (id) =>
    setItems(items.map(item => item.id === id ? { ...item, quantity: item.quantity + 1 } : item));

  const decreaseQuantity = (id) =>
    setItems(
      items.map(item => item.id === id ? { ...item, quantity: item.quantity - 1 } : item)
           .filter(item => item.quantity > 0)
    );

  const deleteItem = (id) => setItems(items.filter(item => item.id !== id));

  const soonToExpire = items.filter(i => { const d = daysLeft(i.expiry); return d >= 0 && d <= 3; });
  const expired = items.filter(i => daysLeft(i.expiry) < 0);

  const locationFiltered = filter === "Tous" ? items : items.filter(i => i.location === filter);
  const presentCats = [...new Set(locationFiltered.map(i => i.category || "autre"))];

  const filteredItems = locationFiltered
    .filter(i => catFilter === "all" || (i.category || "autre") === catFilter)
    .filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "quantity") return b.quantity - a.quantity;
      return new Date(a.expiry) - new Date(b.expiry);
    });

  return (
    <div className="page-app">
      <div className="app-header">
        <h1>Mes réserves</h1>
        <div style={{display:"flex", gap:"0.5rem", alignItems:"center"}}>
          <button className="btn-notif" onClick={() => setShowNotifs(true)}>
            🔔
            {(soonToExpire.length + expired.length) > 0 && (
              <span className="notif-badge">{soonToExpire.length + expired.length}</span>
            )}
          </button>
          <button className="btn-back" onClick={onBack}>← Accueil</button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-num">{items.length}</div>
            <div className="stat-label">produits</div>
          </div>
          <div className="stat-card">
            <div className="stat-num" style={{color: soonToExpire.length > 0 ? "#e67e22" : "var(--brown)"}}>
              {soonToExpire.length}
            </div>
            <div className="stat-label">bientôt périmés</div>
          </div>
          <div className="stat-card">
            <div className="stat-num" style={{color: expired.length > 0 ? "#e74c3c" : "var(--brown)"}}>
              {expired.length}
            </div>
            <div className="stat-label">expirés</div>
          </div>
        </div>
      )}

      <div className="toolbar">
        <div className="filters">
          {["Tous", "Frigo", "Congélateur"].map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? "active" : ""}`}
              onClick={() => { setFilter(f); setCatFilter("all"); }}
            >
              {f === "Frigo" ? "🌡️ " : f === "Congélateur" ? "❄️ " : ""}{f}
            </button>
          ))}
        </div>
        <div className="sort-dropdown" onClick={e => e.stopPropagation()}>
          <button className={`btn-sort ${showSortMenu ? "open" : ""}`} onClick={() => setShowSortMenu(v => !v)}>
            ↕ Tri
          </button>
          {showSortMenu && (
            <div className="sort-menu">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  className={`sort-option ${sortBy === opt.id ? "active" : ""}`}
                  onClick={() => { setSortBy(opt.id); setShowSortMenu(false); }}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {presentCats.length > 1 && (
        <div className="cat-filter-wrap">
          <button className={`cat-chip ${catFilter === "all" ? "active" : ""}`} onClick={() => setCatFilter("all")}>
            Tous
          </button>
          {presentCats.map(catId => {
            const cat = CATEGORIES.find(c => c.id === catId);
            if (!cat) return null;
            return (
              <button
                key={catId}
                className={`cat-chip ${catFilter === catId ? "active" : ""}`}
                onClick={() => setCatFilter(catId)}
              >
                {cat.icon} {cat.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="search-wrap">
        <span className="search-icon">🔍</span>
        <input
          className="search-input"
          type="text"
          placeholder="Rechercher un produit..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && <button className="search-clear" onClick={() => setSearch("")}>✕</button>}
      </div>

      <div className="add-btn-wrap">
        <button className="btn-add" onClick={() => setShowForm(true)}>
          <span>+</span> Ajouter un produit
        </button>
      </div>

      {filteredItems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🫙</div>
          <p>Rien ici pour l'instant.<br />Ajoute ton premier produit !</p>
        </div>
      ) : (
        <ul className="items-list">
          {filteredItems.map(item => {
            const remaining = item.expiry ? daysLeft(item.expiry) : null;
            const status = item.expiry ? getStatus(remaining) : "fresh";
            return (
              <li key={item.id} className={`item-card ${status}`}>
                <div className="item-dot" />
                <div className="item-cat-icon">{getCategoryIcon(item.category || "autre")}</div>
                <div className="item-info">
                  <div className="item-name">
                    {item.name}
                    {item.expiry && <span className="item-badge">{getBadgeLabel(remaining)}</span>}
                  </div>
                  <div className="item-qty">{item.quantity} {item.unit}</div>
                  {item.expiry && <div className="item-meta">Péremption : {formatDate(item.expiry)}</div>}
                </div>
                <div className="item-actions">
                  <div className="item-action-row">
                    <span className="item-location">{item.location === "Frigo" ? "🌡️" : "❄️"}</span>
                    <button className="btn-edit" onClick={() => setEditingItem(item)} title="Modifier">✏️</button>
                    <button className="btn-delete" onClick={() => deleteItem(item.id)} title="Supprimer">🗑</button>
                  </div>
                  <div className="qty-controls">
                    <button className="btn-consume" onClick={() => decreaseQuantity(item.id)}>−</button>
                    <span className="qty-value">{item.quantity}</span>
                    <button className="btn-consume" onClick={() => increaseQuantity(item.id)}>+</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2>Ajouter un produit</h2>
            <ItemForm initial={defaultForm} onSave={addItem} onCancel={() => setShowForm(false)} title="Ajouter" />
          </div>
        </div>
      )}

      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2>Modifier le produit</h2>
            <ItemForm initial={editingItem} onSave={saveEdit} onCancel={() => setEditingItem(null)} title="Enregistrer" />
          </div>
        </div>
      )}

      {showNotifs && (
        <div className="modal-overlay" onClick={() => setShowNotifs(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2>🔔 Notifications</h2>
            {soonToExpire.length === 0 && expired.length === 0 ? (
              <div className="notif-empty">
                <span>✅</span>
                <p>Tout est en ordre !<br />Aucun produit à signaler.</p>
              </div>
            ) : (
              <div className="notif-list">
                {expired.length > 0 && (
                  <div className="alert-box danger">
                    <span className="alert-icon">🚫</span>
                    <div className="alert-body">
                      <strong>Produits périmés</strong>
                      <ul>
                        {expired.map(item => (
                          <li key={item.id}>{item.name} — périmé depuis {Math.abs(daysLeft(item.expiry))}j</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                {soonToExpire.length > 0 && (
                  <div className="alert-box">
                    <span className="alert-icon">⚠️</span>
                    <div className="alert-body">
                      <strong>À consommer bientôt</strong>
                      <ul>
                        {soonToExpire.map(item => (
                          <li key={item.id}>
                            {item.name} — {daysLeft(item.expiry) === 0 ? "aujourd'hui !" : `${daysLeft(item.expiry)}j`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowNotifs(false)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("home");
  return (
    <>
      <style>{style}</style>
      {page === "home"
        ? <HomePage onOpen={() => setPage("fridge")} />
        : <FridgeApp onBack={() => setPage("home")} />
      }
    </>
  );
}
