/* Adify Auth Logic 
    Uses Dexie.js for IndexedDB & File API for Transfer 
*/

// 1. Initialize Database
const db = new Dexie('AdifyDatabase');
db.version(1).stores({
    users: '++id, email, password, fullName, joinedDate' // Primary key and indexed props
});

// 2. UI Toggles
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
    const password = document.getElementById('regPass').value; // In real prod, hash this!

    try {
        // Check if exists
        const existingUser = await db.users.where('email').equals(email).first();
        if (existingUser) {
            alert('User with this email already exists!');
            return;
        }

        // Add to IndexedDB
        await db.users.add({
            fullName,
            email,
            password,
            joinedDate: new Date().toISOString()
        });

        alert('Account Created! Please Login.');
        toggleForms();
        document.getElementById('signupForm').reset();

    } catch (error) {
        console.error('Signup Error:', error);
        alert('Could not create account.');
    }
});

// 4. Handle Login
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPass').value;

    try {
        const user = await db.users.where('email').equals(email).first();

        if (user && user.password === password) {
            // Set Session (Simple LocalStorage for session)
            localStorage.setItem('adifyUser', JSON.stringify({
                name: user.fullName,
                email: user.email,
                id: user.id
            }));
            
            // Redirect to home
            window.location.href = 'index.html';
        } else {
            alert('Invalid credentials');
        }
    } catch (error) {
        console.error('Login Error:', error);
    }
});

// 5. Data Transfer System (Bluetooth/Share Simulation)
// Since Browsers can't direct-bluetooth JSON, we export a file 
// that the user sends via Bluetooth/WhatsApp, then imports on the other device.

async function exportData() {
    try {
        const allUsers = await db.users.toArray();
        const dataStr = JSON.stringify(allUsers);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `adify_backup_${new Date().toISOString().slice(0,10)}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        alert("Backup file created! \n\nYou can now share this file via Bluetooth or WhatsApp to another device.");
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
            if (Array.isArray(data)) {
                // Clear existing or merge? Let's merge/overwrite based on email
                await db.users.bulkPut(data);
                alert("Data imported successfully! You can now log in.");
                window.location.reload();
            } else {
                alert("Invalid file format");
            }
        } catch (err) {
            alert("Error reading file: " + err);
        }
    };
    reader.readAsText(file);
}