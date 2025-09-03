/**
 * MediMentor Authentication Module
 * Handles user authentication, registration, and password management
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const signupBtn = document.getElementById('signup-btn');
    const backToLoginBtn = document.getElementById('back-to-login-btn');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const backToLoginFromForgot = document.getElementById('back-to-login-from-forgot');

    // API Configuration
    const apiUrl = 'https://o3jowgm41d.execute-api.us-east-1.amazonaws.com/dev';

    /**
     * Sets loading state for form submission buttons
     * @param {HTMLElement} form - The form element
     * @param {boolean} isLoading - Whether to show loading state
     */
    const setLoading = (form, isLoading) => {
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.dataset.originalText || submitBtn.textContent;
        
        if (isLoading) {
            submitBtn.dataset.originalText = originalText;
            submitBtn.disabled = true;
            submitBtn.classList.add('loading');
            submitBtn.innerHTML = '<div class="loading-text"><span class="spinner"></span>Processing...</div>';
        } else {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
            submitBtn.textContent = originalText;
        }
    };

    // Improved login form submission
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        setLoading(loginForm, true);

        const email = event.target.querySelector('input[type="email"]').value;
        const password = event.target.querySelector('input[type="password"]').value;

        try {
            const response = await Promise.race([
                fetch(`${apiUrl}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password })
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Request timeout')), 10000)
                )
            ]);

            const data = await response.json();
            
            if (response.ok && data.token) {
                localStorage.setItem('authToken', data.token);
                
                // Enhanced name handling with API retry
                if (data.fullName && data.fullName.trim()) {
                    localStorage.setItem('userName', data.fullName);
                } else {
                    // If fullName is not in initial response, fetch user profile
                    try {
                        const profileResponse = await fetch(`${apiUrl}/auth/profile`, {
                            headers: {
                                'Authorization': `Bearer ${data.token}`,
                                'Content-Type': 'application/json'
                            }
                        });
                        const profileData = await profileResponse.json();
                        
                        if (profileData.fullName && profileData.fullName.trim()) {
                            localStorage.setItem('userName', profileData.fullName);
                        } else {
                            // Final fallback to temporary storage
                            const tempName = localStorage.getItem('tempUserName');
                            if (tempName) {
                                localStorage.setItem('userName', tempName);
                                localStorage.removeItem('tempUserName');
                            } else {
                                console.warn("No name available from any source");
                                localStorage.setItem('userName', 'User');
                            }
                        }
                    } catch (profileError) {
                        console.error('Failed to fetch user profile:', profileError);
                        // Use temporary storage as fallback
                        const tempName = localStorage.getItem('tempUserName');
                        if (tempName) {
                            localStorage.setItem('userName', tempName);
                            localStorage.removeItem('tempUserName');
                        }
                    }
                }

                // Preload main page
                const preloadLink = document.createElement('link');
                preloadLink.rel = 'preload';
                preloadLink.as = 'document';
                preloadLink.href = 'main.html';
                document.head.appendChild(preloadLink);

                setTimeout(() => {
                    window.location.href = 'main.html';
                }, 100);
            } else {
                throw new Error(data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            showError(error.message || 'Login failed. Please try again.');
        } finally {
            setLoading(loginForm, false);
        }
    });

    /**
     * Displays error messages to the user with animation
     * @param {string} message - The error message to display
     */
    const showError = (message) => {
        // Remove any existing alerts
        const existingAlert = document.querySelector('.alert-message');
        if (existingAlert) {
            existingAlert.remove();
        }

        // Create new alert
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert-message';
        alertDiv.textContent = message;
        document.body.appendChild(alertDiv);

        // Trigger reflow for animation
        alertDiv.offsetHeight;

        // Show the alert with animation
        requestAnimationFrame(() => {
            alertDiv.classList.add('show');
        });

        // Remove alert after 4 seconds with fade out
        setTimeout(() => {
            alertDiv.classList.remove('show');
            setTimeout(() => alertDiv.remove(), 300);
        }, 4000);
    };

    // Add these CSS animations to the document
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideDown {
            from { transform: translate(-50%, -100%); }
            to { transform: translate(-50%, 0); }
        }
        @keyframes slideUp {
            from { transform: translate(-50%, 0); }
            to { transform: translate(-50%, -100%); }
        }
    `;
    document.head.appendChild(style);

    // Update within the signup form submission handler
    signupForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const termsCheckbox = document.getElementById('terms-checkbox');
        
        if (!termsCheckbox.checked) {
            showError('You must agree to the terms and conditions to sign up');
            return;
        }
        
        setLoading(signupForm, true);

        const email = event.target.querySelector('input[type="email"]').value;
        const password = event.target.querySelector('input[type="password"]').value;
        const fullName = event.target.querySelector('input[type="text"]').value.trim();

        if (!fullName) {
            showError('Full name is required');
            setLoading(signupForm, false);
            return;
        }

        try {
            // Store full name temporarily before API call
            localStorage.setItem('tempUserName', fullName);

            const response = await fetch(`${apiUrl}/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, fullName })
            });

            const data = await response.json();
            if (response.ok) {
                showError('Sign up successful! Please check your email for verification code.');
                await handleSignupConfirmation(email);
            } else {
                if (data.message.includes('User already exists')) {
                    showError('User already exists!');
                } else {
                    throw new Error(data.message || 'Sign up failed');
                }
            }
        } catch (error) {
            console.error('Sign up error:', error);
            showError(error.message || 'Sign up failed. Please try again.');
            localStorage.removeItem('tempUserName'); // Clean up on error
        } finally {
            setLoading(signupForm, false);
        }
    });

const signupPassword = document.getElementById('signup-password');
const passwordStrengthMeter = document.getElementById('password-strength-meter');

signupPassword.addEventListener('input', updatePasswordStrength);

function updatePasswordStrength() {
    const password = signupPassword.value;
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    for (const [requirement, met] of Object.entries(requirements)) {
        const li = document.getElementById(requirement);
        li.classList.toggle('met', met);
    }
}
const confirmPassword = document.getElementById('confirm-password');
const passwordMatchMessage = document.getElementById('password-match-message');

confirmPassword.addEventListener('input', checkPasswordMatch);

function checkPasswordMatch() {
    const password = signupPassword.value;
    const confirmPwd = confirmPassword.value;

    if (confirmPwd === '') {
        passwordMatchMessage.textContent = '';
    } else if (password === confirmPwd) {
        passwordMatchMessage.textContent = 'Passwords match';
        passwordMatchMessage.style.color = '#4CAF50';
    } else {
        passwordMatchMessage.textContent = 'Passwords do not match';
        passwordMatchMessage.style.color = '#f44336';
    }
}

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

    // Update the forgot password form submission handler
    forgotPasswordForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const emailInput = document.getElementById('forgot-password-email');
        const email = emailInput.value;

        setLoading(forgotPasswordForm, true);

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
                showError('Please check your email for the password reset code.');
                
                const code = prompt('Enter the verification code from your email:');
                if (!code) {
                    throw new Error('Verification code is required');
                }

                const newPassword = prompt('Enter your new password:');
                if (!newPassword) {
                    throw new Error('New password is required');
                }

                const confirmResponse = await fetch(`${apiUrl}/auth/confirm-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, code, newPassword })
                });

                const confirmData = await confirmResponse.json();
                
                if (confirmResponse.ok) {
                    showError('Password has been reset successfully! You can now login with your new password.');
                    document.querySelector('.forgot-password-section').style.display = 'none';
                    document.querySelector('.login-section').style.display = 'flex';
                    emailInput.value = '';
                } else {
                    throw new Error(confirmData.message || 'Failed to reset password');
                }
            } else {
                throw new Error(data.message || 'Failed to send reset code');
            }
        } catch (error) {
            console.error('Password reset error:', error);
            showError(error.message || 'Password reset failed. Please try again.');
        } finally {
            setLoading(forgotPasswordForm, false);
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
                showError('Email confirmed successfully! Please login.');
                // Switch to login section
                document.querySelector('.signup-section').style.display = 'none';
                document.querySelector('.login-section').style.display = 'flex';
            } else {
                showError(data.message || 'Confirmation failed');
                // Add resend code option
                if (confirm('Would you like to resend the confirmation code?')) {
                    await resendConfirmationCode(email);
                }
            }
        } catch (error) {
            console.error('Confirmation error:', error);
            showError('Confirmation failed. Please try again.');
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
                showError('Verification code has been resent to your email');
            } else {
                showError(data.message || 'Failed to resend code');
            }
        } catch (error) {
            console.error('Resend code error:', error);
            showError('Failed to resend code. Please try again.');
        }
    }

    async function forgotPassword() {
        const email = document.getElementById('email').value;
        try {
            const response = await fetch('/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });
            const data = await response.json();
            if (data.success) {
                showError('Password reset code sent to your email.');
            } else {
                showError('Error: ' + data.message);
            }
        } catch (error) {
            console.error('Error:', error);
            showError('An error occurred. Please try again.');
        }
    }

    document.getElementById('forgot-password-form').addEventListener('submit', function (event) {
        event.preventDefault();
        forgotPassword();
    });
});
