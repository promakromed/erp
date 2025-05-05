const API_URL = 'https://proerp-b0dfb327892c.herokuapp.com/api'; // Ensure this matches your deployed backend URL

// --- Data for Dropdowns ---
// Comprehensive list of country calling codes (expandable)
const countryCallingCodes = [
    { code: "+1", name: "USA/Canada (+1)" },
    { code: "+7", name: "Russia/Kazakhstan (+7)" },
    { code: "+20", name: "Egypt (+20)" },
    { code: "+27", name: "South Africa (+27)" },
    { code: "+30", name: "Greece (+30)" },
    { code: "+31", name: "Netherlands (+31)" },
    { code: "+32", name: "Belgium (+32)" },
    { code: "+33", name: "France (+33)" },
    { code: "+34", name: "Spain (+34)" },
    { code: "+36", name: "Hungary (+36)" },
    { code: "+39", name: "Italy (+39)" },
    { code: "+40", name: "Romania (+40)" },
    { code: "+41", name: "Switzerland (+41)" },
    { code: "+43", name: "Austria (+43)" },
    { code: "+44", name: "UK (+44)" },
    { code: "+45", name: "Denmark (+45)" },
    { code: "+46", name: "Sweden (+46)" },
    { code: "+47", name: "Norway (+47)" },
    { code: "+48", name: "Poland (+48)" },
    { code: "+49", name: "Germany (+49)" },
    { code: "+51", name: "Peru (+51)" },
    { code: "+52", name: "Mexico (+52)" },
    { code: "+53", name: "Cuba (+53)" },
    { code: "+54", name: "Argentina (+54)" },
    { code: "+55", name: "Brazil (+55)" },
    { code: "+56", name: "Chile (+56)" },
    { code: "+57", name: "Colombia (+57)" },
    { code: "+58", name: "Venezuela (+58)" },
    { code: "+60", name: "Malaysia (+60)" },
    { code: "+61", name: "Australia (+61)" },
    { code: "+62", name: "Indonesia (+62)" },
    { code: "+63", name: "Philippines (+63)" },
    { code: "+64", name: "New Zealand (+64)" },
    { code: "+65", name: "Singapore (+65)" },
    { code: "+66", name: "Thailand (+66)" },
    { code: "+81", name: "Japan (+81)" },
    { code: "+82", name: "South Korea (+82)" },
    { code: "+84", name: "Vietnam (+84)" },
    { code: "+86", name: "China (+86)" },
    { code: "+90", name: "Turkey (+90)" },
    { code: "+91", name: "India (+91)" },
    { code: "+92", name: "Pakistan (+92)" },
    { code: "+93", name: "Afghanistan (+93)" },
    { code: "+94", name: "Sri Lanka (+94)" },
    { code: "+95", name: "Myanmar (+95)" },
    { code: "+98", name: "Iran (+98)" },
    { code: "+211", name: "South Sudan (+211)" },
    { code: "+212", name: "Morocco (+212)" },
    { code: "+213", name: "Algeria (+213)" },
    { code: "+216", name: "Tunisia (+216)" },
    { code: "+218", name: "Libya (+218)" },
    { code: "+220", name: "Gambia (+220)" },
    { code: "+221", name: "Senegal (+221)" },
    { code: "+222", name: "Mauritania (+222)" },
    { code: "+223", name: "Mali (+223)" },
    { code: "+224", name: "Guinea (+224)" },
    { code: "+225", name: "Ivory Coast (+225)" },
    { code: "+226", name: "Burkina Faso (+226)" },
    { code: "+227", name: "Niger (+227)" },
    { code: "+228", name: "Togo (+228)" },
    { code: "+229", name: "Benin (+229)" },
    { code: "+230", name: "Mauritius (+230)" },
    { code: "+231", name: "Liberia (+231)" },
    { code: "+232", name: "Sierra Leone (+232)" },
    { code: "+233", name: "Ghana (+233)" },
    { code: "+234", name: "Nigeria (+234)" },
    { code: "+235", name: "Chad (+235)" },
    { code: "+236", name: "Central African Republic (+236)" },
    { code: "+237", name: "Cameroon (+237)" },
    { code: "+238", name: "Cape Verde (+238)" },
    { code: "+239", name: "Sao Tome & Principe (+239)" },
    { code: "+240", name: "Equatorial Guinea (+240)" },
    { code: "+241", name: "Gabon (+241)" },
    { code: "+242", name: "Congo - Brazzaville (+242)" },
    { code: "+243", name: "Congo - Kinshasa (+243)" },
    { code: "+244", name: "Angola (+244)" },
    { code: "+245", name: "Guinea-Bissau (+245)" },
    { code: "+246", name: "British Indian Ocean Territory (+246)" },
    { code: "+247", name: "Ascension Island (+247)" },
    { code: "+248", name: "Seychelles (+248)" },
    { code: "+249", name: "Sudan (+249)" },
    { code: "+250", name: "Rwanda (+250)" },
    { code: "+251", name: "Ethiopia (+251)" },
    { code: "+252", name: "Somalia (+252)" },
    { code: "+253", name: "Djibouti (+253)" },
    { code: "+254", name: "Kenya (+254)" },
    { code: "+255", name: "Tanzania (+255)" },
    { code: "+256", name: "Uganda (+256)" },
    { code: "+257", name: "Burundi (+257)" },
    { code: "+258", name: "Mozambique (+258)" },
    { code: "+260", name: "Zambia (+260)" },
    { code: "+261", name: "Madagascar (+261)" },
    { code: "+262", name: "Réunion/Mayotte (+262)" },
    { code: "+263", name: "Zimbabwe (+263)" },
    { code: "+264", name: "Namibia (+264)" },
    { code: "+265", name: "Malawi (+265)" },
    { code: "+266", name: "Lesotho (+266)" },
    { code: "+267", name: "Botswana (+267)" },
    { code: "+268", name: "Eswatini (+268)" },
    { code: "+269", name: "Comoros (+269)" },
    { code: "+290", name: "St. Helena (+290)" },
    { code: "+291", name: "Eritrea (+291)" },
    { code: "+297", name: "Aruba (+297)" },
    { code: "+298", name: "Faroe Islands (+298)" },
    { code: "+299", name: "Greenland (+299)" },
    { code: "+350", name: "Gibraltar (+350)" },
    { code: "+351", name: "Portugal (+351)" },
    { code: "+352", name: "Luxembourg (+352)" },
    { code: "+353", name: "Ireland (+353)" },
    { code: "+354", name: "Iceland (+354)" },
    { code: "+355", name: "Albania (+355)" },
    { code: "+356", name: "Malta (+356)" },
    { code: "+357", name: "Cyprus (+357)" },
    { code: "+358", name: "Finland (+358)" },
    { code: "+359", name: "Bulgaria (+359)" },
    { code: "+370", name: "Lithuania (+370)" },
    { code: "+371", name: "Latvia (+371)" },
    { code: "+372", name: "Estonia (+372)" },
    { code: "+373", name: "Moldova (+373)" },
    { code: "+374", name: "Armenia (+374)" },
    { code: "+375", name: "Belarus (+375)" },
    { code: "+376", name: "Andorra (+376)" },
    { code: "+377", name: "Monaco (+377)" },
    { code: "+378", name: "San Marino (+378)" },
    { code: "+379", name: "Vatican City (+379)" },
    { code: "+380", name: "Ukraine (+380)" },
    { code: "+381", name: "Serbia (+381)" },
    { code: "+382", name: "Montenegro (+382)" },
    { code: "+385", name: "Croatia (+385)" },
    { code: "+386", name: "Slovenia (+386)" },
    { code: "+387", name: "Bosnia & Herzegovina (+387)" },
    { code: "+389", name: "North Macedonia (+389)" },
    { code: "+420", name: "Czech Republic (+420)" },
    { code: "+421", name: "Slovakia (+421)" },
    { code: "+423", name: "Liechtenstein (+423)" },
    { code: "+500", name: "Falkland Islands (+500)" },
    { code: "+501", name: "Belize (+501)" },
    { code: "+502", name: "Guatemala (+502)" },
    { code: "+503", name: "El Salvador (+503)" },
    { code: "+504", name: "Honduras (+504)" },
    { code: "+505", name: "Nicaragua (+505)" },
    { code: "+506", name: "Costa Rica (+506)" },
    { code: "+507", name: "Panama (+507)" },
    { code: "+508", name: "St. Pierre & Miquelon (+508)" },
    { code: "+509", name: "Haiti (+509)" },
    { code: "+590", name: "Guadeloupe (+590)" },
    { code: "+591", name: "Bolivia (+591)" },
    { code: "+592", name: "Guyana (+592)" },
    { code: "+593", name: "Ecuador (+593)" },
    { code: "+594", name: "French Guiana (+594)" },
    { code: "+595", name: "Paraguay (+595)" },
    { code: "+596", name: "Martinique (+596)" },
    { code: "+597", name: "Suriname (+597)" },
    { code: "+598", name: "Uruguay (+598)" },
    { code: "+599", name: "Caribbean Netherlands (+599)" },
    { code: "+670", name: "Timor-Leste (+670)" },
    { code: "+671", name: "Guam (+671)" },
    { code: "+672", name: "Antarctica (+672)" },
    { code: "+673", name: "Brunei (+673)" },
    { code: "+674", name: "Nauru (+674)" },
    { code: "+675", name: "Papua New Guinea (+675)" },
    { code: "+676", name: "Tonga (+676)" },
    { code: "+677", name: "Solomon Islands (+677)" },
    { code: "+678", name: "Vanuatu (+678)" },
    { code: "+679", name: "Fiji (+679)" },
    { code: "+680", name: "Palau (+680)" },
    { code: "+681", name: "Wallis & Futuna (+681)" },
    { code: "+682", name: "Cook Islands (+682)" },
    { code: "+683", name: "Niue (+683)" },
    { code: "+685", name: "Samoa (+685)" },
    { code: "+686", name: "Kiribati (+686)" },
    { code: "+687", name: "New Caledonia (+687)" },
    { code: "+688", name: "Tuvalu (+688)" },
    { code: "+689", name: "French Polynesia (+689)" },
    { code: "+690", name: "Tokelau (+690)" },
    { code: "+691", name: "Micronesia (+691)" },
    { code: "+692", name: "Marshall Islands (+692)" },
    { code: "+850", name: "North Korea (+850)" },
    { code: "+852", name: "Hong Kong (+852)" },
    { code: "+853", name: "Macau (+853)" },
    { code: "+855", name: "Cambodia (+855)" },
    { code: "+856", name: "Laos (+856)" },
    { code: "+880", name: "Bangladesh (+880)" },
    { code: "+886", name: "Taiwan (+886)" },
    { code: "+960", name: "Maldives (+960)" },
    { code: "+961", name: "Lebanon (+961)" },
    { code: "+962", name: "Jordan (+962)" },
    { code: "+963", name: "Syria (+963)" },
    { code: "+964", name: "Iraq (+964)" },
    { code: "+965", name: "Kuwait (+965)" },
    { code: "+966", name: "Saudi Arabia (+966)" },
    { code: "+967", name: "Yemen (+967)" },
    { code: "+968", name: "Oman (+968)" },
    { code: "+970", name: "Palestine (+970)" },
    { code: "+971", name: "UAE (+971)" },
    { code: "+972", name: "Israel (+972)" },
    { code: "+973", name: "Bahrain (+973)" },
    { code: "+974", name: "Qatar (+974)" },
    { code: "+975", name: "Bhutan (+975)" },
    { code: "+976", name: "Mongolia (+976)" },
    { code: "+977", name: "Nepal (+977)" },
    { code: "+992", name: "Tajikistan (+992)" },
    { code: "+993", name: "Turkmenistan (+993)" },
    { code: "+994", name: "Azerbaijan (+994)" },
    { code: "+995", name: "Georgia (+995)" },
    { code: "+996", name: "Kyrgyzstan (+996)" },
    { code: "+998", name: "Uzbekistan (+998)" },
    // Add more as needed
].sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically by name

