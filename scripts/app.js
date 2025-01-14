document.addEventListener('DOMContentLoaded', () => {
    const symptomForm = document.getElementById('symptomForm');
    const symptomsInput = document.getElementById('symptomsInput');
    const resultsSection = document.getElementById('results');
    const analysisOutput = document.getElementById('analysisOutput');

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
        const response = await fetch('https://healthcare.googleapis.com/v1/projects/medimentor-447317/locations/global/datasets/YOUR_DATASET/fhirStores/YOUR_FHIR_STORE/fhir/Observation', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${await getAccessToken()}`,
                'Content-Type': 'application/fhir+json'
            },
            body: JSON.stringify({
                resourceType: 'Observation',
                status: 'preliminary',
                code: {
                    coding: [{
                        system: 'http://loinc.org',
                        code: '75325-1',
                        display: 'Symptom'
                    }]
                },
                subject: {
                    reference: 'Patient/YOUR_PATIENT_ID'
                },
                valueString: symptoms
            })
        });

        const data = await response.json();
        console.log('API Response:', data); // Log the API response for debugging

        // Assuming the API response contains fields 'diagnosis' and 'recommendation'
        return {
            diagnosis: data.diagnosis || 'Unknown',
            recommendation: data.recommendation || 'Consult a healthcare provider.'
        };  
    }

    async function getAccessToken() {
        const credentials = {
            client_id: '112250990882071303714',
            client_secret: 'YOUR_CLIENT_SECRET',
            refresh_token: 'YOUR_REFRESH_TOKEN',
            grant_type: 'refresh_token'
        };

        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams(credentials)
        });

        const data = await response.json();
        return data.access_token;
    }
});
