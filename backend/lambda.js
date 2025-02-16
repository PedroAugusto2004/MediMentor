import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import express from 'express';
import serverless from 'serverless-http';
import axios from 'axios';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

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

// Rest of your server.js code here, but remove the dotenv config and ISABEL_API_KEY constant
// Copy everything from server.js except the dotenv import and configuration,
// and the app.listen() part at the bottom

// Export the handler
export const handler = serverless(app);