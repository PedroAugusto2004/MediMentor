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
    let triageAnswers = [];
    let triageUrl = '';
    let storedDiagnoses = [];
    
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
        'Please select your gender using the options below:',
        'Please enter your date of birth (MM/DD/YYYY):',
        'Please click one of the region options below:',
        'On a scale of 1 to 10, how severe are your symptoms?',
        'Do you have any additional symptoms such as fever or cough?',
        'Are there any factors that trigger or alleviate your symptoms?'
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
            
            // Check if this is a diagnosis-related message
            const isDiagnosisIntro = message.includes('diagnosis-intro');
            const isDiagnosisCard = message.includes('class="diagnosis');
            const isEndMessage = message.includes('end-chat-message');
            
            // Special handling for different message types
            if (isDiagnosisIntro) {
                // For the intro, scroll to show just the intro message
                setTimeout(() => {
                    messageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            } else if (isDiagnosisCard || isEndMessage) {
                // For actual diagnosis cards or end message, don't auto-scroll
                // Let the user scroll manually to view them
            } else {
                // For all other messages, scroll into view as normal
                messageElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }
        }, sender === 'bot' ? 1000 : 0);
    };

    // Utility functions for date parsing/formatting remain unchanged
    const parseRelativeDate = (input) => {
        const text = input.toLowerCase().trim();
        const today = new Date();
        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        
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

        if (text === 'yesterday') {
            const date = new Date();
            date.setDate(date.getDate() - 1);
            return { date, duration: '1 day' };
        }
        if (text === 'today') {
            return { date: today, duration: 'today' };
        }

        const dayMatch = text.match(/(last\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
        if (dayMatch) {
            const targetDay = daysOfWeek.indexOf(dayMatch[2]);
            const date = new Date();
            let diff = targetDay - date.getDay();
            if (diff >= 0 || dayMatch[1]) diff -= 7;
            date.setDate(date.getDate() + diff);
            return { date, duration: `since ${dayMatch[2]}` };
        }

        const timeMatch = text.match(/(\d+)\s*(day|week|month|year)s?/);
        if (timeMatch) {
            return parseRelativeDate(`${timeMatch[1]} ${timeMatch[2]}s ago`);
        }

        return null;
    };

    const formatDateToAmerican = (date) => {
        const [year, month, day] = date.split('-');
        return `${month}/${day}/${year}`;
    };

    const parseAmericanDate = (date) => {
        const [month, day, year] = date.split('/');
        return `${year}-${month}-${day}`;
    };

    const validateDate = (date) => {
        const regex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
        if (!regex.test(date)) return false;
        
        const [month, day, year] = date.split('/').map(Number);
        const d = new Date(year, month - 1, day);
        
        return d.getMonth() === month - 1 && 
               d.getDate() === day && 
               d.getFullYear() === year &&
               year >= 1900 && 
               year <= new Date().getFullYear();
    };

    dateInput.addEventListener('change', (event) => {
        const value = event.target.value;
        if (!validateDate(value)) {
            event.target.setCustomValidity('Please enter a valid date in MM/DD/YYYY format');
            return;
        }
        event.target.setCustomValidity('');
        const americanDate = formatDateToAmerican(event.target.value);
        console.log('American Date Format:', americanDate);
    });

    const processDateInput = () => {
        const americanDate = dateInput.value;
        const isoDate = parseAmericanDate(americanDate);
        console.log('ISO Date Format:', isoDate);
    };

    const getBotResponse = (userMessage, step) => {
        const message = userMessage.toLowerCase();

        if (step === 'pregnancy') {
            if (message === 'yes' || message === 'no') {
                return null;
            }
            return "Please answer with 'yes' or 'no'.";
        }

        if (step === 0) {
            const userSymptoms = message
                .split(/,|and|\+/g)
                .map(s => s.trim().toLowerCase())
                .filter(s => s.length > 0);

            if (userSymptoms.length === 0) {
                return "Please describe your symptoms. You can type to see suggestions and list multiple symptoms separated by commas.";
            }

            if (message.includes('?') || 
                /\b(hello|hi|hey|help|restart)\b/i.test(message) ||
                /\b(what|who|why|where|when|how)\b/.test(message) ||
                /\b(thanks|thank you|ok|okay|bye|goodbye)\b/i.test(message)) {
                return "I'm here to analyze your symptoms. Please tell me what symptoms you're experiencing. Start typing to see suggestions.";
            }

            const nonMedicalWords = /\b(weather|stock|movie|food|game|play|time|work|school)\b/i;
            if (nonMedicalWords.test(message)) {
                return "Please describe only your medical symptoms. For example: headache, fever, cough, etc.";
            }

            const commonDiagnoses = /\b(cancer|diabetes|covid|flu|arthritis|depression)\b/i;
            if (commonDiagnoses.test(message)) {
                return "Please describe your symptoms rather than a diagnosis. What symptoms are you experiencing?";
            }

            const conversationalPattern = /\b(can you|could you|would you|i want|i need|i would like)\b/i;
            if (conversationalPattern.test(message)) {
                return "Please directly state your symptoms. For example: headache, fever, cough, etc.";
            }

            return null;
        }

        if (step === 1) {
            const parsedDate = parseRelativeDate(message);
            if (parsedDate) {
                userInputs.symptomStartDate = parsedDate.date;
                userInputs.symptomDuration = parsedDate.duration;
                return null;
            }
            return "Could you please specify when the symptoms started? For example: '2 days ago' or 'last Monday'";
        }

        if (step === 2 && (message === 'male' || message === 'female')) {
            return null;
        }

        if (step === 3 && /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/.test(message)) {
            return null;
        }

        const regions = ['north-america', 'europe', 'asia', 'africa', 'south-america', 'australia'];
        if (step === 4 && regions.includes(message)) {
            return null;
        }

        if (step === 5 && /^[1-9]$|^10$/.test(message)) {
            return null;
        }

        if (step === 6) {
            return null;
        }

        if (step === 7) {
            return null;
        }

        const medications = ['aspirin', 'ibuprofen', 'paracetamol'];
        if (medications.some(med => message.includes(med))) {
            return "I'm unable to provide medication advice. Could you tell me more about your symptoms instead?";
        }

        return "I can help you with symptom analysis. Could you describe your symptoms instead?";
    };

    // Update handleUserInput function where inputs get disabled
    const handleUserInput = async (input) => {
        if (triageStep > 0 && triageStep <= 7) {
            const answer = parseInt(input);
            const validInputs = getValidTriageInputs(triageStep);
            const validNumbers = validInputs.map(n => parseInt(n));
            
            if (isNaN(answer) || !validNumbers.includes(answer)) {
                // Show appropriate error message based on the valid range for this question
                const maxOption = Math.max(...validNumbers);
                addMessage(`Please enter a number between 1 and ${maxOption} for this question.`, 'bot');
                return;
            }
            
            triageAnswers.push(answer);
    
            const questions = [
                "How quickly did your symptoms develop? (1: Minutes/Hours, 2: Days, 3: Weeks, 4: Months/Years)",
                "Are your symptoms getting worse, better, or staying the same? (1: Worse, 2: Better, 3: Same)",
                "How much pain or discomfort are you in? (1: None, 2: Mild, 3: Very Uncomfortable, 4: Unbearable)",
                "Are your symptoms stopping you from doing normal activities? (1: Not at all, 2: A little, 3: Quite a bit, 4: Completely)",
                "Have you taken anything to relieve your symptoms? Did it help? (1: Nothing taken, 2: No help, 3: Helped a little, 4: Helped a lot)",
                "Do you have any serious conditions like heart disease or diabetes? (1: No, 2: Yes but controlled, 3: Yes and uncontrolled)",
                "How worried are you about your symptoms? (1: Not worried, 2: Slightly, 3: Moderately, 4: Very worried)"
            ];
    
            if (triageStep < 7) {
                addMessage(triageQuestions[triageStep], 'bot');
                triageStep++;
                // Update placeholder for the new question
                updateTriagePlaceholder(triageStep);
            } else {
                await processTriage();
            }
            return;
        }
        
        // Handle triage questions separately - remove this block since it's replaced by the above code
        if (currentStep === 'triage') {
            const answer = input.trim();
            
            // Validate triage answer (should be 1-4)
            if (!/^[1-4]$/.test(answer)) {
                addMessage("Please enter a number between 1 and 4 to answer the question.", 'bot');
                return;
            }
            
            // Store the answer
            triageAnswers.push(answer);
            
            // Move to next question or process results
            if (triageStep < triageQuestions.length) {
                addMessage(triageQuestions[triageStep], 'bot');
                triageStep++;
            } else {
                // Process all triage answers and provide recommendation
                await processTriage();
            }
            return;
        }
        
        const botReply = getBotResponse(input, currentStep);
        if (botReply) {
            addMessage(botReply, 'bot');
            return;
        }
    
        switch (currentStep) {
            case 0:
                userInputs.symptoms = input
                    .toLowerCase()
                    .split(/,|and|\+/g)
                    .map(symptom => symptom.trim())
                    .filter(Boolean);
    
                const symptomConfirmation = `I understand you're experiencing: ${userInputs.symptoms.join(', ')}. When did these symptoms start?`;
                addMessage(symptomConfirmation, 'bot');
                currentStep++;
                return;
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
                // Remove pregnancy check here - move directly to DOB for all users
                currentStep = 3;
                addMessage(steps[currentStep], 'bot');
                configureDateInput();
                return;
            case 3:
                const dateValue = input;
                if (validateDate(dateValue)) {
                    userInputs.yearOfBirth = dateValue;
                    chatInput.classList.remove('hidden');
                    dateInput.classList.add('hidden');
                    
                    // Check if the user is female and within childbearing age (13-65)
                    if (userInputs.gender === 'female') {
                        const birthYear = parseInt(dateValue.split('/')[2]);
                        const currentYear = new Date().getFullYear();
                        const age = currentYear - birthYear;
                        
                        // Only ask pregnancy question for females of childbearing age (13-64)
                        if (age >= 13 && age < 65) {
                            addMessage('Are you currently pregnant? (yes/no)', 'bot');
                            currentStep = 'pregnancy';
                            chatInput.disabled = false;
                            chatInput.placeholder = "Type your message...";
                            chatInputContainer.classList.remove('hidden');
                            return;
                        }
                    }
                    // If not female of childbearing age, continue to next step
                    currentStep = 4;
                    addMessage(steps[currentStep], 'bot');
                    regionSelection.classList.remove('hidden');
                    chatInput.disabled = true;
                    chatInput.placeholder = "Chat is disabled";
                    chatInputContainer.classList.add('hidden');
                    return;
                }
                return;
            case 'pregnancy':
                const pregnancyResponse = input.toLowerCase();
                if (pregnancyResponse === 'yes' || pregnancyResponse === 'no') {
                    userInputs.pregnant = pregnancyResponse === 'yes' ? 'y' : 'n';
                    currentStep = 4;
                    addMessage(steps[currentStep], 'bot');
                    regionSelection.classList.remove('hidden');
                    chatInput.disabled = true;
                    chatInput.placeholder = "Chat is disabled";
                    chatInputContainer.classList.add('hidden');
                } else {
                    addMessage('Please answer with yes or no.', 'bot');
                }
                return;
            case 4:
                userInputs.region = input.toLowerCase();
                break;
            case 5:
                userInputs.severity = input;
                break;
            case 6:
                userInputs.additionalSymptoms = input;
                break;
            case 7:
                userInputs.triggers = input;
                await analyzeSymptoms();
                return;
        }
        currentStep++;
        addMessage(steps[currentStep], 'bot');
        if (currentStep === 2) {
            genderSelection.classList.remove('hidden');
            chatInput.disabled = true;
            chatInput.placeholder = "Chat is disabled";
            chatInputContainer.classList.add('hidden');
        } else if (currentStep === 3) {
            configureDateInput();
        } else if (currentStep === 4) {
            regionSelection.classList.remove('hidden');
            chatInput.disabled = true;
            chatInput.placeholder = "Chat is disabled";
            chatInputContainer.classList.add('hidden');
        } else {
            chatInputContainer.classList.remove('hidden');
            genderSelection.classList.add('hidden');
            regionSelection.classList.add('hidden');
            chatInput.classList.remove('hidden');
            dateInput.classList.add('hidden');
            chatInput.disabled = false;
            chatInput.placeholder = "Type your message...";
        }
    };

    // Updated analyzeSymptoms function with new API endpoint and diagnosis mapping
    const analyzeSymptoms = async () => {
        const loadingSpinner = document.getElementById('loadingSpinner');
        loadingSpinner.classList.add('visible');
        
        try {
            const symptomNames = userInputs.symptoms
                .map(symptom => symptom.trim().toLowerCase())
                .filter(Boolean);

            const payload = {
                symptoms: symptomNames,
                gender: userInputs.gender.toLowerCase(),
                yearOfBirth: userInputs.yearOfBirth.split('/')[2],
                region: userInputs.region.toLowerCase().replace('-', ' ')
            };

            console.log('Request payload:', payload);

            const API_URL = 'https://ozx557ly3h.execute-api.us-east-1.amazonaws.com/dev/analyze-symptoms';

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                mode: 'cors',
                body: JSON.stringify(payload)
            });

            console.log('Response status:', response.status);

            const data = await response.json();
            
            // Add these logs after parsing the response
            console.log('Received Diagnosis Data:', data);
            console.log('Received Triage URL:', data.triageUrl);

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${data.error || 'Unknown error'}`);
            }

            if (!data.diagnoses || !Array.isArray(data.diagnoses)) {
                throw new Error('Invalid response format: missing diagnoses array');
            }

            // Store triage URL from diagnosis response
            triageUrl = data.triageUrl;

            // CHANGED: Store the diagnoses instead of displaying them
            storedDiagnoses = data.diagnoses
                .sort((a, b) => b.percentage - a.percentage)
                .slice(0, 5)
                .map(diagnosis => ({
                    ...diagnosis,
                    percentage: diagnosis.percentage
                }));
            
            // FIXED: Make sure to hide loading spinner before showing triage questions
            loadingSpinner.classList.remove('visible');
            
            // Start triage questions immediately without showing diagnoses
            addMessage(triageQuestions[0], 'bot');
            currentStep = 'triage';
            triageStep = 1;
            chatInput.disabled = false;
            
            // Update placeholder based on current question options
            updateTriagePlaceholder(triageStep);
            
            chatInput.maxLength = 1;
            chatInput.pattern = "[1-4]";
            chatInput.inputMode = "numeric";
            chatInputContainer.classList.remove('hidden');

        } catch (error) {
            console.error('API Error:', error);
            addMessage(`Error: ${error.message}. Please try again.`, 'bot');
            loadingSpinner.classList.remove('visible');
            disableChat();
        }
    };

    // Define triage questions
    const triageQuestions = [
        `<div class="triage-question">
            <h4>How quickly did your symptoms develop?</h4>
            <div class="triage-options">
                <div class="triage-option"><span class="option-number">1</span> Minutes/Hours</div>
                <div class="triage-option"><span class="option-number">2</span> Days</div>
                <div class="triage-option"><span class="option-number">3</span> Weeks</div>
                <div class="triage-option"><span class="option-number">4</span> Months/Years</div>
            </div>
            <p class="triage-instruction">Type a number from 1-4 to select your answer</p>
        </div>`,
        `<div class="triage-question">
            <h4>Are your symptoms getting worse, better, or staying the same?</h4>
            <div class="triage-options">
                <div class="triage-option"><span class="option-number">1</span> Getting worse</div>
                <div class="triage-option"><span class="option-number">2</span> Getting better</div>
                <div class="triage-option"><span class="option-number">3</span> Staying the same</div>
            </div>
            <p class="triage-instruction">Type a number from 1-3 to select your answer</p>
        </div>`,
        `<div class="triage-question">
            <h4>How much pain or discomfort are you in?</h4>
            <div class="triage-options">
                <div class="triage-option"><span class="option-number">1</span> No pain</div>
                <div class="triage-option"><span class="option-number">2</span> Mild discomfort</div>
                <div class="triage-option"><span class="option-number">3</span> Very uncomfortable</div>
                <div class="triage-option"><span class="option-number">4</span> Unbearable pain</div>
            </div>
            <p class="triage-instruction">Type a number from 1-4 to select your answer</p>
        </div>`,
        `<div class="triage-question">
            <h4>Are your symptoms stopping you from doing normal activities?</h4>
            <div class="triage-options">
                <div class="triage-option"><span class="option-number">1</span> Not at all</div>
                <div class="triage-option"><span class="option-number">2</span> A little</div>
                <div class="triage-option"><span class="option-number">3</span> Quite a bit</div>
                <div class="triage-option"><span class="option-number">4</span> Completely</div>
            </div>
            <p class="triage-instruction">Type a number from 1-4 to select your answer</p>
        </div>`,
        `<div class="triage-question">
            <h4>Have you taken anything to relieve your symptoms? Did it help?</h4>
            <div class="triage-options">
                <div class="triage-option"><span class="option-number">1</span> Nothing taken</div>
                <div class="triage-option"><span class="option-number">2</span> Taken but no help</div>
                <div class="triage-option"><span class="option-number">3</span> Helped a little</div>
                <div class="triage-option"><span class="option-number">4</span> Helped a lot</div>
            </div>
            <p class="triage-instruction">Type a number from 1-4 to select your answer</p>
        </div>`,
        `<div class="triage-question">
            <h4>Do you have any serious conditions like heart disease or diabetes?</h4>
            <div class="triage-options">
                <div class="triage-option"><span class="option-number">1</span> No</div>
                <div class="triage-option"><span class="option-number">2</span> Yes, but controlled</div>
                <div class="triage-option"><span class="option-number">3</span> Yes, and uncontrolled</div>
            </div>
            <p class="triage-instruction">Type a number from 1-3 to select your answer</p>
        </div>`,
        `<div class="triage-question">
            <h4>How worried are you about your symptoms?</h4>
            <div class="triage-options">
                <div class="triage-option"><span class="option-number">1</span> Not worried</div>
                <div class="triage-option"><span class="option-number">2</span> Slightly worried</div>
                <div class="triage-option"><span class="option-number">3</span> Moderately worried</div>
                <div class="triage-option"><span class="option-number">4</span> Very worried</div>
            </div>
            <p class="triage-instruction">Type a number from 1-4 to select your answer</p>
        </div>`
    ];

    // Process triage response and decide next steps
    const processTriage = async () => {
        console.log('Triage Payload:', { answers: triageAnswers, triageUrl });
        
        try {
            // Local weighted scoring
            const weights = [0.25, 0.15, 0.20, 0.15, 0.10, 0.10, 0.05];
            const maxValues = [4, 3, 4, 4, 4, 3, 4]; // Max possible answer for each question
            let localScore = 0;

            triageAnswers.forEach((answer, i) => {
                const normalizedAnswer = (answer - 1) / (maxValues[i] - 1); // Normalize to 0-1
                localScore += normalizedAnswer * weights[i] * 150; // Scale to 150
            });

            // API call
            const response = await fetch('https://ozx557ly3h.execute-api.us-east-1.amazonaws.com/dev/process-triage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers: triageAnswers, triageUrl })
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Failed to process triage');

            // Blend scores
            let finalScore = data.score && !isNaN(data.score) ? 
                Math.round((data.score * 0.6) + (localScore * 0.4)) : 
                Math.round(localScore);

            // Enhanced severity mapping
            const severityMap = {
                'Emergency Services': finalScore >= 100,
                'Urgent Care': finalScore >= 70 && finalScore < 100,
                'Primary Care': finalScore >= 40 && finalScore < 70,
                'Self-Care/Telehealth': finalScore < 40
            };
            const careVenue = Object.keys(severityMap).find(key => severityMap[key]);
            const severityCategory = finalScore >= 100 ? 'High Urgency' :
                                    finalScore >= 70 ? 'Moderate Urgency' :
                                    finalScore >= 40 ? 'Low Urgency' : 'Non-Urgent';
            const severityColor = finalScore >= 100 ? '#d32f2f' :
                                 finalScore >= 70 ? '#ff9800' :
                                 finalScore >= 40 ? '#ffeb3b' : '#4caf50';

            // Detailed recommendation
            const timeframe = finalScore >= 100 ? 'Seek care immediately' :
                             finalScore >= 70 ? 'Seek care within 24 hours' :
                             finalScore >= 40 ? 'Seek care within 72 hours' : 'Monitor and seek care if needed';
            const additionalInfo = finalScore >= 100 ? 'Potentially serious condition requiring immediate attention.' :
                                  finalScore >= 70 ? 'Requires prompt evaluation.' :
                                  finalScore >= 40 ? 'Warrants medical review soon.' : 'Likely manageable with self-care.';

            const triageHtml = `
                <div class="triage-result">
                    <h3>Care Recommendation</h3>
                    <div class="triage-score-container">
                        <div class="triage-score-label">Urgency: <span style="color: ${severityColor}">${severityCategory}</span></div>
                        <div class="triage-score-value">Score: ${finalScore}/150</div>
                        <div class="triage-slider-container">
                            <input type="range" min="0" max="150" value="${finalScore}" disabled class="triage-slider">
                            <div class="triage-labels">
                                <span>Non-Urgent</span><span>Low</span><span>Moderate</span><span>High</span>
                            </div>
                        </div>
                    </div>
                    <div class="triage-recommendation" style="border-left: 4px solid ${severityColor};">
                        <h4>Recommended: ${careVenue}</h4>
                        <p><strong>${timeframe}</strong></p>
                        <p>${additionalInfo}</p>
                    </div>
                    
                    <div class="triage-guidelines">
                        <h4>What This Means</h4>
                        <ul>
                            <li><strong>Emergency Services (Score 85+):</strong> Hospital emergency department or call emergency services</li>
                            <li><strong>Urgent Care (Score 40-84):</strong> Walk-in clinic or scheduled same-day appointment with your doctor</li>
                            <li><strong>Routine Care (Score 0-39):</strong> Telehealth consultation or regular appointment with primary care</li>
                        </ul>
                        <p class="triage-disclaimer">This recommendation is based on the information you provided and should not replace professional medical advice.</p>
                    </div>
                </div>
            `;
            addMessage(triageHtml, 'bot');
            
            // ADDED: Now display the diagnosis intro and stored diagnoses
            const introMessage = `
                <div class="diagnosis-intro animate-in">
                    <h3>🔍 Analysis Complete</h3>
                    <p>Based on the symptoms and information you've provided, here are the most likely conditions to consider.</p>
                    <p>Remember: This is not a definitive diagnosis. Always consult with a healthcare professional.</p>
                    <p class="restart-hint">Want to start a new consultation? Click the restart button.</p>
                </div>
            `;
            addMessage(introMessage, 'bot');
            
            // Display stored diagnoses with delay for staggered effect
            storedDiagnoses.forEach((diagnosis, index) => {
                setTimeout(() => {
                    addDiagnosisToChat({
                        name: diagnosis.diagnosis_name,
                        specialty: diagnosis.specialty,
                        redFlag: diagnosis.red_flag,
                        common: diagnosis.common_diagnosis,
                        percentage: diagnosis.percentage,
                        explanation: `This condition is ${diagnosis.common_diagnosis ? "common" : "less common"} and ${diagnosis.red_flag ? "requires immediate medical attention" : "may be managed with appropriate care"}.`,
                        description: `This is a ${diagnosis.specialty.toLowerCase()} related condition.`,
                        knowledgeUrl: diagnosis.knowledge_window_api_url,
                        recommendation: diagnosis.red_flag ? 
                            "Seek immediate medical attention" : 
                            "Consult with a healthcare provider for proper evaluation"
                    });
                }, index * 500);
            });
            
            // End the chat after showing all content
            setTimeout(() => {
                endChat();
            }, storedDiagnoses.length * 500 + 1000);
            
        } catch (error) {
            console.error('Triage Error:', error);
            addMessage(`Error: ${error.message}. Defaulting to local analysis.`, 'bot');
            // Fallback to local score if API fails
            const weights = [0.25, 0.15, 0.20, 0.15, 0.10, 0.10, 0.05];
            const maxValues = [4, 3, 4, 4, 4, 3, 4];
            const localScore = Math.round(triageAnswers.reduce((sum, a, i) => sum + (a - 1) / (maxValues[i] - 1) * weights[i] * 150, 0));
            addMessage(`Local Score: ${localScore}/150. Consult a professional.`, 'bot');
            endChat();
        }
    };

    // Update the disableChat function
    function disableChat() {
        const elements = {
            chatInput: document.getElementById('chatInput'),
            sendButton: document.getElementById('sendButton'),
            dateInput: document.getElementById('dateInput'),
            chatInputContainer: document.getElementById('chatInputContainer'),
            genderSelection: document.getElementById('genderSelection'),
            regionSelection: document.getElementById('regionSelection')
        };

        elements.chatInput.disabled = true;
        elements.chatInput.placeholder = "Chat is disabled";
        elements.sendButton.disabled = true;
        elements.dateInput.disabled = true;

        elements.chatInputContainer.classList.add('hidden');
        elements.genderSelection.classList.add('hidden');
        elements.regionSelection.classList.add('hidden');

        const endMessage = `
            <div class="end-chat-message error">
                <p>This chat session has ended. Please click the restart button to begin a new consultation.</p>
                <p class="disclaimer">If you were in the middle of symptom analysis, we recommend starting a new session.</p>
            </div>
        `;
        addMessage(endMessage, 'bot');
    }

    function addDiagnosisToChat(diagnosis) {
        const severityClass = diagnosis.redFlag ? 'recommendation-severe' : 
                             diagnosis.common ? 'recommendation-mild' : 
                             'recommendation-moderate';
        
        const statusIcons = {
            severe: '🚨',
            moderate: '⚠️',
            mild: 'ℹ️'
        };

        const wikipediaUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(diagnosis.name.replace(/ /g, '_'))}`;

        const diagnosisHtml = `
            <div class="diagnosis animate-in">
                <div class="diagnosis-header">
                    <h3 class="diagnosis-name">
                        ${diagnosis.redFlag ? '🚨 ' : ''}${diagnosis.name}
                    </h3>
                    <span class="diagnosis-specialty">${diagnosis.specialty}</span>
                    <span class="diagnosis-percentage">${(diagnosis.percentage * 100).toFixed(1)}%</span>
                </div>
                
                <div class="diagnosis-content">
                    <div class="diagnosis-status">
                        ${diagnosis.common ? 
                            '<span class="status-badge status-common">Common Condition</span>' : 
                            '<span class="status-badge">Less Common</span>'}
                        ${diagnosis.redFlag ? 
                            '<span class="status-badge status-red-flag">Urgent Attention Required</span>' : ''}
                    </div>
                    
                    <div class="diagnosis-recommendation ${severityClass}">
                        <span class="recommendation-icon">
                            ${diagnosis.redFlag ? statusIcons.severe : 
                              diagnosis.common ? statusIcons.mild : 
                              statusIcons.moderate}
                        </span>
                        <span class="recommendation-text">
                            ${diagnosis.explanation}<br>
                            <strong>${diagnosis.recommendation}</strong>
                        </span>
                    </div>

                    <div class="diagnosis-links">
                        <a href="${wikipediaUrl}" 
                           target="_blank" 
                           class="diagnosis-link wiki-link">
                            Learn More About ${diagnosis.name} 
                            <span aria-hidden="true">📖</span>
                        </a>
                        <a href="https://www.isabelhealthcare.com" 
                           target="_blank" 
                           class="diagnosis-link">
                            Professional Medical Reference
                            <span aria-hidden="true">👨‍⚕️</span>
                        </a>
                    </div>
                </div>
            </div>
        `;

        addMessage(diagnosisHtml, 'bot');
    }

    function endChat() {
        const chatInput = document.getElementById('chatInput');
        const sendButton = document.getElementById('sendButton');
        const dateInput = document.getElementById('dateInput');
        const chatInputContainer = document.getElementById('chatInputContainer');

        chatInput.disabled = true;
        chatInput.placeholder = "Chat is disabled";
        sendButton.disabled = true;
        dateInput.disabled = true;

        const endMessage = `
            <div class="end-chat-message">
                <p>Chat session completed. Please click the restart button to start a new consultation.</p>
                <p class="disclaimer">Remember: This is not a substitute for professional medical advice. 
                If you're experiencing severe symptoms, please seek immediate medical attention.</p>
                <button id="exportPdfButton" class="export-pdf-button">
                    <span class="button-icon">📄</span>
                    Export Results to PDF
                </button>
            </div>
        `;
        addMessage(endMessage, 'bot');

        chatInputContainer.classList.add('hidden');
    }

    function exportToPDF() {
        const userName = localStorage.getItem('userName') || 'Patient';
        const currentDate = new Date().toLocaleDateString();
        const currentTime = new Date().toLocaleTimeString();
        const formattedRegion = userInputs.region.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        const formattedGender = userInputs.gender.charAt(0).toUpperCase() + userInputs.gender.slice(1);
    
        const styles = {
            header: 'color: #007acc; font-size: 24px; margin: 10px 0; font-weight: bold;',
            subHeader: 'color: #333; font-size: 18px; border-bottom: 2px solid #007acc; padding-bottom: 5px; margin: 20px 0 10px 0;',
            sectionBox: 'background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 15px; margin: 15px 0;',
            table: 'width: 100%; border-collapse: collapse; margin: 10px 0;',
            tableCell: 'padding: 8px; border-bottom: 1px solid #dee2e6; color: #000;',
            diagnosisBox: 'background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 10px 0; page-break-inside: avoid;',
            severityBadge: {
                severe: 'background: #dc3545; color: white; padding: 3px 8px; border-radius: 4px; font-size: 12px;',
                moderate: 'background: #ffc107; color: black; padding: 3px 8px; border-radius: 4px; font-size: 12px;',
                mild: 'background: #28a745; color: white; padding: 3px 8px; border-radius: 4px; font-size: 12px;'
            },
            text: 'color: #000;'
        };
    
        // Start building the PDF content with the main container - reduce width to avoid overflow
        let pdfContent = `
            <div style="padding: 15px; width: 190mm; max-width: 100%; box-sizing: border-box;">
                <div style="text-align: center; ${styles.sectionBox}">
                    <img src="assets/images/logo1.png" alt="MediMentor Logo" style="width: 80px; height: 80px;">
                    <h1 style="${styles.header}">Medical Consultation Report</h1>
                    <p style="${styles.text}">Generated on ${currentDate} at ${currentTime}</p>
                </div>
    
                <div style="${styles.sectionBox}">
                    <h2 style="${styles.subHeader}">Patient Information</h2>
                    <table style="${styles.table}">
                        <tr>
                            <td style="${styles.tableCell}" width="25%"><strong>Patient Name:</strong></td>
                            <td style="${styles.tableCell}" width="25%">${userName}</td>
                            <td style="${styles.tableCell}" width="25%"><strong>Gender:</strong></td>
                            <td style="${styles.tableCell}" width="25%">${formattedGender}</td>
                        </tr>
                        <tr>
                            <td style="${styles.tableCell}"><strong>Date of Birth:</strong></td>
                            <td style="${styles.tableCell}">${userInputs.yearOfBirth.includes('/') ? userInputs.yearOfBirth : 'Not provided'}</td>
                            <td style="${styles.tableCell}"><strong>Region:</strong></td>
                            <td style="${styles.tableCell}">${formattedRegion}</td>
                        </tr>
                        ${userInputs.gender === 'female' ? `
                        <tr>
                            <td style="${styles.tableCell}"><strong>Pregnancy Status:</strong></td>
                            <td style="${styles.tableCell}" colspan="3">${userInputs.pregnant === 'y' ? 'Currently Pregnant' : 'Not Pregnant'}</td>
                        </tr>
                        ` : ''}
                    </table>
                </div>
    
                <div style="${styles.sectionBox}">
                    <h2 style="${styles.subHeader}">Symptoms Assessment</h2>
                    <table style="${styles.table}">
                        <tr>
                            <td style="${styles.tableCell}" width="35%"><strong>Reported Symptoms:</strong></td>
                            <td style="${styles.tableCell}" width="65%">${userInputs.symptoms.join(', ')}</td>
                        </tr>
                        <tr>
                            <td style="${styles.tableCell}"><strong>Onset Duration:</strong></td>
                            <td style="${styles.tableCell}">${userInputs.symptomStart}</td>
                        </tr>
                        <tr>
                            <td style="${styles.tableCell}"><strong>Symptom Severity:</strong></td>
                            <td style="${styles.tableCell}">${userInputs.severity}</td>
                        </tr>
                        <tr>
                            <td style="${styles.tableCell}"><strong>Additional Symptoms:</strong></td>
                            <td style="${styles.tableCell}">${userInputs.additionalSymptoms}</td>
                        </tr>
                        <tr>
                            <td style="${styles.tableCell}"><strong>Triggering/Alleviating Factors:</strong></td>
                            <td style="${styles.tableCell}">${userInputs.triggers}</td>
                        </tr>
                    </table>
                </div>
        `;
    
        // Add triage recommendation section (Care Recommendation)
        const triageRecommendation = document.querySelector('.triage-recommendation');
        if (triageRecommendation) {
            const triageResult = document.querySelector('.triage-result');
            const severityCategory = triageResult.querySelector('.triage-score-label span').textContent;
            const scoreText = triageResult.querySelector('.triage-score-value').textContent;
            
            // Determine recommendation type based on text content
            let recommendationType = 'Routine Care';
            if (severityCategory.includes('High')) {
                recommendationType = 'Emergency Care';
            } else if (severityCategory.includes('Moderate')) {
                recommendationType = 'Urgent Care';
            } else if (severityCategory.includes('Low')) {
                recommendationType = 'Primary Care';
            }
            
            // Get background color based on recommendation type
            const bgColor = recommendationType === 'Emergency Care' ? '#ffebee' :
                            recommendationType === 'Urgent Care' ? '#fff3e0' :
                            recommendationType === 'Primary Care' ? '#e8f5e9' : '#e3f2fd';
                            
            // Get text color based on recommendation type
            const textColor = recommendationType === 'Emergency Care' ? '#c62828' :
                              recommendationType === 'Urgent Care' ? '#ef6c00' :
                              recommendationType === 'Primary Care' ? '#2e7d32' : '#1565c0';
            
            pdfContent += `
                <div style="${styles.sectionBox}">
                    <h2 style="${styles.subHeader}">Care Recommendation</h2>
                    <div style="padding: 15px; background: ${bgColor}; border-radius: 8px; margin: 10px 0; overflow: hidden;">
                        <h3 style="color: ${textColor}; margin: 5px 0; word-wrap: break-word; overflow-wrap: break-word;">${recommendationType}</h3>
                        <p style="margin: 12px 0; color: #000; word-wrap: break-word; overflow-wrap: break-word;">${scoreText}</p>
                        <p style="margin: 12px 0; color: #000; word-wrap: break-word; overflow-wrap: break-word; font-weight: bold;">${triageRecommendation.querySelector('h4').textContent}</p>
                        <p style="margin: 12px 0; color: #000; word-wrap: break-word; overflow-wrap: break-word;">${triageRecommendation.querySelector('p:nth-child(2)').textContent}</p>
                        <p style="margin: 12px 0; color: #000; word-wrap: break-word; overflow-wrap: break-word;">${triageRecommendation.querySelector('p:nth-child(3)').textContent}</p>
                    </div>
                    
                    <div style="margin-top: 15px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
                        <h4 style="margin: 5px 0; color: #333;">What This Means</h4>
                        <ul style="margin: 10px 0; padding-left: 20px; color: #000;">
                            <li style="margin: 10px 0; word-wrap: break-word; overflow-wrap: break-word;"><strong>Emergency Services (Score 85+):</strong> Hospital emergency department or call emergency services</li>
                            <li style="margin: 10px 0; word-wrap: break-word; overflow-wrap: break-word;"><strong>Urgent Care (Score 40-84):</strong> Walk-in clinic or scheduled same-day appointment with your doctor</li>
                            <li style="margin: 10px 0; word-wrap: break-word; overflow-wrap: break-word;"><strong>Routine Care (Score 0-39):</strong> Telehealth consultation or regular appointment with primary care</li>
                        </ul>
                    </div>
                </div>
            `;
        }
    
        // Add the diagnostic assessment section
        pdfContent += `<div style="${styles.sectionBox}">
            <h2 style="${styles.subHeader}">Diagnostic Assessment</h2>`;
    
        // Get all diagnoses and add them to the PDF content
        const diagnoses = document.querySelectorAll('.diagnosis');
        diagnoses.forEach((diagnosis, index) => {
            const name = diagnosis.querySelector('.diagnosis-name').textContent.trim();
            const specialty = diagnosis.querySelector('.diagnosis-specialty').textContent;
            const percentage = diagnosis.querySelector('.diagnosis-percentage').textContent;
            const isRedFlag = name.includes('🚨');
            const isCommon = diagnosis.querySelector('.status-common') !== null;
            const recommendation = diagnosis.querySelector('.recommendation-text').textContent;
    
            const severityStyle = isRedFlag ? styles.severityBadge.severe :
                                  isCommon ? styles.severityBadge.mild :
                                  styles.severityBadge.moderate;
    
            pdfContent += `
                <div style="${styles.diagnosisBox}">
                    <div style="margin-bottom: 12px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="width: 70%; vertical-align: top;">
                                    <h3 style="margin: 0; color: #2c3e50; font-size: 18px; word-wrap: break-word; overflow-wrap: break-word;">
                                        ${index + 1}. ${name.replace('🚨', '')}
                                    </h3>
                                    <div style="color: #000; margin: 8px 0; word-wrap: break-word; overflow-wrap: break-word;">Specialty: ${specialty}</div>
                                </td>
                                <td style="width: 30%; text-align: right; vertical-align: top;">
                                    <span style="${severityStyle}; display: inline-block; margin-bottom: 8px;">
                                        ${isRedFlag ? 'Urgent' : isCommon ? 'Common' : 'Moderate'}
                                    </span><br>
                                    <span style="font-weight: bold; color: #0078d4; display: inline-block;">${percentage}</span>
                                </td>
                            </tr>
                        </table>
                    </div>
                    <div style="margin: 10px 0; padding: 12px; background: #f8f9fa; border-radius: 4px; color: #000; word-wrap: break-word; overflow-wrap: break-word;">
                        ${recommendation}
                    </div>
                </div>
            `;
        });
    
        // Close the diagnostic assessment section
        pdfContent += `</div>`;
    
        // Add the footer section
        pdfContent += `
            <div style="margin-top: 30px; ${styles.sectionBox}">
                <p style="color: #000; font-style: italic; font-size: 12px; word-wrap: break-word; overflow-wrap: break-word;">
                    <strong>Important Notice:</strong> This report is generated based on the symptoms provided and should be used for informational purposes only. 
                    It is not a substitute for professional medical diagnosis. Please consult with a qualified healthcare provider for proper medical evaluation and treatment.
                </p>
                <div style="text-align: right; margin-top: 15px; font-size: 12px; color: #000;">
                    Report ID: ${Date.now().toString(36).toUpperCase()}<br>
                    Generated by MediMentor Healthcare System
                </div>
            </div>
        </div>`;
    
        // Create the PDF element
        const pdfElement = document.createElement('div');
        pdfElement.innerHTML = pdfContent;
    
        // Configure the PDF options
        const opt = {
            margin: [1.0, 1.0, 1.0, 1.0], // Reduce margins to give more space for content
            filename: `MediMentor_Report_${userName.replace(/\s+/g, '_')}_${currentDate.replace(/\//g, '-')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2,
                logging: false,
                useCORS: true,
                allowTaint: true
            },
            jsPDF: { 
                unit: 'cm',
                format: 'a4',
                orientation: 'portrait'
            },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };
    
        // Generate and download the PDF
        html2pdf().set(opt).from(pdfElement).save();
    }

    document.addEventListener('click', (event) => {
        if (event.target.closest('#exportPdfButton')) {
            exportToPDF();
        }
    });

    // Update resetConversation function to reset the placeholder
    const resetConversation = () => {
        dateInput.classList.add('hidden');
        genderSelection.classList.add('hidden');
        regionSelection.classList.add('hidden');
        chatInputContainer.classList.remove('hidden');
        chatInput.classList.remove('hidden');

        chatInput.disabled = false;
        chatInput.placeholder = "Type your message...";
        sendButton.disabled = false;
        dateInput.disabled = false;

        chatInput.value = '';
        dateInput.value = '';

        currentStep = 0;
        triageStep = 0;
        triageAnswers = [];
        triageUrl = '';
        userInputs = {
            symptoms: [],
            gender: '',
            yearOfBirth: '',
            region: '',
            symptomStart: '',
            pregnant: 'n'
        };

        chatOutput.innerHTML = '';

        chatInputContainer.style.display = 'flex';

        chatInput.disabled = false;
        chatInput.placeholder = "Type your message...";
        chatInput.maxLength = 524288; // Reset to default max length
        chatInput.pattern = ""; // Remove pattern restriction
        chatInput.inputMode = "text"; // Reset to normal text input

        displayWelcomeMessage();
    };

    const toggleSendButton = () => {
        const inputField = currentStep === 3 ? dateInput : chatInput;
        if (inputField.value.trim() !== '') {
            sendButton.disabled = false;
            sendButton.classList.add('active');
        } else {
            sendButton.disabled = true;
            sendButton.classList.remove('active');
        }
    };

    chatInput.addEventListener('input', toggleSendButton);
    dateInput.addEventListener('input', toggleSendButton);

    toggleSendButton();

    sendButton.addEventListener('click', () => {
        let userInput;
        if (currentStep === 3) {
            userInput = dateInput.value.trim();
            if (!validateDate(userInput)) {
                addMessage('Please enter a valid date in MM/DD/YYYY format.', 'bot');
                return;
            }
        } else {
            userInput = chatInput.value.trim();
        }
        
        if (!userInput) return;

        addMessage(userInput, 'user');
        handleUserInput(userInput);
        
        if (currentStep === 3) {
            dateInput.value = '';
        } else {
            chatInput.value = '';
        }
        toggleSendButton();
    });

    chatInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !sendButton.disabled) {
            sendButton.click();
        }
    });

    dateInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !sendButton.disabled) {
            sendButton.click();
        }
    });

    genderSelection.addEventListener('click', (event) => {
        if (event.target.classList.contains('optionButton')) {
            const gender = event.target.getAttribute('data-value');
            addMessage(gender, 'user');
            handleUserInput(gender);
            genderSelection.classList.add('hidden');
            chatInputContainer.classList.remove('hidden');
        }
    });

    regionSelection.addEventListener('click', (event) => {
        if (event.target.classList.contains('optionButton')) {
            const region = event.target.getAttribute('data-value');
            addMessage(region, 'user');
            handleUserInput(region);
            regionSelection.classList.add('hidden');
            chatInputContainer.classList.remove('hidden');
        }
    });

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

    restartButton.addEventListener('click', resetConversation);

    displayWelcomeMessage();

    const createSuggestionsContainer = () => {
        const container = document.createElement('div');
        container.id = 'suggestionDropdown';
        container.className = 'suggestion-dropdown hidden';
        chatInputContainer.appendChild(container);
        return container;
    };

    const suggestionsContainer = createSuggestionsContainer();
    let currentSuggestions = [];
    let selectedSuggestionIndex = -1;

    const fetchPredictiveText = async (searchTerm) => {
        try {
            const response = await fetch(
                `https://ozx557ly3h.execute-api.us-east-1.amazonaws.com/dev/predictive-text?term=${encodeURIComponent(searchTerm)}`
            );
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Failed to fetch predictions:', error);
            return [];
        }
    };

    const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    const handleSuggestions = debounce(async (input) => {
        if (currentStep !== 0 || input.length < 2) {
            suggestionsContainer.classList.add('hidden');
            return;
        }

        const suggestions = await fetchPredictiveText(input);
        currentSuggestions = suggestions;

        if (suggestions.length > 0) {
            suggestionsContainer.innerHTML = '';
            suggestions.forEach((suggestion, index) => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                div.textContent = suggestion;
                div.addEventListener('click', () => {
                    const currentValue = chatInput.value;
                    const lastCommaIndex = currentValue.lastIndexOf(',');
                    const baseValue = lastCommaIndex !== -1 ? 
                        currentValue.substring(0, lastCommaIndex + 1) + ' ' : '';
                    chatInput.value = baseValue + suggestion;
                    suggestionsContainer.classList.add('hidden');
                    chatInput.focus();
                });
                div.addEventListener('mouseenter', () => {
                    selectedSuggestionIndex = index;
                    updateSelectedSuggestion();
                });
                suggestionsContainer.appendChild(div);
            });
            suggestionsContainer.classList.remove('hidden');
        } else {
            suggestionsContainer.classList.add('hidden');
        }
    }, 300);

    chatInput.addEventListener('input', (event) => {
        const input = event.target.value;
        const lastComma = input.lastIndexOf(',');
        const searchTerm = lastComma !== -1 ? 
            input.substring(lastComma + 1).trim() : 
            input.trim();
        handleSuggestions(searchTerm);
    });

    chatInput.addEventListener('keydown', (event) => {
        if (suggestionsContainer.classList.contains('hidden')) return;

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                selectedSuggestionIndex = Math.min(
                    selectedSuggestionIndex + 1,
                    currentSuggestions.length - 1
                );
                updateSelectedSuggestion();
                break;
            case 'ArrowUp':
                event.preventDefault();
                selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, 0);
                updateSelectedSuggestion();
                break;
            case 'Enter':
                if (selectedSuggestionIndex >= 0) {
                    event.preventDefault();
                    const currentValue = chatInput.value;
                    const lastCommaIndex = currentValue.lastIndexOf(',');
                    const baseValue = lastCommaIndex !== -1 ? 
                        currentValue.substring(0, lastCommaIndex + 1) + ' ' : '';
                    chatInput.value = baseValue + currentSuggestions[selectedSuggestionIndex];
                    suggestionsContainer.classList.add('hidden');
                    selectedSuggestionIndex = -1;
                }
                break;
            case 'Escape':
                suggestionsContainer.classList.add('hidden');
                selectedSuggestionIndex = -1;
                break;
        }
    });

    document.addEventListener('click', (event) => {
        if (!event.target.closest('#chatInputContainer')) {
            suggestionsContainer.classList.add('hidden');
            selectedSuggestionIndex = -1;
        }
    });

    // Add this after your other event listeners

    chatInput.addEventListener('keydown', (event) => {
        // Only apply this restriction during triage questions
        if (currentStep === 'triage' || triageStep > 0) {
            const validInputs = getValidTriageInputs(triageStep);
            // Allow only valid numbers for this question, plus navigation keys
            const allowedKeys = [...validInputs, 'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
            
            if (!allowedKeys.includes(event.key)) {
                event.preventDefault();
            }
        }
    });

    // Modify input validation to automatically accept and submit valid answers
    chatInput.addEventListener('input', (event) => {
        // Handle suggestions for symptom input
        const input = event.target.value;
        
        // Toggle send button state
        toggleSendButton();
        
        // For triage questions, automatically submit valid answers (1-4)
        if (currentStep === 'triage' || triageStep > 0) {
            const validInputs = getValidTriageInputs(triageStep);
            const isValidInput = validInputs.includes(input);
            
            if (isValidInput) {
                // Small delay to let user see what they typed before submitting
                setTimeout(() => {
                    sendButton.click();
                }, 300);
            }
        }
        
        // Handle suggestions for symptom entry (only in step 0)
        if (currentStep === 0) {
            const lastComma = input.lastIndexOf(',');
            const searchTerm = lastComma !== -1 ? 
                input.substring(lastComma + 1).trim() : 
                input.trim();
            handleSuggestions(searchTerm);
        }
    });

    // Add this function to validate input based on current triage question
    const getValidTriageInputs = (step) => {
        // Special handling for questions with only 3 options
        // Question 2 (index 1) is about symptoms getting worse/better/same
        // Question 6 (index 5) is about serious conditions
        if (step === 2 || step === 6) {
            return ['1', '2', '3'];
        }
        // Default for questions with 4 options
        return ['1', '2', '3', '4']; 
    };

    // Update the keydown event listener to use the new function
    chatInput.addEventListener('keydown', (event) => {
        // Only apply this restriction during triage questions
        if (currentStep === 'triage' || triageStep > 0) {
            const validInputs = getValidTriageInputs(triageStep);
            // Allow only valid numbers for this question, plus navigation keys
            const allowedKeys = [...validInputs, 'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
            
            if (!allowedKeys.includes(event.key)) {
                event.preventDefault();
            }
        }
    });

    // Update the input event handler to match the validation function
    chatInput.addEventListener('input', (event) => {
        const input = event.target.value;
        
        // Toggle send button state
        toggleSendButton();
        
        // For triage questions, automatically submit valid answers
        if (currentStep === 'triage' || triageStep > 0) {
            const validInputs = getValidTriageInputs(triageStep);
            const isValidInput = validInputs.includes(input);
            
            if (isValidInput) {
                // Small delay to let user see what they typed before submitting
                setTimeout(() => {
                    sendButton.click();
                }, 300);
            }
        }
        
        // Handle suggestions for symptom entry (only in step 0)
        if (currentStep === 0) {
            const lastComma = input.lastIndexOf(',');
            const searchTerm = lastComma !== -1 ? 
                input.substring(lastComma + 1).trim() : 
                input.trim();
            handleSuggestions(searchTerm);
        }
    });

    // Also update the placeholder text based on the current question
    const updateTriagePlaceholder = (step) => {
        const validInputs = getValidTriageInputs(step);
        const maxOption = Math.max(...validInputs.map(n => parseInt(n)));
        chatInput.placeholder = `Type ${validInputs.join(', ')} (1-${maxOption})`;
    };

    // Call this function whenever triageStep changes
    // For example, add it in the section where you're setting up the triage questions:

    setTimeout(() => {
        addMessage("To determine where you should seek care, please answer 7 quick questions. First: How quickly did your symptoms develop? (1: Minutes/Hours, 2: Days, 3: Weeks, 4: Months/Years)", 'bot');
        currentStep = 'triage';
        triageStep = 1;
        chatInput.disabled = false;
        
        // Update placeholder based on current question options
        updateTriagePlaceholder(triageStep);
        
        chatInput.maxLength = 1; // Restrict to single digit
        chatInput.pattern = "[1-4]"; // HTML5 pattern for validation
        chatInput.inputMode = "numeric"; // Show numeric keyboard on mobile
        chatInputContainer.classList.remove('hidden');
    }, sortedDiagnoses.length * 500 + 1000);

    // Also update where the triageStep is changed
    // For example, in the handleUserInput function when processing triage answers:
    if (triageStep > 0 && triageStep <= 7) {
        triageAnswers.push(parseInt(input));
        triageStep++;
        
        if (triageStep <= 7) {
            addMessage(triageQuestions[triageStep-1], 'bot');
            // Update placeholder for the new question
            updateTriagePlaceholder(triageStep);
        } else {
            // Process triage answers...
        }
    }
});

function configureDateInput() {
    chatInput.classList.add('hidden');
    dateInput.classList.remove('hidden');
    dateInput.value = '';
    dateInput.type = 'text';
    dateInput.placeholder = 'MM/DD/YYYY';

    const formatDateInput = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) value = value.slice(0, 2) + '/' + value.slice(2);
        if (value.length >= 5) value = value.slice(0, 5) + '/' + value.slice(5);
        if (value.length > 10) value = value.slice(0, 10);
        e.target.value = value;
        
        sendButton.disabled = !validateDate(value);
        if (!sendButton.disabled) {
            sendButton.classList.add('active');
        } else {
            sendButton.classList.remove('active');
        }
    };
    
    dateInput.addEventListener('input', formatDateInput);
}