// Comprehensive list of countries (expandable)
const countries = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", 
    "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", 
    "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", 
    "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo, Democratic Republic of the", 
    "Congo, Republic of the", "Costa Rica", "Cote d'Ivoire", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", 
    "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", 
    "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", 
    "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", 
    "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Korea, North", "Korea, South", "Kosovo", 
    "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", 
    "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", 
    "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar (Burma)", "Namibia", "Nauru", 
    "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", 
    "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", 
    "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", 
    "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", 
    "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", 
    "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", 
    "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", 
    "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
].sort(); // Sort alphabetically


document.addEventListener('DOMContentLoaded', () => {
    // Check authentication immediately
    if (!checkAuth()) {
        return; 
    }

    // Cache DOM elements
    const clientForm = document.getElementById('client-form');
    const clientTableBody = document.querySelector('#client-table tbody');
    const clientFormMessage = document.getElementById('client-form-message');
    const clientListMessage = document.getElementById('client-list-message');
    const logoutButton = document.getElementById('logout-button');
    const cancelEditButton = document.getElementById('cancel-edit-button');
    const clientIdField = document.getElementById('clientId');
    const countrySelect = document.getElementById('country'); // Get country select element

    // --- Populate Dropdowns --- 
    populatePhoneCountryCodes();
    populateCountries(countrySelect); // Populate country dropdown

    // --- Event Listeners --- 
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }

    if (clientForm) {
        clientForm.addEventListener('submit', handleSaveClient);
    }

    if (cancelEditButton) {
        cancelEditButton.addEventListener('click', resetForm);
    }

    if (clientTableBody) {
        clientTableBody.addEventListener('click', handleTableActions);
    }

    // --- Initial Load --- 
    fetchAndDisplayClients();
});

