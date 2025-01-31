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

// Add symptom ID to name mapping
const symptomIdToName = {
    '10': 'fever',
    '15': 'headache',
    '20': 'nausea',
    '25': 'cough',
    '30': 'fatigue',
    '35': 'sore throat',
    '40': 'shortness of breath',
    '45': 'body ache',
    '50': 'dizziness',
    '55': 'chest pain'
};

// Update symptom severity mapping with IDs
const symptomSeverity = {
    '10': { // fever
        severity: 'moderate',
        commonCauses: ['viral infection', 'common cold', 'flu'],
        requiresMoreSymptoms: true,
        name: 'fever'
    },
    '25': { // cough
        severity: 'mild',
        commonCauses: ['common cold', 'allergies', 'upper respiratory infection'],
        requiresMoreSymptoms: true,
        name: 'cough'
    },
    '55': { // chest pain
        severity: 'severe',
        commonCauses: ['anxiety', 'muscle strain', 'respiratory infection'],
        requiresEmergency: true,
        name: 'chest pain'
    }
    // Add more symptoms as needed
};

// Add helper function for processing temporal information
function processTemporalContext(symptomStart, temporalContext) {
    // Convert relative dates to Isabel API format
    if (temporalContext) {
        if (temporalContext.includes('day')) return 'acute';
        if (temporalContext.includes('week')) return 'subacute';
        if (temporalContext.includes('month') || temporalContext.includes('year')) return 'chronic';
    }
    
    // Default to acute if we can't determine
    return 'acute';
}

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

// Helper function to calculate age group
function calculateAgeGroup(yearOfBirth) {
    const birthYear = parseInt(yearOfBirth.split('-')[0]);
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    
    if (age < 18) return 'pediatric';
    if (age >= 65) return 'elderly';
    return 'adult';
}

// Helper function to generate appropriate recommendations
function getRecommendation(isRedFlag, isCommon) {
    if (isRedFlag) {
        return 'This condition requires immediate medical attention. Please seek emergency care.';
    }
    if (isCommon) {
        return 'While this is a common condition, it\'s recommended to consult with a healthcare provider for proper evaluation and treatment.';
    }
    return 'Please consult with a healthcare provider for proper evaluation and treatment of your symptoms.';
}

function validateSymptomCombination(symptoms, diagnosisName) {
    // Less strict validation for common symptoms
    if (symptoms.length === 1) {
        const symptomId = symptoms[0];
        const severity = symptomSeverity[symptomId];
        if (severity?.requiresMoreSymptoms) {
            // Only filter out severe conditions for mild symptoms
            const diagLower = diagnosisName.toLowerCase();
            const severeConditions = [
                'severe', 'critical', 'emergency', 'failure', 'hemorrhage',
                'toxic', 'septic', 'malignant', 'crisis'
            ];
            return !severeConditions.some(term => diagLower.includes(term));
        }
    }
    return true;
}

function validateDiagnosisSeverity(symptoms, diagnosis) {
    // More lenient severity validation
    const maxSymptomSeverity = symptoms.reduce((max, symptomId) => {
        const severity = symptomSeverity[symptomId]?.severity || 'moderate';
        return severity === 'severe' ? severity : max;
    }, 'mild');

    // Only filter out red flag conditions for explicitly mild symptoms
    if (maxSymptomSeverity === 'mild' && diagnosis.red_flag === 'true') {
        const isSingleMildSymptom = symptoms.length === 1 && 
            symptomSeverity[symptoms[0]]?.severity === 'mild';
        return !isSingleMildSymptom;
    }

    return true;
}

function validateRedFlag(symptoms, isRedFlag) {
    // More permissive red flag validation
    if (!isRedFlag) return false;
    
    // Check if any symptom is severe or if there are multiple symptoms
    return symptoms.some(id => symptomSeverity[id]?.requiresEmergency) || 
           symptoms.length > 1;
}

function generateExplanation(symptomNames, diagnosis, gender, yearOfBirth, region, symptomStart) {
    try {
        return `Based on your reported symptoms (${symptomNames.join(', ')}), ` +
               `considering your ${calculateAgeGroup(yearOfBirth)} age group and ${gender} gender, ` +
               `this condition appears to be a ${diagnosis.common_diagnosis ? 'common' : 'possible'} cause. ` +
               `The diagnosis takes into account your location (${region}) and symptom onset (${symptomStart}).`;
    } catch (error) {
        return 'Explanation could not be generated due to missing information.';
    }
}

function generateDescription(diagnosisName, symptoms) {
    try {
        const symptomNames = symptoms
            .map(id => symptomIdToName[id])
            .filter(name => name)
            .join(', ');

        return `${diagnosisName} is a condition that may be associated with ${symptomNames}. ` +
               `Please consult a healthcare provider for proper evaluation and treatment.`;
    } catch (error) {
        return 'Description could not be generated due to missing information.';
    }
}

function generateRecommendation(symptoms, diagnosis) {
    const severityLevel = symptoms.some(id => symptomSeverity[id]?.requiresEmergency) ? 'severe' :
                         symptoms.some(id => symptomSeverity[id]?.severity === 'moderate') ? 'moderate' : 'mild';

    switch (severityLevel) {
        case 'severe':
            return 'Seek immediate medical attention at the nearest emergency facility.';
        case 'moderate':
            return 'Schedule an appointment with your healthcare provider within the next few days.';
        default:
            return 'Monitor your symptoms and consult a healthcare provider if they worsen or persist.';
    }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
