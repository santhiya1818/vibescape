// Common utility functions for VibeScape
// This file should be included in all pages to provide shared functionality

/**
 * Load user profile picture and update header
 */
async function loadUserProfilePicture() {
    const token = sessionStorage.getItem('vibescape-token') || localStorage.getItem('vibescape-token');
    const profileImg = document.getElementById('profile-img');
    
    if (!token || !profileImg) {
        return;
    }

    try {
        const response = await fetch('/api/user/profile', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const user = await response.json();
            if (user.profilePic) {
                profileImg.src = user.profilePic;
                profileImg.style.borderRadius = '50%';
                profileImg.style.objectFit = 'cover';
            }
        }
    } catch (error) {
        console.error('Error loading profile picture:', error);
    }
}

/**
 * Initialize common page functionality
 */
function initializeCommonFeatures() {
    // Load profile picture
    loadUserProfilePicture();
    
    // Add any other common initialization here
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeCommonFeatures();
});