// Function to get the authentication token from localStorage
function getAuthToken() {
    try {
        const userInfoString = localStorage.getItem('userInfo');
        if (!userInfoString) {
            console.log("DEBUG: No 'userInfo' found in localStorage.");
            return null;
        }
        const userInfo = JSON.parse(userInfoString);
        if (!userInfo || !userInfo.token) {
            console.log("DEBUG: 'userInfo' found but no token inside.", userInfo);
            return null;
        }
        return userInfo.token;
    } catch (error) {
        console.error("Error parsing userInfo from localStorage:", error);
        return null;
    }
}

function checkAuth() {
    console.log("DEBUG: checkAuth() called on clients.js");
    const token = getAuthToken();

    if (!token) {
        console.error("CRITICAL: No valid token found! Redirecting to login.");
        window.location.href = 'login.html'; 
        return false; 
    } else {
        console.log("DEBUG: Token found. Authentication check passed.");
        // Populate user name if element exists
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
             try {
                const userInfo = JSON.parse(localStorage.getItem('userInfo'));
                userNameElement.textContent = userInfo.name || '';
            } catch (e) { /* ignore */ }
        }
        return true; 
    }
}

function logout() {
    localStorage.removeItem('userInfo'); 
    window.location.href = 'login.html';
}

function showMessage(element, message, isError = false) {
    if (element) {
        element.textContent = message;
        element.className = isError ? 'message error' : 'message success';
        element.style.display = 'block';
        if (element.timeoutId) {
            clearTimeout(element.timeoutId);
        }
        element.timeoutId = setTimeout(() => {
            if (element.style.display !== 'none') { 
                 element.style.display = 'none';
                 element.textContent = '';
            }
        }, 5000);
    }
}

