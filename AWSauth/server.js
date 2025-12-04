const serverless = require('serverless-http');
const express = require('express');
const {
    CognitoUserPool,
    CognitoUser,
    AuthenticationDetails
} = require('amazon-cognito-identity-js');
const cors = require('cors');
require('dotenv').config();
const AWS = require('aws-sdk');

const app = express();
app.use(express.json());

// Configure CORS
app.use(cors({
    origin: '*', // Allow all origins for simplicity, you can restrict this to your frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

const cognito = new AWS.CognitoIdentityServiceProvider({
    region: process.env.COGNITO_REGION,
});

app.use((req, res, next) => {
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

    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
    const authenticationDetails = new AuthenticationDetails({ Username: email, Password: password });

    // Set request timeout (12s to accommodate cold starts and Cognito latency)
    const requestTimeout = new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error('Authentication timeout'));
        }, 12000);
    });

    // Authentication promise
    const authenticationPromise = new Promise((resolve, reject) => {
        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: (result) => resolve(result),
            onFailure: (err) => reject(err),
            newPasswordRequired: () => reject(new Error('New password required'))
        });
    });

    // Race between timeout and authentication
    Promise.race([authenticationPromise, requestTimeout])
        .then(result => {
            const response = {
                success: true,
                token: result.getIdToken().getJwtToken(),
                message: 'Login successful'
            };
            res.json(response);
        })
        .catch(err => {
            console.error('Login error:', err);
            res.status(err.message === 'Authentication timeout' ? 504 : 401)
                .json({ success: false, message: err.message || 'Login failed' });
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

// 🔹 Sign up endpoint with better error handling
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
                if (err.code === 'UsernameExistsException') {
                    return res.status(400).json({
                        success: false,
                        message: 'User already exists'
                    });
                }
                return res.status(400).json({
                    success: false,
                    message: err.message || 'Sign up failed'
                });
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
            return res.status(400).json({ success: false, message: err.message || 'Resend code failed' });
        }
        res.json({ success: true, message: 'Verification code resent successfully' });
    });
});

// Update the forgot password endpoint
app.post('/auth/forgot-password', (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool
    });

    cognitoUser.forgotPassword({
        onSuccess: () => {
            res.json({
                success: true,
                message: 'Password reset code sent successfully'
            });
        },
        onFailure: (err) => {
            console.error('Forgot password error:', err);
            res.status(400).json({
                success: false,
                message: err.message || 'Failed to initiate password reset'
            });
        }
    });
});

// Update the confirm password endpoint
app.post('/auth/confirm-password', async (req, res) => {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
        return res.status(400).json({
            success: false,
            message: 'Email, verification code, and new password are required'
        });
    }

    const params = {
        ClientId: COGNITO_USER_POOL_WEB_CLIENT_ID,
        Username: email,
        ConfirmationCode: code,
        Password: newPassword
    };

    try {
        await cognito.confirmForgotPassword(params).promise();
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
