/**
 * firebase.js — Dashboard Cloud Sync
 * ════════════════════════════════════
 * Drop this file in the same folder as your HTML pages.
 * Add  <script type="module" src="firebase.js"></script>
 * to each HTML page — that's the only change needed.
 *
 * SETUP:
 *  1. Replace the firebaseConfig below with YOUR project's config
 *     (Firebase console → Project settings → Your apps → SDK snippet)
 *  2. Set USE_AUTH = true if you want Google Sign-In protection
 *  3. Done.
 */

// ─────────────────────────────────────────────────────────────
// ★  PASTE YOUR FIREBASE CONFIG HERE  ★
// ─────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyD4XQMKY2C3ThNPn-RMQEoSyV_-wEwG_30",
    authDomain: "home-68c02.firebaseapp.com",
    projectId: "home-68c02",
    storageBucket: "home-68c02.firebasestorage.app",
    messagingSenderId: "1006697217871",
    appId: "1:1006697217871:web:83841d31eff4d001fd4f3a"
};

// ─────────────────────────────────────────────────────────────
// ★  OPTIONS  ★
// ─────────────────────────────────────────────────────────────

/** Set to true to require Google Sign-In before syncing */
const USE_AUTH = true;

/**
 * Keys that are synced to Firestore.
 * Everything else stays in localStorage only.
 */
const SYNC_KEYS = [
  'tasks',
  'habits',
  'habitLog',
  'plannerEvents',
  'petData',
  'focusStats',
  'focusLog',
  'focusSettings',
  'todayTasksDone',
  'todayHabitsDone',
  'todayFocusDone',
];

/**
 * How long to wait (ms) after a write before pushing to Firestore.
 * Debouncing prevents a flood of writes when many keys change quickly.
 */
const DEBOUNCE_MS = 800;

// ─────────────────────────────────────────────────────────────
// IMPORTS — Firebase CDN (no bundler needed)
// ─────────────────────────────────────────────────────────────
import { initializeApp }
  from 'https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  enableIndexedDbPersistence,
} from 'https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from 'https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js';

// ─────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────
const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

// Enable offline persistence (data survives losing internet)
enableIndexedDbPersistence(db).catch(err => {
  if (err.code === 'failed-precondition') {
    console.warn('[Firebase] Persistence unavailable — multiple tabs open?');
  } else if (err.code === 'unimplemented') {
    console.warn('[Firebase] Persistence not supported in this browser');
  }
});

// ─────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────
let currentUserId = null;   // set after auth (or 'default' if no auth)
let syncEnabled   = false;  // flips true once user is identified
let debounceTimers = {};    // key → timer id

// ─────────────────────────────────────────────────────────────
// FIRESTORE HELPERS
// ─────────────────────────────────────────────────────────────

/** Returns the Firestore document reference for a given localStorage key */
function docRef(key) {
  return doc(db, 'users', currentUserId, key, 'data');
}

/** Push a single key's value from localStorage → Firestore */
async function pushKey(key) {
  if (!syncEnabled) return;
  const value = window._realLocalStorage.getItem(key);
  if (value === null) return;
  try {
    await setDoc(docRef(key), { value });
    console.log(`[Firebase] ↑ saved: ${key}`);
  } catch (e) {
    console.warn(`[Firebase] ↑ failed to save ${key}:`, e.message);
  }
}

/** Pull ALL synced keys from Firestore → localStorage */
async function pullAll() {
  if (!syncEnabled) return;
  console.log('[Firebase] ↓ pulling all data from Firestore...');
  for (const key of SYNC_KEYS) {
    try {
      const snap = await getDoc(docRef(key));
      if (snap.exists()) {
        const { value } = snap.data();
        window._realLocalStorage.setItem(key, value);
        console.log(`[Firebase] ↓ loaded: ${key}`);
      }
    } catch (e) {
      console.warn(`[Firebase] ↓ failed to load ${key}:`, e.message);
    }
  }
  console.log('[Firebase] ↓ pull complete — reloading page data');
  // Fire a custom event so pages can refresh their UI
  window.dispatchEvent(new CustomEvent('firebaseDataLoaded'));
}