// Populates the phone country code dropdown
function populatePhoneCountryCodes() {
    const countryCodeSelect = document.getElementById('phoneCountryCode');
    if (!countryCodeSelect) return;

    countryCodeSelect.innerHTML = '<option value="">Code</option>'; 

    countryCallingCodes.forEach(country => {
        const option = document.createElement('option');
        option.value = country.code;
        option.textContent = country.name;
        countryCodeSelect.appendChild(option);
    });
}

// Populates the country dropdown
function populateCountries(selectElement) {
    if (!selectElement) return;

    selectElement.innerHTML = '<option value="">Select Country</option>'; 

    countries.forEach(countryName => {
        const option = document.createElement('option');
        option.value = countryName;
        option.textContent = countryName;
        selectElement.appendChild(option);
    });
}

// --- Validation Functions ---
function isValidEmail(email) {
    // Simple regex for email validation
    const emailRegex = /^\S+@\S+\.\S+$/;
    return emailRegex.test(email);
}

function isValidPhoneNumber(phone) {
    // Simple regex: allows digits, spaces, hyphens, parentheses, and plus sign
    // Adjust this regex based on more specific requirements if needed
    const phoneRegex = /^[\d\s\-\(\)\+]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 7; // Ensure at least 7 digits
}

// --- API Interaction Functions ---
async function fetchAndDisplayClients() {
    const clientTableBody = document.querySelector('#client-table tbody');
    const clientListMessage = document.getElementById('client-list-message');
    if (!clientTableBody || !clientListMessage) return;

    showMessage(clientListMessage, 'Loading clients...', false);

    try {
        const token = getAuthToken();
        if (!token) {
             checkAuth(); 
             return; 
        }
        
        const response = await fetch(`${API_URL}/clients`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) { 
             logout(); 
             return; 
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const clients = await response.json();
        clientTableBody.innerHTML = ''; 

        if (clients.length === 0) {
            showMessage(clientListMessage, 'No clients found.', false);
        } else {
            clients.forEach(client => {
                const row = clientTableBody.insertRow();
                // Use textContent for security against XSS
                row.insertCell().textContent = client.companyName || 'N/A';
                row.insertCell().textContent = client.clientName || 'N/A';
                row.insertCell().textContent = client.email || 'N/A';
                row.insertCell().textContent = `${client.phoneCountryCode || ''} ${client.phoneNumber || 'N/A'}`;
                row.insertCell().textContent = client.address || 'N/A';
                row.insertCell().textContent = client.city || 'N/A';
                row.insertCell().textContent = client.country || 'N/A';
                
                const actionsCell = row.insertCell();
                actionsCell.classList.add('action-buttons');
                actionsCell.innerHTML = `
                    <button data-id="${client._id}" class="btn btn-sm btn-warning edit-btn">Edit</button>
                    <button data-id="${client._id}" class="btn btn-sm btn-danger delete-btn">Delete</button>
                `;
            });
            clientListMessage.style.display = 'none'; 
            if (clientListMessage.timeoutId) clearTimeout(clientListMessage.timeoutId); 
        }
    } catch (error) {
        console.error('Error fetching clients:', error);
        showMessage(clientListMessage, `Error fetching clients: ${error.message}`, true);
    }
}

async function handleSaveClient(event) {
    event.preventDefault();
    const clientFormMessage = document.getElementById('client-form-message');
    const clientIdField = document.getElementById('clientId');
    const clientId = clientIdField.value;

    // Clear previous messages
    showMessage(clientFormMessage, '', false); 
    clientFormMessage.style.display = 'none';

    const clientData = {
        companyName: document.getElementById('companyName').value.trim(),
        clientName: document.getElementById('clientName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phoneCountryCode: document.getElementById('phoneCountryCode').value,
        phoneNumber: document.getElementById('phoneNumber').value.trim(),
        address: document.getElementById('address').value.trim(),
        city: document.getElementById('city').value.trim(),
        country: document.getElementById('country').value,
    };

    // --- Input Validation ---
    let validationErrors = [];
    if (!clientData.companyName) validationErrors.push("Company Name is required.");
    if (!clientData.clientName) validationErrors.push("Client Name is required.");
    if (!clientData.email) {
        validationErrors.push("Email is required.");
    } else if (!isValidEmail(clientData.email)) {
        validationErrors.push("Please enter a valid email address.");
    }
    if (!clientData.phoneCountryCode) validationErrors.push("Phone Country Code is required.");
    if (!clientData.phoneNumber) {
        validationErrors.push("Phone Number is required.");
    } else if (!isValidPhoneNumber(clientData.phoneNumber)) {
        validationErrors.push("Please enter a valid phone number (digits, spaces, hyphens allowed).");
    }
    if (!clientData.address) validationErrors.push("Address is required.");
    if (!clientData.city) validationErrors.push("City is required.");
    if (!clientData.country) validationErrors.push("Country is required.");

    if (validationErrors.length > 0) {
        showMessage(clientFormMessage, validationErrors.join('\n'), true);
        return;
    }
    // --- End Validation ---

    const method = clientId ? 'PUT' : 'POST';
    const url = clientId ? `${API_URL}/clients/${clientId}` : `${API_URL}/clients`;

    try {
        const token = getAuthToken();
         if (!token) {
             checkAuth(); 
             return;
        }
        
        // Disable button temporarily
        const submitButton = document.querySelector('#client-form button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = clientId ? 'Updating...' : 'Saving...';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(clientData)
        });

        if (response.status === 401) { 
             logout(); 
             return; 
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        showMessage(clientFormMessage, `Client ${clientId ? 'updated' : 'added'} successfully!`, false);
        resetForm();
        fetchAndDisplayClients(); 

    } catch (error) {
        console.error(`Error ${clientId ? 'updating' : 'adding'} client:`, error);
        showMessage(clientFormMessage, `Error: ${error.message}`, true);
    } finally {
        // Re-enable button
        const submitButton = document.querySelector('#client-form button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Save Client'; 
            // If it was an update, reset button text in resetForm
            if (clientId) resetForm(); 
        }
    }
}

function handleTableActions(event) {
    const target = event.target;
    const clientId = target.getAttribute('data-id');

    if (target.classList.contains('edit-btn') && clientId) {
        populateFormForEdit(clientId);
    }

    if (target.classList.contains('delete-btn') && clientId) {
        if (confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
            handleDeleteClient(clientId);
        }
    }
}

async function populateFormForEdit(clientId) {
    const clientFormMessage = document.getElementById('client-form-message');
    showMessage(clientFormMessage, 'Loading client data for edit...', false);

    try {
        const token = getAuthToken();
         if (!token) {
             checkAuth(); 
             return;
        }
        
        const response = await fetch(`${API_URL}/clients/${clientId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) { 
             logout(); 
             return; 
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const client = await response.json();

        document.getElementById('clientId').value = client._id;
        document.getElementById('companyName').value = client.companyName || '';
        document.getElementById('clientName').value = client.clientName || '';
        document.getElementById('email').value = client.email || '';
        document.getElementById('phoneCountryCode').value = client.phoneCountryCode || '';
        document.getElementById('phoneNumber').value = client.phoneNumber || '';
        document.getElementById('address').value = client.address || '';
        document.getElementById('city').value = client.city || '';
        document.getElementById('country').value = client.country || ''; // Set country dropdown value

        document.getElementById('cancel-edit-button').style.display = 'inline-block';
        document.querySelector('#client-form button[type="submit"]').textContent = 'Update Client';
        window.scrollTo(0, 0); 
        showMessage(clientFormMessage, '', false); // Clear loading message
        clientFormMessage.style.display = 'none';

    } catch (error) {
        console.error('Error fetching client details for edit:', error);
        showMessage(clientFormMessage, `Error loading client data: ${error.message}`, true);
    }
}

async function handleDeleteClient(clientId) {
    const clientListMessage = document.getElementById('client-list-message');
    showMessage(clientListMessage, 'Deleting client...', false);

    try {
        const token = getAuthToken();
         if (!token) {
             checkAuth(); 
             return;
        }
        
        const response = await fetch(`${API_URL}/clients/${clientId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

       if (response.status === 401) { 
             logout(); 
             return; 
        }

        if (!response.ok) {
            let errorMsg = `HTTP error! status: ${response.status}`;
            try {
                 const errorData = await response.json();
                 errorMsg = errorData.message || errorMsg;
            } catch(e) { /* Ignore if response is not JSON */ }
            throw new Error(errorMsg);
        }

        showMessage(clientListMessage, 'Client deleted successfully!', false);
        fetchAndDisplayClients(); 

    } catch (error) {
        console.error('Error deleting client:', error);
        showMessage(clientListMessage, `Error deleting client: ${error.message}`, true);
    }
}

function resetForm() {
    const clientForm = document.getElementById('client-form');
    const clientIdField = document.getElementById('clientId');
    const cancelEditButton = document.getElementById('cancel-edit-button');
    const submitButton = document.querySelector('#client-form button[type="submit"]');
    const clientFormMessage = document.getElementById('client-form-message');

    if (clientForm) clientForm.reset();
    if (clientIdField) clientIdField.value = '';
    if (cancelEditButton) cancelEditButton.style.display = 'none';
    if (submitButton) submitButton.textContent = 'Save Client';
    if (clientFormMessage) {
         showMessage(clientFormMessage, '', false); // Clear message
         clientFormMessage.style.display = 'none';
    }
}

