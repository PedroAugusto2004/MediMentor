import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import cors from 'cors';

// Load environment variables from .env file
dotenv.config();

const app = express();
app.use(express.json()); // Middleware to parse JSON bodies
app.use(cors()); // Middleware to enable CORS

const ISABEL_API_KEY = process.env.ISABEL_API_KEY || '4s21pzYoxqWZL6tG54g8g41G26R7PnT2';

// Map region names to their corresponding IDs
const regionMap = {
    'north-america': 1,
    'europe': 2,
    'asia': 3,
    'africa': 4,
    'south-america': 5,
    'australia': 6
};

// Endpoint to analyze symptoms
app.post('/analyze-symptoms', async (req, res) => {
    const { symptoms, gender, yearOfBirth, region, symptomStart } = req.body;

    console.log('Received symptoms:', symptoms); // Log the received symptoms for debugging

    // Validate the symptoms input
    if (!Array.isArray(symptoms) || symptoms.length === 0) {
        console.error('Invalid symptoms format:', symptoms); // Log the invalid format
        return res.status(400).json({ error: 'Invalid symptoms format. Expecting an array of symptom IDs.' });
    }

    // Map the region to its corresponding ID
    const regionId = regionMap[region.toLowerCase()];
    if (!regionId) {
        console.error('Invalid region:', region); // Log the invalid region
        return res.status(400).json({ error: 'Invalid region. Please select a valid region.' });
    }

    try {
        // Call Isabel API for symptom analysis
        const response = await axios.get('https://apiscsandbox.isabelhealthcare.com/v3/ranked_differential_diagnoses', {
            params: {
                language: 'en',
                dob: yearOfBirth.replace(/-/g, ''), // Format date as YYYYMMDD
                sex: gender.charAt(0), // Use 'm' or 'f'
                querytext: symptoms.join(','),
                region: regionId, // Use the mapped region ID
                symptom_start: symptomStart, // Include symptom start date
                web_service: 'json' // Ensure the response is in JSON format
            },
            headers: {
                'Content-Type': 'application/json',
                'Authorization': ISABEL_API_KEY // Include the API key in the headers without 'Bearer'
            }
        });

        const diagnosisData = response.data.diagnoses_checklist;
        console.log('Isabel API Response:', diagnosisData); // Log the API response for debugging

        // Check if diagnosis data is valid
        if (!diagnosisData || !Array.isArray(diagnosisData.diagnoses) || diagnosisData.diagnoses.length === 0) {
            return res.status(400).json({ error: 'No diagnosis data returned from API.' });
        }

        // Extract relevant information from the diagnosis data
        const diagnoses = diagnosisData.diagnoses.map(d => ({
            name: d.diagnosis_name,
            specialty: d.specialty,
            common: d.common_diagnosis,
            redFlag: d.red_flag,
            knowledgeUrl: d.knowledge_window_api_url,
            explanation: `Based on your symptoms (${symptoms.join(', ')}), age, gender, and symptom start date (${symptomStart}), this condition is a possible diagnosis.`,
            description: `This is a brief description of ${d.diagnosis_name}. For more information, please visit the provided link.`
        }));

        res.json({
            diagnoses: diagnoses
        });
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'An error occurred while analyzing symptoms.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
