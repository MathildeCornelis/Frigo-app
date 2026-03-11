import { useState, useEffect, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";
import { supabase } from "./supabase";


const VAPID_PUBLIC_KEY = "BBd4bxTCJw5gphITzIfHm1DpS4S0VAG7Wiy67HJPCs-87W4Gt9SWuaAtZpYr--3OuFoHGyDRN-pMQ0oyCZWykPQ";

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

async function registerPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    return sub;
  } catch(e) { console.log('Push registration failed:', e); }
}

function checkExpiredItems(items) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const expiredItems = items.filter(i => i.expiry && daysLeft(i.expiry) < 0);
  if (expiredItems.length === 0) return;
  const notified = JSON.parse(localStorage.getItem('notifiedExpiredItems') || '[]');
  const toNotify = expiredItems.filter(i => !notified.includes(String(i.id)));
  if (toNotify.length === 0) return;
  const newNotified = [...notified, ...toNotify.map(i => String(i.id))];
  localStorage.setItem('notifiedExpiredItems', JSON.stringify(newNotified));
  toNotify.forEach(item => {
    const d = Math.abs(daysLeft(item.expiry));
    const body = d === 0 ? `${item.name} a expiré aujourd'hui !` : `${item.name} a expiré depuis ${d} jour${d > 1 ? 's' : ''} !`;
    new Notification('🚫 Mon Frigo', { body, icon: '/icon-192.png' });
  });
}

function checkExpiringItems(items) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const expiring = items.filter(i => {
    if (!i.expiry) return false;
    const d = Math.floor((new Date(i.expiry) - new Date().setHours(0,0,0,0)) / 86400000);
    return d >= 0 && d <= 3;
  });
  if (expiring.length === 0) return;

  // On garde en mémoire les IDs déjà notifiés
  const notified = JSON.parse(localStorage.getItem('notifiedItems') || '[]');
  const toNotify = expiring.filter(i => !notified.includes(String(i.id)));
  if (toNotify.length === 0) return;

  // On sauvegarde les nouveaux IDs notifiés
  const newNotified = [...notified, ...toNotify.map(i => String(i.id))];
  localStorage.setItem('notifiedItems', JSON.stringify(newNotified));

  toNotify.forEach(item => {
    const d = Math.floor((new Date(item.expiry) - new Date().setHours(0,0,0,0)) / 86400000);
    const body = d === 0 ? `${item.name} expire aujourd'hui !` : d === 1 ? `${item.name} expire demain !` : `${item.name} expire dans ${d} jours`;
    new Notification('⚠️ Mon Frigo', { body, icon: '/icon-192.png' });
  });
}

const CATEGORIES = [
  { id: "laitier", label: "Laitier", icon: "🥛" },
  { id: "viande", label: "Viande", icon: "🥩" },
  { id: "poisson", label: "Poisson", icon: "🐟" },
  { id: "legume", label: "Légume frais", icon: "🥦" },
  { id: "legume-conserve", label: "Légume en conserve", icon: "🥫" },
  { id: "fruit", label: "Fruit frais", icon: "🍎" },
  { id: "fruit-conserve", label: "Fruit en conserve", icon: "🍑" },
  { id: "feculents", label: "Féculents", icon: "🍝" },
  { id: "pain", label: "Pain & Céréales", icon: "🍞" },
  { id: "condiment", label: "Condiments & Sauces", icon: "🧂" },
  { id: "boisson", label: "Boisson", icon: "🧃" },
  { id: "plat", label: "Plat cuisiné", icon: "🍱" },
  { id: "surgele", label: "Surgelé", icon: "🧊" },
  { id: "epicerie", label: "Épicerie sèche", icon: "🌾" },
  { id: "autre", label: "Autre", icon: "🫙" },
];

const getCategoryIcon = (catId) => CATEGORIES.find(c => c.id === catId)?.icon || "🫙";