/** Subscribe to real-time updates for all synced keys */
function subscribeRealtime() {
  SYNC_KEYS.forEach(key => {
    onSnapshot(docRef(key), snap => {
      if (!snap.exists()) return;
      const { value } = snap.data();
      const local = window._realLocalStorage.getItem(key);
      if (value !== local) {
        window._realLocalStorage.setItem(key, value);
        console.log(`[Firebase] ⟳ realtime update: ${key}`);
        window.dispatchEvent(new CustomEvent('firebaseKeyUpdated', { detail: { key } }));
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────
// LOCALSTORAGE PROXY
// Intercepts every setItem/removeItem call so pages don't need
// to know about Firebase at all.
// ─────────────────────────────────────────────────────────────
function installStorageProxy() {
  // Keep a reference to the real localStorage methods
  window._realLocalStorage = {
    getItem:    key       => localStorage.getItem(key),
    setItem:    (key, val)=> localStorage.setItem(key, val),
    removeItem: key       => localStorage.removeItem(key),
  };

  // Proxy setItem
  const origSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function(key, value) {
    origSetItem.call(this, key, value);  // always write locally first
    if (this === localStorage && SYNC_KEYS.includes(key) && syncEnabled) {
      // Debounce the cloud write
      clearTimeout(debounceTimers[key]);
      debounceTimers[key] = setTimeout(() => pushKey(key), DEBOUNCE_MS);
    }
  };

  // Proxy removeItem
  const origRemoveItem = Storage.prototype.removeItem;
  Storage.prototype.removeItem = function(key) {
    origRemoveItem.call(this, key);
    // Note: we don't delete from Firestore on remove —
    // keeping cloud data is safer for cross-device sync
  };
}

// ─────────────────────────────────────────────────────────────
// AUTH UI
// ─────────────────────────────────────────────────────────────
function showSignInBanner() {
  const banner = document.createElement('div');
  banner.id = 'fb-signin-banner';
  banner.innerHTML = `
    <div style="
      position:fixed; bottom:0; left:0; right:0;
      background:#12121a; border-top:2px solid #7c6af7;
      padding:12px 20px; z-index:9999;
      display:flex; align-items:center; justify-content:space-between;
      font-family:'Press Start 2P',monospace; font-size:7px;
      color:#e8e6ff; gap:16px; flex-wrap:wrap;
    ">
      <span style="color:#7c6af7;">⟳ FIREBASE SYNC</span>
      <span style="color:#6b6890;">Sign in to sync your data across devices</span>
      <div style="display:flex;gap:8px;">
        <button id="fb-signin-btn" style="
          font-family:'Press Start 2P',monospace; font-size:7px;
          background:#7c6af7; color:#fff; border:none;
          padding:8px 14px; cursor:pointer; letter-spacing:0.06em;
          box-shadow:3px 3px 0 #3d2e9e;
        ">SIGN IN WITH GOOGLE</button>
        <button id="fb-skip-btn" style="
          font-family:'Press Start 2P',monospace; font-size:7px;
          background:transparent; color:#6b6890;
          border:2px solid #2a2a3e; padding:8px 10px; cursor:pointer;
        ">SKIP</button>
      </div>
    </div>
  `;
  document.body.appendChild(banner);

  document.getElementById('fb-signin-btn').onclick = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      banner.remove();
    } catch (e) {
      console.error('[Firebase] Sign-in failed:', e.message);
    }
  };
  document.getElementById('fb-skip-btn').onclick = () => {
    banner.remove();
    activateAsGuest();
  };
}

function showSyncIndicator(userId) {
  // Small persistent badge top-right showing sync is active
  const existing = document.getElementById('fb-sync-badge');
  if (existing) return;

  const badge = document.createElement('div');
  badge.id = 'fb-sync-badge';
  badge.title = `Synced as: ${userId}`;
  badge.innerHTML = `
    <div style="
      position:fixed; top:6px; right:10px;
      font-family:'Press Start 2P',monospace; font-size:5px;
      color:#6af7c8; background:#0a1a10;
      border:1px solid #6af7c8; padding:3px 7px;
      z-index:9998; cursor:pointer; letter-spacing:0.06em;
      display:flex; align-items:center; gap:5px;
    " id="fb-badge-inner">
      <span id="fb-sync-dot" style="
        width:5px;height:5px;background:#6af7c8;
        display:inline-block;animation:fb-blink 2s infinite;
      "></span>
      CLOUD SYNC ON
    </div>
    <style>
      @keyframes fb-blink { 0%,90%,100%{opacity:1} 95%{opacity:0} }
    </style>
  `;
  document.body.appendChild(badge);

  document.getElementById('fb-badge-inner').onclick = () => {
    if (confirm('Sign out of cloud sync?')) {
      signOut(auth).then(() => {
        badge.remove();
        syncEnabled = false;
        console.log('[Firebase] Signed out');
      });
    }
  };
}

// ─────────────────────────────────────────────────────────────
// ACTIVATION
// ─────────────────────────────────────────────────────────────
async function activateSync(userId) {
  currentUserId = userId;
  syncEnabled   = true;
  await pullAll();        // load cloud data first
  subscribeRealtime();    // then watch for changes
  showSyncIndicator(userId);
}

function activateAsGuest() {
  // No auth — use a fixed ID so data persists in Firestore
  // without tying it to a Google account
  let guestId = localStorage.getItem('fb_guest_id');
  if (!guestId) {
    guestId = 'guest_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('fb_guest_id', guestId);
  }
  activateSync(guestId);
}

// ─────────────────────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────────────────────
installStorageProxy();

if (USE_AUTH) {
  onAuthStateChanged(auth, user => {
    if (user) {
      console.log('[Firebase] Signed in as:', user.email);
      activateSync(user.uid);
    } else {
      showSignInBanner();
    }
  });
} else {
  // No auth — auto-activate with a stable guest ID
  activateAsGuest();
}

// ─────────────────────────────────────────────────────────────
// PAGE REFRESH ON DATA LOAD
// Each page listens for firebaseDataLoaded and rerenders.
// This is handled automatically below for pages that use the
// standard render() / renderHabits() / renderPetCard() pattern.
// ─────────────────────────────────────────────────────────────
window.addEventListener('firebaseDataLoaded', () => {
  // Try calling the page's own render function
  const renderFns = [
    'render',           // todo.html, planner.html, focus.html
    'renderHabits',     // habits.html
    'renderPetCard',    // pet.html, index.html
    'renderSummary',    // index.html
    'renderHero',       // index.html
  ];
  renderFns.forEach(fn => {
    if (typeof window[fn] === 'function') {
      try { window[fn](); } catch(e) {}
    }
  });
});

window.addEventListener('firebaseKeyUpdated', (e) => {
  const key = e.detail.key;
  // Re-render pages that depend on the updated key
  const keyMap = {
    tasks:          ['render'],
    habits:         ['renderHabits'],
    habitLog:       ['renderHabits'],
    plannerEvents:  ['render', 'renderEvents'],
    petData:        ['render', 'renderPetCard', 'renderHabits'],
    focusStats:     ['renderStats'],
    focusLog:       ['renderLog'],
  };
  (keyMap[key] || []).forEach(fn => {
    if (typeof window[fn] === 'function') {
      try { window[fn](); } catch(e) {}
    }
  });
});

console.log('[Firebase] ✓ firebase.js loaded — sync module ready');
