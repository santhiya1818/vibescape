// History tracking utility
async function addToHistory(songTitle, artist) {
    try {
        const token = sessionStorage.getItem('token') || sessionStorage.getItem('vibescape-token');
        if (!token) {
            // User not logged in, skip history tracking
            return;
        }

        const response = await fetch('/api/history', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ songTitle, artist })
        });

        if (!response.ok) {
            console.log('Failed to add to history:', response.status);
        }
    } catch (error) {
        console.log('Error adding to history:', error);
    }
}

// Export for use in other scripts
window.addToHistory = addToHistory;