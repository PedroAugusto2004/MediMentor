const express = require('express');
const {
    CognitoUserPool,
    CognitoUser,
    AuthenticationDetails
} = require('amazon-cognito-identity-js');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Debug environment variables
console.log('Environment Variables:', {
    userPoolId: process.env.COGNITO_USER_POOL_ID,
    clientId: process.env.COGNITO_USER_POOL_WEB_CLIENT_ID,
    region: process.env.COGNITO_REGION
});

// Validate required environment variables
if (!process.env.COGNITO_USER_POOL_ID || !process.env.COGNITO_USER_POOL_WEB_CLIENT_ID) {
    throw new Error('Required environment variables are missing. Please check your .env file.');
}

const poolData = {
    UserPoolId: process.env.COGNITO_USER_POOL_ID,
    ClientId: process.env.COGNITO_USER_POOL_WEB_CLIENT_ID
};

// Debug pool data
console.log('Pool Data:', poolData);

const userPool = new CognitoUserPool(poolData);

// Login endpoint
app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;

    const authenticationDetails = new AuthenticationDetails({
        Username: email,
        Password: password
    });

    const userData = {
        Username: email,
        Pool: userPool
    };

    const cognitoUser = new CognitoUser(userData);

    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => {
            res.json({
                success: true,
                token: result.getIdToken().getJwtToken(),
                message: 'Login successful'
            });
        },
        onFailure: (err) => {
            res.status(401).json({
                success: false,
                message: err.message || 'Login failed'
            });
        }
    });
});

// Sign up endpoint
app.post('/auth/signup', (req, res) => {
    const { email, password, fullName } = req.body;

    userPool.signUp(email, password, [{
        Name: 'email',
        Value: email
    }, {
        Name: 'name',
        Value: fullName
    }], null, (err, result) => {
        if (err) {
            res.status(400).json({
                success: false,
                message: err.message || 'Sign up failed'
            });
            return;
        }
        res.json({
            success: true,
            message: 'Sign up successful'
        });
    });
});

// Google OAuth endpoint
app.get('/auth/google', (req, res) => {
    const domain = process.env.COGNITO_DOMAIN;
    const clientId = process.env.COGNITO_USER_POOL_WEB_CLIENT_ID;
    const redirectUri = 'http://localhost:3000/auth/google/callback';
    
    const url = `https://${domain}.auth.${process.env.COGNITO_REGION}.amazoncognito.com/oauth2/authorize?` +
        `client_id=${clientId}&` +
        `response_type=code&` +
        `scope=email+openid+profile&` +
        `redirect_uri=${redirectUri}&` +
        `identity_provider=Google`;
    
    res.json({ url });
});

// Google OAuth callback endpoint
app.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    const domain = process.env.COGNITO_DOMAIN;
    const clientId = process.env.COGNITO_USER_POOL_WEB_CLIENT_ID;
    const redirectUri = 'http://localhost:3000/auth/google/callback';

    try {
        const response = await axios.post(`https://${domain}.auth.${process.env.COGNITO_REGION}.amazoncognito.com/oauth2/token`, null, {
            params: {
                grant_type: 'authorization_code',
                client_id: clientId,
                redirect_uri: redirectUri,
                code
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { id_token } = response.data;
        res.json({
            success: true,
            token: id_token,
            message: 'Google login successful'
        });
    } catch (error) {
        console.error('Google login error:', error);
        res.status(500).json({
            success: false,
            message: 'Google login failed'
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
