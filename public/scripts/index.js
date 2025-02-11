document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const signupBtn = document.getElementById('signup-btn');
    const backToLoginBtn = document.getElementById('back-to-login-btn');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const backToLoginFromForgot = document.getElementById('back-to-login-from-forgot');

    const apiUrl = 'https://o3jowgm41d.execute-api.us-east-1.amazonaws.com/dev'; // Update with your deployed API endpoint

    // Update login form submission to handle tokens
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = event.target.querySelector('input[type="email"]').value;
        const password = event.target.querySelector('input[type="password"]').value;

        try {
            const response = await fetch(`${apiUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            if (response.ok && data.token) {
                // Store token securely
                localStorage.setItem('authToken', data.token);
                console.log('Login successful');
                window.location.href = 'main.html';
            } else if (data.message === 'User is not confirmed.') {
                alert('Please verify your email first');
                await handleSignupConfirmation(email);
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
            const response = await fetch(`${apiUrl}/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, fullName })
            });

            const data = await response.json();
            if (response.ok) {
                alert('Sign up successful! Please check your email for verification code.');
                // Handle confirmation flow
                await handleSignupConfirmation(email);
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
            const response = await fetch(`${apiUrl}/auth/forgot-password`, {
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

    // Add after signup form submission
    async function handleSignupConfirmation(email) {
        const code = prompt('Please enter the verification code sent to your email:');
        if (!code) return;

        try {
            const response = await fetch(`${apiUrl}/auth/confirm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, code })
            });

            const data = await response.json();
            if (response.ok) {
                alert('Email confirmed successfully! Please login.');
                // Switch to login section
                document.querySelector('.signup-section').style.display = 'none';
                document.querySelector('.login-section').style.display = 'flex';
            } else {
                alert(data.message || 'Confirmation failed');
                // Add resend code option
                if (confirm('Would you like to resend the confirmation code?')) {
                    await resendConfirmationCode(email);
                }
            }
        } catch (error) {
            console.error('Confirmation error:', error);
            alert('Confirmation failed. Please try again.');
        }
    }

    async function resendConfirmationCode(email) {
        try {
            const response = await fetch(`${apiUrl}/auth/resend-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            if (response.ok) {
                alert('Verification code has been resent to your email');
            } else {
                alert(data.message || 'Failed to resend code');
            }
        } catch (error) {
            console.error('Resend code error:', error);
            alert('Failed to resend code. Please try again.');
        }
    }
});
