// IndexedDB wrapper
class AdDatabase {
    constructor() {
        this.dbName = 'AdifyDB';
        this.version = 1;
        this.storeName = 'ads';
        this.db = null;
    }

    async open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
                    store.createIndex('title', 'title', { unique: false });
                    store.createIndex('status', 'status', { unique: false });
                }
            };
        });
    }

    async getAll() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async add(ad) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            // Ensure impressions is number
            ad.impressions = Number(ad.impressions) || 0;
            const request = store.add(ad);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async update(ad) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            ad.impressions = Number(ad.impressions) || 0;
            const request = store.put(ad);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async delete(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(id);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async getById(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(id);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }
}

// App state
const db = new AdDatabase();
let currentView = 'dashboard';
let chartInstance = null;

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    await db.open();
    setupEventListeners();
    await loadView('dashboard');
});

// Setup global listeners
function setupEventListeners() {
    // Sidebar navigation
    document.querySelectorAll('.sidebar-nav li').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            if (view) loadView(view);
        });
    });

    // "View all" link
    document.querySelector('.view-all').addEventListener('click', (e) => {
        e.preventDefault();
        loadView('ads');
    });

    // Search input
    document.getElementById('searchInput').addEventListener('input', (e) => {
        if (currentView === 'ads') {
            filterAdsTable(e.target.value);
        }
    });

    // Add/Edit form submission
    document.getElementById('adForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveAd();
    });
}

// Load a view (dashboard, ads, add)
async function loadView(view) {
    // Update active class in sidebar
    document.querySelectorAll('.sidebar-nav li').forEach(li => {
        li.classList.toggle('active', li.dataset.view === view);
    });

    // Hide all views, show selected
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const viewElement = document.getElementById(view + 'View');
    if (viewElement) {
        viewElement.classList.add('active');
        currentView = view;

        // Load data based on view
        if (view === 'dashboard') {
            await loadDashboard();
        } else if (view === 'ads') {
            await loadAdsList();
            document.getElementById('searchInput').value = ''; // clear search
        } else if (view === 'add') {
            resetForm();
        }
    }
}

// Dashboard
async function loadDashboard() {
    const ads = await db.getAll();
    updateStats(ads);
    updateRecentAds(ads);
    updateChart(ads);
}

function updateStats(ads) {
    const total = ads.length;
    const active = ads.filter(ad => ad.status === 'active').length;
    const pending = ads.filter(ad => ad.status === 'pending').length;
    const totalImpressions = ads.reduce((sum, ad) => sum + (Number(ad.impressions) || 0), 0);

    const statsGrid = document.getElementById('statsGrid');
    statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon"><i class="fas fa-ad"></i></div>
            <div class="stat-details">
                <h3>Total Ads</h3>
                <p>${total}</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
            <div class="stat-details">
                <h3>Active Ads</h3>
                <p>${active}</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon"><i class="fas fa-clock"></i></div>
            <div class="stat-details">
                <h3>Pending</h3>
                <p>${pending}</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon"><i class="fas fa-chart-simple"></i></div>
            <div class="stat-details">
                <h3>Total Impressions</h3>
                <p>${totalImpressions.toLocaleString()}</p>
            </div>
        </div>
    `;
}

function updateRecentAds(ads) {
    const tbody = document.getElementById('recentAdsTableBody');
    const recent = ads.slice(-5).reverse(); // last 5 added
    tbody.innerHTML = recent.map(ad => `
        <tr>
            <td>${escapeHtml(ad.title)}</td>
            <td><span class="status-badge status-${ad.status}">${ad.status}</span></td>
            <td>${Number(ad.impressions).toLocaleString()}</td>
        </tr>
    `).join('');
}

function updateChart(ads) {
    // For demo, we generate last 7 days impressions based on ad data
    // In a real app, you'd have daily data. We'll create a simple mock based on total impressions.
    const ctx = document.getElementById('viewsChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    // Generate some random-ish data based on total impressions
    const totalImp = ads.reduce((sum, ad) => sum + (Number(ad.impressions) || 0), 0);
    const base = Math.max(100, Math.floor(totalImp / 100));
    const data = Array.from({ length: 7 }, (_, i) => Math.floor(base * (0.8 + 0.4 * Math.random())));

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Ad Views',
                data: data,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.3,
                fill: true,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

// Ads List View
async function loadAdsList() {
    const ads = await db.getAll();
    const tbody = document.getElementById('adsTableBody');
    const emptyMsg = document.getElementById('emptyAdsMessage');

    if (ads.length === 0) {
        tbody.innerHTML = '';
        emptyMsg.style.display = 'block';
    } else {
        emptyMsg.style.display = 'none';
        tbody.innerHTML = ads.map(ad => `
            <tr data-id="${ad.id}">
                <td>${escapeHtml(ad.title)}</td>
                <td>${escapeHtml(ad.description || '')}</td>
                <td><span class="status-badge status-${ad.status}">${ad.status}</span></td>
                <td>${Number(ad.impressions).toLocaleString()}</td>
                <td>
                    <i class="fas fa-edit action-icon" onclick="editAd(${ad.id})"></i>
                    <i class="fas fa-trash action-icon delete" onclick="deleteAd(${ad.id})"></i>
                </td>
            </tr>
        `).join('');
    }
}

// Filter ads table by search term
function filterAdsTable(term) {
    const rows = document.querySelectorAll('#adsTableBody tr');
    const lowerTerm = term.toLowerCase();
    rows.forEach(row => {
        const title = row.cells[0]?.textContent.toLowerCase() || '';
        row.style.display = title.includes(lowerTerm) ? '' : 'none';
    });
}

// Add/Edit form
function resetForm() {
    document.getElementById('adId').value = '';
    document.getElementById('title').value = '';
    document.getElementById('description').value = '';
    document.getElementById('status').value = 'active';
    document.getElementById('impressions').value = 0;
    document.getElementById('imageUrl').value = '';
    document.getElementById('formTitle').textContent = 'Add New Advertisement';
}

async function editAd(id) {
    const ad = await db.getById(Number(id));
    if (!ad) return;

    document.getElementById('adId').value = ad.id;
    document.getElementById('title').value = ad.title || '';
    document.getElementById('description').value = ad.description || '';
    document.getElementById('status').value = ad.status || 'active';
    document.getElementById('impressions').value = ad.impressions || 0;
    document.getElementById('imageUrl').value = ad.imageUrl || '';
    document.getElementById('formTitle').textContent = 'Edit Advertisement';

    loadView('add');
}

async function deleteAd(id) {
    if (confirm('Are you sure you want to delete this ad?')) {
        await db.delete(Number(id));
        if (currentView === 'ads') await loadAdsList();
        else if (currentView === 'dashboard') await loadDashboard();
    }
}

async function saveAd() {
    const ad = {
        title: document.getElementById('title').value.trim(),
        description: document.getElementById('description').value.trim(),
        status: document.getElementById('status').value,
        impressions: parseInt(document.getElementById('impressions').value, 10) || 0,
        imageUrl: document.getElementById('imageUrl').value.trim(),
        updatedAt: new Date().toISOString()
    };

    const id = document.getElementById('adId').value;
    if (!ad.title) {
        alert('Title is required');
        return;
    }

    if (id) {
        ad.id = Number(id);
        await db.update(ad);
    } else {
        ad.createdAt = new Date().toISOString();
        await db.add(ad);
    }

    loadView('ads');
}

// Helper to escape HTML
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Make functions global for onclick handlers
window.editAd = editAd;
window.deleteAd = deleteAd;