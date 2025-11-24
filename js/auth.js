// KazzAnonim Authentication System - TANPA EMAIL
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔥 Auth system loaded');
    
    // Check if user is already logged in
    checkAuthStatus();
    
    // Register Form Handler
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Login Form Handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        checkLoginAttempts();
    }
});

// === REGISTER FUNCTION ===
async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validasi
    if (!validateRegister(username, password, confirmPassword)) {
        return;
    }
    
    // Loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '⏳ Membuat akun...';
    submitBtn.disabled = true;
    
    try {
        // Register user dengan CUSTOM AUTH (tanpa email)
        const userData = await window.KazzAuth.register(username, password);
        
        // Auto login setelah register
        localStorage.setItem('kazzanonim_user', JSON.stringify({
            id: userData.id,
            username: userData.username,
            loggedIn: true
        }));
        
        // Success
        showNotification('✅ Akun berhasil dibuat! Mengarahkan ke dashboard...', 'success');
        setTimeout(() => {
            window.location.href = '../dashboard/index.html';
        }, 2000);
        
    } catch (error) {
        console.error('Register error:', error);
        showNotification(`❌ Error: ${error.message}`, 'error');
    } finally {
        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// === LOGIN FUNCTION ===
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    // Validasi
    if (!username || !password) {
        showNotification('❌ Username dan password harus diisi', 'error');
        return;
    }
    
    // Check if user is blocked
    const isBlocked = await checkIfBlocked(username);
    if (isBlocked) {
        showBlockedMessage(isBlocked);
        return;
    }
    
    // Loading state
    const submitBtn = document.getElementById('loginBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '⏳ Memverifikasi...';
    submitBtn.disabled = true;
    
    try {
        // Login dengan CUSTOM AUTH (tanpa email)
        const userData = await window.KazzAuth.login(username, password);
        
        // Reset attempts on successful login
        await recordLoginAttempt(username, true);
        
        // Save session
        localStorage.setItem('kazzanonim_user', JSON.stringify({
            id: userData.id,
            username: userData.username,
            loggedIn: true
        }));
        
        // Redirect to dashboard
        showNotification('✅ Login berhasil!', 'success');
        setTimeout(() => {
            window.location.href = '../dashboard/index.html';
        }, 1500);
        
    } catch (error) {
        console.error('Login error:', error);
        
        // Login failed - increment attempt counter
        await recordLoginAttempt(username, false);
        showNotification(`❌ Login gagal: ${error.message}`, 'error');
        
        // Update attempt counter display
        await checkLoginAttempts();
    } finally {
        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// === VALIDATION FUNCTIONS ===
function validateRegister(username, password, confirmPassword) {
    let isValid = true;
    
    // Reset errors
    clearErrors();
    
    // Username validation
    if (username.length < 3) {
        showError('usernameError', 'Username minimal 3 karakter');
        isValid = false;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        showError('usernameError', 'Hanya boleh huruf, angka, dan underscore');
        isValid = false;
    }
    
    // Password validation
    if (password.length < 6) {
        showError('passwordError', 'Password minimal 6 karakter');
        isValid = false;
    }
    
    // Confirm password
    if (password !== confirmPassword) {
        showError('confirmPasswordError', 'Password tidak cocok');
        isValid = false;
    }
    
    return isValid;
}

// === LOGIN ATTEMPTS SYSTEM ===
async function checkIfBlocked(username) {
    const { data, error } = await supabase
        .from('login_attempts')
        .select('*')
        .eq('username', username)
        .single();
    
    if (error || !data) return false;
    
    // Check if blocked_until is in the future
    if (data.blocked_until && new Date(data.blocked_until) > new Date()) {
        return data.blocked_until;
    }
    
    return false;
}

async function recordLoginAttempt(username, isSuccess) {
    if (isSuccess) {
        // Reset attempts on successful login
        await supabase
            .from('login_attempts')
            .delete()
            .eq('username', username);
        return;
    }
    
    // Get current attempt data
    const { data: existing } = await supabase
        .from('login_attempts')
        .select('*')
        .eq('username', username)
        .single();
    
    const attemptCount = existing ? existing.attempt_count + 1 : 1;
    const blockedUntil = attemptCount >= 3 ? new Date(Date.now() + 60 * 60 * 1000) : null;
    
    if (existing) {
        // Update existing record
        await supabase
            .from('login_attempts')
            .update({
                attempt_count: attemptCount,
                last_attempt: new Date(),
                blocked_until: blockedUntil
            })
            .eq('username', username);
    } else {
        // Create new record
        await supabase
            .from('login_attempts')
            .insert([
                {
                    username: username,
                    attempt_count: attemptCount,
                    last_attempt: new Date(),
                    blocked_until: blockedUntil
                }
            ]);
    }
}

async function checkLoginAttempts() {
    const username = document.getElementById('loginUsername')?.value;
    if (!username) return;
    
    const { data } = await supabase
        .from('login_attempts')
        .select('*')
        .eq('username', username)
        .single();
    
    if (data) {
        const warningElement = document.getElementById('loginWarning');
        const attemptCountElement = document.getElementById('attemptCount');
        
        if (warningElement && attemptCountElement) {
            warningElement.style.display = 'block';
            attemptCountElement.textContent = data.attempt_count;
        }
        
        // Check if blocked
        if (data.blocked_until && new Date(data.blocked_until) > new Date()) {
            showBlockedMessage(data.blocked_until);
        }
    }
}

function showBlockedMessage(blockedUntil) {
    const blockedElement = document.getElementById('blockedMessage');
    const blockTimeElement = document.getElementById('blockTime');
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    
    if (blockedElement && blockTimeElement) {
        const minutesLeft = Math.ceil((new Date(blockedUntil) - new Date()) / (60 * 1000));
        blockTimeElement.textContent = minutesLeft;
        blockedElement.style.display = 'block';
        
        // Disable form
        if (loginForm) loginForm.style.opacity = '0.5';
        if (loginBtn) loginBtn.disabled = true;
    }
}

// === HELPER FUNCTIONS ===
function checkAuthStatus() {
    const userData = window.KazzAuth.checkAuth();
    if (userData && userData.loggedIn) {
        if (!window.location.pathname.includes('/dashboard/')) {
            window.location.href = '../dashboard/index.html';
        }
    }
}

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
}

function clearErrors() {
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(element => {
        element.style.display = 'none';
    });
}

function showNotification(message, type) {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 10px;
        color: white;
        font-weight: bold;
        z-index: 9999;
        animation: slideIn 0.5s ease;
        ${type === 'success' ? 'background: #25D366;' : 'background: #ff4444;'}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 4000);
}