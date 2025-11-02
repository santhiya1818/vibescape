// History tracking utility
async function addToHistory(songTitle, artist) {
    try {
        const token = sessionStorage.getItem('token') || sessionStorage.getItem('vibescape-token');
        console.log('Attempting to add to history:', { songTitle, artist, hasToken: !!token });
        
        if (!token) {
            console.log('No auth token found - user not logged in');
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
            console.log('Failed to add to history:', response.status, await response.text());
        } else {
            console.log('Successfully added to history:', songTitle);
        }
    } catch (error) {
        console.log('Error adding to history:', error);
    }
}

// Export for use in other scripts
window.addToHistory = addToHistory;