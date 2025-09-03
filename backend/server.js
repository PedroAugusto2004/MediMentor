/**
 * MediMentor Backend Server
 * AWS Lambda serverless backend for symptom analysis and user management
 * Integrates with Isabel Healthcare API for medical diagnosis
 */

import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import serverless from 'serverless-http';
import cors from 'cors';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { DynamoDBClient, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'Access-Control-Allow-Origin'],
    credentials: true
}));

// CORS headers
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Origin,Accept,Access-Control-Allow-Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
});

// Initialize AWS clients
const ssmClient = new SSMClient({ region: process.env.AWS_REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });

/**
 * Retrieves the Isabel Healthcare API key from AWS Systems Manager Parameter Store
 * @returns {Promise<string>} The API key for Isabel Healthcare
 * @throws {Error} If the API key cannot be retrieved
 */
async function getIsabelApiKey() {
    try {
        const command = new GetParameterCommand({
            Name: '/medimentor/isabel/api-key',
            WithDecryption: true,
        });
        const response = await ssmClient.send(command);

        return response.Parameter.Value;
    } catch (error) {
        console.error('Error fetching Isabel API key:', error);
        throw new Error('Failed to retrieve API key');
    }
}

// Update the region mapping to match user input with Isabel API regions
const regionMap = {
    'europe': '1',
    'north-america': '12',
    'asia': '9',
    'africa': '4',
    'south-america': '14',
    'australia': '16'
};

// Chatbot states
const states = {
    INIT: 'init',
    SYMPTOMS: 'symptoms',
    DEMOGRAPHICS: 'demographics',
    HISTORY: 'history',
    CONFIRM: 'confirm',
    DIAGNOSE: 'diagnose',
};

// Session management with DynamoDB
async function getSession(sessionId) {
    const command = new GetItemCommand({
        TableName: process.env.DYNAMODB_TABLE || 'MedimentorSessions',
        Key: marshall({ sessionId }),
    });
    const result = await dynamoClient.send(command);
    return result.Item ? unmarshall(result.Item) : null;
}

async function saveSession(sessionId, sessionData) {
    const command = new PutItemCommand({
        TableName: process.env.DYNAMODB_TABLE || 'MedimentorSessions',
        Item: marshall({ sessionId, ...sessionData, updatedAt: Date.now() }),
    });
    await dynamoClient.send(command);
}

/**
 * Analyzes symptoms using Isabel Healthcare API
 * @param {Object} params - Analysis parameters
 * @param {string[]} params.symptoms - Array of symptoms
 * @param {string} params.gender - User's gender
 * @param {string} params.yearOfBirth - User's year of birth
 * @param {string} params.region - User's region
 * @param {string} params.pregnant - Pregnancy status
 * @returns {Promise<Object>} Analysis results with diagnoses and recommendations
 */
async function analyzeSymptoms({ symptoms, gender, yearOfBirth, region, pregnant }) {
    try {
        // Normalize region: convert spaces to hyphens and make lowercase
        const normalizedRegion = region.toLowerCase().replace(/\s+/g, '-');
        const regionId = regionMap[normalizedRegion];
        
        if (!regionId) {
            const validRegions = Object.keys(regionMap).join(', ');
            throw new Error(`Invalid region: "${region}". Valid options are: ${validRegions}`);
        }

        // Format DOB as YYYYMMDD for Isabel API
        const dob = `${yearOfBirth}0101`; // Default to Jan 1
        const apiKey = await getIsabelApiKey();

        const params = {
            language: 'en',
            specialties: '28',
            dob: dob,
            sex: gender === 'male' ? 'm' : 'f',
            pregnant: pregnant || 'n',
            region: regionId,
            querytext: symptoms.join(','),
            suggest: 'Suggest+Differential+Diagnosis',
            flag: 'sortbyRW_advanced',
            searchType: '0',
            web_service: 'json',
        };
        const url = 'https://apiscsandbox.isabelhealthcare.com/v3/ranked_differential_diagnoses?' + new URLSearchParams(params).toString();


        const response = await axios.get(url, {
            headers: { Authorization: apiKey },
        });


        
        // Calculate percentages based on ranking
        const diagnoses = response.data?.diagnoses_checklist?.diagnoses || [];
        const totalDiagnoses = diagnoses.length;
        
        const diagnosesWithPercentages = diagnoses.map((d, index) => {
            // Calculate percentage based on position (inverse ranking)
            // First position gets highest percentage
            const percentage = ((totalDiagnoses - index) / totalDiagnoses).toFixed(4);
            
            return {
                diagnosis_name: d.diagnosis_name,
                specialty: d.specialty,
                red_flag: d.red_flag === 'true',
                common_diagnosis: d.common_diagnosis === 'true',
                knowledge_window_api_url: d.knowledge_window_api_url,
                percentage: parseFloat(percentage) // Convert to number
            };
        });

        return {
            diagnoses: diagnosesWithPercentages,
            triageUrl: response.data?.diagnoses_checklist?.triage_api_url,
        };
    } catch (error) {
        console.error('Analyze Symptoms Error:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            requestData: { symptoms, gender, yearOfBirth, region, pregnant }
        });
        throw new Error(error.response?.data?.error || error.message);
    }
}

