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

// Optimize the login endpoint
app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
    const authenticationDetails = new AuthenticationDetails({ Username: email, Password: password });

    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => {
            res.json({
                success: true,
                token: result.getIdToken().getJwtToken(),
                message: 'Login successful'
            });
        },
        onFailure: (err) => {
            console.error('Login error:', err);
            res.status(401).json({ success: false, message: err.message || 'Login failed' });
        },
        newPasswordRequired: () => {
            res.status(403).json({ success: false, message: 'New password required' });
        }
    });
});

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

// 🔹 Catch-all for unknown routes
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

module.exports.handler = serverless(app);
