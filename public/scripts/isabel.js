document.addEventListener('DOMContentLoaded', () => {
    const symptomForm = document.getElementById('symptomForm');
    const symptomsInput = document.getElementById('symptomsInput');
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

    symptomForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const symptoms = symptomsInput.value.split(',').map(symptom => symptom.trim().toLowerCase());
        if (!symptoms.length) return alert('Please enter your symptoms.');

        // Map symptom names to their corresponding IDs
        const symptomIds = symptoms.map(symptom => symptomMap[symptom]).filter(id => id !== undefined);
        if (!symptomIds.length) return alert('Please enter valid symptoms.');

        console.log('Submitting symptom IDs:', symptomIds); // Log the symptom IDs being submitted

        try {
            const response = await fetch('http://localhost:3000/analyze-symptoms', { // Update URL to match backend server
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ symptoms: symptomIds })
            });

            const data = await response.json();

            if (response.ok) {
                analysisOutput.textContent = `Diagnosis: ${data.diagnosis}`;
                recommendationOutput.textContent = `Recommendation: ${data.recommendation}`;
                resultsSection.classList.remove('hidden');
                resultsSection.style.display = 'block'; // Ensure the results section is displayed
            } else {
                analysisOutput.textContent = `Error: ${data.error}`;
                recommendationOutput.textContent = '';
                resultsSection.classList.remove('hidden');
                resultsSection.style.display = 'block'; // Ensure the results section is displayed
            }
        } catch (error) {
            analysisOutput.textContent = `Error: ${error.message}`;
            recommendationOutput.textContent = '';
            resultsSection.classList.remove('hidden');
            resultsSection.style.display = 'block'; // Ensure the results section is displayed
        }
    });

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
    });
});
