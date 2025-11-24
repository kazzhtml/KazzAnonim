// KazzAnonim Message System
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔥 Message system loaded');
    
    // Get target username from URL
    const targetUsername = getUsernameFromURL();
    
    if (targetUsername) {
        loadTargetUser(targetUsername);
        setupMessageForm(targetUsername);
        checkSpamStatus();
    } else {
        showError('Username tidak valid');
    }
    
    // Character counter
    const messageText = document.getElementById('messageText');
    if (messageText) {
        messageText.addEventListener('input', updateCharCount);
    }
});

// === GET USERNAME FROM URL ===
function getUsernameFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('user');
    
    if (username) {
        return username;
    }
    
    // Fallback for testing - bisa diganti dengan username yang mau di-test
    return 'testuser';
}

// === LOAD TARGET USER ===
async function loadTargetUser(username) {
    try {
        const targetElement = document.querySelector('.username-placeholder');
        if (targetElement) {
            targetElement.textContent = `@${username}`;
        }
        
        // Load user profile info
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('username, avatar_url, bio')
            .eq('username', username)
            .single();
        
        if (error) throw error;
        
        // Update page title
        document.title = `Kirim Pesan ke ${username} - KazzAnonim☯︎`;
        
        console.log('Target user loaded:', profile);
        
    } catch (error) {
        console.error('Error loading target user:', error);
        showError('User tidak ditemukan');
    }
}

// === MESSAGE FORM ===
function setupMessageForm(username) {
    const form = document.getElementById('messageForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleSendMessage(username);
        });
    }
}

async function handleSendMessage(targetUsername) {
    const messageText = document.getElementById('messageText').value.trim();
    
    // Validation
    if (!messageText) {
        showError('Pesan tidak boleh kosong');
        return;
    }
    
    if (messageText.length > 1000) {
        showError('Pesan maksimal 1000 karakter');
        return;
    }
    
    // Check spam
    if (await checkIfSpammed()) {
        showSpamWarning();
        return;
    }
    
    // Loading state
    const submitBtn = document.querySelector('.message-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '⏳ Mengirim...';
    submitBtn.disabled = true;
    
    try {
        // Get target user's links
        const { data: targetProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', targetUsername)
            .single();
        
        if (profileError) throw new Error('User tidak ditemukan');
        
        // Get user's active links
        const { data: userLinks, error: linksError } = await supabase
            .from('anonymous_links')
            .select('id')
            .eq('user_id', targetProfile.id)
            .eq('is_active', true)
            .limit(1);
        
        if (linksError || !userLinks.length) {
            throw new Error('User tidak memiliki link aktif');
        }
        
        // Get sender IP (simplified)
        const senderIp = await getSenderIP();
        
        // Save message
        const { data: message, error: messageError } = await supabase
            .from('anonymous_messages')
            .insert([
                {
                    link_id: userLinks[0].id,
                    message_text: messageText,
                    sender_ip: senderIp,
                    created_at: new Date(),
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
                }
            ])
            .select()
            .single();
        
        if (messageError) throw messageError;
        
        // Record spam prevention
        recordMessageSent(senderIp);
        
        // Show success
        showSuccess();
        
    } catch (error) {
        console.error('Error sending message:', error);
        showError(`Gagal mengirim pesan: ${error.message}`);
    } finally {
        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// === SPAM PREVENTION ===
async function checkIfSpammed() {
    const senderIp = await getSenderIP();
    const lastMessageTime = localStorage.getItem(`last_message_${senderIp}`);
    
    if (!lastMessageTime) return false;
    
    const timeDiff = Date.now() - parseInt(lastMessageTime);
    const fiveMinutes = 5 * 60 * 1000;
    
    return timeDiff < fiveMinutes;
}

function recordMessageSent(senderIp) {
    localStorage.setItem(`last_message_${senderIp}`, Date.now().toString());
}

async function checkSpamStatus() {
    if (await checkIfSpammed()) {
        showSpamWarning();
    }
}

function showSpamWarning() {
    const warningElement = document.getElementById('spamWarning');
    const waitTimeElement = document.getElementById('waitTime');
    const messageForm = document.getElementById('messageForm');
    const messageBtn = document.querySelector('.message-btn');
    
    if (warningElement && waitTimeElement) {
        const lastMessageTime = localStorage.getItem(`last_message_${await getSenderIP()}`);
        const timeDiff = Date.now() - parseInt(lastMessageTime);
        const fiveMinutes = 5 * 60 * 1000;
        const minutesLeft = Math.ceil((fiveMinutes - timeDiff) / (60 * 1000));
        
        waitTimeElement.textContent = minutesLeft;
        warningElement.style.display = 'block';
        
        // Disable form
        if (messageForm) messageForm.style.opacity = '0.5';
        if (messageBtn) messageBtn.disabled = true;
        
        // Auto-enable after time expires
        setTimeout(() => {
            warningElement.style.display = 'none';
            if (messageForm) messageForm.style.opacity = '1';
            if (messageBtn) messageBtn.disabled = false;
        }, fiveMinutes - timeDiff);
    }
}

// === IP DETECTION (Simplified) ===
async function getSenderIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        return `user_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// === SUCCESS HANDLING ===
function showSuccess() {
    const form = document.getElementById('messageForm');
    const success = document.getElementById('successMessage');
    
    if (form && success) {
        form.style.display = 'none';
        success.style.display = 'block';
    }
}

function sendAnother() {
    const form = document.getElementById('messageForm');
    const success = document.getElementById('successMessage');
    
    if (form && success) {
        form.style.display = 'block';
        success.style.display = 'none';
        form.reset();
        updateCharCount();
    }
}

function goHome() {
    window.location.href = '../index.html';
}

function createAccount() {
    window.location.href = '../auth/register.html';
}

// === UTILITY FUNCTIONS ===
function updateCharCount() {
    const messageText = document.getElementById('messageText');
    const charCount = document.getElementById('charCount');
    
    if (messageText && charCount) {
        const count = messageText.value.length;
        charCount.textContent = count;
        
        if (count > 900) {
            charCount.style.color = '#ff6b6b';
        } else if (count > 800) {
            charCount.style.color = '#ffd700';
        } else {
            charCount.style.color = '#ccc';
        }
    }
}

function showError(message) {
    showNotification(message, 'error');
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