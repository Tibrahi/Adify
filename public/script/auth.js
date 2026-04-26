/* script/auth.js */
const API = '';  // Same origin — server.js serves static files

// ── Constants ──────────────────────────────────────────────
const INTERESTS = [
  { label: 'Music',              icon: 'fa-music' },
  { label: 'Sports',             icon: 'fa-futbol' },
  { label: 'Comedy',             icon: 'fa-face-grin-beam' },
  { label: 'Art',                icon: 'fa-palette' },
  { label: 'Food & Dining',      icon: 'fa-utensils' },
  { label: 'Technology',         icon: 'fa-microchip' },
  { label: 'Fashion',            icon: 'fa-shirt' },
  { label: 'Film & Cinema',      icon: 'fa-film' },
  { label: 'Dance',              icon: 'fa-person-dancing' },
  { label: 'Night Life',         icon: 'fa-moon' },
  { label: 'Culture & Heritage', icon: 'fa-landmark' },
  { label: 'Business & Networking', icon: 'fa-handshake' },
  { label: 'Fitness & Wellness', icon: 'fa-dumbbell' },
  { label: 'Gaming',             icon: 'fa-gamepad' },
  { label: 'Photography',        icon: 'fa-camera' }
];

let selectedInterests = [];
let favoriteArtists   = [];

// ── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Redirect if already logged in
  const token = localStorage.getItem('adifyToken');
  if (token) {
    window.location.href = 'dashboard.html';
    return;
  }

  // Render interest tags
  const grid = document.getElementById('interestGrid');
  if (grid) {
    INTERESTS.forEach(({ label, icon }) => {
      const tag = document.createElement('span');
      tag.className = 'interest-tag';
      tag.dataset.value = label;
      tag.innerHTML = `<i class="fas ${icon}"></i> ${label}`;
      tag.addEventListener('click', () => toggleInterest(tag, label));
      grid.appendChild(tag);
    });
  }
});

// ── View Switching ─────────────────────────────────────────
function showLogin() {
  hide('regStep1'); hide('regStep2'); hide('regStep3');
  show('loginSection');
  document.getElementById('panelTitle').textContent = 'Welcome Back';
  document.getElementById('panelDesc').textContent  = 'Sign in and discover what\'s happening in Rwanda today.';
}

function showRegister() {
  hide('loginSection');
  nextStep(1);
  document.getElementById('panelTitle').textContent = 'Join the Community';
  document.getElementById('panelDesc').textContent  = 'Create your profile and start connecting with people who share your passion.';
}

function hide(id) { const el = document.getElementById(id); if (el) { el.classList.remove('active'); } }
function show(id) { const el = document.getElementById(id); if (el) { el.classList.add('active'); } }

function nextStep(step) {
  hide('regStep1'); hide('regStep2'); hide('regStep3'); hide('loginSection');
  if (step === 1) {
    show('regStep1');
  } else if (step === 2) {
    // Validate step 1
    const name  = val('regName');
    const email = val('regEmail');
    const pass  = val('regPass');
    const conf  = val('regPassConfirm');
    if (!name || !email || !pass || !conf) {
      return showAlert('reg1Alert', 'Please fill in all required fields.', 'error');
    }
    if (!isValidEmail(email)) return showAlert('reg1Alert', 'Please enter a valid email address.', 'error');
    if (pass.length < 6) return showAlert('reg1Alert', 'Password must be at least 6 characters.', 'error');
    if (pass !== conf) return showAlert('reg1Alert', 'Passwords do not match.', 'error');
    show('regStep2');
  } else if (step === 3) {
    show('regStep3');
  }
}

// ── Interest Tags ──────────────────────────────────────────
function toggleInterest(el, label) {
  const idx = selectedInterests.indexOf(label);
  if (idx > -1) {
    selectedInterests.splice(idx, 1);
    el.classList.remove('selected');
  } else {
    selectedInterests.push(label);
    el.classList.add('selected');
  }
}

// ── Artist Chips ───────────────────────────────────────────
function addArtist() {
  const input = document.getElementById('artistInput');
  const name  = input.value.trim();
  if (!name || favoriteArtists.includes(name)) { input.value = ''; return; }
  favoriteArtists.push(name);
  renderArtistChips();
  input.value = '';
}

function removeArtist(name) {
  favoriteArtists = favoriteArtists.filter(a => a !== name);
  renderArtistChips();
}

function renderArtistChips() {
  const container = document.getElementById('artistChips');
  if (!container) return;
  container.innerHTML = favoriteArtists.map(a => `
    <span class="chip">
      ${a}
      <span class="chip-remove" onclick="removeArtist('${a}')"><i class="fas fa-times"></i></span>
    </span>
  `).join('');
}

// ── Login ──────────────────────────────────────────────────
async function handleLogin() {
  const email    = val('loginEmail');
  const password = val('loginPass');
  if (!email || !password) return showAlert('loginAlert', 'Email and password are required.', 'error');

  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    storeSession(data.token, data.user);
    window.location.href = 'dashboard.html';
  } catch (err) {
    showAlert('loginAlert', err.message || 'Login failed. Please try again.', 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt" style="margin-right:0.4rem"></i> Sign In';
  }
}

// ── Register ───────────────────────────────────────────────
async function handleRegister() {
  if (selectedInterests.length === 0) {
    return showAlert('reg3Alert', 'Please select at least one interest.', 'error');
  }

  const btn = document.getElementById('registerBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';

  const payload = {
    fullName:            val('regName'),
    email:               val('regEmail'),
    password:            val('regPass'),
    age:                 val('regAge') ? parseInt(val('regAge')) : undefined,
    gender:              val('regGender'),
    location:            val('regLocation'),
    occupation:          val('regOccupation'),
    phone:               val('regPhone'),
    bio:                 val('regBio'),
    interests:           selectedInterests,
    favoriteArtists:     favoriteArtists,
    preferredEventTypes: selectedInterests
  };

  try {
    const res = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    storeSession(data.token, data.user);
    window.location.href = 'dashboard.html';
  } catch (err) {
    showAlert('reg3Alert', err.message || 'Registration failed. Please try again.', 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-rocket" style="margin-right:0.4rem"></i> Join Adify';
  }
}

// ── Helpers ────────────────────────────────────────────────
function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function storeSession(token, user) {
  localStorage.setItem('adifyToken', token);
  localStorage.setItem('adifyUser', JSON.stringify(user));
}

function showAlert(containerId, message, type = 'error') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  setTimeout(() => { el.innerHTML = ''; }, 5000);
}

// Handle Enter key on login
document.addEventListener('DOMContentLoaded', () => {
  const loginPass = document.getElementById('loginPass');
  if (loginPass) loginPass.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
  const loginEmail = document.getElementById('loginEmail');
  if (loginEmail) loginEmail.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
});