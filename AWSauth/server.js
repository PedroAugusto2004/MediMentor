const serverless = require('serverless-http');
const express = require('express');
const {
    CognitoUserPool,
    CognitoUser,
    AuthenticationDetails
} = require('amazon-cognito-identity-js');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// 🔹 Log every request (for debugging)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// 🔹 Validate required environment variables
const { COGNITO_USER_POOL_ID, COGNITO_USER_POOL_WEB_CLIENT_ID } = process.env;
if (!COGNITO_USER_POOL_ID || !COGNITO_USER_POOL_WEB_CLIENT_ID) {
    throw new Error('Required environment variables are missing. Please check your .env file.');
}

const userPool = new CognitoUserPool({
    UserPoolId: COGNITO_USER_POOL_ID,
    ClientId: COGNITO_USER_POOL_WEB_CLIENT_ID
});

// Optimize login endpoint with caching
const loginCache = new Map();
const LOGIN_CACHE_TTL = 2000; // 2 seconds

app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Check cache
    const cacheKey = `${email}:${password}`;
    const cachedResult = loginCache.get(cacheKey);
    if (cachedResult && Date.now() - cachedResult.timestamp < LOGIN_CACHE_TTL) {
        return res.json(cachedResult.data);
    }

    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
    const authenticationDetails = new AuthenticationDetails({ Username: email, Password: password });

    // Set a timeout for the Cognito authentication
    const authTimeout = setTimeout(() => {
        cognitoUser.signOut();
        res.status(504).json({ success: false, message: 'Authentication timeout' });
    }, 8000);

    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => {
            clearTimeout(authTimeout);
            const response = {
                success: true,
                token: result.getIdToken().getJwtToken(),
                message: 'Login successful'
            };
            
            // Cache the successful result
            loginCache.set(cacheKey, {
                timestamp: Date.now(),
                data: response
            });
            
            res.json(response);
        },
        onFailure: (err) => {
            clearTimeout(authTimeout);
            console.error('Login error:', err);
            res.status(401).json({ success: false, message: err.message || 'Login failed' });
        },
        newPasswordRequired: () => {
            clearTimeout(authTimeout);
            res.status(403).json({ success: false, message: 'New password required' });
        }
    });
});

// Clean up expired cache entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of loginCache.entries()) {
        if (now - value.timestamp > LOGIN_CACHE_TTL) {
            loginCache.delete(key);
        }
    }
}, 60000);

// Add a health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK' });
});


// 🔹 Sign up endpoint
app.post('/auth/signup', (req, res) => {
    const { email, password, fullName } = req.body;
    if (!email || !password || !fullName) {
        return res.status(400).json({ success: false, message: 'Email, password, and full name are required' });
    }

    userPool.signUp(
        email,
        password,
        [{ Name: 'email', Value: email }, { Name: 'name', Value: fullName }],
        null,
        (err, result) => {
            if (err) {
                console.error('Sign up error:', err);
                return res.status(400).json({ success: false, message: err.message || 'Sign up failed' });
            }
            res.json({ success: true, message: 'Sign up successful' });
        }
    );
});

// 🔹 Confirm signup endpoint
app.post('/auth/confirm', (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) {
        return res.status(400).json({ success: false, message: 'Email and verification code are required' });
    }

    const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool
    });

    cognitoUser.confirmRegistration(code, true, (err, result) => {
        if (err) {
            console.error('Confirmation error:', err);
            return res.status(400).json({ success: false, message: err.message || 'Confirmation failed' });
        }
        res.json({ success: true, message: 'Email confirmed successfully' });
    });
});

// 🔹 Resend confirmation code endpoint
app.post('/auth/resend-code', (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool
    });

    cognitoUser.resendConfirmationCode((err, result) => {
        if (err) {
            console.error('Resend code error:', err);
            return res.status(400).json({ success: false, message: err.message || 'Failed to resend code' });
        }
        res.json({ success: true, message: 'Verification code resent successfully' });
    });
});

// Add forgot password endpoint
app.post('/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }

    try {
        const cognitoUser = new CognitoUser({
            Username: email,
            Pool: userPool
        });

        await new Promise((resolve, reject) => {
            cognitoUser.forgotPassword({
                onSuccess: () => resolve(),
                onFailure: err => reject(err)
            });
        });

        res.json({ success: true, message: 'Password reset code sent successfully' });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(400).json({ 
            success: false, 
            message: err.message || 'Failed to initiate password reset' 
        });
    }
});

// Add confirm new password endpoint
app.post('/auth/confirm-password', async (req, res) => {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
        return res.status(400).json({ 
            success: false, 
            message: 'Email, verification code, and new password are required' 
        });
    }

    try {
        const cognitoUser = new CognitoUser({
            Username: email,
            Pool: userPool
        });

        await new Promise((resolve, reject) => {
            cognitoUser.confirmPassword(code, newPassword, {
                onSuccess: () => resolve(),
                onFailure: err => reject(err)
            });
        });

        res.json({ success: true, message: 'Password reset successful' });
    } catch (err) {
        console.error('Confirm password error:', err);
        res.status(400).json({ 
            success: false, 
            message: err.message || 'Failed to reset password' 
        });
    }
});

// 🔹 Catch-all for unknown routes
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

module.exports.handler = serverless(app);
