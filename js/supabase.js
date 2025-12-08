// Supabase Configuration untuk SPCK Editor
const SUPABASE_URL = 'https://rqkcozaleykjuhfoyjpq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxa2NvemFsZXlranVoZm95anBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTA4MTIsImV4cCI6MjA4MDc4NjgxMn0.DRTuLHBWbhPRoCnaPTyWvkQzabpHubmd4A3qM28eOnA';

// Global Supabase client (untuk compatibility SPCK)
let supabase;

// Initialize Supabase client
function initSupabase() {
    if (window.supabase && window.supabase.createClient) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase client initialized');
    } else {
        console.error('❌ Supabase library not loaded');
        // Fallback: Load Supabase manually
        loadSupabaseLibrary();
    }
}

// Fallback load Supabase
function loadSupabaseLibrary() {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.onload = function() {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase loaded manually');
    };
    document.head.appendChild(script);
}

// Custom Auth Functions
const Auth = {
    // Register user
    async register(username, password) {
        await waitForSupabase();
        
        try {
            // Check if username already exists
            const { data: existingUser, error: checkError } = await supabase
                .from('profiles')
                .select('username')
                .eq('username', username)
                .single();

            if (checkError && checkError.code !== 'PGRST116') {
                throw new Error('Error checking username: ' + checkError.message);
            }

            if (existingUser) {
                throw new Error('Username sudah digunakan');
            }

            // Hash password
            const hashedPassword = this.simpleHash(password);
            
            // Create user profile
            const { data, error } = await supabase
                .from('profiles')
                .insert([
                    {
                        username: username,
                        password_hash: hashedPassword,
                        created_at: new Date()
                    }
                ])
                .select()
                .single();

            if (error) {
                throw new Error('Gagal membuat akun: ' + error.message);
            }
            
            return data;
        } catch (error) {
            console.error('Register error:', error);
            throw error;
        }
    },

    // Login user
    async login(username, password) {
        await waitForSupabase();
        
        try {
            // Get user by username
            const { data: user, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('username', username)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    throw new Error('Username tidak ditemukan');
                }
                throw new Error('Error: ' + error.message);
            }

            if (!user) {
                throw new Error('Username tidak ditemukan');
            }

            // Verify password
            const hashedPassword = this.simpleHash(password);
            if (user.password_hash !== hashedPassword) {
                throw new Error('Password salah');
            }

            return user;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    // Simple hash function
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString();
    },

    // Check if user is logged in
    checkAuth() {
        const userData = localStorage.getItem('kazzanonim_user');
        return userData ? JSON.parse(userData) : null;
    },

    // Logout
    logout() {
        localStorage.removeItem('kazzanonim_user');
    }
};

// Wait for Supabase to be ready
function waitForSupabase() {
    return new Promise((resolve) => {
        const checkSupabase = () => {
            if (supabase) {
                resolve();
            } else {
                setTimeout(checkSupabase, 100);
            }
        };
        checkSupabase();
    });
}

// Initialize when loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSupabase);
} else {
    initSupabase();
}

window.KazzAuth = Auth;
window.getSupabase = () => supabase;