// Generate doctor report
function generateDoctorReport(data) {
    return `Clinical Summary:
- Patient: ${data.gender === 'm' ? 'Male' : 'Female'}, born ${data.yearOfBirth}
- Region: ${data.region}
- Symptoms: ${data.symptoms.join(', ')}
- Pregnant: ${data.pregnant === 'y' ? 'Yes' : 'No'}
- History: ${data.history || 'None reported'}
- Possible Diagnoses: ${data.diagnosis.diagnoses.map(d => `${d.diagnosis_name}`).join(', ')}`;  // No probability in sandbox
}

// Chat endpoint
app.post('/chat', async (req, res) => {
    try {
        const { sessionId, message } = req.body;
        if (!sessionId) return res.status(400).json({ error: 'Session ID required' });

        let session = await getSession(sessionId) || {
            state: states.INIT,
            data: { symptoms: [], gender: '', yearOfBirth: '', region: '', pregnant: 'n', history: '', pregnantConfirmed: false },
        };

        let responseText = '';

        switch (session.state) {
            case states.INIT:
                responseText = 'Hello! I’m here to help with your health concerns. What’s the main issue you’re experiencing today?';
                session.state = states.SYMPTOMS;
                break;

            case states.SYMPTOMS:
                if (message.toLowerCase() === 'no') {
                    if (!session.data.symptoms.length) {
                        responseText = 'Please tell me at least one symptom to proceed.';
                    } else {
                        session.state = states.DEMOGRAPHICS;
                        responseText = 'Okay, no more symptoms. What’s your gender? (male/female)';
                    }
                } else {
                    session.data.symptoms.push(message);
                    responseText = `Noted: "${message}". Any other symptoms? If not, say "no".`;
                }
                break;

            case states.DEMOGRAPHICS:
                if (!session.data.gender) {
                    if (!['male', 'female'].includes(message.toLowerCase())) {
                        responseText = 'Please enter "male" or "female".';
                    } else {
                        session.data.gender = message.toLowerCase().startsWith('m') ? 'm' : 'f';
                        responseText = 'Thanks! What’s your year of birth? (e.g., 1990)';
                    }
                } else if (!session.data.yearOfBirth) {
                    if (!/^\d{4}$/.test(message)) {
                        responseText = 'Please enter a valid year (e.g., 1990).';
                    } else {
                        session.data.yearOfBirth = message;
                        responseText = 'Which region are you in? (e.g., North America)';
                    }
                } else if (!session.data.region) {
                    const regionKey = message.toLowerCase();
                    if (!regionMap[regionKey]) {
                        responseText = `Invalid region. Try one of: ${Object.keys(regionMap).join(', ')}`;
                    } else {
                        session.data.region = regionKey;
                        session.state = states.HISTORY;
                        responseText = 'Do you have any past medical conditions or allergies? (If none, say "none")';
                    }
                }
                break;

            case states.HISTORY:
                if (session.data.gender === 'f' && !session.data.pregnantConfirmed) {
                    if (!['yes', 'no'].includes(message.toLowerCase())) {
                        responseText = 'Please answer "yes" or "no" to the pregnancy question.';
                    } else {
                        session.data.pregnant = message.toLowerCase() === 'yes' ? 'y' : 'n';
                        session.data.pregnantConfirmed = true;
                        session.state = states.CONFIRM;
                        responseText = `Summary: Symptoms: ${session.data.symptoms.join(', ')}, Gender: ${session.data.gender === 'm' ? 'Male' : 'Female'}, Born: ${session.data.yearOfBirth}, Region: ${session.data.region}, Pregnant: ${session.data.pregnant === 'y' ? 'Yes' : 'No'}, History: ${session.data.history || 'None reported'}. Correct? (yes/no)`;
                    }
                } else {
                    session.data.history = message;
                    session.state = states.CONFIRM;
                    responseText = `Summary: Symptoms: ${session.data.symptoms.join(', ')}, Gender: ${session.data.gender === 'm' ? 'Male' : 'Female'}, Born: ${session.data.yearOfBirth}, Region: ${session.data.region}, Pregnant: ${session.data.pregnant === 'y' ? 'Yes' : 'No'}, History: ${session.data.history || 'None reported'}. Correct? (yes/no)`;
                }
                break;

            case states.CONFIRM:
                if (message.toLowerCase() === 'yes') {
                    session.state = states.DIAGNOSE;
                    const diagnosis = await analyzeSymptoms(session.data);
                    session.data.diagnosis = diagnosis;
                    responseText = `Possible conditions: ${diagnosis.diagnoses.map(d => d.diagnosis_name).join(', ')}. Discuss with a doctor. Want a detailed report? (yes/no)`;
                } else if (message.toLowerCase() === 'no') {
                    responseText = 'Let’s fix that. What’s your main issue today?';
                    session.state = states.SYMPTOMS;
                    session.data = { symptoms: [], gender: '', yearOfBirth: '', region: '', pregnant: 'n', history: '', pregnantConfirmed: false };
                } else {
                    responseText = 'Please answer "yes" or "no".';
                }
                break;

            case states.DIAGNOSE:
                if (message.toLowerCase() === 'yes') {
                    responseText = generateDoctorReport(session.data);
                } else if (message.toLowerCase() === 'no') {
                    responseText = 'Okay, let me know if you need more help!';
                } else {
                    responseText = 'Please answer "yes" or "no" to get a detailed report.';
                }
                break;

            default:
                responseText = 'Something went wrong. Let’s start over. What’s your main issue?';
                session.state = states.SYMPTOMS;
                session.data = { symptoms: [], gender: '', yearOfBirth: '', region: '', pregnant: 'n', history: '', pregnantConfirmed: false };
        }

        await saveSession(sessionId, session);
        res.json({ message: responseText, state: session.state, diagnoses: session.data.diagnosis?.diagnoses });
    } catch (error) {
        console.error('Chat Error:', error);
        res.status(500).json({ error: 'Something went wrong. Try again later.' });
    }
});

