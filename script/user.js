/* script/user.js - Unified Dashboard Controller */

// 1. Setup Database & Session
const db = new Dexie('AdifyDatabase');
db.version(2).stores({
    users: '++id, email, password, fullName, joinedDate, bio, location, favStar, avatar',
    shoutouts: '++id, userId, title, message, date'
});

const session = JSON.parse(localStorage.getItem('adifyUser'));

// Guard: Redirect if not logged in
if (!session) {
    window.location.href = 'auth.html';
}

// 2. Initialization on Load
document.addEventListener('DOMContentLoaded', () => {
    // Set Header Info
    document.getElementById('dashName').textContent = session.name.split(' ')[0];
    document.getElementById('headerInitials').textContent = session.name.charAt(0).toUpperCase();
    
    // Load Data
    loadDashboardData();
    
    // Pre-fill Profile Form
    loadProfileData();
});

// 3. Tab Switching Logic
function switchTab(tabName) {
    const overview = document.getElementById('view-overview');
    const profile = document.getElementById('view-profile');
    const btnOverview = document.getElementById('nav-overview');
    const btnProfile = document.getElementById('nav-profile');

    if (tabName === 'overview') {
        overview.classList.remove('hidden');
        profile.classList.add('hidden');
        
        // Active Styling
        btnOverview.classList.remove('text-slate-400', 'hover:bg-slate-800');
        btnOverview.classList.add('bg-emerald-700', 'text-white');
        
        btnProfile.classList.add('text-slate-400', 'hover:bg-slate-800');
        btnProfile.classList.remove('bg-emerald-700', 'text-white');
        
        // Reload data to ensure freshness
        loadDashboardData();
        
    } else {
        overview.classList.add('hidden');
        profile.classList.remove('hidden');
        
        // Active Styling
        btnProfile.classList.remove('text-slate-400', 'hover:bg-slate-800');
        btnProfile.classList.add('bg-emerald-700', 'text-white');
        
        btnOverview.classList.add('text-slate-400', 'hover:bg-slate-800');
        btnOverview.classList.remove('bg-emerald-700', 'text-white');
    }
}

// 4. Modal Toggles
function toggleModal(modalId) {
    const el = document.getElementById(modalId);
    if (el.classList.contains('hidden')) {
        el.classList.remove('hidden');
    } else {
        el.classList.add('hidden');
    }
}

// 5. Data Handling: OVERVIEW
async function loadDashboardData() {
    try {
        // Fetch User details for stats
        const user = await db.users.get(session.id);
        if (user) {
            document.getElementById('statStar').textContent = user.favStar || 'Not Set';
        }

        // Fetch User's Shoutouts
        const items = await db.shoutouts.where('userId').equals(session.id).reverse().toArray();
        document.getElementById('statCount').textContent = items.length;

        const listEl = document.getElementById('shoutoutList');
        const emptyEl = document.getElementById('emptyState');
        listEl.innerHTML = '';

        if (items.length === 0) {
            emptyEl.classList.remove('hidden');
        } else {
            emptyEl.classList.add('hidden');
            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'bg-white p-6 rounded-[2rem] shadow-sm hover:shadow-md transition relative group border border-slate-100 animate__animated animate__fadeIn';
                card.innerHTML = `
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex items-center gap-2">
                            <span class="bg-emerald-100 text-emerald-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">Active</span>
                            <span class="text-xs text-slate-300 font-bold">${item.date}</span>
                        </div>
                        <button onclick="deleteShoutout(${item.id})" class="h-8 w-8 flex items-center justify-center rounded-full bg-slate-50 hover:bg-red-50 text-slate-300 hover:text-red-500 transition"><i class="fas fa-trash"></i></button>
                    </div>
                    <h4 class="font-bold text-lg text-slate-800 mb-2 leading-tight">${item.title}</h4>
                    <p class="text-slate-500 text-sm mb-4 line-clamp-2">${item.message}</p>
                    <div class="w-full bg-slate-50 h-1.5 rounded-full overflow-hidden">
                        <div class="bg-emerald-500 w-2/3 h-full rounded-full"></div>
                    </div>
                    <div class="text-[10px] text-slate-400 mt-2 font-bold uppercase text-right">Engagement: High</div>
                `;
                listEl.appendChild(card);
            });
        }
    } catch (err) {
        console.error("Error loading dashboard:", err);
    }
}

// 6. Data Handling: PROFILE
async function loadProfileData() {
    const user = await db.users.get(session.id);
    if (user) {
        document.getElementById('profName').value = user.fullName || '';
        document.getElementById('profLocation').value = user.location || '';
        document.getElementById('profBio').value = user.bio || '';
        document.getElementById('profStar').value = user.favStar || 'Not Selected';
    }
}

// 7. Event Listeners

// ADD SHOUTOUT
document.getElementById('addShoutoutForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('shoutTitle').value;
    const message = document.getElementById('shoutMessage').value;

    try {
        await db.shoutouts.add({
            userId: session.id,
            title: title,
            message: message,
            date: new Date().toLocaleDateString()
        });
        toggleModal('addModal');
        document.getElementById('addShoutoutForm').reset();
        loadDashboardData(); // Refresh View
        alert("Shoutout Posted!");
    } catch (err) {
        alert("Error posting.");
    }
});

// SAVE PROFILE
document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const updates = {
        fullName: document.getElementById('profName').value,
        location: document.getElementById('profLocation').value,
        bio: document.getElementById('profBio').value,
        favStar: document.getElementById('profStar').value
    };

    try {
        await db.users.update(session.id, updates);
        
        // Update Session in localStorage
        const newSession = {...session, name: updates.fullName};
        localStorage.setItem('adifyUser', JSON.stringify(newSession));
        
        // Refresh UI
        document.getElementById('dashName').textContent = updates.fullName.split(' ')[0];
        
        alert("Profile Updated Successfully!");
        switchTab('overview'); // Go back to overview
    } catch (err) {
        alert("Error updating profile.");
    }
});

// DELETE SHOUTOUT
async function deleteShoutout(id) {
    if(confirm("Are you sure you want to delete this ad?")) {
        await db.shoutouts.delete(id);
        loadDashboardData();
    }
}

// LOGOUT
function logout() {
    if(confirm("Log out of Adify?")) {
        localStorage.removeItem('adifyUser');
        window.location.href = 'index.html';
    }
}