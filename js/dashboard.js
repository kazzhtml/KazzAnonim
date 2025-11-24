// KazzAnonim Dashboard System - FIXED FOR SPCK
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔥 Dashboard system loaded');
    
    // Check authentication
    checkDashboardAuth();
    
    // Load dashboard data based on current page
    const currentPage = window.location.pathname;
    
    if (currentPage.includes('index.html') || currentPage.endsWith('/dashboard/')) {
        loadDashboardData();
    } else if (currentPage.includes('create-link.html')) {
        setupCreateLinkForm();
    } else if (currentPage.includes('profile.html')) {
        loadProfileData();
    }
});

// === AUTH CHECK ===
function checkDashboardAuth() {
    const userData = localStorage.getItem('kazzanonim_user');
    if (!userData) {
        window.location.href = '../auth/login.html';
        return;
    }
    
    const user = JSON.parse(userData);
    
    // Update welcome message
    const welcomeElement = document.getElementById('welcomeUser');
    if (welcomeElement) {
        welcomeElement.textContent = `Welcome, ${user.username}!`;
    }
    
    // Update profile form
    const usernameInput = document.getElementById('profileUsername');
    if (usernameInput) {
        usernameInput.value = user.username;
        usernameInput.disabled = true;
    }
}

// === DASHBOARD DATA ===
async function loadDashboardData() {
    try {
        const userData = JSON.parse(localStorage.getItem('kazzanonim_user'));
        const supabase = window.getSupabase();
        
        if (!supabase) {
            throw new Error('Database connection not ready');
        }
        
        // Load user's links
        const { data: links, error: linksError } = await supabase
            .from('anonymous_links')
            .select('*')
            .eq('user_id', userData.id)
            .order('created_at', { ascending: false });
        
        if (linksError) throw linksError;
        
        // Load messages count
        let totalMessages = 0;
        let activeMessages = 0;
        
        if (links.length > 0) {
            const { data: messages, error: messagesError } = await supabase
                .from('anonymous_messages')
                .select('*')
                .in('link_id', links.map(link => link.id))
                .gt('expires_at', new Date());
            
            if (!messagesError) {
                totalMessages = messages.length;
                activeMessages = messages.length;
            }
        }
        
        // Update stats
        updateStats(links.length, totalMessages, activeMessages);
        
        // Display links
        displayLinks(links);
        
        // Load recent messages preview
        if (links.length > 0) {
            loadRecentMessages(links.map(link => link.id));
        }
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('❌ Gagal memuat data dashboard', 'error');
    }
}

function updateStats(totalLinks, totalMessages, activeMessages) {
    const linksElement = document.getElementById('totalLinks');
    const messagesElement = document.getElementById('totalMessages');
    const activeElement = document.getElementById('activeMessages');
    
    if (linksElement) linksElement.textContent = totalLinks;
    if (messagesElement) messagesElement.textContent = totalMessages;
    if (activeElement) activeElement.textContent = activeMessages;
}

function displayLinks(links) {
    const linksContainer = document.getElementById('linksList');
    if (!linksContainer) return;
    
    if (links.length === 0) {
        linksContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎯</div>
                <h3>Belum ada link</h3>
                <p>Buat link pertama Anda untuk mulai menerima pesan anonymous</p>
                <button class="btn btn-primary" onclick="goToCreateLink()">Buat Link Pertama</button>
            </div>
        `;
        return;
    }
    
    linksContainer.innerHTML = links.map(link => `
        <div class="link-item">
            <div class="link-info">
                <h4>${link.title || 'Untitled Link'}</h4>
                <p class="link-url">kazzanonim.vercel.app/m/${link.unique_slug}</p>
                <small>Dibuat: ${new Date(link.created_at).toLocaleDateString('id-ID')}</small>
            </div>
            <div class="link-actions">
                <button class="btn btn-small" onclick="copyLink('${link.unique_slug}')">📋 Copy</button>
                <button class="btn btn-small btn-secondary" onclick="viewLinkMessages('${link.id}')">📨 Pesan</button>
            </div>
        </div>
    `).join('');
}

// === CREATE LINK ===
function setupCreateLinkForm() {
    const form = document.getElementById('createLinkForm');
    if (form) {
        form.addEventListener('submit', handleCreateLink);
    }
}

async function handleCreateLink(e) {
    e.preventDefault();
    
    const title = document.getElementById('linkTitle').value;
    const customSlug = document.getElementById('customSlug').value;
    const photo = document.getElementById('linkPhoto').value;
    
    const userData = JSON.parse(localStorage.getItem('kazzanonim_user'));
    
    // Generate unique slug
    const uniqueSlug = customSlug || generateRandomSlug();
    
    // Loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '⏳ Membuat link...';
    submitBtn.disabled = true;
    
    try {
        // Get supabase client
        const supabase = window.getSupabase();
        if (!supabase) {
            throw new Error('Database connection not ready');
        }
        
        const { data, error } = await supabase
            .from('anonymous_links')
            .insert([
                {
                    user_id: userData.id,
                    unique_slug: uniqueSlug,
                    title: title,
                    custom_photo: photo || null,
                    created_at: new Date()
                }
            ])
            .select()
            .single();
        
        if (error) throw error;
        
        // Show success preview
        showLinkPreview(uniqueSlug);
        
    } catch (error) {
        console.error('Error creating link:', error);
        showNotification(`❌ Gagal membuat link: ${error.message}`, 'error');
    } finally {
        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function generateRandomSlug() {
    return `link-${Math.random().toString(36).substr(2, 8)}`;
}

function showLinkPreview(slug) {
    const form = document.getElementById('createLinkForm');
    const preview = document.getElementById('linkPreview');
    const linkInput = document.getElementById('generatedLink');
    
    if (form && preview && linkInput) {
        form.style.display = 'none';
        preview.style.display = 'block';
        linkInput.value = `https://kazzanonim.vercel.app/m/${slug}`;
    }
}

