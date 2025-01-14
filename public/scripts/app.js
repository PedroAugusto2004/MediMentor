document.addEventListener('DOMContentLoaded', () => {
    const symptomForm = document.getElementById('symptomForm');
    const symptomsInput = document.getElementById('symptomsInput');
    const resultsSection = document.getElementById('results');
    const analysisOutput = document.getElementById('analysisOutput');
    const themeToggle = document.getElementById('themeToggle');

    symptomForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const symptoms = symptomsInput.value.trim();
        if (!symptoms) return alert('Please enter your symptoms.');

        const response = await analyzeSymptoms(symptoms);

        resultsSection.style.display = 'block';
        analysisOutput.innerHTML = `
            <p><strong>Symptoms:</strong> ${symptoms}</p>
            <p><strong>Diagnosis:</strong> ${response.diagnosis}</p>
            <p><strong>Recommendation:</strong> ${response.recommendation}</p>
            <p><strong>Warning:</strong> If symptoms worsen, please consult a healthcare provider. Ensure you are not allergic to any recommended medications.</p>
        `;
    });

    async function analyzeSymptoms(symptoms) {
        const response = await fetch('http://localhost:3000/analyze-symptoms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ symptoms })
        });

        const data = await response.json();
        console.log('API Response:', data); // Log the API response for debugging

        return {
            diagnosis: data.diagnosis || 'Unknown',
            recommendation: data.recommendation || 'Consult a healthcare provider.'
        };
    }

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
    });
});
