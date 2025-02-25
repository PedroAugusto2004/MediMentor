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
        'chest pain': '55',
        'vomiting': '60',
        'diarrhea': '65',
        'stomach pain': '70',
        'rash': '75',
        'joint pain': '80',
        'anxiety': '85',
        'back pain': '90',
        'blurred vision': '95',
        'constipation': '100',
        'depression': '105',
        'ear pain': '110',
        'eye pain': '115',
        'frequent urination': '120',
        'heartburn': '125',
        'insomnia': '130',
        'loss of appetite': '135',
        'muscle weakness': '140',
        'neck pain': '145',
        'numbness': '150',
        'palpitations': '155',
        'runny nose': '160',
        'seizures': '165',
        'shoulder pain': '170',
        'sinus congestion': '175',
        'sweating': '180',
        'swelling': '185',
        'tingling': '190',
        'tremors': '195',
        'weakness': '200',
        'weight loss': '205',
        'wheezing': '210',
        'allergies': '215',
        'arm pain': '220',
        'bad breath': '225',
        'bruising': '230',
        'chills': '235',
        'confusion': '240',
        'dehydration': '245',
        'dry mouth': '250',
        'facial pain': '255',
        'hair loss': '260',
        'hand pain': '265',
        'hiccups': '270',
        'itching': '275',
        'knee pain': '280',
        'leg pain': '285',
        'memory problems': '290',
        'mood swings': '295',
        'nail problems': '300',
        'nose bleeding': '305',
        'skin problems': '310',
        'sleep problems': '315',
        'sneezing': '320',
        'stress': '325',
        'throat swelling': '330',
        'tooth pain': '335',
        'vision changes': '340',
        'menstrual pain': '345',
        'hot flashes': '350',
        'night sweats': '355',
        'jaundice': '360',
        'light sensitivity': '365',
        'limping': '370',
        'loss of balance': '375',
        'muscle cramps': '380',
        'panic attacks': '385',
        'paralysis': '390',
        'poor concentration': '395',
        'rapid breathing': '400',
        'red eyes': '405',
        'ringing in ears': '410',
        'shaking': '415',
        'stiff neck': '420',
        'swollen joints': '425',
        'taste changes': '430',
        'thirst': '435',
        'urinary urgency': '440',
        'vertigo': '445',
        'voice changes': '450',
        'watery eyes': '455',
        'weakness in limbs': '460',
        'yellow eyes': '465',
        'abdominal bloating': '470',
        'acne': '475',
        'appetite changes': '480',
        'black stools': '485',
        'bleeding gums': '490',
        'bloody nose': '495',
        'breast pain': '500',
        'cold hands': '505',
        'color blindness': '510',
        'double vision': '515',
        'dry eyes': '520',
        'earache': '525',
        'fainting': '530',
        'foot pain': '535',
        'genital pain': '540',
        'groin pain': '545',
        'hearing loss': '550',
        'hoarseness': '555',
        'irregular heartbeat': '560',
        'jaw pain': '565',
        'joint stiffness': '570',
        'metallic taste': '575',
        'mouth sores': '580',
        'muscle twitching': '585',
        'night blindness': '590',
        'painful urination': '595',
        'rib pain': '600',
        'skin ulcers': '605',
        'speech problems': '610',
        'tongue pain': '615',
        'unsteady gait': '620',
        'urinary retention': '625',
        'vaginal discharge': '630',
        'vision loss': '635',
        'wrist pain': '640',
        'ankle swelling': '645',
        'blood in urine': '650',
        'burning sensation': '655',
        'chest tightness': '660',
        'cold feet': '665',
        'decreased appetite': '670',
        'dry skin': '675',
        'early satiety': '680',
        'excessive thirst': '685',
        'finger pain': '690',
        'flank pain': '695',
        'foot swelling': '700',
        'hallucinations': '705',
        'heel pain': '710',
        'hip pain': '715',
        'increased appetite': '720',
        'joint swelling': '725',
        'lower back pain': '730',
        'memory loss': '735',
        'muscle pain': '740',
        'nail discoloration': '745',
        'nervousness': '750',
        'pelvic pain': '755',
        'rapid heart rate': '760',
        'rectal bleeding': '765',
        'skin redness': '770',
        'slow heart rate': '775',
        'stomach cramps': '780',
        'testicular pain': '785',
        'toe pain': '790',
        'upper back pain': '795',
        'urinary frequency': '800'
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
            // Split the message by common separators and clean up each symptom
            const userSymptoms = message
                .split(/,|and|\+/g) // Split by comma, 'and', or plus sign
                .map(s => s.trim().toLowerCase())
                .filter(s => s.length > 0); // Remove empty strings

            // Check if any of the symptoms are valid
            const validSymptoms = userSymptoms.some(symptom => 
                Object.keys(symptomMap).some(validSymptom => 
                    symptom.includes(validSymptom)
                )
            );

            if (validSymptoms) {
                return null; // Valid symptoms found, proceed
            }

            // If no valid symptoms found, provide guidance
            return "I couldn't identify those symptoms. Please describe your symptoms using common terms like 'fever', 'headache', 'cough', etc. You can list multiple symptoms separated by commas.";
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
                // Process multiple symptoms
                userInputs.symptoms = input
                    .toLowerCase()
                    .split(/,|and|\+/g)
                    .map(symptom => symptom.trim())
                    .filter(symptom => 
                        Object.keys(symptomMap).some(validSymptom => 
                            symptom.includes(validSymptom)
                        )
                    );

                // Confirm symptoms with user
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
            chatInput.disabled = true; // Disable chat input
            chatInputContainer.classList.add('hidden');
        } else if (currentStep === 3) {
            chatInput.disabled = false; // Re-enable chat input
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
            chatInput.disabled = false; // Ensure chat input is enabled
        }
    };

    const analyzeSymptoms = async () => {
        const loadingSpinner = document.getElementById('loadingSpinner');
        loadingSpinner.classList.remove('hidden');
        addMessage('Analyzing your symptoms... Please wait.', 'bot');
        addMessage('Based on your symptoms, here are the most likely conditions:', 'bot');
        try {
            // Convert symptoms array to string array of actual symptom names
            const symptomNames = userInputs.symptoms
                .map(symptom => symptom.trim().toLowerCase())
                .filter(Boolean); // Remove empty strings

            const payload = {
                symptoms: symptomNames,  // Send array of symptom names
                gender: userInputs.gender.toLowerCase(),
                yearOfBirth: userInputs.yearOfBirth.split('-')[0], // Extract year from YYYY-MM-DD
                region: userInputs.region.toLowerCase().replace('-', ' ') // Convert north-america to north america
            };

            console.log('Request payload:', payload);

            const API_URL = 'https://1n6ajiuic7.execute-api.us-east-1.amazonaws.com/dev/analyze-symptoms';

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

            const loadingSpinner = document.getElementById('loadingSpinner');
            loadingSpinner.classList.remove('hidden');

            if (!data.diagnoses || !Array.isArray(data.diagnoses)) {
                throw new Error('Invalid response format: missing diagnoses array');
            }

            // Process and display diagnoses
            const topDiagnoses = data.diagnoses.slice(0, 3);
            topDiagnoses.forEach(diagnosis => {
                addDiagnosisToChat({
                    name: diagnosis.diagnosis_name,
                    specialty: diagnosis.specialty,
                    redFlag: diagnosis.red_flag === "true",
                    common: diagnosis.common_diagnosis === "true",
                    explanation: `This condition is ${diagnosis.common_diagnosis === "true" ? "common" : "less common"} and ${diagnosis.red_flag === "true" ? "requires immediate medical attention" : "may be managed with appropriate care"}.`,
                    description: `This is a ${diagnosis.specialty.toLowerCase()} related condition.`,
                    knowledgeUrl: diagnosis.knowledge_window_api_url,
                    recommendation: diagnosis.red_flag === "true" ? 
                        "Seek immediate medical attention" : 
                        "Consult with a healthcare provider for proper evaluation"
                });
            });

            // After displaying all diagnoses
            setTimeout(() => {
                endChat();
            }, 1000);

            loadingSpinner.classList.add('hidden');
        } catch (error) {
            console.error('API Error:', error);
            addMessage(`Error: ${error.message}. Please try again.`, 'bot');
            const loadingSpinner = document.getElementById('loadingSpinner');
            loadingSpinner.classList.add('hidden');
        }
    };

    function addDiagnosisToChat(diagnosis) {
        const severityClass = diagnosis.redFlag ? 'recommendation-severe' : 
                             diagnosis.common ? 'recommendation-mild' : 
                             'recommendation-moderate';
        
        const statusIcons = {
            severe: '🚨',
            moderate: '⚠️',
            mild: 'ℹ️'
        };

        const diagnosisHtml = `
            <div class="diagnosis animate-in">
                <div class="diagnosis-header">
                    <h3 class="diagnosis-name">
                        ${diagnosis.redFlag ? '🚨 ' : ''}${diagnosis.name}
                    </h3>
                    <span class="diagnosis-specialty">${diagnosis.specialty}</span>
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

                    <a href="https://www.isabelhealthcare.com" 
                       target="_blank" 
                       class="diagnosis-link">
                        Learn More About ${diagnosis.name}
                        <span aria-hidden="true">→</span>
                    </a>
                </div>
            </div>
        `;

        addMessage(diagnosisHtml, 'bot');
    }

    // Add this function after addDiagnosisToChat
    function endChat() {
        // Disable input and send button
        const chatInput = document.getElementById('chatInput');
        const sendButton = document.getElementById('sendButton');
        const dateInput = document.getElementById('dateInput');
        const chatInputContainer = document.getElementById('chatInputContainer');

        chatInput.disabled = true;
        sendButton.disabled = true;
        dateInput.disabled = true;

        // Add end chat message with export button
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

        // Hide input container
        chatInputContainer.classList.add('hidden');
    }

    // Add this after the endChat function
    function exportToPDF() {
        // Get user name and format date
        const userName = localStorage.getItem('userName') || 'Patient';
        const currentDate = new Date().toLocaleDateString();
        const currentTime = new Date().toLocaleTimeString();

        // Format region and gender for display
        const formattedRegion = userInputs.region
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        
        const formattedGender = userInputs.gender.charAt(0).toUpperCase() + userInputs.gender.slice(1);

        // Calculate age from year of birth
        const birthYear = userInputs.yearOfBirth.split('-')[0];
        const age = new Date().getFullYear() - parseInt(birthYear);

        // Create PDF content container
        const pdfContent = document.createElement('div');
        pdfContent.className = 'pdf-container';

        // Add header with logo and title
        pdfContent.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <img src="assets/images/logo1.png" alt="MediMentor Logo" style="width: 100px; height: 100px;">
                <h1 style="color: #007acc; margin: 10px 0;">MediMentor Consultation Report</h1>
                <p style="color: #666;">Generated on ${currentDate} at ${currentTime}</p>
            </div>

            <div style="margin-bottom: 30px;">
                <h2 style="color: #333; border-bottom: 2px solid #007acc; padding-bottom: 5px;">Patient Information</h2>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <tr>
                        <td style="padding: 8px; width: 30%;"><strong>Name:</strong></td>
                        <td style="padding: 8px;">${userName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px;"><strong>Date of Birth:</strong></td>
                        <td style="padding: 8px;">${userInputs.yearOfBirth}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px;"><strong>Gender:</strong></td>
                        <td style="padding: 8px;">${formattedGender}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px;"><strong>Region:</strong></td>
                        <td style="padding: 8px;">${formattedRegion}</td>
                    </tr>
                </table>
            </div>

            <div style="margin-bottom: 30px;">
                <h2 style="color: #333; border-bottom: 2px solid #007acc; padding-bottom: 5px;">Symptom Information</h2>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <tr>
                        <td style="padding: 8px; width: 30%;"><strong>Reported Symptoms:</strong></td>
                        <td style="padding: 8px;">${userInputs.symptoms.join(', ')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px;"><strong>Onset:</strong></td>
                        <td style="padding: 8px;">${userInputs.symptomStart}</td>
                    </tr>
                </table>
            </div>
        `;

        // Add diagnoses section
        const diagnosesContainer = document.createElement('div');
        diagnosesContainer.innerHTML = `
            <h2 style="color: #333; border-bottom: 2px solid #007acc; padding-bottom: 5px;">Diagnostic Assessment</h2>
        `;

        // Copy diagnosis elements
        const diagnoses = document.querySelectorAll('.diagnosis');
        diagnoses.forEach(diagnosis => {
            const clone = diagnosis.cloneNode(true);
            // Remove any interactive elements from the PDF version
            const links = clone.querySelectorAll('a');
            links.forEach(link => {
                const span = document.createElement('span');
                span.textContent = link.textContent;
                link.parentNode.replaceChild(span, link);
            });
            diagnosesContainer.appendChild(clone);
        });
        pdfContent.appendChild(diagnosesContainer);

        // Add disclaimer
        pdfContent.innerHTML += `
            <div style="margin-top: 30px; padding: 15px; border-top: 1px solid #ccc;">
                <p style="font-style: italic; color: #666; font-size: 12px;">
                    <strong>Disclaimer:</strong> This report is generated based on the symptoms provided and should not be considered as a definitive medical diagnosis. 
                    Please consult with a healthcare professional for proper medical evaluation and treatment.
                </p>
                <p style="font-size: 12px; text-align: right;">
                    Report ID: ${Date.now().toString(36).toUpperCase()}<br>
                    Generated by MediMentor
                </p>
            </div>
        `;

        // Configure PDF options
        const opt = {
            margin: [0.5, 1, 0.5, 1], // [top, right, bottom, left]
            filename: `MediMentor_Report_${userName.replace(/\s+/g, '_')}_${currentDate.replace(/\//g, '-')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, logging: false },
            jsPDF: { unit: 'cm', format: 'a4', orientation: 'portrait' }
        };

        // Generate PDF
        html2pdf().set(opt).from(pdfContent).save();
    }

    // Add event listener for the export button
    document.addEventListener('click', (event) => {
        if (event.target.closest('#exportPdfButton')) {
            exportToPDF();
        }
    });

    const resetConversation = () => {
        // Reset UI elements
        dateInput.classList.add('hidden');
        genderSelection.classList.add('hidden');
        regionSelection.classList.add('hidden');
        chatInputContainer.classList.remove('hidden');
        chatInput.classList.remove('hidden');

        // Enable input fields and buttons
        chatInput.disabled = false;
        sendButton.disabled = false;
        dateInput.disabled = false;

        // Clear input fields
        chatInput.value = '';
        dateInput.value = '';

        // Reset conversation state
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

        // Clear chat history
        chatOutput.innerHTML = '';

        // Show chat input container if it was hidden
        chatInputContainer.style.display = 'flex';

        // Restart conversation with welcome message
        displayWelcomeMessage();
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
