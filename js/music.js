// KazzAnonim Music System - TOMBOL MUSIK WORK 100%
class MusicPlayer {
    constructor() {
        this.audio = new Audio('https://g.top4top.io/m_3570z0se60.mp3');
        this.audio.loop = true;
        this.audio.volume = 0.7;
        this.isPlaying = false;
        
        console.log('🎵 Music system initialized');
    }
    
    playMusic() {
        this.audio.play().then(() => {
            this.isPlaying = true;
            console.log('🎵 MUSIC BERHASIL DIMULAI!');
            this.showMusicStatus('🎵 MUSIC AKTIF', '#25D366');
            this.updateMusicButton();
        }).catch(error => {
            console.log('❌ Music error:', error);
            this.showMusicStatus('❌ Gagal memutar music', '#ff4444');
        });
    }
    
    stopMusic() {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.isPlaying = false;
        console.log('⏹️ Music dihentikan');
        this.showMusicStatus('⏹️ MUSIC BERHENTI', '#ff4444');
        this.updateMusicButton();
    }
    
    toggleMusic() {
        if (this.isPlaying) {
            this.stopMusic();
        } else {
            this.playMusic();
        }
    }
    
    showMusicStatus(message, color) {
        // Hapus status sebelumnya
        const existingStatus = document.getElementById('music-status');
        if (existingStatus) {
            existingStatus.remove();
        }
        
        // Buat status baru
        const status = document.createElement('div');
        status.id = 'music-status';
        status.textContent = message;
        status.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${color};
            color: white;
            padding: 12px 18px;
            border-radius: 10px;
            font-weight: bold;
            z-index: 9999;
            animation: slideIn 0.5s ease;
        `;
        
        document.body.appendChild(status);
        
        // Hapus setelah 3 detik
        setTimeout(() => {
            if (status.parentNode) {
                status.remove();
            }
        }, 3000);
    }
    
    updateMusicButton() {
        const musicBtn = document.querySelector('.btn-music');
        if (musicBtn) {
            if (this.isPlaying) {
                musicBtn.innerHTML = '<span class="btn-icon">⏹️</span> Stop Musik';
                musicBtn.style.background = 'linear-gradient(45deg, #ff4444, #cc0000)';
            } else {
                musicBtn.innerHTML = '<span class="btn-icon">🎵</span> Putar Musik';
                musicBtn.style.background = 'linear-gradient(45deg, #25D366, #128C7E)';
            }
        }
    }
}

// Initialize music player
document.addEventListener('DOMContentLoaded', function() {
    window.musicPlayer = new MusicPlayer();
    
    // Add CSS for animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    console.log('✅ Music system ready - Tombol musik siap digunakan!');
});