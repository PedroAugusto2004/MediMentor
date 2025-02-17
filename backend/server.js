import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import cors from 'cors';
import serverless from 'serverless-http';
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

// Load environment variables from .env file
dotenv.config();

const app = express();
app.use(express.json()); // Middleware to parse JSON bodies
app.use(cors()); // Middleware to enable CORS

// Initialize SSM client
const ssmClient = new SSMClient({ region: process.env.AWS_REGION });

// Function to get Isabel API key from Parameter Store
async function getIsabelApiKey() {
    try {
        const command = new GetParameterCommand({
            Name: "/medimentor/isabel/api-key",
            WithDecryption: true
        });
        const response = await ssmClient.send(command);
        return response.Parameter.Value;
    } catch (error) {
        console.error('Error fetching Isabel API key:', error);
        throw error;
    }
}

// Handle GET requests for /analyze-symptoms
app.get('/analyze-symptoms', (req, res) => {
    res.json({ message: "GET request received successfully!" });
});

// Endpoint to analyze symptoms
app.post('/analyze-symptoms', async (req, res) => {
    const { symptoms, gender, yearOfBirth, region, symptomStart, temporalContext } = req.body;

    console.log('Received request data:', {
        symptoms,
        gender,
        yearOfBirth,
        region,
        symptomStart,
        temporalContext
    });

    // Validate all required inputs
    if (!symptoms || !gender || !yearOfBirth || !region) {
        return res.status(400).json({ 
            error: 'Missing required information. Please provide symptoms, gender, date of birth, and region.' 
        });
    }

    // Ensure symptoms is properly formatted
    if (!Array.isArray(symptoms) || symptoms.length === 0) {
        return res.status(400).json({ 
            error: 'Invalid symptoms format. Please provide at least one symptom.' 
        });
    }

    const regionId = regionMap[region.toLowerCase()];
    if (!regionId) {
        return res.status(400).json({ 
            error: 'Invalid region. Please select a valid region.' 
        });
    }

    try {
        // Fetch the API key securely
        const ISABEL_API_KEY = await getIsabelApiKey();
        // Format date as YYYYMMDD
        const formattedDOB = yearOfBirth.replace(/-/g, '');

        // Convert symptom IDs to names for logging
        const symptomNames = symptoms.map(id => symptomIdToName[id] || `unknown(${id})`);
        console.log('Processing symptoms:', symptomNames);

        // Create detailed query text from symptoms
        const queryText = symptoms
            .filter(symptom => symptom && symptom.trim()) // Remove empty symptoms
            .join(',');

        // Process temporal information
        const onset = processTemporalContext(symptomStart, temporalContext);

        const response = await axios.get('https://apiscsandbox.isabelhealthcare.com/v3/ranked_differential_diagnoses', {
            params: {
                language: 'en',
                dob: formattedDOB,
                sex: gender.charAt(0).toLowerCase(),
                querytext: queryText,
                region: regionId,
                symptom_start: onset,
                temporal_context: temporalContext || 'unspecified',
                web_service: 'json'
            },
            headers: {
                'Content-Type': 'application/json',
                'Authorization': ISABEL_API_KEY
            }
        });

        console.log('Isabel API request params:', response.config.params);

        const diagnosisData = response.data?.diagnoses_checklist;

        if (!diagnosisData?.diagnoses?.length) {
            return res.status(400).json({ 
                error: 'No diagnosis data available for the provided symptoms.' 
            });
        }

        // Filter and process diagnoses with more lenient validation
        const filteredDiagnoses = diagnosisData.diagnoses
            .filter(d => {
                if (!d || !d.diagnosis_name) return false;

                // Accept diagnoses that are either common or match symptom severity
                const isCommon = d.common_diagnosis === 'true';
                const matchesSeverity = validateDiagnosisSeverity(symptoms, d);
                const isValidCombination = validateSymptomCombination(symptoms, d.diagnosis_name);

                return (isCommon || matchesSeverity) && isValidCombination;
            })
            .map(d => ({
                name: d.diagnosis_name,
                specialty: d.specialty || 'General',
                common: d.common_diagnosis === 'true',
                redFlag: validateRedFlag(symptoms, d.red_flag === 'true'),
                knowledgeUrl: d.knowledge_window_api_url || '',
                explanation: generateExplanation(symptomNames, d, gender, yearOfBirth, region, symptomStart),
                description: generateDescription(d.diagnosis_name, symptoms),
                recommendation: generateRecommendation(symptoms, d)
            }))
            .slice(0, 10); // Limit to top 10 most relevant diagnoses

        if (filteredDiagnoses.length === 0) {
            return res.status(400).json({
                error: 'No matching diagnoses found. Please provide more specific symptoms.'
            });
        }

        res.json({ diagnoses: filteredDiagnoses });

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ 
            error: 'Error processing symptoms. Please try again.' 
        });
    }
});

// Export the app for AWS Lambda
export const handler = serverless(app);