const style = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --cream: #F5E4D1; --terracotta: #BA826A; --terracotta-dark: #9B6A54;
    --terracotta-light: #E8C4AD; --brown: #5C3D2E; --text: #2C1810;
    --text-muted: #8B6355; --white: #FEFAF7;
    --shadow: 0 4px 24px rgba(92,61,46,0.12); --shadow-lg: 0 12px 40px rgba(92,61,46,0.18);
  }
  body { font-family: 'DM Sans', sans-serif; background-color: var(--cream); color: var(--text); min-height: 100vh; -webkit-font-smoothing: antialiased; transition: background 0.3s, color 0.3s; }
  body.dark { --cream: #1a1212; --white: #241818; --text: #F5E4D1; --text-muted: #c9a898; --brown: #e8c4ad; --terracotta-light: #3d2020; --shadow: 0 4px 24px rgba(0,0,0,0.4); --shadow-lg: 0 12px 40px rgba(0,0,0,0.5); }
  .btn-burger { background: none; border: none; font-size: 1.3rem; cursor: pointer; padding: 0.2rem 0.4rem; border-radius: 8px; color: var(--brown); display: flex; flex-direction: column; gap: 4px; justify-content: center; align-items: center; width: 36px; height: 36px; }
  .btn-burger span { display: block; width: 18px; height: 2px; background: var(--brown); border-radius: 2px; transition: all 0.2s; }
  .burger-menu { position: absolute; top: 3.5rem; right: 1rem; background: var(--white); border-radius: 16px; box-shadow: var(--shadow-lg); z-index: 1000; min-width: 200px; overflow: hidden; animation: fadeIn 0.15s ease; }
  .burger-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.9rem 1.1rem; font-size: 0.95rem; font-weight: 500; color: var(--text); cursor: pointer; border: none; background: none; width: 100%; font-family: "DM Sans",sans-serif; transition: background 0.12s; }
  .burger-item:hover { background: rgba(92,61,46,0.07); }
  .burger-item + .burger-item { border-top: 1px solid rgba(92,61,46,0.08); }
  .burger-item.danger { color: #e74c3c; }

  /* AUTH */
  .page-auth {
    min-height: 100vh; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 2rem; position: relative; overflow: hidden;
  }
  .page-auth::before {
    content: ''; position: absolute; width: 500px; height: 500px; border-radius: 50%;
    background: radial-gradient(circle, var(--terracotta-light) 0%, transparent 70%);
    top: -150px; right: -150px; opacity: 0.4; pointer-events: none;
  }
  .page-auth::after {
    content: ''; position: absolute; width: 350px; height: 350px; border-radius: 50%;
    background: radial-gradient(circle, var(--terracotta-light) 0%, transparent 70%);
    bottom: -80px; left: -100px; opacity: 0.3; pointer-events: none;
  }
  .auth-card {
    background: var(--white); border-radius: 24px; padding: 2rem;
    width: 100%; max-width: 400px; box-shadow: var(--shadow-lg);
    position: relative; z-index: 1;
  }
  .auth-logo { font-size: 3rem; text-align: center; margin-bottom: 0.5rem; }
  .auth-title {
    font-family: 'DM Serif Display', serif; font-size: 1.6rem;
    color: var(--brown); text-align: center; margin-bottom: 0.3rem;
  }
  .auth-subtitle { font-size: 0.9rem; color: var(--text-muted); text-align: center; margin-bottom: 1.5rem; }
  .auth-tabs { display: flex; gap: 0.3rem; background: rgba(92,61,46,0.07); padding: 0.3rem; border-radius: 100px; margin-bottom: 1.5rem; }
  .auth-tab {
    flex: 1; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; font-weight: 500;
    padding: 0.6rem; border: none; border-radius: 100px; background: transparent;
    color: var(--text-muted); cursor: pointer; transition: all 0.2s;
  }
  .auth-tab.active { background: var(--white); color: var(--brown); font-weight: 600; box-shadow: var(--shadow); }
  .auth-field { margin-bottom: 1rem; }
  .auth-field label { display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.4rem; }
  .auth-field input {
    width: 100%; font-family: 'DM Sans', sans-serif; font-size: 0.95rem;
    color: var(--text); background: rgba(92,61,46,0.05);
    border: 1.5px solid transparent; border-radius: 10px;
    padding: 0.7rem 0.9rem; outline: none;
    transition: border-color 0.15s, background 0.15s;
  }
  .auth-field input:focus { border-color: var(--terracotta); background: white; }
  .btn-auth {
    width: 100%; font-family: 'DM Sans', sans-serif; font-size: 1rem; font-weight: 600;
    color: white; background: var(--terracotta); border: none; border-radius: 12px;
    padding: 0.9rem; cursor: pointer; box-shadow: 0 4px 14px rgba(186,130,106,0.4);
    transition: all 0.15s; margin-bottom: 0.75rem;
  }
  .btn-auth:hover { background: var(--terracotta-dark); transform: translateY(-1px); }
  .btn-auth:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
  .auth-divider { text-align: center; color: var(--text-muted); font-size: 0.85rem; margin: 0.75rem 0; position: relative; }
  .auth-divider::before, .auth-divider::after {
    content: ''; position: absolute; top: 50%; width: 40%; height: 1px;
    background: rgba(92,61,46,0.15);
  }
  .auth-divider::before { left: 0; }
  .auth-divider::after { right: 0; }
  .btn-google {
    width: 100%; font-family: 'DM Sans', sans-serif; font-size: 0.95rem; font-weight: 500;
    color: var(--text); background: var(--white); border: 1.5px solid rgba(92,61,46,0.15);
    border-radius: 12px; padding: 0.85rem; cursor: pointer;
    transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 0.6rem;
  }
  .btn-google:hover { border-color: var(--terracotta); background: rgba(186,130,106,0.05); }
  .auth-error { background: #FEE2E2; border: 1px solid #FCA5A5; border-radius: 8px; padding: 0.6rem 0.9rem; font-size: 0.85rem; color: #B91C1C; margin-bottom: 1rem; }
  .auth-success { background: #e8f8ec; border: 1px solid #a7f3c2; border-radius: 8px; padding: 0.6rem 0.9rem; font-size: 0.85rem; color: #166534; margin-bottom: 1rem; }

  /* HOME */
  .page-home { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; text-align: center; position: relative; overflow: hidden; }
  .page-home::before { content: ''; position: absolute; width: 500px; height: 500px; border-radius: 50%; background: radial-gradient(circle, var(--terracotta-light) 0%, transparent 70%); top: -150px; right: -150px; opacity: 0.4; pointer-events: none; }
  .page-home::after { content: ''; position: absolute; width: 350px; height: 350px; border-radius: 50%; background: radial-gradient(circle, var(--terracotta-light) 0%, transparent 70%); bottom: -80px; left: -100px; opacity: 0.3; pointer-events: none; }
  .home-emoji { font-size: 5rem; margin-bottom: 1.5rem; animation: float 4s ease-in-out infinite; position: relative; z-index: 1; }
  @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
  .home-title { font-family: 'DM Serif Display', serif; font-size: clamp(2rem, 6vw, 3rem); line-height: 1.15; color: var(--brown); margin-bottom: 1rem; position: relative; z-index: 1; }
  .home-title em { font-style: italic; color: var(--terracotta); }
  .home-subtitle { font-size: 1.05rem; color: var(--text-muted); font-weight: 300; line-height: 1.6; margin-bottom: 2.5rem; position: relative; z-index: 1; }
  .home-user { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem; position: relative; z-index: 1; }
  .btn-primary { font-family: 'DM Sans', sans-serif; font-size: 1rem; font-weight: 600; color: var(--white); background: var(--terracotta); border: none; border-radius: 100px; padding: 0.85rem 2.2rem; cursor: pointer; box-shadow: 0 6px 20px rgba(186,130,106,0.45); transition: all 0.2s ease; position: relative; z-index: 1; }
  .btn-primary:hover { background: var(--terracotta-dark); transform: translateY(-2px); box-shadow: 0 10px 28px rgba(186,130,106,0.55); }
  .btn-signout { font-family: 'DM Sans', sans-serif; font-size: 0.8rem; color: var(--text-muted); background: none; border: 1px solid rgba(92,61,46,0.2); border-radius: 100px; padding: 0.4rem 0.9rem; cursor: pointer; transition: all 0.15s; position: relative; z-index: 1; margin-top: 1rem; }
  .btn-signout:hover { border-color: var(--terracotta); color: var(--terracotta); }

  /* APP */
  .page-app { min-height: 100vh; max-width: 480px; margin: 0 auto; padding: 0 1.25rem 6rem; }
  .app-header { padding: 2rem 0 1.25rem; display: flex; align-items: center; justify-content: space-between; }
  .app-header h1 { font-family: 'DM Serif Display', serif; font-size: 1.8rem; color: var(--brown); }
  .btn-back { font-family: 'DM Sans', sans-serif; font-size: 0.85rem; color: var(--text-muted); background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 0.3rem; padding: 0.4rem 0.75rem; border-radius: 100px; transition: background 0.15s; }
  .btn-back:hover { background: rgba(186,130,106,0.1); }
  .btn-notif { position: relative; font-size: 1.1rem; background: var(--white); border: none; border-radius: 100px; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: var(--shadow); transition: transform 0.15s; }
  .btn-notif:hover { transform: scale(1.08); }
  .notif-badge { position: absolute; top: -4px; right: -4px; background: #E74C3C; color: white; font-size: 0.65rem; font-weight: 700; min-width: 16px; height: 16px; border-radius: 100px; display: flex; align-items: center; justify-content: center; padding: 0 3px; }
  .notif-list { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 0.5rem; }
  .notif-empty { text-align: center; padding: 2rem 1rem; color: var(--text-muted); }
  .notif-empty span { font-size: 2.5rem; display: block; margin-bottom: 0.75rem; }
  .notif-empty p { font-size: 0.9rem; line-height: 1.6; }
  .stats-row { display: flex; gap: 0.75rem; margin-bottom: 1.25rem; }
  .stat-card { flex: 1; background: var(--white); border-radius: 14px; padding: 0.9rem; text-align: center; box-shadow: var(--shadow); }
  .stat-num { font-family: 'DM Serif Display', serif; font-size: 1.6rem; color: var(--brown); line-height: 1; }
  .stat-label { font-size: 0.72rem; color: var(--text-muted); margin-top: 0.25rem; font-weight: 500; }
  .toolbar { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem; }
  .filters { flex: 1; display: flex; gap: 0.5rem; background: rgba(255,255,255,0.55); padding: 0.3rem; border-radius: 100px; backdrop-filter: blur(8px); }
  .filter-btn { flex: 1; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 500; padding: 0.55rem 0.5rem; border: none; border-radius: 100px; background: transparent; color: var(--text-muted); cursor: pointer; transition: all 0.2s ease; white-space: nowrap; }
  .filter-btn.active { background: var(--white); color: var(--brown); font-weight: 600; box-shadow: 0 2px 10px rgba(92,61,46,0.12); }
  .sort-dropdown { position: relative; flex-shrink: 0; }
  .btn-sort { font-family: 'DM Sans', sans-serif; font-size: 0.8rem; font-weight: 500; color: var(--text-muted); background: rgba(255,255,255,0.55); border: none; border-radius: 100px; padding: 0.55rem 0.75rem; cursor: pointer; display: flex; align-items: center; gap: 0.3rem; white-space: nowrap; backdrop-filter: blur(8px); transition: all 0.15s; }
  .btn-sort:hover, .btn-sort.open { background: var(--white); color: var(--brown); box-shadow: var(--shadow); }
  .sort-menu { position: absolute; top: calc(100% + 0.4rem); right: 0; background: var(--white); border-radius: 12px; box-shadow: var(--shadow-lg); padding: 0.4rem; z-index: 100; min-width: 170px; animation: fadeIn 0.15s ease; }
  .sort-option { width: 100%; text-align: left; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 500; color: var(--text-muted); background: none; border: none; border-radius: 8px; padding: 0.55rem 0.75rem; cursor: pointer; transition: background 0.12s, color 0.12s; display: flex; align-items: center; gap: 0.4rem; }
  .sort-option:hover { background: rgba(186,130,106,0.1); color: var(--brown); }
  .sort-option.active { color: var(--terracotta); font-weight: 600; }
  .cat-filter-wrap { display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.5rem; margin-bottom: 0.75rem; scrollbar-width: none; }
  .cat-filter-wrap::-webkit-scrollbar { display: none; }
  .cat-chip { flex-shrink: 0; font-family: 'DM Sans', sans-serif; font-size: 0.78rem; font-weight: 500; padding: 0.35rem 0.8rem; border-radius: 100px; border: 1.5px solid transparent; background: rgba(255,255,255,0.6); color: var(--text-muted); cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 0.3rem; white-space: nowrap; }
  .cat-chip:hover { background: var(--white); color: var(--brown); }
  .cat-chip.active { background: var(--terracotta); color: white; border-color: var(--terracotta); }
  .search-wrap { position: relative; margin-bottom: 1.25rem; display: flex; align-items: center; }
  .search-icon { position: absolute; left: 0.9rem; font-size: 0.9rem; pointer-events: none; }
  .search-input { width: 100%; font-family: 'DM Sans', sans-serif; font-size: 0.92rem; color: var(--text); background: var(--white); border: 1.5px solid transparent; border-radius: 12px; padding: 0.75rem 2.5rem 0.75rem 2.4rem; outline: none; box-shadow: var(--shadow); transition: border-color 0.15s; }
  .search-input:focus { border-color: var(--terracotta); }
  .search-input::placeholder { color: var(--text-muted); }
  .search-clear { position: absolute; right: 0.75rem; background: none; border: none; color: var(--text-muted); font-size: 0.8rem; cursor: pointer; padding: 0.2rem 0.4rem; border-radius: 100px; transition: background 0.15s; }
  .search-clear:hover { background: rgba(92,61,46,0.08); }
  .add-btn-wrap { margin-bottom: 1.25rem; }
  .btn-add { width: 100%; font-family: 'DM Sans', sans-serif; font-size: 1rem; font-weight: 600; color: var(--white); background: var(--terracotta); border: none; border-radius: 14px; padding: 1rem; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 16px rgba(186,130,106,0.35); display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
  .btn-add:hover { background: var(--terracotta-dark); transform: translateY(-1px); box-shadow: 0 8px 22px rgba(186,130,106,0.45); }
  .items-list { display: flex; flex-direction: column; gap: 0.75rem; list-style: none; }
  .item-card { background: var(--white); border-radius: 16px; padding: 1rem 1.1rem; display: flex; align-items: center; gap: 0.75rem; box-shadow: var(--shadow); border-left: 4px solid transparent; transition: transform 0.15s, box-shadow 0.15s; animation: slideIn 0.25s ease; }
  @keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .item-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
  .item-card.fresh { border-color: #2ecc71; } .item-card.medium { border-color: #f39c12; } .item-card.soon { border-color: #e67e22; } .item-card.expired { border-color: #e74c3c; }
  .item-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .fresh .item-dot { background: #2ecc71; } .medium .item-dot { background: #f39c12; } .soon .item-dot { background: #e67e22; } .expired .item-dot { background: #e74c3c; }
  .item-cat-icon { font-size: 1.3rem; flex-shrink: 0; }
  .item-img { width: 38px; height: 38px; border-radius: 8px; object-fit: cover; flex-shrink: 0; background: rgba(92,61,46,0.07); }
  .item-wrapper { position: relative; overflow: hidden; border-radius: 16px; margin-bottom: 0.75rem; }
  .item-swipe-bg { position: absolute; inset: 0; background: #e74c3c; display: flex; align-items: center; justify-content: flex-end; padding-right: 1.5rem; border-radius: 16px; }
  .item-swipe-bg span { color: white; font-size: 1.4rem; }
  .item-card { position: relative; transition: transform 0.15s ease; touch-action: pan-y; margin-bottom: 0; border-radius: 16px; }
  .toast-undo { position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%); background: var(--brown); color: var(--white); padding: 0.75rem 1.25rem; border-radius: 100px; display: flex; align-items: center; gap: 0.75rem; font-size: 0.9rem; font-weight: 500; box-shadow: var(--shadow-lg); z-index: 9999; animation: slideUp 0.3s ease; }
  .toast-undo button { background: var(--terracotta-light); border: none; color: var(--text); font-family: "DM Sans",sans-serif; font-weight: 600; font-size: 0.85rem; border-radius: 100px; padding: 0.3rem 0.75rem; cursor: pointer; }
  @keyframes slideUp { from { opacity:0; transform: translate(-50%, 20px); } to { opacity:1; transform: translate(-50%, 0); } }
  .item-info { flex: 1; min-width: 0; }
  .item-name { font-weight: 600; font-size: 0.95rem; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .item-badge { display: inline-block; font-size: 0.7rem; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: 100px; margin-left: 0.4rem; }
  .fresh .item-badge { background: #e8f8ec; color: #27ae60; } .medium .item-badge { background: #fef3e2; color: #d68910; } .soon .item-badge { background: #fdeede; color: #ca6f1e; } .expired .item-badge { background: #fde8e8; color: #cb4335; }
  .item-qty { font-size: 0.78rem; color: var(--text-muted); margin-top: 0.15rem; }
  .item-meta { font-size: 0.78rem; color: var(--text-muted); margin-top: 0.2rem; }
  .item-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 0.4rem; flex-shrink: 0; }
  .item-action-row { display: flex; gap: 0.35rem; align-items: center; }
  .item-location { font-size: 0.72rem; color: var(--text-muted); background: rgba(92,61,46,0.07); padding: 0.2rem 0.5rem; border-radius: 100px; }
  .btn-edit { background: none; border: none; font-size: 0.85rem; cursor: pointer; padding: 0.2rem 0.3rem; border-radius: 6px; opacity: 0.45; transition: opacity 0.15s, background 0.15s; }
  .btn-edit:hover { opacity: 1; background: #FEF9C3; }
  .btn-delete { background: none; border: none; font-size: 0.85rem; cursor: pointer; padding: 0.2rem 0.3rem; border-radius: 6px; opacity: 0.45; transition: opacity 0.15s, background 0.15s; }
  .btn-delete:hover { opacity: 1; background: #FEE2E2; }
  .qty-controls { display: flex; align-items: center; gap: 0.4rem; }
  .btn-consume { font-family: 'DM Sans', sans-serif; font-size: 1rem; font-weight: 600; color: var(--terracotta); background: rgba(186,130,106,0.1); border: none; border-radius: 100px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; flex-shrink: 0; }
  .btn-consume:hover { background: var(--terracotta); color: white; }
  .qty-value { font-size: 0.85rem; font-weight: 600; color: var(--text); min-width: 1.5rem; text-align: center; }
  .empty-state { text-align: center; padding: 3rem 1rem; color: var(--text-muted); }
  .empty-state .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
  .empty-state p { font-size: 0.9rem; line-height: 1.6; }
  .alert-box { background: #FFF3E0; border: 1.5px solid #FFCC80; border-radius: 14px; padding: 1rem 1.1rem; margin-bottom: 1.25rem; display: flex; gap: 0.75rem; align-items: flex-start; }
  .alert-box.danger { background: #FEE2E2; border-color: #FCA5A5; }
  .alert-box.danger .alert-body strong { color: #B91C1C; }
  .alert-box.danger .alert-body li { color: #7F1D1D; }
  .alert-box.danger .alert-body li::before { color: #EF4444; }
  .alert-icon { font-size: 1.2rem; flex-shrink: 0; margin-top: 1px; }
  .alert-body strong { font-size: 0.85rem; font-weight: 600; color: #B45309; display: block; margin-bottom: 0.4rem; }
  .alert-body ul { list-style: none; display: flex; flex-direction: column; gap: 0.2rem; }
  .alert-body li { font-size: 0.82rem; color: #92400E; display: flex; align-items: center; gap: 0.4rem; }
  .alert-body li::before { content: '·'; font-weight: 700; color: #D97706; }
  .modal-overlay { position: fixed; inset: 0; background: rgba(44,24,16,0.45); backdrop-filter: blur(4px); display: flex; align-items: flex-end; justify-content: center; z-index: 1000; animation: fadeIn 0.2s ease; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .modal { background: var(--white); border-radius: 24px 24px 0 0; padding: 1.5rem 1.5rem 2.5rem; width: 100%; max-width: 480px; animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); max-height: 92vh; overflow-y: auto; }
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  .modal-handle { width: 36px; height: 4px; background: rgba(92,61,46,0.15); border-radius: 100px; margin: 0 auto 1.5rem; }
  .modal h2 { font-family: 'DM Serif Display', serif; font-size: 1.4rem; color: var(--brown); margin-bottom: 1.25rem; }
  .field { margin-bottom: 1.1rem; }
  .field label { display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.4rem; }
  .field input, .field select { width: 100%; font-family: 'DM Sans', sans-serif; font-size: 0.95rem; color: var(--text); background: rgba(92,61,46,0.05); border: 1.5px solid transparent; border-radius: 10px; padding: 0.7rem 0.9rem; outline: none; transition: border-color 0.15s, background 0.15s; appearance: none; }
  .field input:focus, .field select:focus { border-color: var(--terracotta); background: white; }
  .field-row { display: flex; gap: 0.75rem; }
  .field-row .field { flex: 1; }
  .date-row { display: flex; gap: 0.5rem; }
  .date-row select { flex: 1; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; color: var(--text); background: rgba(92,61,46,0.05); border: 1.5px solid transparent; border-radius: 10px; padding: 0.7rem 0.4rem; outline: none; transition: border-color 0.15s, background 0.15s; appearance: none; text-align: center; cursor: pointer; }
  .date-row select:focus { border-color: var(--terracotta); background: white; }
  .cat-picker { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .cat-pick-btn { font-family: 'DM Sans', sans-serif; font-size: 0.8rem; font-weight: 500; padding: 0.35rem 0.7rem; border-radius: 100px; border: 1.5px solid rgba(92,61,46,0.12); background: rgba(92,61,46,0.04); color: var(--text-muted); cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 0.3rem; }
  .cat-pick-btn:hover { border-color: var(--terracotta); color: var(--brown); }
  .cat-pick-btn.active { background: var(--terracotta); border-color: var(--terracotta); color: white; }
  .modal-footer { display: flex; gap: 0.75rem; margin-top: 1.5rem; }
  .btn-cancel { flex: 1; font-family: 'DM Sans', sans-serif; font-size: 1rem; font-weight: 500; color: var(--text-muted); background: rgba(92,61,46,0.07); border: none; border-radius: 12px; padding: 0.9rem; cursor: pointer; transition: background 0.15s; }
  .btn-cancel:hover { background: rgba(92,61,46,0.12); }
  .btn-submit { flex: 2; font-family: 'DM Sans', sans-serif; font-size: 1rem; font-weight: 600; color: white; background: var(--terracotta); border: none; border-radius: 12px; padding: 0.9rem; cursor: pointer; box-shadow: 0 4px 14px rgba(186,130,106,0.4); transition: all 0.15s; }
  .btn-submit:hover { background: var(--terracotta-dark); transform: translateY(-1px); }
  .loading { display: flex; align-items: center; justify-content: center; min-height: 100vh; font-size: 2rem; }
  .shopping-item { display: flex; align-items: center; gap: 0.75rem; background: var(--white); border-radius: 12px; padding: 0.85rem 1rem; box-shadow: var(--shadow); margin-bottom: 0.6rem; }
  .shopping-item.checked { opacity: 0.5; }
  .shopping-item input[type="checkbox"] { width: 20px; height: 20px; accentColor: var(--terracotta); cursor: pointer; flex-shrink: 0; accent-color: var(--terracotta); }
  .shopping-item-name { flex: 1; font-size: 0.95rem; font-weight: 500; color: var(--text); }
  .shopping-item.checked .shopping-item-name { text-decoration: line-through; color: var(--text-muted); }
  .btn-clear-list { width: 100%; font-family: "DM Sans", sans-serif; font-size: 0.9rem; font-weight: 500; color: #e74c3c; background: #fde8e8; border: none; border-radius: 12px; padding: 0.75rem; cursor: pointer; margin-top: 1rem; transition: background 0.15s; }
  .btn-clear-list:hover { background: #fca5a5; }
  .btn-scan { font-family: "DM Sans", sans-serif; font-size: 0.85rem; font-weight: 500; color: var(--terracotta); background: rgba(186,130,106,0.1); border: 1.5px solid rgba(186,130,106,0.3); border-radius: 10px; padding: 0.6rem 0.9rem; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 0.4rem; width: 100%; justify-content: center; margin-bottom: 0.75rem; }
  .btn-scan:hover { background: rgba(186,130,106,0.2); border-color: var(--terracotta); }
  .scanner-wrap { position: relative; width: 100%; border-radius: 12px; overflow: hidden; background: #000; margin-bottom: 0.75rem; }
  .scanner-wrap video { width: 100%; display: block; max-height: 220px; object-fit: cover; }
  .scanner-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
  .scanner-frame { width: 60%; aspect-ratio: 1; border: 2.5px solid var(--terracotta); border-radius: 12px; box-shadow: 0 0 0 1000px rgba(0,0,0,0.4); }
  .btn-scan-close { position: absolute; top: 0.5rem; right: 0.5rem; background: rgba(0,0,0,0.5); border: none; color: white; border-radius: 100px; width: 28px; height: 28px; cursor: pointer; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; }
  .scan-status { font-size: 0.82rem; color: var(--text-muted); text-align: center; margin-bottom: 0.75rem; }
  .scan-status.success { color: #27ae60; font-weight: 600; }
  .scan-status.error { color: #e74c3c; }
  .pull-indicator { text-align: center; padding: 0.75rem; font-size: 0.85rem; color: var(--text-muted); animation: fadeIn 0.2s ease; }
  .btn-refresh { background: none; border: none; font-size: 1.1rem; cursor: pointer; padding: 0.2rem; border-radius: 100px; transition: transform 0.3s; }
  .btn-refresh:hover { transform: rotate(180deg); }
  .btn-refresh.spinning { animation: spin 0.6s linear; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`;

const daysLeft = (date) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const expiry = new Date(date); expiry.setHours(0,0,0,0);
  return Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
};
const getStatus = (r) => { if (r < 0) return "expired"; if (r <= 3) return "soon"; if (r <= 5) return "medium"; return "fresh"; };
const getBadgeLabel = (r) => { if (r < 0) return `Périmé (${Math.abs(r)}j)`; if (r === 0) return "Aujourd'hui !"; if (r === 1) return "Demain !"; return `${r}j`; };
const formatDate = (d) => { if (!d) return ""; const [y,m,dd] = d.split("-"); return `${dd}/${m}/${y}`; };
const defaultForm = { name: "", quantity: 1, unit: "pièce", location: "Frigo", expiry: "", category: "autre" };
const SORT_OPTIONS = [
  { id: "expiry", label: "Date d'expiration", icon: "📅" },
  { id: "name", label: "Nom", icon: "🔤" },
  { id: "quantity", label: "Quantité", icon: "🔢" },
];

function AuthPage({ onAuth }) {
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async () => {
    setError(""); setSuccess(""); setLoading(true);
    try {
      if (tab === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccess("Compte créé ! Vérifie tes emails pour confirmer ton compte.");
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google" });
  };

  return (
    <div className="page-auth">
      <div className="auth-card">
        <div className="auth-logo">🧊</div>
        <h1 className="auth-title">Mon Frigo</h1>
        <p className="auth-subtitle">Garde un œil sur tes réserves</p>
        <div className="auth-tabs">
          <button className={`auth-tab ${tab === "login" ? "active" : ""}`} onClick={() => setTab("login")}>Connexion</button>
          <button className={`auth-tab ${tab === "signup" ? "active" : ""}`} onClick={() => setTab("signup")}>Inscription</button>
        </div>
        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}
        <div className="auth-field">
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ton@email.com" />
        </div>
        <div className="auth-field">
          <label>Mot de passe</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        <button className="btn-auth" onClick={handleSubmit} disabled={loading}>
          {loading ? "..." : tab === "login" ? "Se connecter" : "Créer mon compte"}
        </button>
        <div className="auth-divider">ou</div>
        <button className="btn-google" onClick={handleGoogle}>
          <span>🔵</span> Continuer avec Google
        </button>
      </div>
    </div>
  );
}

function ItemForm({ initial, onSave, onCancel, title }) {
  const [form, setForm] = useState(initial);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const videoRef = useRef(null);
  const readerRef = useRef(null);

  const handleChange = (e) => {
    let value = e.target.value;
    if (e.target.name === "name" && value.length > 0) value = value.charAt(0).toUpperCase() + value.slice(1);
    setForm({ ...form, [e.target.name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name) return;
    onSave({ ...form, quantity: Number(form.quantity) });
  };

  const startScan = async () => {
    setScanning(true);
    setScanStatus("Pointez la caméra vers le code-barres...");
    readerRef.current = new BrowserMultiFormatReader();
    try {
      await readerRef.current.decodeFromVideoDevice(null, videoRef.current, async (result, err) => {
        if (result) {
          stopScan();
          setScanStatus("Code détecté ! Recherche du produit...");
          try {
            const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${result.getText()}.json`);
            const data = await res.json();
            if (data.status === 1) {
              const p = data.product;
              const name = p.product_name_fr || p.product_name || "";
              const image_url = p.image_front_small_url || p.image_url || "";
              setForm(f => ({ ...f, name: name.charAt(0).toUpperCase() + name.slice(1), image_url }));
              setScanStatus(`✅ Produit trouvé : ${name}`);
            } else {
              setScanStatus("❌ Produit non trouvé, entre le nom manuellement.");
            }
          } catch {
            setScanStatus("❌ Erreur lors de la recherche.");
          }
        }
      });
    } catch {
      setScanStatus("❌ Impossible d'accéder à la caméra.");
      setScanning(false);
    }
  };

  const stopScan = () => {
    if (readerRef.current) { readerRef.current.reset(); readerRef.current = null; }
    setScanning(false);
  };

  useEffect(() => { return () => { if (readerRef.current) { readerRef.current.reset(); } }; }, []);

  return (
    <form onSubmit={handleSubmit}>
      <button type="button" className="btn-scan" onClick={startScan}>📷 Scanner un code-barres</button>
      {scanning && (
        <div className="scanner-wrap">
          <video ref={videoRef} />
          <div className="scanner-overlay"><div className="scanner-frame" /></div>
          <button type="button" className="btn-scan-close" onClick={stopScan}>✕</button>
        </div>
      )}
      {scanStatus && <div className={`scan-status ${scanStatus.startsWith("✅") ? "success" : scanStatus.startsWith("❌") ? "error" : ""}`}>{scanStatus}</div>}
      <div className="field"><label>Nom du produit</label><input name="name" value={form.name} onChange={handleChange} placeholder="ex: Yaourts nature" /></div>
      <div className="field">
        <label>Catégorie</label>
        <div className="cat-picker">
          {CATEGORIES.map(cat => (
            <button key={cat.id} type="button" className={`cat-pick-btn ${form.category === cat.id ? "active" : ""}`} onClick={() => setForm({ ...form, category: cat.id })}>
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>
      <div className="field-row">
        <div className="field"><label>Quantité</label><input type="number" name="quantity" min="1" value={form.quantity} onChange={handleChange} /></div>
        <div className="field"><label>Unité</label><select name="unit" value={form.unit} onChange={handleChange}><option>pièce</option><option>g</option><option>kg</option><option>ml</option><option>L</option></select></div>
      </div>
      <div className="field"><label>Localisation</label><select name="location" value={form.location} onChange={handleChange}><option>Frigo</option><option>Congélateur</option><option>Placard</option></select></div>
      <div className="field" onClick={() => setForm({...form, reorder: !form.reorder})} style={{display:"flex",alignItems:"center",gap:"0.75rem",background: form.reorder ? "rgba(186,130,106,0.12)" : "rgba(92,61,46,0.04)",borderRadius:"10px",padding:"0.7rem 0.9rem",cursor:"pointer",border: form.reorder ? "1.5px solid rgba(186,130,106,0.4)" : "1.5px solid transparent",transition:"all 0.15s"}}>
        <div style={{width:"20px",height:"20px",borderRadius:"6px",border:"2px solid",borderColor: form.reorder ? "var(--terracotta)" : "#ccc",background: form.reorder ? "var(--terracotta)" : "white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>
          {form.reorder && <span style={{color:"white",fontSize:"13px",fontWeight:"bold",lineHeight:1}}>✓</span>}
        </div>
        <span style={{fontSize:"0.9rem",color:"var(--text)",fontWeight:"500"}}>🛒 Ajouter à la liste de courses quand épuisé</span>
      </div>
      <div className="field">
        <label>Date de péremption</label>
        <div className="date-row">
          <select value={form.expiry ? form.expiry.split("-")[2] : ""} onChange={e => { const p = form.expiry ? form.expiry.split("-") : [new Date().getFullYear().toString(),"01",""]; setForm({...form, expiry:`${p[0]}-${p[1]}-${e.target.value}`}); }}>
            <option value="">Jour</option>{Array.from({length:31},(_,i)=>String(i+1).padStart(2,"0")).map(d=><option key={d} value={d}>{d}</option>)}
          </select>
          <select value={form.expiry ? form.expiry.split("-")[1] : ""} onChange={e => { const p = form.expiry ? form.expiry.split("-") : [new Date().getFullYear().toString(),"","01"]; setForm({...form, expiry:`${p[0]}-${e.target.value}-${p[2]}`}); }}>
            <option value="">Mois</option>{["Janv","Févr","Mars","Avr","Mai","Juin","Juil","Août","Sept","Oct","Nov","Déc"].map((m,i)=><option key={i} value={String(i+1).padStart(2,"0")}>{m}</option>)}
          </select>
          <select value={form.expiry ? form.expiry.split("-")[0] : ""} onChange={e => { const p = form.expiry ? form.expiry.split("-") : ["","01","01"]; setForm({...form, expiry:`${e.target.value}-${p[1]}-${p[2]}`}); }}>
            <option value="">Année</option>{Array.from({length:6},(_,i)=>new Date().getFullYear()+i).map(y=><option key={y} value={y}>{y}</option>)}
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

function WasteHistoryModal({ user, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("waste_history").select("*").eq("user_id", user.id).order("deleted_at", { ascending: false }).limit(50)
      .then(({ data }) => { if (data) setHistory(data); setLoading(false); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const byMonth = history.reduce((acc, i) => {
    const m = new Date(i.deleted_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    if (!acc[m]) acc[m] = [];
    acc[m].push(i);
    return acc;
  }, {});

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2>📊 Historique de gaspillage</h2>
        {loading ? <div style={{textAlign:"center",padding:"2rem"}}>Chargement...</div> :
        history.length === 0 ? (
          <div className="notif-empty"><span>🌱</span><p>Aucun gaspillage enregistré !<br />Bravo !</p></div>
        ) : (
          Object.entries(byMonth).map(([month, items]) => (
            <div key={month} style={{marginBottom:"1.25rem"}}>
              <div style={{fontSize:"0.8rem",fontWeight:"600",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:"0.5rem"}}>{month} — {items.length} produit{items.length > 1 ? "s" : ""}</div>
              {items.map(i => (
                <div key={i.id} style={{display:"flex",alignItems:"center",gap:"0.75rem",background:"var(--white)",borderRadius:"10px",padding:"0.6rem 0.9rem",marginBottom:"0.4rem",boxShadow:"var(--shadow)"}}>
                  <span style={{fontSize:"1.1rem"}}>{getCategoryIcon(i.category)}</span>
                  <span style={{flex:1,fontSize:"0.9rem",fontWeight:"500"}}>{i.name}</span>
                  <span style={{fontSize:"0.75rem",color: i.reason === "périmé" ? "#e74c3c" : "var(--text-muted)",fontWeight:"600"}}>{i.reason}</span>
                </div>
              ))}
            </div>
          ))
        )}
        <div className="modal-footer"><button className="btn-cancel" onClick={onClose}>Fermer</button></div>
      </div>
    </div>
  );
}

function ShoppingListModal({ onClose }) {
  const [list, setList] = useState(() => JSON.parse(localStorage.getItem('shoppingList') || '[]'));
  const [undoShop, setUndoShop] = useState(null);
  const undoShopTimer = useRef(null);
  const swipeShopStart = useRef(0);
  const swipeShopEl = useRef(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', category: 'autre', quantity: 1 });

  const save = (updated) => { setList(updated); localStorage.setItem('shoppingList', JSON.stringify(updated)); };

  const toggleItem = (id) => save(list.map(i => i.id === id ? { ...i, checked: !i.checked } : i));

  const removeItem = (id, withUndo = false) => {
    const item = list.find(i => i.id === id);
    save(list.filter(i => i.id !== id));
    if (withUndo) {
      setUndoShop(item);
      if (undoShopTimer.current) clearTimeout(undoShopTimer.current);
      undoShopTimer.current = setTimeout(() => setUndoShop(null), 3000);
    }
  };

  const undoShopDelete = () => {
    if (!undoShop) return;
    if (undoShopTimer.current) clearTimeout(undoShopTimer.current);
    save([...list, undoShop]);
    setUndoShop(null);
  };

  const clearChecked = () => save(list.filter(i => !i.checked));

  const changeQty = (id, delta) => save(list.map(i => i.id === id ? { ...i, quantity: Math.max(1, (i.quantity || 1) + delta) } : i));

  const handleSwipeStart = (e, id) => { swipeShopStart.current = e.touches[0].clientX; swipeShopEl.current = id; };
  const handleSwipeMove = (e) => {
    const diff = e.touches[0].clientX - swipeShopStart.current;
    if (diff < 0) {
      const el = document.getElementById(`shop-${swipeShopEl.current}`);
      if (el) el.style.transform = `translateX(${Math.max(diff, -100)}px)`;
    }
  };
  const handleSwipeEnd = (e) => {
    const diff = e.changedTouches[0].clientX - swipeShopStart.current;
    const el = document.getElementById(`shop-${swipeShopEl.current}`);
    if (diff < -80) {
      if (el) el.style.transform = 'translateX(-100%)';
      setTimeout(() => removeItem(swipeShopEl.current, true), 150);
    } else {
      if (el) el.style.transform = 'translateX(0)';
    }
  };

  const submitAdd = () => {
    if (!newItem.name) return;
    save([...list, { id: Date.now(), name: newItem.name.charAt(0).toUpperCase() + newItem.name.slice(1), category: newItem.category, checked: false, quantity: newItem.quantity }]);
    setNewItem({ name: '', category: 'autre', quantity: 1 });
    setShowAddForm(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2>🛒 Liste de courses</h2>

        {showAddForm ? (
          <div style={{marginBottom:"1rem"}}>
            <div className="field"><label>Nom du produit</label><input value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="ex: Yaourts nature" autoFocus /></div>
            <div className="field"><label>Quantité</label>
              <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
                <button type="button" onClick={() => setNewItem({...newItem, quantity: Math.max(1, newItem.quantity - 1)})} style={{background:"rgba(92,61,46,0.08)",border:"none",borderRadius:"8px",width:"36px",height:"36px",cursor:"pointer",fontSize:"1.2rem"}}>−</button>
                <span style={{fontWeight:"600",fontSize:"1.1rem",minWidth:"28px",textAlign:"center"}}>{newItem.quantity}</span>
                <button type="button" onClick={() => setNewItem({...newItem, quantity: newItem.quantity + 1})} style={{background:"rgba(92,61,46,0.08)",border:"none",borderRadius:"8px",width:"36px",height:"36px",cursor:"pointer",fontSize:"1.2rem"}}>+</button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowAddForm(false)}>Annuler</button>
              <button className="btn-submit" onClick={submitAdd}>Ajouter</button>
            </div>
          </div>
        ) : (
          <>
            {list.length === 0 ? (
              <div className="notif-empty"><span>🛒</span><p>Ta liste est vide !<br />Les produits épuisés marqués apparaîtront ici.</p></div>
            ) : (
              <>
                {list.map(item => (
                  <div key={item.id} style={{position:"relative",overflow:"hidden",borderRadius:"12px",marginBottom:"0.5rem"}}>
                    <div style={{position:"absolute",inset:0,background:"#e74c3c",display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:"1.25rem",borderRadius:"12px"}}>
                      <span style={{color:"white",fontSize:"1.3rem"}}>🗑</span>
                    </div>
                    <div id={`shop-${item.id}`} className={`shopping-item ${item.checked ? "checked" : ""}`}
                      style={{margin:0,position:"relative",background:"var(--white)",transition:"transform 0.15s ease",borderRadius:"12px"}}
                      onTouchStart={e => handleSwipeStart(e, item.id)}
                      onTouchMove={handleSwipeMove}
                      onTouchEnd={handleSwipeEnd}>
                      <input type="checkbox" checked={item.checked} onChange={() => toggleItem(item.id)} />
                      <span className="shopping-item-name">{getCategoryIcon(item.category)} {item.name}</span>
                      <div style={{display:"flex",alignItems:"center",gap:"0.3rem",flexShrink:0}}>
                        <button onClick={() => changeQty(item.id, -1)} style={{background:"rgba(92,61,46,0.08)",border:"none",borderRadius:"6px",width:"24px",height:"24px",cursor:"pointer",fontSize:"0.9rem",display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                        <span style={{fontSize:"0.85rem",fontWeight:"600",minWidth:"18px",textAlign:"center"}}>{item.quantity || 1}</span>
                        <button onClick={() => changeQty(item.id, 1)} style={{background:"rgba(92,61,46,0.08)",border:"none",borderRadius:"6px",width:"24px",height:"24px",cursor:"pointer",fontSize:"0.9rem",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                      </div>
                    </div>
                  </div>
                ))}
                {list.some(i => i.checked) && (
                  <button className="btn-clear-list" onClick={clearChecked}>🗑 Supprimer les articles cochés</button>
                )}
              </>
            )}
            {undoShop && (
              <div className="toast-undo" style={{position:"relative",bottom:"auto",left:"auto",transform:"none",marginTop:"0.75rem",borderRadius:"12px"}}>
                <span>🗑 {undoShop.name} supprimé</span>
                <button onClick={undoShopDelete}>Annuler</button>
              </div>
            )}
            <div className="modal-footer">
              <button className="btn-cancel" onClick={onClose}>Fermer</button>
              <button className="btn-submit" onClick={() => setShowAddForm(true)}>+ Ajouter</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function HomePage({ user, onOpen, onSignOut }) {
  return (
    <div className="page-home">
      <div className="home-emoji">🧊</div>
      <h1 className="home-title">Tout ce que tu as,<br /><em>au même endroit</em></h1>
      <p className="home-subtitle">Garde toujours un œil<br />sur ce qu'il y a dans ton frigo.</p>
      {user && <p className="home-user">👋 {user.email}</p>}
      <button className="btn-primary" onClick={onOpen}>Ouvrir mon frigo</button>
      <button className="btn-signout" onClick={onSignOut}>Se déconnecter</button>
    </div>
  );
}

function FridgeApp({ user, onBack }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("Tous");
  const [catFilter, setCatFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("expiry");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [expiryFilter, setExpiryFilter] = useState("all");
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [showWasteHistory, setShowWasteHistory] = useState(false);
  const [showBurger, setShowBurger] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]); // eslint-disable-line react-hooks/exhaustive-deps
  const [loadingItems, setLoadingItems] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const [undoItem, setUndoItem] = useState(null);
  const undoTimer = useRef(null);
  const swipeStartX = useRef(0);
  const swipeEl = useRef(null);

  useEffect(() => {
    registerPush();
  }, []);

  useEffect(() => {
    if (items.length > 0) {
      checkExpiringItems(items);
      checkExpiredItems(items);
    }
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchItems();

    // Sync temps réel via Supabase Realtime
    const channel = supabase
      .channel("items-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "items" }, () => {
        fetchItems(true);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchItems = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoadingItems(true);
    const { data } = await supabase.from("items").select("*").order("expiry", { ascending: true });
    if (data) setItems(data);
    if (isRefresh) { setTimeout(() => setRefreshing(false), 400); }
    else setLoadingItems(false);
  };

  const handleTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchMove = (e) => {
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 10 && window.scrollY === 0) e.preventDefault();
  };
  const handleTouchEnd = (e) => {
    const diff = e.changedTouches[0].clientY - touchStartY.current;
    if (diff > 80 && window.scrollY === 0) fetchItems(true);
  };

  useEffect(() => {
    if (!showSortMenu) return;
    const handler = () => setShowSortMenu(false);
    setTimeout(() => document.addEventListener("click", handler), 0);
    return () => document.removeEventListener("click", handler);
  }, [showSortMenu]);

  useEffect(() => {
    if (!showBurger) return;
    const handler = () => setShowBurger(false);
    setTimeout(() => document.addEventListener("click", handler), 0);
    return () => document.removeEventListener("click", handler);
  }, [showBurger]); // eslint-disable-line react-hooks/exhaustive-deps

  const addItem = async (data) => {
    const { data: inserted } = await supabase.from("items").insert([{ ...data, user_id: user.id, id: Date.now() }]).select();
    if (inserted) setItems(prev => [...prev, ...inserted]);
    setShowForm(false);
  };

  const saveEdit = async (data) => {
    const { data: updated } = await supabase.from("items").update(data).eq("id", editingItem.id).select();
    if (updated) setItems(prev => prev.map(i => i.id === editingItem.id ? updated[0] : i));
    setEditingItem(null);
  };

  const increaseQuantity = async (id) => {
    const item = items.find(i => i.id === id);
    const newQty = item.quantity + 1;
    await supabase.from("items").update({ quantity: newQty }).eq("id", id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: newQty } : i));
  };

  const decreaseQuantity = async (id) => {
    const item = items.find(i => i.id === id);
    if (item.quantity <= 1) {
      if (item.reorder) {
        // Save to shopping list in localStorage
        const list = JSON.parse(localStorage.getItem('shoppingList') || '[]');
        if (!list.find(i => i.name === item.name)) {
          list.push({ id: Date.now(), name: item.name, category: item.category, checked: false, quantity: 1 });
          localStorage.setItem('shoppingList', JSON.stringify(list));
        }
      }
      await supabase.from("items").delete().eq("id", id);
      setItems(prev => prev.filter(i => i.id !== id));
    } else {
      const newQty = item.quantity - 1;
      await supabase.from("items").update({ quantity: newQty }).eq("id", id);
      setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: newQty } : i));
    }
  };

  const deleteItem = async (id, withUndo = false) => {
    const item = items.find(i => i.id === id);
    if (withUndo) {
      setItems(prev => prev.filter(i => i.id !== id));
      setUndoItem(item);
      if (undoTimer.current) clearTimeout(undoTimer.current);
      undoTimer.current = setTimeout(async () => {
        await supabase.from("items").delete().eq("id", id);
        if (item.reorder || (item.expiry && daysLeft(item.expiry) < 0)) {
          await supabase.from("waste_history").insert([{ id: Date.now(), user_id: user.id, name: item.name, category: item.category, quantity: item.quantity, unit: item.unit, reason: item.expiry && daysLeft(item.expiry) < 0 ? 'périmé' : 'consommé' }]);
        }
        setUndoItem(null);
      }, 3000);
    } else {
      await supabase.from("items").delete().eq("id", id);
      setItems(prev => prev.filter(i => i.id !== id));
    }
  };

  const undoDelete = () => {
    if (!undoItem) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setItems(prev => [...prev, undoItem]);
    setUndoItem(null);
  };

  const handleSwipeStart = (e, id) => {
    swipeStartX.current = e.touches[0].clientX;
    swipeEl.current = id;
  };

  const handleSwipeMove = (e) => {
    const diff = e.touches[0].clientX - swipeStartX.current;
    if (diff < 0) {
      const el = document.getElementById(`item-${swipeEl.current}`);
      if (el) el.style.transform = `translateX(${Math.max(diff, -100)}px)`;
    }
  };

  const handleSwipeEnd = (e) => {
    const diff = e.changedTouches[0].clientX - swipeStartX.current;
    const el = document.getElementById(`item-${swipeEl.current}`);
    if (diff < -80) {
      if (el) el.style.transform = 'translateX(-100%)';
      setTimeout(() => deleteItem(swipeEl.current, true), 150);
    } else {
      if (el) el.style.transform = 'translateX(0)';
    }
  };

  const soonToExpire = items.filter(i => i.expiry && daysLeft(i.expiry) >= 0 && daysLeft(i.expiry) <= 3);
  const expired = items.filter(i => i.expiry && daysLeft(i.expiry) < 0);
  const locationFiltered = filter === "Tous" ? items : items.filter(i => i.location === filter);
  const presentCats = [...new Set(locationFiltered.map(i => i.category || "autre"))];
  const filteredItems = locationFiltered
    .filter(i => catFilter === "all" || (i.category || "autre") === catFilter)
    .filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    .filter(i => {
      if (expiryFilter === "soon") { const d = i.expiry ? daysLeft(i.expiry) : null; return d !== null && d >= 0 && d <= 3; }
      if (expiryFilter === "expired") { const d = i.expiry ? daysLeft(i.expiry) : null; return d !== null && d < 0; }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "quantity") return b.quantity - a.quantity;
      return new Date(a.expiry || "9999") - new Date(b.expiry || "9999");
    });

  return (
    <div className="page-app" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div className="app-header">
        <h1>Mes réserves</h1>
        <div style={{display:"flex",gap:"0.5rem",alignItems:"center"}}>
          <button className={`btn-refresh ${refreshing ? "spinning" : ""}`} onClick={() => fetchItems(true)} title="Actualiser">🔄</button>
          <div style={{position:"relative"}}>
            <button className="btn-burger" onClick={() => setShowBurger(v => !v)}>
              <span /><span /><span />
            </button>
            {showBurger && (
              <div className="burger-menu">
                <button className="burger-item" onClick={() => { setDarkMode(v => !v); setShowBurger(false); }}>
                  {darkMode ? "☀️" : "🌙"} {darkMode ? "Mode clair" : "Mode sombre"}
                </button>
                <button className="burger-item" onClick={() => { setShowShoppingList(true); setShowBurger(false); }}>
                  🛒 Liste de courses
                </button>
                <button className="burger-item" onClick={() => { setShowWasteHistory(true); setShowBurger(false); }}>
                  📊 Historique gaspillage
                </button>
                <button className="burger-item danger" onClick={() => { setShowBurger(false); onBack(); }}>
                  ← Retour accueil
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {refreshing && <div className="pull-indicator">Actualisation...</div>}

      {items.length > 0 && (
        <div className="stats-row">
          <div className="stat-card" style={{cursor:"pointer"}} onClick={() => setExpiryFilter("all")}>
            <div className="stat-num" style={{color: expiryFilter === "all" ? "var(--terracotta)" : "var(--brown)"}}>{items.length}</div>
            <div className="stat-label">produits</div>
          </div>
          <div className="stat-card" style={{cursor:"pointer"}} onClick={() => setExpiryFilter(expiryFilter === "soon" ? "all" : "soon")}>
            <div className="stat-num" style={{color: soonToExpire.length > 0 ? "#e67e22" : "var(--brown)", textDecoration: expiryFilter === "soon" ? "underline" : "none"}}>{soonToExpire.length}</div>
            <div className="stat-label">bientôt périmés</div>
          </div>
          <div className="stat-card" style={{cursor:"pointer"}} onClick={() => setExpiryFilter(expiryFilter === "expired" ? "all" : "expired")}>
            <div className="stat-num" style={{color: expired.length > 0 ? "#e74c3c" : "var(--brown)", textDecoration: expiryFilter === "expired" ? "underline" : "none"}}>{expired.length}</div>
            <div className="stat-label">expirés</div>
          </div>
        </div>
      )}

      <div className="filters" style={{marginBottom:"0.5rem"}}>
        {["Tous","Frigo","Congélateur","Placard"].map(f => (
          <button key={f} className={`filter-btn ${filter === f ? "active" : ""}`} onClick={() => { setFilter(f); setCatFilter("all"); }}>
            {f === "Frigo" ? "🌡️ " : f === "Congélateur" ? "❄️ " : f === "Placard" ? "🗄️ " : ""}{f}
          </button>
        ))}
      </div>
      <div style={{marginBottom:"0.75rem", position:"relative"}} onClick={e => e.stopPropagation()}>
        <button className={`btn-sort ${showSortMenu ? "open" : ""}`} style={{width:"100%", justifyContent:"center"}} onClick={() => setShowSortMenu(v => !v)}>
          ↕ Tri — {SORT_OPTIONS.find(o => o.id === sortBy)?.label}
        </button>
        {showSortMenu && (
          <div className="sort-menu" style={{width:"100%"}}>
            {SORT_OPTIONS.map(opt => (
              <button key={opt.id} className={`sort-option ${sortBy === opt.id ? "active" : ""}`} onClick={() => { setSortBy(opt.id); setShowSortMenu(false); }}>
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {presentCats.length > 1 && (
        <div className="cat-filter-wrap">
          <button className={`cat-chip ${catFilter === "all" ? "active" : ""}`} onClick={() => setCatFilter("all")}>Tous</button>
          {presentCats.map(catId => { const cat = CATEGORIES.find(c => c.id === catId); if (!cat) return null; return (
            <button key={catId} className={`cat-chip ${catFilter === catId ? "active" : ""}`} onClick={() => setCatFilter(catId)}>{cat.icon} {cat.label}</button>
          );})}
        </div>
      )}

      <div className="search-wrap">
        <span className="search-icon">🔍</span>
        <input className="search-input" type="text" placeholder="Rechercher un produit..." value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button className="search-clear" onClick={() => setSearch("")}>✕</button>}
      </div>

      <div className="add-btn-wrap">
        <button className="btn-add" onClick={() => setShowForm(true)}><span>+</span> Ajouter un produit</button>
      </div>

      {loadingItems ? (
        <div className="empty-state"><div className="empty-icon">⏳</div><p>Chargement...</p></div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🫙</div><p>Rien ici pour l'instant.<br />Ajoute ton premier produit !</p></div>
      ) : (
        <ul className="items-list">
          {filteredItems.map(item => {
            const remaining = item.expiry ? daysLeft(item.expiry) : null;
            const status = item.expiry ? getStatus(remaining) : "fresh";
            return (
              <div key={item.id} className="item-wrapper">
                <div className="item-swipe-bg"><span>🗑</span></div>
                <li id={`item-${item.id}`} className={`item-card ${status}`}
                  onTouchStart={e => handleSwipeStart(e, item.id)}
                  onTouchMove={handleSwipeMove}
                  onTouchEnd={handleSwipeEnd}>
                  <div className="item-dot" />
                  {item.image_url
                    ? <img className="item-img" src={item.image_url} alt={item.name} onError={e => { e.target.style.display="none"; e.target.nextSibling.style.display="block"; }} />
                    : null}
                  <div className="item-cat-icon" style={{display: item.image_url ? "none" : "block"}}>{getCategoryIcon(item.category || "autre")}</div>
                  <div className="item-info">
                    <div className="item-name">{item.name}{item.expiry && <span className="item-badge">{getBadgeLabel(remaining)}</span>}</div>
                    <div className="item-qty">{item.quantity} {item.unit}</div>
                    {item.expiry && <div className="item-meta">Péremption : {formatDate(item.expiry)}</div>}
                  </div>
                  <div className="item-actions">
                    <div className="item-action-row">
                      <span className="item-location">{item.location === "Frigo" ? "🌡️" : item.location === "Congélateur" ? "❄️" : "🗄️"}</span>
                      <button className="btn-edit" onClick={() => setEditingItem(item)}>✏️</button>
                      <button className="btn-delete" onClick={() => deleteItem(item.id, true)}>🗑</button>
                    </div>
                    <div className="qty-controls">
                      <button className="btn-consume" onClick={() => decreaseQuantity(item.id)}>−</button>
                      <span className="qty-value">{item.quantity}</span>
                      <button className="btn-consume" onClick={() => increaseQuantity(item.id)}>+</button>
                    </div>
                  </div>
                </li>
              </div>
            );
          })}
        </ul>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" /><h2>Ajouter un produit</h2>
            <ItemForm initial={defaultForm} onSave={addItem} onCancel={() => setShowForm(false)} title="Ajouter" />
          </div>
        </div>
      )}

      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" /><h2>Modifier le produit</h2>
            <ItemForm initial={editingItem} onSave={saveEdit} onCancel={() => setEditingItem(null)} title="Enregistrer" />
          </div>
        </div>
      )}

      {undoItem && (
        <div className="toast-undo">
          <span>🗑 {undoItem.name} supprimé</span>
          <button onClick={undoDelete}>Annuler</button>
        </div>
      )}

      {showWasteHistory && (
        <WasteHistoryModal user={user} onClose={() => setShowWasteHistory(false)} />
      )}

      {showShoppingList && (
        <ShoppingListModal onClose={() => setShowShoppingList(false)} />
      )}


    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined);
  const [page, setPage] = useState("home");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return <div className="loading">⏳</div>;

  return (
    <>
      <style>{style}</style>
      {!session ? (
        <AuthPage onAuth={setSession} />
      ) : page === "home" ? (
        <HomePage user={session.user} onOpen={() => setPage("fridge")} onSignOut={() => supabase.auth.signOut()} />
      ) : (
        <FridgeApp user={session.user} onBack={() => setPage("home")} />
      )}
    </>
  );
}
