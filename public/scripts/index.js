document.getElementById('login-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const email = document.querySelector('input[type="email"]').value;
    const password = document.querySelector('input[type="password"]').value;

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            window.location.href = 'main.htm';
        } else {
            alert('Login failed. Please check your credentials and try again.');
        }
    } catch (error) {
        console.error('Error during login:', error);
        alert('An error occurred. Please try again later.');
    }
});

document.getElementById('signup-btn').addEventListener('click', function() {
    document.querySelector('.login-section').style.display = 'none';
    document.querySelector('.signup-section').style.display = 'flex';
});

document.getElementById('back-to-login-btn').addEventListener('click', function() {
    document.querySelector('.signup-section').style.display = 'none';
    document.querySelector('.login-section').style.display = 'flex';
});

document.getElementById('google-btn').addEventListener('click', function() {
    // Add AWS Cognito Google authentication logic here
    alert('Continue with Google functionality to be implemented');
});
