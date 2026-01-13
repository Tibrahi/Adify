/* script/auth.js - Updated for Dashboard & Shoutouts */

// 1. Initialize Database (Updated Schema)
const db = new Dexie('AdifyDatabase');

// Version 2: Added 'shoutouts' store and extra user fields
db.version(2).stores({
    users: '++id, email, password, fullName, joinedDate, bio, location, favStar, avatar',
    shoutouts: '++id, userId, title, message, date'
});

// 2. UI Toggles (Same as before)
function toggleForms() {
    const login = document.getElementById('loginSection');
    const signup = document.getElementById('signupSection');
    
    if (login.classList.contains('hidden')) {
        login.classList.remove('hidden');
        login.classList.add('animate__fadeInLeft');
        signup.classList.add('hidden');
        signup.classList.remove('animate__fadeInRight');
    } else {
        login.classList.add('hidden');
        login.classList.remove('animate__fadeInLeft');
        signup.classList.remove('hidden');
        signup.classList.add('animate__fadeInRight');
    }
}

// 3. Handle Sign Up
document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPass').value;

    try {
        const existingUser = await db.users.where('email').equals(email).first();
        if (existingUser) {
            alert('User with this email already exists!');
            return;
        }
        await db.users.add({
            fullName, email, password,
            joinedDate: new Date().toISOString(),
            bio: "I'm a new fan!", // Default
            location: "Kigali",
            favStar: "None"
        });
        alert('Account Created! Please Login.');
        toggleForms();
        document.getElementById('signupForm').reset();
    } catch (error) {
        console.error('Signup Error:', error);
        alert('Could not create account.');
    }
});

// 4. Handle Login (Redirects to Dashboard now)
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPass').value;

    try {
        const user = await db.users.where('email').equals(email).first();
        if (user && user.password === password) {
            localStorage.setItem('adifyUser', JSON.stringify({
                id: user.id,
                name: user.fullName,
                email: user.email
            }));
            // REDIRECT TO DASHBOARD
            window.location.href = 'dashboard.html'; 
        } else {
            alert('Invalid credentials');
        }
    } catch (error) {
        console.error('Login Error:', error);
    }
});

// 5. Data Export (Backup Profile & Shoutouts)
async function exportData() {
    try {
        const users = await db.users.toArray();
        const shoutouts = await db.shoutouts.toArray();
        const exportObj = { users, shoutouts, type: 'adify_full_backup' };
        
        const dataStr = JSON.stringify(exportObj);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', `adify_backup_${new Date().getTime()}.json`);
        linkElement.click();
        alert("Backup file ready for Bluetooth transfer!");
    } catch (err) {
        alert("Error exporting data");
    }
}

async function importData(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.type === 'adify_full_backup') {
                await db.users.bulkPut(data.users);
                await db.shoutouts.bulkPut(data.shoutouts);
                alert("System synced successfully!");
                window.location.reload();
            } else {
                alert("Invalid Adify Backup File");
            }
        } catch (err) {
            alert("Error reading file");
        }
    };
    reader.readAsText(file);
}