app.post('/process-triage', async (req, res) => {
    try {
        const { answers, triageUrl } = req.body;


        if (!triageUrl || !Array.isArray(answers) || answers.length !== 7) {
            return res.status(400).json({ error: 'Invalid input: triageUrl and 7 answers required' });
        }

        // Validate answer ranges
        const validRanges = [[1, 4], [1, 3], [1, 4], [1, 4], [1, 4], [1, 3], [1, 4]];
        for (let i = 0; i < answers.length; i++) {
            if (answers[i] < validRanges[i][0] || answers[i] > validRanges[i][1]) {
                return res.status(400).json({ error: `Answer ${i + 1} must be between ${validRanges[i][0]} and ${validRanges[i][1]}` });
            }
        }

        // Local weighted score
        const weights = [0.25, 0.15, 0.20, 0.15, 0.10, 0.10, 0.05];
        const maxValues = [4, 3, 4, 4, 4, 3, 4];
        let localScore = answers.reduce((sum, a, i) => {
            const normalized = (a - 1) / (maxValues[i] - 1);
            return sum + normalized * weights[i] * 150;
        }, 0);

        // API call
        const urlParams = new URLSearchParams(triageUrl.split('?')[1]);
        answers.forEach((a, i) => urlParams.set(`Q${i + 1}`, encodeURIComponent(a)));
        const fullUrl = `${triageUrl.split('?')[0]}?${urlParams.toString()}`;
        const response = await axios.get(fullUrl, {
            headers: { Authorization: await getIsabelApiKey() }
        });

        let triageScore = response.data.where_to_now?.triage_score;
        if (typeof triageScore === 'string' || isNaN(triageScore)) {

            triageScore = localScore;
        } else {
            triageScore = Math.round((parseInt(triageScore, 10) * 0.6) + (localScore * 0.4));
        }

        const careVenue = triageScore >= 100 ? 'Emergency Services' :
                         triageScore >= 70 ? 'Urgent Care' :
                         triageScore >= 40 ? 'Primary Care' : 'Self-Care/Telehealth';

        res.json({ score: triageScore, careVenue, localScore });
    } catch (error) {
        console.error('Triage Error:', error.message);
        res.status(500).json({ error: 'Error processing triage', details: error.message });
    }
});

app.get('/analyze-symptoms', (req, res) => res.json({ message: 'GET request received!' }));

app.post('/analyze-symptoms', async (req, res) => {
    try {
        const { symptoms, gender, yearOfBirth, region } = req.body;
        if (!symptoms || !gender || !yearOfBirth || !region) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const diagnosis = await analyzeSymptoms({ symptoms, gender, yearOfBirth, region });
        
        // Add this log before sending the response

        
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(diagnosis, null, 2));
    } catch (error) {
        console.error('Analyze Symptoms Endpoint Error:', error);
        res.status(500).json({ 
            error: 'Error analyzing symptoms', 
            details: error.message 
        });
    }
});

app.get('/predictive-text', async (req, res) => {
    try {
        const query = req.query.term || '';
        const apiKey = await getIsabelApiKey();
        
        const response = await axios.get(
            `https://apiscsandbox.isabelhealthcare.com/v3/predictive_text?` + 
            new URLSearchParams({
                language: 'en',
                searchterm: query,
                web_service: 'json'
            }).toString(),
            {
                headers: { Authorization: apiKey }
            }
        );
        
        res.json(response.data.predictive_text || []);
    } catch (error) {
        console.error('Predictive Text Error:', error);
        res.status(500).json({ error: 'Failed to fetch predictive text' });
    }
});

export const handler = serverless(app);