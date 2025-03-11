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
            
            // Scroll to the new message
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
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

    const handleUserInput = async (input) => {
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
                if (userInputs.gender === 'female') {
                    addMessage('Are you currently pregnant? (yes/no)', 'bot');
                    currentStep = 'pregnancy';
                    chatInput.disabled = false;
                    chatInputContainer.classList.remove('hidden');
                    genderSelection.classList.add('hidden');
                    return;
                }
                currentStep = 3;
                addMessage(steps[currentStep], 'bot');
                configureDateInput();
                return;
            case 'pregnancy':
                const pregnancyResponse = input.toLowerCase();
                if (pregnancyResponse === 'yes' || pregnancyResponse === 'no') {
                    userInputs.pregnant = pregnancyResponse === 'yes' ? 'y' : 'n';
                    currentStep = 3;
                    addMessage(steps[currentStep], 'bot');
                    configureDateInput();
                } else {
                    addMessage('Please answer with yes or no.', 'bot');
                }
                return;
            case 3:
                const dateValue = input;
                if (validateDate(dateValue)) {
                    userInputs.yearOfBirth = dateValue;
                    chatInput.classList.remove('hidden');
                    dateInput.classList.add('hidden');
                    break;
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
            chatInputContainer.classList.add('hidden');
        } else if (currentStep === 3) {
            configureDateInput();
        } else if (currentStep === 4) {
            regionSelection.classList.remove('hidden');
            chatInput.disabled = true;
            chatInputContainer.classList.add('hidden');
        } else {
            chatInputContainer.classList.remove('hidden');
            genderSelection.classList.add('hidden');
            regionSelection.classList.add('hidden');
            chatInput.classList.remove('hidden');
            dateInput.classList.add('hidden');
            chatInput.disabled = false;
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
            console.log('Response data:', data);

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${data.error || 'Unknown error'}`);
            }

            loadingSpinner.classList.remove('hidden');

            if (!data.diagnoses || !Array.isArray(data.diagnoses)) {
                throw new Error('Invalid response format: missing diagnoses array');
            }

            // Sort diagnoses by percentage and display at least 5
            const sortedDiagnoses = data.diagnoses
                .sort((a, b) => b.percentage - a.percentage)
                .slice(0, 5)
                .map(diagnosis => ({
                    ...diagnosis,
                    percentage: diagnosis.percentage // Now this will be a number between 0 and 1
                }));

            sortedDiagnoses.forEach(diagnosis => {
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
            });

            setTimeout(() => {
                endChat();
            }, 1000);

            loadingSpinner.classList.remove('visible');
        } catch (error) {
            console.error('API Error:', error);
            addMessage(`Error: ${error.message}. Please try again.`, 'bot');
            loadingSpinner.classList.remove('visible');
            disableChat();
        }
    };

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

        const pdfContent = document.createElement('div');
        pdfContent.innerHTML = `
            <div style="padding: 20px; width: 210mm;">
                <div style="text-align: center; ${styles.sectionBox}">
                    <img src="assets/images/logo1.png" alt="MediMentor Logo" style="width: 80px; height: 80px;">
                    <h1 style="${styles.header}">Medical Consultation Report</h1>
                    <p style="${styles.text}">Generated on ${currentDate} at ${currentTime}</p>
                </div>

                <div style="${styles.sectionBox}">
                    <h2 style="${styles.subHeader}">Patient Information</h2>
                    <table style="${styles.table}">
                        <tr>
                            <td style="${styles.tableCell}"><strong>Patient Name:</strong></td>
                            <td style="${styles.tableCell}">${userName}</td>
                            <td style="${styles.tableCell}"><strong>Gender:</strong></td>
                            <td style="${styles.tableCell}">${formattedGender}</td>
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
                            <td style="${styles.tableCell}"><strong>Reported Symptoms:</strong></td>
                            <td style="${styles.tableCell}">${userInputs.symptoms.join(', ')}</td>
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

                <h2 style="${styles.subHeader}">Diagnostic Assessment</h2>
        `;

        const diagnoses = document.querySelectorAll('.diagnosis');
        diagnoses.forEach((diagnosis, index) => {
            const name = diagnosis.querySelector('.diagnosis-name').textContent.trim();
            const specialty = diagnosis.querySelector('.diagnosis-specialty').textContent;
            const isRedFlag = name.includes('🚨');
            const isCommon = diagnosis.querySelector('.status-common') !== null;
            const recommendation = diagnosis.querySelector('.recommendation-text').textContent;

            const severityStyle = isRedFlag ? styles.severityBadge.severe :
                                isCommon ? styles.severityBadge.mild :
                                styles.severityBadge.moderate;

            pdfContent.innerHTML += `
                <div style="${styles.diagnosisBox}">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h3 style="margin: 0; color: #2c3e50; font-size: 18px;">
                            ${index + 1}. ${name.replace('🚨', '')}
                        </h3>
                        <span style="${severityStyle}">
                            ${isRedFlag ? 'Urgent' : isCommon ? 'Common' : 'Moderate'}
                        </span>
                    </div>
                    <div style="color: #000; margin: 5px 0;">Specialty: ${specialty}</div>
                    <div style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 4px; color: #000;">
                        ${recommendation}
                    </div>
                </div>
            `;
        });

        pdfContent.innerHTML += `
            <div style="margin-top: 30px; ${styles.sectionBox}">
                <p style="color: #000; font-style: italic; font-size: 12px;">
                    <strong>Important Notice:</strong> This report is generated based on the symptoms provided and should be used for informational purposes only. 
                    It is not a substitute for professional medical diagnosis. Please consult with a qualified healthcare provider for proper medical evaluation and treatment.
                </p>
                <div style="text-align: right; margin-top: 15px; font-size: 12px; color: #000;">
                    Report ID: ${Date.now().toString(36).toUpperCase()}<br>
                    Generated by MediMentor Healthcare System
                </div>
            </div>
        `;

        const opt = {
            margin: [1.5, 1, 1.5, 1],
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

        html2pdf().set(opt).from(pdfContent).save();
    }

    document.addEventListener('click', (event) => {
        if (event.target.closest('#exportPdfButton')) {
            exportToPDF();
        }
    });

    const resetConversation = () => {
        dateInput.classList.add('hidden');
        genderSelection.classList.add('hidden');
        regionSelection.classList.add('hidden');
        chatInputContainer.classList.remove('hidden');
        chatInput.classList.remove('hidden');

        chatInput.disabled = false;
        sendButton.disabled = false;
        dateInput.disabled = false;

        chatInput.value = '';
        dateInput.value = '';

        currentStep = 0;
        triageStep = 0;
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
