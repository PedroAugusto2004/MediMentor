import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cors from 'cors';
import { GoogleAuth } from 'google-auth-library';
import fs from 'fs';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

app.post('/analyze-symptoms', async (req, res) => {
    const { symptoms } = req.body;

    try {
        const accessToken = await getAccessToken();
        const response = await fetch(`https://healthcare.googleapis.com/v1/projects/${process.env.GOOGLE_PROJECT_ID}/locations/${process.env.YOUR_LOCATION}/datasets/${process.env.YOUR_DATASET}/fhirStores/${process.env.YOUR_FHIR_STORE}/fhir/Observation`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
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
                    reference: `Patient/${process.env.YOUR_PATIENT_ID}`
                },
                valueString: symptoms
            })
        });

        const data = await response.json();
        console.log('API Response:', data); // Log the API response for debugging

        if (data.issue) {
            console.error('API Issue:', JSON.stringify(data.issue, null, 2));
            return res.status(400).json({ error: data.issue });
        }

        res.json({
            diagnosis: data.diagnosis || 'Unknown',
            recommendation: data.recommendation || 'Consult a healthcare provider.'
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred while analyzing symptoms.' });
    }
});

async function getAccessToken() {
    const credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_CREDENTIALS_PATH, 'utf8'));
    const auth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    return accessToken.token;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
