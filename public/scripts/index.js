import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';

const poolData = {
    UserPoolId: process.env.COGNITO_USER_POOL_ID,
    ClientId: process.env.COGNITO_USER_POOL_WEB_CLIENT_ID
};

const userPool = new CognitoUserPool(poolData);

// Remove the import statement
// import Amplify, { Auth } from 'aws-amplify';

Amplify.configure({
    Auth: {
        region: process.env.COGNITO_REGION,
        userPoolId: process.env.COGNITO_USER_POOL_ID,
        userPoolWebClientId: process.env.COGNITO_USER_POOL_WEB_CLIENT_ID
    }
});

// Event listener for login form submission
document.getElementById('login-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    const email = event.target.querySelector('input[type="email"]').value;
    const password = event.target.querySelector('input[type="password"]').value;

    const authenticationDetails = new AuthenticationDetails({
        Username: email,
        Password: password,
    });

    const userData = {
        Username: email,
        Pool: userPool
    };

    const cognitoUser = new CognitoUser(userData);

    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function (result) {
            console.log('Login successful:', result);
            // Handle successful login
            window.location.href = 'main.htm'; // Redirect to main.htm
        },
        onFailure: function (err) {
            console.error('Login failed:', err);
            // Handle login failure
        }
    });
});

// Event listener for sign-up button click
document.getElementById('signup-btn').addEventListener('click', function() {
    console.log('Sign-up button clicked'); // Debugging statement
    // Hide login section and show sign-up section
    document.querySelector('.login-section').style.display = 'none';
    document.querySelector('.signup-section').style.display = 'flex';
});

// Event listener for back-to-login button click
document.getElementById('back-to-login-btn').addEventListener('click', function() {
    // Hide sign-up section and show login section
    document.querySelector('.signup-section').style.display = 'none';
    document.querySelector('.login-section').style.display = 'flex';
});

// Event listener for Google login button click
document.getElementById('google-btn').addEventListener('click', async function() {
    try {
        const response = await Auth.federatedSignIn({
            provider: 'Google'
        });
        
        if (response.success) {
            console.log('Successfully signed in with Google');
            window.location.href = 'main.htm';
        }
    } catch (error) {
        console.error('Error signing in with Google:', error);
        alert('Error signing in with Google');
    }
});

// Event listener for sign-up form submission
document.getElementById('signup-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    const email = event.target.querySelector('input[type="email"]').value;
    const password = event.target.querySelector('input[type="password"]').value;
    const fullName = event.target.querySelector('input[type="text"]').value;
    try {
        await Auth.signUp({ username: email, password, attributes: { email, name: fullName } });
        alert('Sign Up successful');
        window.location.href = 'main.htm'; // Redirect to main.htm
    } catch (error) {
        console.error('Error signing up:', error);
        alert('Error signing up');
    }
});
