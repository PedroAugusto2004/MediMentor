document.addEventListener('DOMContentLoaded', () => {
    // Get references to the form and input elements
    const symptomForm = document.getElementById('symptomForm');
    const symptomsInput = document.getElementById('symptomsInput');
    const genderInput = document.getElementById('genderInput');
    const yearOfBirthInput = document.getElementById('yearOfBirthInput');
    const regionInput = document.getElementById('regionInput');
    const resultsSection = document.getElementById('results');
    const analysisOutput = document.getElementById('analysisOutput');
    const recommendationOutput = document.getElementById('recommendationOutput');
    const themeToggle = document.getElementById('themeToggle');

    // Predefined list of symptoms with their IDs
    const symptomMap = {
        'fever': 10,
        'headache': 15,
        'nausea': 20,
        'cough': 25,
        'fatigue': 30,
        'sore throat': 35,
        'shortness of breath': 40,
        'body ache': 45,
        'dizziness': 50,
        'chest pain': 55
    };

    async function fetchWithRetry(url, options, maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                const response = await fetch(url, options);
                if (response.ok) return response;
                
                if (response.status === 429) {
                    const retryAfter = response.headers.get('Retry-After') || 1;
                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                    continue;
                }
                
                throw new Error(`HTTP error! status: ${response.status}`);
            } catch (error) {
                if (i === maxRetries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
            }
        }
    }

    // Event listener for form submission
    symptomForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent the default form submission behavior

        // Get the values from the input fields
        const symptoms = symptomsInput.value.split(',').map(symptom => symptom.trim().toLowerCase());
        const gender = genderInput.value;
        const yearOfBirth = yearOfBirthInput.value;
        const region = regionInput.value;

        // Validate the inputs
        if (!symptoms.length) return alert('Please enter your symptoms.');
        if (!gender) return alert('Please select your gender.');
        if (!yearOfBirth) return alert('Please enter your date of birth.');
        if (!region) return alert('Please select your region.');

        // Map symptom names to their corresponding IDs
        const symptomIds = symptoms.map(symptom => symptomMap[symptom]).filter(id => id !== undefined);
        if (!symptomIds.length) return alert('Please enter valid symptoms.');

        console.log('Submitting symptom IDs:', symptomIds); // Log the symptom IDs being submitted

        const API_URL = 'https://cd5sajsc77.execute-api.us-east-1.amazonaws.com/dev';

        try {
            // Send a POST request to the backend server with the symptom IDs, gender, date of birth, and region
            const response = await fetchWithRetry(`${API_URL}/analyze-symptoms`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                mode: 'cors', // Ensure CORS is enabled
                body: JSON.stringify({
                    symptoms: symptomIds,
                    gender,
                    yearOfBirth,
                    region,
                    temporalContext: 'acute' // Add default temporal context
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (response.ok) {
                // Display the diagnoses and recommendations if the response is successful
                analysisOutput.innerHTML = '<h3>Diagnoses:</h3>';
                data.diagnoses.forEach(d => {
                    analysisOutput.innerHTML += `
                        <div class="diagnosis">
                            <p><strong>Name:</strong> ${d.name}</p>
                            <p><strong>Specialty:</strong> ${d.specialty}</p>
                            <p><strong>Common:</strong> ${d.common ? 'Yes' : 'No'}</p>
                            <p><strong>Red Flag:</strong> ${d.redFlag ? 'Yes' : 'No'}</p>
                            <p><strong>Explanation:</strong> ${d.explanation}</p>
                            <p><strong>Description:</strong> ${d.description}</p>
                            <p><a href="${d.knowledgeUrl}" target="_blank">More Info</a></p>
                        </div>
                    `;
                });
                recommendationOutput.innerHTML = '<h3>Recommendation:</h3><p>Consult a healthcare provider.</p>';
                resultsSection.classList.remove('hidden');
                resultsSection.style.display = 'block'; // Ensure the results section is displayed
            } else {
                // Display the error message if the response is not successful
                analysisOutput.innerHTML = `<h3>Error:</h3><p>${data.error}</p>`;
                recommendationOutput.innerHTML = '';
                resultsSection.classList.remove('hidden');
                resultsSection.style.display = 'block'; // Ensure the results section is displayed
            }
        } catch (error) {
            console.error('API Error:', error);
            // Display the error message if there is an error in the request
            analysisOutput.innerHTML = `
                <div class="error-message">
                    <h3>Error</h3>
                    <p>Unable to analyze symptoms: ${error.message}</p>
                </div>`;
            recommendationOutput.innerHTML = '';
            resultsSection.classList.remove('hidden');
            resultsSection.style.display = 'block'; // Ensure the results section is displayed
        }
    });

    // Event listener for theme toggle
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
    });
});
