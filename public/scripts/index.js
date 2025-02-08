document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const signupBtn = document.getElementById('signup-btn');
    const backToLoginBtn = document.getElementById('back-to-login-btn');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const backToLoginFromForgot = document.getElementById('back-to-login-from-forgot');
    // Remove Google button reference
    // const googleBtn = document.getElementById('google-btn');

    // Login form submission
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = event.target.querySelector('input[type="email"]').value;
        const password = event.target.querySelector('input[type="password"]').value;

        try {
            const response = await fetch('http://localhost:3000/auth/login', { // Ensure the correct URL
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            if (response.ok) {
                console.log('Login successful');
                window.location.href = 'main.html';
            } else {
                alert(data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed. Please try again.');
        }
    });

    // Sign-up form submission
    signupForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = event.target.querySelector('input[type="email"]').value;
        const password = event.target.querySelector('input[type="password"]').value;
        const fullName = event.target.querySelector('input[type="text"]').value;

        try {
            const response = await fetch('http://localhost:3000/auth/signup', { // Ensure the correct URL
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, fullName })
            });

            const data = await response.json();
            if (response.ok) {
                alert('Sign up successful');
                window.location.href = 'main.html';
            } else {
                alert(data.message || 'Sign up failed');
            }
        } catch (error) {
            console.error('Sign up error:', error);
            alert('Sign up failed. Please try again.');
        }
    });

    // Forgot password link click handler
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('.login-section').style.display = 'none';
        document.querySelector('.forgot-password-section').style.display = 'flex';
    });

    // Back to login from forgot password
    backToLoginFromForgot.addEventListener('click', () => {
        document.querySelector('.forgot-password-section').style.display = 'none';
        document.querySelector('.login-section').style.display = 'flex';
    });

    // Handle forgot password form submission
    forgotPasswordForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = event.target.querySelector('input[type="email"]').value;

        try {
            const response = await fetch('http://localhost:3000/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            if (response.ok) {
                alert('Password reset instructions have been sent to your email');
                // Return to login screen
                document.querySelector('.forgot-password-section').style.display = 'none';
                document.querySelector('.login-section').style.display = 'flex';
            } else {
                alert(data.message || 'Password reset failed');
            }
        } catch (error) {
            console.error('Password reset error:', error);
            alert('Password reset failed. Please try again.');
        }
    });

    // UI Toggle Functions
    signupBtn.addEventListener('click', () => {
        document.querySelector('.login-section').style.display = 'none';
        document.querySelector('.signup-section').style.display = 'flex';
    });

    backToLoginBtn.addEventListener('click', () => {
        document.querySelector('.signup-section').style.display = 'none';
        document.querySelector('.login-section').style.display = 'flex';
    });
});
