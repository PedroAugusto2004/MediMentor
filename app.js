require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { Issuer, generators } = require('openid-client');
const { CognitoIdentityProviderClient, InitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');
const bodyParser = require('body-parser');
const app = express();

app.set('view engine', 'ejs');

let client;
// Initialize OpenID Client
async function initializeClient() {
    const issuer = await Issuer.discover('https://cognito-idp.us-east-1.amazonaws.com/us-east-1_d37gujEI3');
    client = new issuer.Client({
        client_id: '4pc8icbch8bfqis828i3qgqd3f',
        client_secret: process.env.COGNITO_CLIENT_SECRET,
        redirect_uris: ['https://d84l1y8p4kdic.cloudfront.net'],
        response_types: ['code']
    });
};
initializeClient().catch(console.error);

app.use(session({
    secret: 'some secret',
    resave: false,
    saveUninitialized: false
}));

app.use(bodyParser.json());

const checkAuth = (req, res, next) => {
    if (!req.session.userInfo) {
        req.isAuthenticated = false;
    } else {
        req.isAuthenticated = true;
    }
    next();
};

app.get('/', checkAuth, (req, res) => {
    res.render('home', {
        isAuthenticated: req.isAuthenticated,
        userInfo: req.session.userInfo
    });
});

app.get('/login', (req, res) => {
    const nonce = generators.nonce();
    const state = generators.state();

    req.session.nonce = nonce;
    req.session.state = state;

    const authUrl = client.authorizationUrl({
        scope: 'phone openid email',
        state: state,
        nonce: nonce,
    });

    res.redirect(authUrl);
});

function getPathFromURL(urlString) {
    try {
        const url = new URL(urlString);
        return url.pathname;
    } catch (error) {
        console.error('Invalid URL:', error);
        return null;
    }
}

app.get(getPathFromURL('https://d84l1y8p4kdic.cloudfront.net'), async (req, res) => {
    try {
        const params = client.callbackParams(req);
        const tokenSet = await client.callback(
            'https://d84l1y8p4kdic.cloudfront.net',
            params,
            {
                nonce: req.session.nonce,
                state: req.session.state
            }
        );

        const userInfo = await client.userinfo(tokenSet.access_token);
        req.session.userInfo = userInfo;

        res.redirect('/');
    } catch (err) {
        console.error('Callback error:', err);
        res.redirect('/');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    const logoutUrl = `https://<user pool domain>/logout?client_id=4pc8icbch8bfqis828i3qgqd3f&logout_uri=<logout uri>`;
    res.redirect(logoutUrl);
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const client = new CognitoIdentityProviderClient({ region: 'us-east-1' });
        const command = new InitiateAuthCommand({
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: '4pc8icbch8bfqis828i3qgqd3f',
            AuthParameters: {
                USERNAME: email,
                PASSWORD: password
            }
        });

        const response = await client.send(command);

        req.session.userInfo = response.AuthenticationResult;
        res.status(200).send('Login successful');
    } catch (error) {
        console.error('Login error:', error);
        res.status(401).send('Login failed');
    }
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
