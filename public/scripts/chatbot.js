document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chatInput');
    const sendButton = document.getElementById('sendButton');
    const chatOutput = document.getElementById('chatOutput');
    const themeToggle = document.getElementById('themeToggle');

    let userInputs = {
        symptoms: [],
        gender: '',
        yearOfBirth: '',
        region: ''
    };

    let currentStep = 0;

    const steps = [
        'Hello! I am MediMentor. What symptoms are you experiencing?',
        'Please select your gender (male/female).',
        'Please enter your date of birth (YYYY-MM-DD).',
        'Please select your region (north-america, europe, asia, africa, south-america, australia).'
    ];

    const addMessage = (message, sender) => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);
        messageElement.textContent = message;
        chatOutput.appendChild(messageElement);
        chatOutput.scrollTop = chatOutput.scrollHeight;
    };

    const handleUserInput = async (input) => {
        switch (currentStep) {
            case 0:
                userInputs.symptoms = input.split(',').map(symptom => symptom.trim().toLowerCase());
                break;
            case 1:
                userInputs.gender = input.toLowerCase();
                break;
            case 2:
                userInputs.yearOfBirth = input;
                break;
            case 3:
                userInputs.region = input.toLowerCase();
                await analyzeSymptoms();
                return;
        }
        currentStep++;
        addMessage(steps[currentStep], 'bot');
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
        if (userInput) {
            addMessage(userInput, 'user');
            handleUserInput(userInput);
            chatInput.value = '';
        }
    });

    chatInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendButton.click();
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
