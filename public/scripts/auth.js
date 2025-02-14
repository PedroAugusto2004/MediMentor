document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');
    const logoutPopup = document.getElementById('logout-popup');
    const confirmLogoutBtn = document.getElementById('confirm-logout');
    const cancelLogoutBtn = document.getElementById('cancel-logout');

    logoutBtn.addEventListener('click', () => {
        logoutPopup.classList.add('show');
    });

    confirmLogoutBtn.addEventListener('click', () => {
        // Clear all auth-related data
        localStorage.removeItem('authToken');
        localStorage.removeItem('userName');
        localStorage.removeItem('tempUserName'); // Also clear any temporary data
        window.location.href = 'index.html';
    });

    cancelLogoutBtn.addEventListener('click', () => {
        logoutPopup.classList.remove('show');
    });

    // Close popup when clicking outside
    logoutPopup.addEventListener('click', (e) => {
        if (e.target === logoutPopup) {
            logoutPopup.classList.remove('show');
        }
    });

    // Check if the user is authenticated
    function checkAuth() {
        return localStorage.getItem('authToken') !== null;
    }

    // Show login popup if not authenticated
    function showLoginPopupIfNeeded() {
        if (!checkAuth()) {
            document.getElementById('login-popup').style.display = 'block';
        }
    }

    showLoginPopupIfNeeded();

    const redirectLoginBtn = document.getElementById('redirect-login');
    if (redirectLoginBtn) {
        redirectLoginBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
});

// Update the username display logic with retry mechanism
const updateUserDisplay = async () => {
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (!userNameDisplay) return;

    let userName = localStorage.getItem('userName');
    
    // If no name is found, try to fetch it from the API
    if (!userName || userName === 'User') {
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                const response = await fetch(`${apiUrl}/auth/profile`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                const data = await response.json();
                if (data.fullName && data.fullName.trim()) {
                    userName = data.fullName;
                    localStorage.setItem('userName', userName);
                }
            } catch (error) {
                console.error('Failed to fetch user profile:', error);
            }
        }
    }

    userNameDisplay.textContent = userName && userName !== 'User' 
        ? `Welcome, ${userName}` 
        : 'Welcome';
};

// Call this when the page loads
document.addEventListener('DOMContentLoaded', updateUserDisplay);