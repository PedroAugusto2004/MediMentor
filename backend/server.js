import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import serverless from 'serverless-http';
import cors from 'cors';
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());

// Enable CORS for all origins
app.use(cors());

// Manually set CORS headers for API Gateway proxy integration
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    
    // Handle preflight requests
    if (req.method === "OPTIONS") {
        return res.status(204).end();
    }
    
    next();
});

// Initialize SSM client
const ssmClient = new SSMClient({ region: process.env.AWS_REGION });

// Function to get Isabel API key
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

// Simple test route (GET)
app.get('/analyze-symptoms', (req, res) => {
    res.json({ message: "GET request received successfully!" });
});

// POST route to analyze symptoms
app.post('/analyze-symptoms', async (req, res) => {
    try {
        const { symptoms, gender, yearOfBirth, region } = req.body;
        if (!symptoms || !gender || !yearOfBirth || !region) {
            return res.status(400).json({ error: 'Missing required information.' });
        }

        const ISABEL_API_KEY = await getIsabelApiKey();

        const response = await axios.get('https://apiscsandbox.isabelhealthcare.com/v3/ranked_differential_diagnoses', {
            params: { language: 'en', dob: yearOfBirth.replace(/-/g, ''), sex: gender.charAt(0).toLowerCase(), querytext: symptoms.join(','), region },
            headers: { 'Authorization': ISABEL_API_KEY }
        });

        res.json({ diagnoses: response.data?.diagnoses_checklist?.diagnoses || [] });

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Error processing symptoms.' });
    }
});

// Export for AWS Lambda
export const handler = serverless(app);
