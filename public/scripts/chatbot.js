document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chatInput');
    const dateInput = document.getElementById('dateInput');
    const sendButton = document.getElementById('sendButton');
    const chatOutput = document.getElementById('chatOutput');
    const themeToggle = document.querySelectorAll('.theme-toggle input[name="theme"]');
    const genderSelection = document.getElementById('genderSelection');
    const regionSelection = document.getElementById('regionSelection');
    const chatInputContainer = document.getElementById('chatInputContainer');
    const restartButton = document.getElementById('restartButton');

    let userInputs = {
        symptoms: [],
        gender: '',
        yearOfBirth: '',
        region: '',
        symptomStart: '',
        pregnant: 'n'
    };


    let currentStep = 0;
    let triageStep = 0;
    // Add triage questions flow
    const triageQuestions = [
        "How quickly did your symptoms develop? (1=minutes/hours, 2=days, 3=weeks)",
        "How severe are your symptoms? (1=mild, 2=moderate, 3=severe)",
        "Are you experiencing any chest pain? (1=yes, 2=no)",
        "Are you having difficulty breathing? (1=yes, 2=no)",
        "Have you experienced any loss of consciousness? (1=yes, 2=no)",
        "Is there any bleeding that won't stop? (1=yes, 2=no)",
        "Have you experienced any sudden weakness or numbness? (1=yes, 2=no)"
    ];



    const userName = localStorage.getItem('userName') || 'User';
    
    // Update welcome message function
    const displayWelcomeMessage = async () => {
        let userName = localStorage.getItem('userName');
        
        // If no valid name is found, try to fetch from API
        if (!userName || userName === 'User') {
            const token = localStorage.getItem('authToken');
            if (token) {
                try {
                    const response = await fetch(`${apiUrl}/auth/profile`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    const data = await response.json();
                    if (data.fullName && data.fullName.trim()) {
                        userName = data.fullName;
                        localStorage.setItem('userName', userName);
                    }
                } catch (error) {
                    console.error('Failed to fetch user profile:', error);
                }
            }
        }

        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'bot-message');
        
        const currentHour = new Date().getHours();
        let greeting = currentHour < 12 ? 'Good morning' : 
                       currentHour < 18 ? 'Good afternoon' : 
                       'Good evening';
        
        const displayName = userName && userName !== 'User' ? userName : '';
        messageElement.innerHTML = displayName 
            ? `${greeting} ${displayName}! I am MediMentor. What symptoms are you experiencing?`
            : `${greeting}! I am MediMentor. What symptoms are you experiencing?`;
        
        chatOutput.appendChild(messageElement);
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
    };

    // Update steps array with personalized greeting
    const steps = [
        `I am MediMentor. What symptoms are you experiencing?`,
        'Thank you for sharing your symptoms. Could you tell me when they started?',
        'Please select your gender (male/female).',
        'Please enter your date of birth (YYYY-MM-DD).',
        'Please select your region (north-america, europe, asia, africa, south-america, australia).',
        'I\'m here to help with symptoms and diagnoses. Could you describe how you\'re feeling?'
    ];

    const addMessage = (message, sender) => {
        // Show typing indicator for bot messages
        let typingIndicator;
        if (sender === 'bot') {
            typingIndicator = document.createElement('div');
            typingIndicator.className = 'typing-indicator';
            typingIndicator.innerHTML = '<span></span><span></span><span></span>';
            chatOutput.appendChild(typingIndicator);
        }

        // Delay message appearance for bot messages
        setTimeout(() => {
            // Remove typing indicator if it exists
            if (typingIndicator) {
                typingIndicator.remove();
            }

            const messageElement = document.createElement('div');
            messageElement.classList.add('message', `${sender}-message`);
            messageElement.innerHTML = message;
            chatOutput.appendChild(messageElement);
            
            // Scroll to the new message
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, sender === 'bot' ? 1000 : 0); // Add delay for bot messages
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

    // Add these utility functions at the top level
    const parseRelativeDate = (input) => {
        const text = input.toLowerCase().trim();
        const today = new Date();
        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        
        // Handle "X days/weeks/months ago"
        const agoMatch = text.match(/(\d+)\s*(day|week|month|year)s?\s*ago/);
        if (agoMatch) {
            const [_, number, unit] = agoMatch;
            const date = new Date();
            switch (unit) {
                case 'day': date.setDate(date.getDate() - parseInt(number)); break;
                case 'week': date.setDate(date.getDate() - (parseInt(number) * 7)); break;
                case 'month': date.setMonth(date.getMonth() - parseInt(number)); break;
                case 'year': date.setFullYear(date.getFullYear() - parseInt(number)); break;
            }
            return { date, duration: `${number} ${unit}${number > 1 ? 's' : ''}` };
        }

        // Handle "yesterday", "today", etc.
        if (text === 'yesterday') {
            const date = new Date();
            date.setDate(date.getDate() - 1);
            return { date, duration: '1 day' };
        }
        if (text === 'today') {
            return { date: today, duration: 'today' };
        }

        // Handle day names (e.g., "last Monday")
        const dayMatch = text.match(/(last\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
        if (dayMatch) {
            const targetDay = daysOfWeek.indexOf(dayMatch[2]);
            const date = new Date();
            let diff = targetDay - date.getDay();
            if (diff >= 0 || dayMatch[1]) diff -= 7; // Go to previous week if it's "last" or the day has passed
            date.setDate(date.getDate() + diff);
            return { date, duration: `since ${dayMatch[2]}` };
        }

        // Handle "X weeks/months" without "ago"
        const timeMatch = text.match(/(\d+)\s*(day|week|month|year)s?/);
        if (timeMatch) {
            return parseRelativeDate(`${timeMatch[1]} ${timeMatch[2]}s ago`);
        }

        return null;
    };

    // Update the getBotResponse function
    const getBotResponse = (userMessage, step) => {
        const message = userMessage.toLowerCase();

        // Check for symptoms
        if (step === 0) {
            const userSymptoms = message.split(',').map(s => s.trim());
            const validSymptoms = userSymptoms.every(symptom => symptomMap[symptom]);
            if (validSymptoms) return null;
        }

        // Enhanced date understanding for step 1
        if (step === 1) {
            const parsedDate = parseRelativeDate(message);
            if (parsedDate) {
                userInputs.symptomStartDate = parsedDate.date;
                userInputs.symptomDuration = parsedDate.duration;
                return null;
            }
            // If we can't parse the date, ask for clarification
            return "Could you please specify when the symptoms started? For example: '2 days ago' or 'last Monday'";
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
                const parsedDate = parseRelativeDate(input);
                if (parsedDate) {
                    userInputs.symptomStart = parsedDate.duration;
                    userInputs.symptomStartFormatted = parsedDate.date.toISOString().split('T')[0];
                } else {
                    userInputs.symptomStart = input;
                }
                break;
            case 2:
                userInputs.gender = input.toLowerCase();
                // Check if female between 13-64
                const birthYear = parseInt(userInputs.yearOfBirth);
                const currentYear = new Date().getFullYear();
                const age = currentYear - birthYear;
                if (userInputs.gender === 'female' && age >= 13 && age <= 64) {
                    addMessage('Are you pregnant? (yes/no)', 'bot');
                    currentStep = 'pregnancy';
                    return;
                }
                break;
            case 'pregnancy':
                userInputs.pregnant = input.toLowerCase() === 'yes' ? 'y' : 'n';
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
            const payload = {
                ...userInputs,
                // Add formatted dates if available
                symptomStart: userInputs.symptomStartFormatted || userInputs.symptomStart,
                temporalContext: userInputs.symptomDuration || 'unspecified'
            };

            const API_URL = 'https://cd5sajsc77.execute-api.us-east-1.amazonaws.com/dev/analyze-symptoms';

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            const data = await response.json();

            if (response.ok) {
                const topDiagnosis = data.diagnoses[0];
                addDiagnosisToChat(topDiagnosis);
                
                if (data.triageUrl) {
                    currentStep = 'triage';
                    triageStep = 0;
                    addMessage(triageQuestions[triageStep], 'bot');
                } else if (!topDiagnosis.redFlag) {
                    addMessage('It seems like your symptoms are mild. Here are some friendly recommendations:\n- Stay hydrated\n- Get plenty of rest\n- Monitor your symptoms\n- Consult a healthcare professional if symptoms persist or worsen.', 'bot');
                }

            } else {
                addMessage(`Error: ${data.error}`, 'bot');
            }
        } catch (error) {
            addMessage(`Error: ${error.message}`, 'bot');
        }
    };

    function addDiagnosisToChat(diagnosis) {
        const severityClass = diagnosis.redFlag ? 'recommendation-severe' : 
                             diagnosis.common ? 'recommendation-mild' : 
                             'recommendation-moderate';
        
        const diagnosisHtml = `
            <div class="diagnosis">
                <div class="diagnosis-header">
                    <h3 class="diagnosis-name">${diagnosis.name}</h3>
                    <span class="diagnosis-specialty">${diagnosis.specialty}</span>
                </div>
                
                <div class="diagnosis-content">
                    <div class="diagnosis-status">
                        ${diagnosis.common ? '<span class="status-badge status-common">Common Condition</span>' : ''}
                        ${diagnosis.redFlag ? '<span class="status-badge status-red-flag">Requires Attention</span>' : ''}
                    </div>
                    
                    <p class="diagnosis-explanation">${diagnosis.explanation}</p>
                    <p class="diagnosis-description">${diagnosis.description}</p>
                    
                    <a href="${diagnosis.knowledgeUrl}" target="_blank" class="diagnosis-link">
                        Learn More About This Condition
                    </a>
                    
                    <div class="diagnosis-recommendation ${severityClass}">
                        <span class="recommendation-icon">
                            ${diagnosis.redFlag ? '⚠️' : diagnosis.common ? 'ℹ️' : '🏥'}
                        </span>
                        <span class="recommendation-text">${diagnosis.recommendation}</span>
                    </div>
                </div>
            </div>
        `;

        addMessage(diagnosisHtml, 'bot');
    }

    const resetConversation = () => {
        dateInput.classList.add('hidden');
        genderSelection.classList.add('hidden');
        regionSelection.classList.add('hidden');
        chatInputContainer.classList.remove('hidden');

        // Clear input fields
        chatInput.value = '';
        dateInput.value = '';

        // Clear all chat messages except the first one
        while (chatOutput.childNodes.length > 1) {
            chatOutput.removeChild(chatOutput.lastChild);
        }
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
    themeToggle.forEach(radio => {
        radio.addEventListener('change', (event) => {
            const selectedTheme = event.target.value;
            localStorage.setItem('theme', selectedTheme);
            applyTheme(selectedTheme);
        });
    });

    const applyTheme = (theme) => {
        if (theme === 'system') {
            const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)").matches;
            theme = prefersDarkScheme ? 'dark' : 'light';
        }
        document.documentElement.setAttribute('data-theme', theme);
    };

    const savedTheme = localStorage.getItem('theme') || 'system';
    document.querySelector(`.theme-toggle input[value="${savedTheme}"]`).checked = true;
    applyTheme(savedTheme);

    // Event listener for restart button
    restartButton.addEventListener('click', resetConversation);

    // Call displayWelcomeMessage instead of first step message
    displayWelcomeMessage();
});
