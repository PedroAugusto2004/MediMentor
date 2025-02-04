document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');
    const logoutPopup = document.getElementById('logout-popup');
    const confirmLogoutBtn = document.getElementById('confirm-logout');
    const cancelLogoutBtn = document.getElementById('cancel-logout');

    logoutBtn.addEventListener('click', () => {
        logoutPopup.classList.add('show');
    });

    confirmLogoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'index.htm';
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
});
