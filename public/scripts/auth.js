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
        localStorage.removeItem('userName');
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

    const userName = localStorage.getItem('userName');
    if (userName) {
        displayWelcomeMessage(userName);
    }

    // ...existing code...

    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => {
            const userName = result.idToken.payload['cognito:username'];
            localStorage.setItem('userName', userName);
            displayWelcomeMessage(userName);
            res.json({
                success: true,
                token: result.getIdToken().getJwtToken(),
                message: 'Login successful'
            });
        },
        // ...existing code...
    });

    // ...existing code...
});
