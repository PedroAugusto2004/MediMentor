import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const APIMEDIC_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6InBhNDA1MzY5QGdtYWlsLmNvbSIsInJvbGUiOiJVc2VyIiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvc2lkIjoiMTE3NjMiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3ZlcnNpb24iOiIxMDkiLCJodHRwOi8vZXhhbXBsZS5vcmcvY2xhaW1zL2xpbWl0IjoiMTAwIiwiaHR0cDovL2V4YW1wbGUub3JnL2NsYWltcy9tZW1iZXJzaGlwIjoiQmFzaWMiLCJodHRwOi8vZXhhbXBsZS5vcmcvY2xhaW1zL2xhbmd1YWdlIjoiZW4tZ2IiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL2V4cGlyYXRpb24iOiIyMDk5LTEyLTMxIiwiaHR0cDovL2V4YW1wbGUub3JnL2NsYWltcy9tZW1iZXJzaGlwc3RhcnQiOiIyMDI1LTAxLTE1IiwiaXNzIjoiaHR0cHM6Ly9hdXRoc2VydmljZS5wcmlhaWQuY2giLCJhdWQiOiJodHRwczovL2hlYWx0aHNlcnZpY2UucHJpYWlkLmNoIiwiZXhwIjoxNzM3MDc4MTg3LCJuYmYiOjE3MzcwNzA5ODd9.7l2bgxB5QUEnytPNeVjMAZoy7ospFxIoYsnyMYaYDKQ';

app.post('/analyze-symptoms', async (req, res) => {
    const { symptoms } = req.body;

    console.log('Received symptoms:', symptoms); // Log the received symptoms for debugging

    if (!Array.isArray(symptoms) || symptoms.some(isNaN)) {
        console.error('Invalid symptoms format:', symptoms); // Log the invalid format
        return res.status(400).json({ error: 'Invalid symptoms format. Expecting an array of symptom IDs.' });
    }

    try {
        const token = APIMEDIC_TOKEN;

        // Call Apimedic Health-Service for symptom analysis
        const response = await axios.get('https://healthservice.priaid.ch/diagnosis', {
            params: {
                symptoms: JSON.stringify(symptoms),
                gender: 'male',
                year_of_birth: 1991,
                format: 'json',
                language: 'en-gb'
            },
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const diagnosisData = response.data;
        console.log('Apimedic API Response:', diagnosisData); // Log the API response for debugging

        if (!Array.isArray(diagnosisData) || diagnosisData.length === 0) {
            return res.status(400).json({ error: 'No diagnosis data returned from API.' });
        }

        const diagnosis = diagnosisData[0]?.Issue?.Name || 'Unknown';
        const recommendation = diagnosisData[0]?.Specialisation?.[0]?.Name || 'Consult a healthcare provider.';

        res.json({
            diagnosis: diagnosis,
            recommendation: recommendation
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
