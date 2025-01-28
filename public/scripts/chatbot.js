document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chatInput');
    const dateInput = document.getElementById('dateInput');
    const sendButton = document.getElementById('sendButton');
    const chatOutput = document.getElementById('chatOutput');
    const themeToggle = document.getElementById('themeToggle');
    const genderSelection = document.getElementById('genderSelection');
    const regionSelection = document.getElementById('regionSelection');
    const chatInputContainer = document.getElementById('chatInputContainer');
    const restartButton = document.getElementById('restartButton');

    let userInputs = {
        symptoms: [],
        gender: '',
        yearOfBirth: '',
        region: '',
        symptomStart: ''
    };

    let currentStep = 0;

    const steps = [
        'Hello! I am MediMentor. What symptoms are you experiencing?',
        'Thank you for sharing your symptoms. Could you tell me when they started?',
        'Please select your gender (male/female).',
        'Please enter your date of birth (YYYY-MM-DD).',
        'Please select your region (north-america, europe, asia, africa, south-america, australia).',
        'I\'m here to help with symptoms and diagnoses. Could you describe how you\'re feeling?'
    ];

    const addMessage = (message, sender) => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);
        messageElement.textContent = message;
        chatOutput.appendChild(messageElement);
        
        // Scroll to the new message with smooth animation
        setTimeout(() => {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 100);
    };

    // Extended symptom map with more symptoms and their IDs
    const symptomMap = {
        'fever': '10',
        'headache': '15',
        'nausea': '20',
        'cough': '25',
        'fatigue': '30',
        'sore throat': '35',
        'shortness of breath': '40',
        'body ache': '45',
        'dizziness': '50',
        'chest pain': '55'
    };

    const getBotResponse = (userMessage, step) => {
        const message = userMessage.toLowerCase();

        // Check for symptoms
        if (step === 0) {
            const userSymptoms = message.split(',').map(s => s.trim());
            const validSymptoms = userSymptoms.every(symptom => symptomMap[symptom]);
            if (validSymptoms) return null;
        }

        // Check for symptom start date
        if (step === 1 && /\d+ (day|week|month|year)s? ago/.test(message)) {
            return null; // No need for a special response, proceed with the flow
        }

        // Check for gender
        if (step === 2 && (message === 'male' || message === 'female')) {
            return null; // No need for a special response, proceed with the flow
        }

        // Check for date of birth
        if (step === 3 && /^\d{4}-\d{2}-\d{2}$/.test(message)) {
            return null; // No need for a special response, proceed with the flow
        }

        // Check for region
        const regions = ['north-america', 'europe', 'asia', 'africa', 'south-america', 'australia'];
        if (step === 4 && regions.includes(message)) {
            return null; // No need for a special response, proceed with the flow
        }

        // Check for medications
        const medications = ['aspirin', 'ibuprofen', 'paracetamol'];
        if (medications.some(med => message.includes(med))) {
            return "I'm unable to provide medication advice. Could you tell me more about your symptoms instead?";
        }

        // Default response for unrelated inputs
        return "I can help you with symptom analysis. Could you describe your symptoms instead?";
    };

    const handleUserInput = async (input) => {
        const botReply = getBotResponse(input, currentStep);
        if (botReply) {
            addMessage(botReply, 'bot');
            return; // Pause the flow until a relevant response is received
        }

        switch (currentStep) {
            case 0:
                // Convert symptoms to their IDs
                const symptoms = input.split(',')
                    .map(symptom => symptom.trim().toLowerCase())
                    .map(symptom => symptomMap[symptom])
                    .filter(id => id); // Remove any undefined values
                userInputs.symptoms = symptoms;
                break;
            case 1:
                userInputs.symptomStart = input;
                break;
            case 2:
                userInputs.gender = input.toLowerCase();
                break;
            case 3:
                userInputs.yearOfBirth = input;
                chatInput.classList.remove('hidden');
                dateInput.classList.add('hidden');
                break;
            case 4:
                userInputs.region = input.toLowerCase();
                await analyzeSymptoms();
                return;
        }
        currentStep++;
        addMessage(steps[currentStep], 'bot');
        if (currentStep === 2) {
            genderSelection.classList.remove('hidden');
            chatInputContainer.classList.add('hidden');
        } else if (currentStep === 3) {
            chatInput.classList.add('hidden');
            dateInput.classList.remove('hidden');
        } else if (currentStep === 4) {
            regionSelection.classList.remove('hidden');
            chatInputContainer.classList.add('hidden');
        } else {
            chatInputContainer.classList.remove('hidden');
            genderSelection.classList.add('hidden');
            regionSelection.classList.add('hidden');
            chatInput.classList.remove('hidden');
            dateInput.classList.add('hidden');
        }
    };

    const analyzeSymptoms = async () => {
        addMessage('Analyzing your symptoms...', 'bot');
        try {
            const response = await fetch('http://localhost:3000/analyze-symptoms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userInputs)
            });

            const data = await response.json();

            if (response.ok) {
                data.diagnoses.forEach(d => {
                    addMessage(`Diagnosis: ${d.name}\nSpecialty: ${d.specialty}\nCommon: ${d.common ? 'Yes' : 'No'}\nRed Flag: ${d.redFlag ? 'Yes' : 'No'}\nExplanation: ${d.explanation}\nDescription: ${d.description}\nMore Info: ${d.knowledgeUrl}`, 'bot');
                });
                addMessage('Recommendation: Consult a healthcare provider.', 'bot');
            } else {
                addMessage(`Error: ${data.error}`, 'bot');
            }
        } catch (error) {
            addMessage(`Error: ${error.message}`, 'bot');
        }
    };

    const resetConversation = () => {
        // Reset user inputs
        userInputs = {
            symptoms: [],
            gender: '',
            yearOfBirth: '',
            region: '',
            symptomStart: ''
        };

        // Reset current step
        currentStep = 0;

        // Clear chat output
        chatOutput.innerHTML = '';

        // Reset UI elements
        chatInput.classList.remove('hidden');
        dateInput.classList.add('hidden');
        genderSelection.classList.add('hidden');
        regionSelection.classList.add('hidden');
        chatInputContainer.classList.remove('hidden');

        // Clear input fields
        chatInput.value = '';
        dateInput.value = '';

        // Start new conversation
        addMessage(steps[currentStep], 'bot');
    };

    sendButton.addEventListener('click', () => {
        const userInput = currentStep === 3 ? dateInput.value : chatInput.value.trim();
        if (!userInput) return;

        addMessage(userInput, 'user');
        handleUserInput(userInput);
        
        // Clear inputs and restore text input after date selection
        if (currentStep === 3) {
            dateInput.value = '';
            chatInput.classList.remove('hidden');
            dateInput.classList.add('hidden');
        }
        chatInput.value = '';
    });

    chatInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendButton.click();
        }
    });

    dateInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendButton.click();
        }
    });

    // Event listener for gender selection
    genderSelection.addEventListener('click', (event) => {
        if (event.target.classList.contains('optionButton')) {
            const gender = event.target.getAttribute('data-value');
            addMessage(gender, 'user');
            handleUserInput(gender);
            genderSelection.classList.add('hidden');
            chatInputContainer.classList.remove('hidden');
        }
    });

    // Event listener for region selection
    regionSelection.addEventListener('click', (event) => {
        if (event.target.classList.contains('optionButton')) {
            const region = event.target.getAttribute('data-value');
            addMessage(region, 'user');
            handleUserInput(region);
            regionSelection.classList.add('hidden');
            chatInputContainer.classList.remove('hidden');
        }
    });

    // Event listener for theme toggle
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
    });

    // Event listener for restart button
    restartButton.addEventListener('click', resetConversation);

    // Start the conversation
    addMessage(steps[currentStep], 'bot');
});
