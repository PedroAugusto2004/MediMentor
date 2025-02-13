document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const signupBtn = document.getElementById('signup-btn');
    const backToLoginBtn = document.getElementById('back-to-login-btn');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const backToLoginFromForgot = document.getElementById('back-to-login-from-forgot');

    const apiUrl = 'https://o3jowgm41d.execute-api.us-east-1.amazonaws.com/dev'; // Update with your deployed API endpoint

    // Add loading state management
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

    // Add token validation check
    const validateToken = async () => {
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                const response = await fetch(`${apiUrl}/auth/validate-token`, {
                    headers: { 'Authorization': token }
                });
                if (!response.ok) {
                    localStorage.removeItem('authToken');
                    window.location.reload();
                }
            } catch (error) {
                localStorage.removeItem('authToken');
                window.location.reload();
            }
        }
    };

    validateToken();

    // Improved login form submission
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        setLoading(loginForm, true);

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
                localStorage.setItem('authToken', data.token);
                window.location.href = 'main.html';
            } else if (data.message === 'User is not confirmed.') {
                if (confirm('Your account is not confirmed. Would you like to resend the confirmation code?')) {
                    await resendConfirmationCode(email);
                }
                await handleSignupConfirmation(email);
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

    // Add error message display
    const showError = (message) => {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        const form = document.querySelector('form:not([style*="display: none"])');
        form.insertBefore(errorDiv, form.firstChild);
        
        setTimeout(() => errorDiv.remove(), 5000);
    };

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
        setLoading(forgotPasswordForm, true);

        const emailInput = document.getElementById('forgot-password-email');
        const email = emailInput.value;
        
        // Store email for the reset flow
        localStorage.setItem('resetEmail', email);

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
                const resetForm = document.createElement('form');
                resetForm.id = 'reset-password-form';
                resetForm.innerHTML = `
                    <input type="text" placeholder="Verification Code" required>
                    <input type="password" id="new-password" placeholder="New Password" required>
                    <input type="password" id="confirm-new-password" placeholder="Confirm New Password" required>
                    <div id="reset-password-strength-meter">
                        <p>Password must contain:</p>
                        <ul>
                            <li id="reset-length">At least 8 characters</li>
                            <li id="reset-uppercase">At least one uppercase letter</li>
                            <li id="reset-lowercase">At least one lowercase letter</li>
                            <li id="reset-number">At least one number</li>
                            <li id="reset-special">At least one special character</li>
                        </ul>
                    </div>
                    <button type="submit">Reset Password</button>
                    <button type="button" class="back-to-login">Back to Login</button>
                `;

                const forgotPasswordSection = document.querySelector('.forgot-password-section');
                forgotPasswordSection.querySelector('form').replaceWith(resetForm);

                // Add event listener for the new reset form
                document.getElementById('reset-password-form').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const storedEmail = localStorage.getItem('resetEmail');
                    const code = e.target.querySelector('input[type="text"]').value;
                    const newPassword = e.target.querySelector('#new-password').value;
                    const confirmPassword = e.target.querySelector('#confirm-new-password').value;

                    if (newPassword !== confirmPassword) {
                        showError('Passwords do not match');
                        return;
                    }

                    if (!validatePassword(newPassword)) {
                        showError('Password does not meet requirements');
                        return;
                    }

                    try {
                        const confirmResponse = await fetch(`${apiUrl}/auth/confirm-password`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ 
                                email: storedEmail, 
                                code, 
                                newPassword 
                            })
                        });

                        const confirmData = await confirmResponse.json();
                        
                        if (confirmResponse.ok) {
                            // Clean up stored email
                            localStorage.removeItem('resetEmail');
                            
                            alert('Password has been reset successfully! You can now login with your new password.');
                            document.querySelector('.forgot-password-section').style.display = 'none';
                            document.querySelector('.login-section').style.display = 'flex';
                            // Reset form to original state
                            forgotPasswordSection.querySelector('form').replaceWith(forgotPasswordForm);
                            emailInput.value = '';
                        } else {
                            throw new Error(confirmData.message || 'Failed to reset password');
                        }
                    } catch (error) {
                        showError(error.message || 'Failed to reset password');
                    }
                });
            } else {
                throw new Error(data.message || 'Failed to send reset code');
            }
        } catch (error) {
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

    function validatePassword(password) {
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        return Object.values(requirements).every(requirement => requirement === true);
    }
});