// === PROFILE ===
async function loadProfileData() {
    try {
        const userData = JSON.parse(localStorage.getItem('kazzanonim_user'));
        const supabase = window.getSupabase();
        
        if (!supabase) {
            throw new Error('Database connection not ready');
        }
        
        // Load profile data
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userData.id)
            .single();
        
        if (profileError) throw profileError;
        
        // Update profile form
        document.getElementById('profileBio').value = profile.bio || '';
        document.getElementById('profileAvatar').value = profile.avatar_url || '';
        document.getElementById('userId').textContent = userData.id;
        document.getElementById('joinDate').textContent = new Date(profile.created_at).toLocaleDateString('id-ID');
        
        // Load user stats
        const { data: links } = await supabase
            .from('anonymous_links')
            .select('id')
            .eq('user_id', userData.id);
        
        let totalMessages = 0;
        if (links && links.length > 0) {
            const { data: messages } = await supabase
                .from('anonymous_messages')
                .select('id')
                .in('link_id', links.map(link => link.id));
            totalMessages = messages ? messages.length : 0;
        }
        
        document.getElementById('profileTotalLinks').textContent = links ? links.length : 0;
        document.getElementById('profileTotalMessages').textContent = totalMessages;
        
        // Setup profile form handler
        const form = document.getElementById('profileForm');
        if (form) {
            form.addEventListener('submit', handleProfileUpdate);
        }
        
    } catch (error) {
        console.error('Error loading profile:', error);
        showNotification('❌ Gagal memuat data profil', 'error');
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const bio = document.getElementById('profileBio').value;
    const avatar = document.getElementById('profileAvatar').value;
    const userData = JSON.parse(localStorage.getItem('kazzanonim_user'));
    
    // Loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '⏳ Menyimpan...';
    submitBtn.disabled = true;
    
    try {
        const supabase = window.getSupabase();
        if (!supabase) {
            throw new Error('Database connection not ready');
        }
        
        const { error } = await supabase
            .from('profiles')
            .update({
                bio: bio,
                avatar_url: avatar
            })
            .eq('id', userData.id);
        
        if (error) throw error;
        
        showNotification('✅ Profil berhasil diperbarui!', 'success');
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification(`❌ Gagal update profil: ${error.message}`, 'error');
    } finally {
        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// === MESSAGES SYSTEM ===
async function viewMessages() {
    try {
        const userData = JSON.parse(localStorage.getItem('kazzanonim_user'));
        const supabase = window.getSupabase();
        
        if (!supabase) {
            throw new Error('Database connection not ready');
        }
        
        // Load user's links
        const { data: links, error: linksError } = await supabase
            .from('anonymous_links')
            .select('*')
            .eq('user_id', userData.id)
            .order('created_at', { ascending: false });
        
        if (linksError) throw linksError;
        
        if (links.length === 0) {
            showNotification('🎯 Buat link dulu untuk menerima pesan', 'info');
            return;
        }
        
        // Show messages modal
        showMessagesModal(links);
        
    } catch (error) {
        console.error('Error loading messages:', error);
        showNotification('❌ Gagal memuat pesan', 'error');
    }
}

function showMessagesModal(links) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>📨 Pesan Masuk Anda</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="messages-tabs">
                    ${links.map(link => `
                        <button class="tab-btn" onclick="loadLinkMessages('${link.id}', this)">
                            ${link.title || 'Untitled Link'}
                        </button>
                    `).join('')}
                </div>
                <div id="messagesContainer" class="messages-container">
                    <div class="loading">Pilih link untuk melihat pesan...</div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Load messages for first link
    if (links.length > 0) {
        setTimeout(() => {
            loadLinkMessages(links[0].id);
        }, 100);
    }
}

async function loadLinkMessages(linkId, button = null) {
    // Update active tab
    if (button) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    }
    
    const container = document.getElementById('messagesContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Memuat pesan...</div>';
    
    try {
        const supabase = window.getSupabase();
        if (!supabase) {
            throw new Error('Database connection not ready');
        }
        
        const { data: messages, error } = await supabase
            .from('anonymous_messages')
            .select('*')
            .eq('link_id', linkId)
            .gt('expires_at', new Date())
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (messages.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💌</div>
                    <h4>Belum ada pesan</h4>
                    <p>Share link Anda untuk mulai menerima pesan anonymous</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = messages.map(msg => `
            <div class="message-item">
                <div class="message-content">
                    <p>${msg.message_text}</p>
                    <div class="message-meta">
                        <span class="message-time">${formatMessageTime(msg.created_at)}</span>
                        <span class="message-expires">⏰ Hilang: ${formatMessageTime(msg.expires_at)}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading link messages:', error);
        container.innerHTML = '<div class="error">❌ Gagal memuat pesan</div>';
    }
}

async function viewLinkMessages(linkId) {
    try {
        const supabase = window.getSupabase();
        if (!supabase) {
            throw new Error('Database connection not ready');
        }
        
        const { data: messages, error } = await supabase
            .from('anonymous_messages')
            .select('*')
            .eq('link_id', linkId)
            .gt('expires_at', new Date())
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (messages.length === 0) {
            showNotification('📭 Belum ada pesan untuk link ini', 'info');
            return;
        }
        
        // Create simple modal for single link
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📨 Pesan untuk Link Ini</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="messages-container">
                        ${messages.map(msg => `
                            <div class="message-item">
                                <div class="message-content">
                                    <p>${msg.message_text}</p>
                                    <div class="message-meta">
                                        <span class="message-time">${formatMessageTime(msg.created_at)}</span>
                                        <span class="message-expires">⏰ Hilang: ${formatMessageTime(msg.expires_at)}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Error loading messages:', error);
        showNotification('❌ Gagal memuat pesan', 'error');
    }
}

async function loadRecentMessages(linkIds) {
    if (!linkIds.length) return;
    
    try {
        const supabase = window.getSupabase();
        if (!supabase) {
            return;
        }
        
        const { data: messages, error } = await supabase
            .from('anonymous_messages')
            .select('*')
            .in('link_id', linkIds)
            .gt('expires_at', new Date())
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (error) return;
        
        displayRecentMessages(messages);
        
    } catch (error) {
        console.error('Error loading recent messages:', error);
    }
}

function displayRecentMessages(messages) {
    const container = document.getElementById('messagesPreview');
    if (!container) return;
    
    if (messages.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💌</div>
                <p>Belum ada pesan</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = messages.map(msg => `
        <div class="message-preview-item">
            <div class="message-text">${msg.message_text}</div>
            <div class="message-time">${new Date(msg.created_at).toLocaleDateString('id-ID')}</div>
        </div>
    `).join('');
}

function formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// === NAVIGATION ===
function goToDashboard() {
    window.location.href = 'index.html';
}

function goToCreateLink() {
    window.location.href = 'create-link.html';
}

function goToProfile() {
    window.location.href = 'profile.html';
}

function logout() {
    // Gunakan custom auth logout
    if (window.KazzAuth) {
        window.KazzAuth.logout();
    } else {
        localStorage.removeItem('kazzanonim_user');
    }
    window.location.href = '../index.html';
}

// === UTILITY FUNCTIONS ===
function copyLink(slug = null) {
    const link = slug ? `https://kazzanonim.vercel.app/m/${slug}` : document.getElementById('generatedLink').value;
    
    navigator.clipboard.writeText(link).then(() => {
        showNotification('✅ Link berhasil disalin!', 'success');
    }).catch(() => {
        // Fallback
        const tempInput = document.createElement('input');
        tempInput.value = link;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        showNotification('✅ Link berhasil disalin!', 'success');
    });
}

function createAnother() {
    const form = document.getElementById('createLinkForm');
    const preview = document.getElementById('linkPreview');
    
    if (form && preview) {
        form.style.display = 'block';
        preview.style.display = 'none';
        form.reset();
    }
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

// Music toggle function
function toggleMusic() {
    if (window.musicPlayer) {
        window.musicPlayer.toggleMusic();
    }
}