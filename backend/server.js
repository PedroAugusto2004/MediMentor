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

// Fetch Isabel API key
async function getIsabelApiKey() {
    try {
        const command = new GetParameterCommand({
            Name: '/medimentor/isabel/api-key',
            WithDecryption: true,
        });
        const response = await ssmClient.send(command);
        console.log('SSM Parameter Response:', response);
        return response.Parameter.Value;
    } catch (error) {
        console.error('Error fetching Isabel API key:', error);
        throw new Error('Failed to retrieve API key');
    }
}

// Fetch and cache regions dynamically
let cachedRegions = null;
async function getRegions() {
    if (!cachedRegions) {
        try {
            const apiKey = await getIsabelApiKey();
            const response = await axios.get('https://apiscsandbox.isabelhealthcare.com/v3/regions', {
                params: { language: 'en', web_service: 'json' },
                headers: { Authorization: apiKey }
            });
            console.log('Regions API Response:', response.data);
            cachedRegions = response.data.travel_history.region.reduce((map, region) => {
                map[region.region_name.toLowerCase()] = region.region_id;
                return map;
            }, {});
            console.log('Cached Regions:', cachedRegions);
        } catch (error) {
            console.error('Error fetching regions:', error.response?.data || error.message);
            throw new Error('Failed to retrieve regions');
        }
    }
    return cachedRegions;
}

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

// Analyze symptoms
async function analyzeSymptoms({ symptoms, gender, yearOfBirth, region, pregnant }) {
    try {
        const regions = await getRegions();
        const normalizedRegion = region.toLowerCase();
        const regionId = regions[normalizedRegion];
        if (!regionId) {
            const validRegions = Object.keys(regions).join(', ');
            throw new Error(`Invalid region: "${region}". Valid options are: ${validRegions}`);
        }

        // Format DOB as YYYYMMDD
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
        console.log('Diagnosis API Request URL:', url);

        const response = await axios.get(url, {
            headers: { Authorization: apiKey },
        });

        console.log('Diagnosis API Response:', response.data);
        return {
            diagnoses: response.data?.diagnoses_checklist?.diagnoses || [],
            triageUrl: response.data?.diagnoses_checklist?.triage_api_url,
        };
    } catch (error) {
        console.error('Analyze Symptoms Error:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
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
- Possible Diagnoses: ${data.diagnosis.diagnoses.map(d => `${d.name} (${d.probability || 'N/A'}%)`).join(', ')}`;
}

// Chat endpoint
app.post('/chat', async (req, res) => {
    try {
        const { sessionId, message } = req.body;
        if (!sessionId) return res.status(400).json({ error: 'Session ID required' });

        let session = await getSession(sessionId) || {
            state: states.INIT,
            data: { symptoms: [], gender: '', yearOfBirth: '', region: '', pregnant: 'n', history: '' },
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
                    session.data.gender = message.toLowerCase().startsWith('m') ? 'm' : 'f';
                    responseText = 'Thanks! What’s your year of birth? (e.g., 1990)';
                } else if (!session.data.yearOfBirth) {
                    if (!/^\d{4}$/.test(message)) {
                        responseText = 'Please enter a valid year (e.g., 1990).';
                    } else {
                        session.data.yearOfBirth = message;
                        responseText = 'Which region are you in? (e.g., North America)';
                    }
                } else if (!session.data.region) {
                    const regionKey = message.toLowerCase();
                    const regions = await getRegions();
                    if (!regions[regionKey]) {
                        responseText = `Invalid region. Try one of: ${Object.keys(regions).join(', ')}`;
                    } else {
                        session.data.region = regionKey;
                        session.state = states.HISTORY;
                        responseText = 'Do you have any past medical conditions or allergies? (If none, say "none")';
                    }
                }
                break;

            case states.HISTORY:
                session.data.history = message;
                if (session.data.gender === 'f' && !session.data.pregnantConfirmed) {
                    responseText = 'Are you pregnant? (yes/no)';
                    session.data.pregnantConfirmed = true;
                } else {
                    session.state = states.CONFIRM;
                    responseText = `Summary: Symptoms: ${session.data.symptoms.join(', ')}, Gender: ${data.gender === 'm' ? 'Male' : 'Female'}, Born: ${session.data.yearOfBirth}, Region: ${session.data.region}, Pregnant: ${session.data.pregnant}. Correct? (yes/no)`;
                }
                break;

            case states.CONFIRM:
                if (message.toLowerCase() === 'yes') {
                    session.state = states.DIAGNOSE;
                    const diagnosis = await analyzeSymptoms(session.data);
                    responseText = `Possible conditions: ${diagnosis.diagnoses.map(d => d.name).join(', ')}. Discuss with a doctor. Want a detailed report?`;
                    session.data.diagnosis = diagnosis;
                } else {
                    responseText = 'Let’s fix that. What’s your main issue today?';
                    session.state = states.SYMPTOMS;
                    session.data = { symptoms: [], gender: '', yearOfBirth: '', region: '', pregnant: 'n', history: '' };
                }
                break;

            case states.DIAGNOSE:
                if (message.toLowerCase() === 'yes') {
                    responseText = generateDoctorReport(session.data);
                } else {
                    responseText = 'Okay, let me know if you need more help!';
                }
                break;

            default:
                responseText = 'Something went wrong. Let’s start over. What’s your main issue?';
                session.state = states.SYMPTOMS;
        }

        if (session.state === states.HISTORY && session.data.gender === 'f' && message.toLowerCase().startsWith('y')) {
            session.data.pregnant = 'y';
            session.state = states.CONFIRM;
            responseText = `Summary: Symptoms: ${session.data.symptoms.join(', ')}, Gender: ${data.gender === 'm' ? 'Male' : 'Female'}, Born: ${session.data.yearOfBirth}, Region: ${session.data.region}, Pregnant: Yes. Correct? (yes/no)`;
        }

        await saveSession(sessionId, session);
        res.json({ message: responseText, state: session.state });
    } catch (error) {
        console.error('Chat Error:', error);
        res.status(500).json({ error: 'Something went wrong. Try again later.' });
    }
});

app.post('/process-triage', async (req, res) => {
    try {
        const { answers, triageUrl } = req.body;
        const response = await axios.get(
            `${triageUrl}&${answers.map((a, i) => `Q${i + 1}=${a}`).join('&')}`,
            { headers: { Authorization: await getIsabelApiKey() } }
        );
        res.json(response.data);
    } catch (error) {
        console.error('Triage Error:', error);
        res.status(500).json({ error: 'Error processing triage.' });
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
        // Pretty-print JSON response
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

export const handler = serverless(app);