document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');
    const logoutPopup = document.getElementById('logout-popup');
    const confirmLogoutBtn = document.getElementById('confirm-logout');
    const cancelLogoutBtn = document.getElementById('cancel-logout');

    logoutBtn.addEventListener('click', () => {
        logoutPopup.classList.add('show');
    });

    confirmLogoutBtn.addEventListener('click', () => {
        localStorage.removeItem('authToken');
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