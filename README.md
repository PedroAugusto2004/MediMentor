# MediMentor

MediMentor is an AI-powered health assistant that helps users analyze symptoms and receive personalized recommendations using advanced medical APIs. This project is powered by **Isabel Healthcare**, a leading provider of medical diagnosis tools. Learn more at [Isabel Healthcare](https://www.isabelhealthcare.com).

## How MediMentor Helps
MediMentor is designed to assist both **patients** and **healthcare professionals**:
- **For Patients**: Provides an easy way to analyze symptoms and receive possible conditions, helping users understand their health concerns before consulting a doctor.
- **For Doctors**: Enhances diagnostic accuracy by offering AI-powered differential diagnosis support, reducing the chances of misdiagnosis and improving patient outcomes.

## Features
- AI-driven symptom analysis powered by **Isabel Healthcare**
- Secure authentication with AWS Cognito
- Backend hosted on AWS Lambda
- Frontend deployed via AWS Amplify
- Integration with medical APIs such as Isabel Healthcare

## Screenshots
![Home Page](path/to/homepage-screenshot.png)
![Symptom Analysis](path/to/symptom-analysis.png)

## Demo Video
[![Watch the Demo](path/to/video-thumbnail.png)](path/to/demo-video.mp4)

## Deployment
MediMentor is deployed using AWS services:
- **Frontend**: AWS Amplify
- **Backend**: AWS Lambda with API Gateway

To deploy the project:
```sh
# Deploy frontend to AWS Amplify
amplify publish

# Deploy backend to AWS Lambda
serverless deploy
```

## Technologies Used
- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, AWS Lambda
- **Authentication**: AWS Cognito
- **Hosting**: AWS Amplify
- **Medical API**: [Isabel Healthcare](https://www.isabelhealthcare.com)

## License
This project is licensed under the MIT License.
