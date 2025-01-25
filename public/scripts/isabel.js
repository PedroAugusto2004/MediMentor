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
        // Add more symptoms and their IDs here
    };

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

        try {
            // Send a POST request to the backend server with the symptom IDs, gender, date of birth, and region
            const response = await fetch('http://localhost:3000/analyze-symptoms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ symptoms: symptomIds, gender, yearOfBirth, region })
            });

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
            // Display the error message if there is an error in the request
            analysisOutput.innerHTML = `<h3>Error:</h3><p>${error.message}</p>`;
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
