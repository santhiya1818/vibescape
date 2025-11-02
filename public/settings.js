document.addEventListener('DOMContentLoaded', () => {
    // --- AUTHENTICATION & INITIALIZATION ---
    const token = sessionStorage.getItem('vibescape-token') || localStorage.getItem('vibescape-token');
    if (!token) {
        alert('Please login to access settings.');
        window.location.href = '/login.html';
        return;
    }

    // --- DOM ELEMENTS ---
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const profilePicPreview = document.getElementById('profile-pic-preview');
    const profilePicUpload = document.getElementById('profile-pic-upload');
    const uploadPicBtn = document.getElementById('upload-pic-btn');
    const removePicBtn = document.getElementById('remove-pic-btn');
    const profileForm = document.getElementById('profile-form');
    const passwordForm = document.getElementById('password-form');
    const logoutBtn = document.getElementById('logout-btn');

    // --- API HELPER FUNCTION ---
    const fetchAPI = async (url, options = {}) => {
        const headers = { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers 
        };
        
        try {
            const response = await fetch(url, { ...options, headers });
            
            if (response.status === 401) {
                alert('Your session has expired. Please login again.');
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/login.html';
                return null;
            }
            
            return response;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    };

    // --- LOAD USER DATA ---
    const loadUserData = async () => {
        try {
            const response = await fetchAPI('/api/user/profile');
            if (!response || !response.ok) {
                throw new Error('Failed to fetch user data');
            }
            
            const user = await response.json();
            usernameInput.value = user.username || '';
            emailInput.value = user.email || '';
            
            // Load profile picture if exists
            if (user.profilePic) {
                profilePicPreview.src = user.profilePic;
            }
            
        } catch (error) {
            console.error('Error loading user data:', error);
            alert('Failed to load user data. Please refresh the page.');
        }
    };

    // --- PROFILE PICTURE FUNCTIONALITY ---
    uploadPicBtn.addEventListener('click', () => {
        profilePicUpload.click();
    });

    profilePicUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image size should be less than 5MB.');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('profilePic', file);

            const response = await fetch('/api/user/profile-picture', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                profilePicPreview.src = result.profilePic;
                alert('Profile picture updated successfully!');
            } else {
                throw new Error('Failed to upload profile picture');
            }
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            alert('Failed to upload profile picture. Please try again.');
        }
    });

    removePicBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to remove your profile picture?')) {
            return;
        }

        try {
            const response = await fetchAPI('/api/user/profile-picture', {
                method: 'DELETE'
            });

            if (response && response.ok) {
                profilePicPreview.src = 'https://via.placeholder.com/120x120?text=No+Image';
                alert('Profile picture removed successfully!');
            } else {
                throw new Error('Failed to remove profile picture');
            }
        } catch (error) {
            console.error('Error removing profile picture:', error);
            alert('Failed to remove profile picture. Please try again.');
        }
    });

    // --- PROFILE FORM SUBMISSION ---
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const updatedData = {
            username: usernameInput.value.trim(),
            email: emailInput.value.trim()
        };

        if (!updatedData.username || !updatedData.email) {
            alert('Please fill in all fields.');
            return;
        }

        try {
            const response = await fetchAPI('/api/user/profile', {
                method: 'PUT',
                body: JSON.stringify(updatedData)
            });

            if (response && response.ok) {
                alert('Profile updated successfully!');
            } else {
                const error = await response.json();
                alert(error.message || 'Failed to update profile.');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile. Please try again.');
        }
    });

    // --- PASSWORD FORM SUBMISSION ---
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (!currentPassword || !newPassword || !confirmPassword) {
            alert('Please fill in all password fields.');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('New password and confirmation do not match.');
            return;
        }

        if (newPassword.length < 6) {
            alert('New password must be at least 6 characters long.');
            return;
        }

        try {
            const response = await fetchAPI('/api/user/change-password', {
                method: 'PUT',
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            if (response && response.ok) {
                alert('Password changed successfully!');
                passwordForm.reset();
            } else {
                const error = await response.json();
                alert(error.message || 'Failed to change password.');
            }
        } catch (error) {
            console.error('Error changing password:', error);
            alert('Failed to change password. Please try again.');
        }
    });

    // --- PASSWORD VISIBILITY TOGGLES ---
    const toggleButtons = document.querySelectorAll('.toggle-password');
    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            const input = document.getElementById(button.dataset.target);
            const icon = button.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // --- LOGOUT FUNCTIONALITY ---
    logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/login.html';
        }
    });

    // --- INITIALIZE ---
    loadUserData();

});