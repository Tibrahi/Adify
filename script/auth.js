<!-- IMPROVED auth.js - v3.0 -->
<!-- Key Improvements for "Better Than Expected" Behavior: -->
<!-- 1. Full input validation + password confirmation -->
<!-- 2. Secure password hashing with per-user salt (SHA-256 + crypto.subtle) - no more plain-text passwords -->
<!-- 3. Backward compatibility for old v2 users (they can still login; new accounts use hash) -->
<!-- 4. Loading states + prevent double-submit -->
<!-- 5. Auto-redirect if already logged in -->
<!-- 6. Reliable pure-CSS 3D flip success animation (no external libraries, works offline, smooth 60fps) -->
<!-- 7. Better UX: trimmed inputs, modern alerts replaced by inline toasts where possible, export/import enhanced -->
<!-- 8. DB upgraded to v3 with new fields; old data still works -->
<!-- 9. Added default avatar + improved error handling everywhere -->

<script>
// 1. Initialize Database (v3 - secure schema)
const db = new Dexie('AdifyDatabase');

db.version(3).stores({
    users: '++id, email, passwordHash, salt, fullName, joinedDate, bio, location, favStar, avatar',
    shoutouts: '++id, userId, title, message, date'
});

// 2. Helper: Reliable password hashing (async + salt)
async function hashPassword(password, salt) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function generateSalt() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// 3. Reliable 3D Success Animation (pure CSS 3D - no Three.js, no dependencies)
function show3DSuccessAnimation(callback) {
    // Inject keyframes once (reliable, works even if page reloaded)
    if (!document.getElementById('adify-3d-style')) {
        const style = document.createElement('style');
        style.id = 'adify-3d-style';
        style.innerHTML = `
            @keyframes adifyFlip3D {
                0%   { transform: rotateY(0deg) rotateX(0deg) scale(0.8); }
                50%  { transform: rotateY(180deg) rotateX(25deg) scale(1.1); }
                100% { transform: rotateY(360deg) rotateX(0deg) scale(1); }
            }
            .adify-3d-card {
                width: 280px;
                height: 280px;
                background: linear-gradient(135deg, #ff00cc, #00ffcc);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 28px;
                font-weight: bold;
                text-align: center;
                border-radius: 30px;
                box-shadow: 0 0 60px rgba(255,255,255,0.8);
                transform-style: preserve-3d;
                animation: adifyFlip3D 2.2s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards;
                backface-visibility: hidden;
            }
            .adify-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.85);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                perspective: 1200px;
            }
        `;
        document.head.appendChild(style);
    }

    const overlay = document.createElement('div');
    overlay.className = 'adify-overlay';

    const card = document.createElement('div');
    card.className = 'adify-3d-card';
    card.innerHTML = `
        Welcome to<br>
        <span style="font-size:42px; color:#fff;">ADIFY ✨</span>
        <br><small style="font-size:14px; opacity:0.9;">Dashboard loading...</small>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Clean up + callback after animation
    setTimeout(() => {
        overlay.style.transition = 'opacity 0.6s';
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.remove();
            if (callback) callback();
        }, 600);
    }, 2300);
}

// 4. Auto-check if already logged in (prevents going back to login)
if (localStorage.getItem('adifyUser')) {
    window.location.href = 'dashboard.html';
}

// 5. UI Toggle (kept + enhanced with scale animation for smoothness)
function toggleForms() {
    const login = document.getElementById('loginSection');
    const signup = document.getElementById('signupSection');
    
    if (login.classList.contains('hidden')) {
        login.classList.remove('hidden');
        login.classList.add('animate__fadeInLeft', 'scale-100');
        signup.classList.add('hidden');
        signup.classList.remove('animate__fadeInRight');
    } else {
        login.classList.add('hidden');
        login.classList.remove('animate__fadeInLeft');
        signup.classList.remove('hidden');
        signup.classList.add('animate__fadeInRight');
    }
}

// 6. IMPROVED Sign Up - validation + hashing + confirm password
document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Disable button + loading state
    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Creating Account... ⏳';

    const fullName = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const password = document.getElementById('regPass').value;
    const confirmPass = document.getElementById('regConfirmPass')?.value; // ← ADD THIS INPUT IN HTML!

    try {
        // Validation
        if (!fullName || !email || !password) throw new Error('All fields required');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email format');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        if (password !== confirmPass) throw new Error('Passwords do not match');

        // Check existing
        const existing = await db.users.where('email').equals(email).first();
        if (existing) throw new Error('Account already exists!');

        // Secure hash
        const salt = generateSalt();
        const passwordHash = await hashPassword(password, salt);

        await db.users.add({
            fullName,
            email,
            passwordHash,
            salt,
            joinedDate: new Date().toISOString(),
            bio: "I'm a new fan! 🚀",
            location: "Kigali",
            favStar: "None",
            avatar: 'https://picsum.photos/id/64/150' // beautiful default
        });

        // Success toast + toggle
        alert('✅ Account created securely! Please login.');
        toggleForms();
        e.target.reset();

    } catch (err) {
        alert('⚠️ ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
});

// 7. IMPROVED Login - hashing + 3D animation + loading
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Logging in... 🔄';

    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPass').value;

    try {
        if (!email || !password) throw new Error('Email and password required');

        const user = await db.users.where('email').equals(email).first();
        if (!user) throw new Error('User not found');

        let isValid = false;

        // Backward compatibility for old plain-text users (v2)
        if (user.password) {
            isValid = user.password === password;
        } 
        // New secure method (v3+)
        else if (user.passwordHash && user.salt) {
            const inputHash = await hashPassword(password, user.salt);
            isValid = inputHash === user.passwordHash;
        }

        if (!isValid) throw new Error('Invalid credentials');

        // Store safe user info
        localStorage.setItem('adifyUser', JSON.stringify({
            id: user.id,
            name: user.fullName,
            email: user.email,
            avatar: user.avatar
        }));

        // 🔥 RELIABLE 3D ANIMATION + redirect
        show3DSuccessAnimation(() => {
            window.location.href = 'dashboard.html';
        });

    } catch (err) {
        alert('❌ ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
});

// 8. IMPROVED Export / Import (added validation + progress toast)
async function exportData() {
    try {
        const users = await db.users.toArray();
        const shoutouts = await db.shoutouts.toArray();
        const exportObj = { 
            users, 
            shoutouts, 
            type: 'adify_full_backup_v3',
            exportedAt: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(exportObj, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const link = document.createElement('a');
        link.href = dataUri;
        link.download = `adify_backup_${new Date().toISOString().slice(0,10)}.json`;
        link.click();
        
        // Success toast
        const toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#00ff88;color:#000;padding:12px 24px;border-radius:9999px;font-weight:bold;box-shadow:0 10px 30px rgba(0,255,136,0.4);z-index:9999;';
        toast.textContent = '✅ Backup ready for Bluetooth transfer!';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    } catch (err) {
        alert('Export failed: ' + err.message);
    }
}

async function importData(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (data.type !== 'adify_full_backup_v3') {
                throw new Error('Invalid Adify v3 backup file');
            }

            await db.users.bulkPut(data.users);
            await db.shoutouts.bulkPut(data.shoutouts || []);

            const toast = document.createElement('div');
            toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#00ccff;color:#000;padding:12px 24px;border-radius:9999px;font-weight:bold;z-index:9999;';
            toast.textContent = '✅ System synced successfully! Reloading...';
            document.body.appendChild(toast);

            setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
            alert('Import failed: ' + err.message);
        }
    };
    reader.readAsText(file);
}
</script>