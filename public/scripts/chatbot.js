document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chatInput');
    const sendButton = document.getElementById('sendButton');
    const chatOutput = document.getElementById('chatOutput');
    const themeToggle = document.getElementById('themeToggle');
    const genderSelection = document.getElementById('genderSelection');
    const regionSelection = document.getElementById('regionSelection');
    const chatInputContainer = document.getElementById('chatInputContainer');

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
        chatOutput.scrollTop = chatOutput.scrollHeight;
    };

    const getBotResponse = (userMessage) => {
        const message = userMessage.toLowerCase();

        // Check for symptoms
        const symptoms = ['fever', 'headache', 'nausea'];
        if (symptoms.some(symptom => message.includes(symptom))) {
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
        const botReply = getBotResponse(input);
        if (botReply) {
            addMessage(botReply, 'bot');
            return; // Pause the flow until a relevant response is received
        }

        switch (currentStep) {
            case 0:
                userInputs.symptoms = input.split(',').map(symptom => symptom.trim().toLowerCase());
                break;
            case 1:
                userInputs.symptomStart = input;
                break;
            case 2:
                userInputs.gender = input.toLowerCase();
                break;
            case 3:
                userInputs.yearOfBirth = input;
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
        } else if (currentStep === 4) {
            regionSelection.classList.remove('hidden');
            chatInputContainer.classList.add('hidden');
        } else {
            chatInputContainer.classList.remove('hidden');
            genderSelection.classList.add('hidden');
            regionSelection.classList.add('hidden');
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

    sendButton.addEventListener('click', () => {
        const userInput = chatInput.value.trim();
        if (!userInput) return;

        addMessage(userInput, 'user');
        handleUserInput(userInput);
        chatInput.value = '';
    });

    chatInput.addEventListener('keypress', (event) => {
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

    // Start the conversation
    addMessage(steps[currentStep], 'bot');
});
