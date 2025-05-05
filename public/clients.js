const API_URL = 'https://proerp-b0dfb327892c.herokuapp.com/api'; // Ensure this matches your deployed backend URL

document.addEventListener('DOMContentLoaded', () => {
    // Run checkAuth but don't block execution based on its return value for now
    checkAuth(); 

    // Proceed with setting up the page regardless of initial checkAuth outcome
    const clientForm = document.getElementById('client-form');
    const clientTableBody = document.querySelector('#client-table tbody');
    const clientFormMessage = document.getElementById('client-form-message');
    const clientListMessage = document.getElementById('client-list-message');
    const logoutButton = document.getElementById('logout-button');
    const cancelEditButton = document.getElementById('cancel-edit-button');
    const clientIdField = document.getElementById('clientId');

    // --- Populate Country Codes --- 
    populateCountryCodes();

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

function checkAuth() {
    console.log("DEBUG: checkAuth() called on clients.js");
    const token = localStorage.getItem('token');
    console.log("DEBUG: Token retrieved from localStorage:", token); // Log the actual token value

    // Log all localStorage items for comparison
    try {
        console.log("DEBUG: Full localStorage content:", JSON.stringify(localStorage));
    } catch (e) {
        console.error("DEBUG: Could not stringify localStorage", e);
    }

    if (!token) {
        console.error("CRITICAL: No token found in localStorage! Redirect is REMOVED for debugging.");
        // window.location.href = 'login.html'; // *** REDIRECT COMPLETELY REMOVED ***
        // We will let the API calls fail and show errors on the page instead.
        return false; // Indicate authentication check failed (though we don't block based on this now)
    } else {
        console.log("DEBUG: Token found during initial checkAuth.");
        // Optional: Add a check here to verify the token with the backend
        // Example: verifyTokenWithBackend(token);
        return true; // Indicate authentication passed
    }
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}

function showMessage(element, message, isError = false) {
    if (element) {
        element.textContent = message;
        element.className = isError ? 'message error' : 'message success';
        element.style.display = 'block';
        // Automatically hide message after 5 seconds
        // Clear previous timeout if exists
        if (element.timeoutId) {
            clearTimeout(element.timeoutId);
        }
        element.timeoutId = setTimeout(() => {
            if (element.style.display !== 'none') { // Check if still visible
                 element.style.display = 'none';
                 element.textContent = '';
            }
        }, 5000);
    }
}

function populateCountryCodes() {
    const countryCodeSelect = document.getElementById('phoneCountryCode');
    if (!countryCodeSelect) return;

    // Basic list - expand as needed or fetch from an API/library
    const countryCodes = [
        { code: "+1", name: "USA/Canada (+1)" },
        { code: "+44", name: "UK (+44)" },
        { code: "+49", name: "Germany (+49)" },
        { code: "+33", name: "France (+33)" },
        { code: "+91", name: "India (+91)" },
        { code: "+86", name: "China (+86)" },
        { code: "+20", name: "Egypt (+20)" },
        // Add more countries as required
    ];

    // Clear existing options first
    countryCodeSelect.innerHTML = '<option value="">Select Code</option>'; 

    countryCodes.forEach(country => {
        const option = document.createElement('option');
        option.value = country.code;
        option.textContent = country.name;
        countryCodeSelect.appendChild(option);
    });
}

async function fetchAndDisplayClients() {
    const clientTableBody = document.querySelector('#client-table tbody');
    const clientListMessage = document.getElementById('client-list-message');
    if (!clientTableBody || !clientListMessage) return;

    showMessage(clientListMessage, 'Loading clients...', false);

    try {
        const token = localStorage.getItem('token');
        // Re-check token just before fetch
        if (!token) {
             console.error("Token missing before fetching clients.");
             throw new Error("Authentication token missing. Cannot fetch clients. Please log in again.");
        }
        
        const response = await fetch(`${API_URL}/clients`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) { // Handle unauthorized specifically
             console.error("Unauthorized access fetching clients. Token might be invalid or expired.");
             // Don't logout automatically here, show error message first
             // logout(); 
             throw new Error("Unauthorized (401). Your session may have expired. Please log out and log in again.");
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const clients = await response.json();
        clientTableBody.innerHTML = ''; // Clear existing rows

        if (clients.length === 0) {
            showMessage(clientListMessage, 'No clients found.', false);
        } else {
            clients.forEach(client => {
                const row = clientTableBody.insertRow();
                row.innerHTML = `
                    <td>${client.companyName || 'N/A'}</td>
                    <td>${client.clientName || 'N/A'}</td>
                    <td>${client.email || 'N/A'}</td>
                    <td>${client.phoneCountryCode || ''} ${client.phoneNumber || 'N/A'}</td>
                    <td>${client.address || 'N/A'}</td>
                    <td>${client.city || 'N/A'}</td>
                    <td>${client.country || 'N/A'}</td>
                    <td class="action-buttons">
                        <button data-id="${client._id}" class="edit-btn">Edit</button>
                        <button data-id="${client._id}" class="delete-btn">Delete</button>
                    </td>
                `;
            });
            // Hide the message area if data is successfully loaded
            clientListMessage.style.display = 'none'; 
            if (clientListMessage.timeoutId) clearTimeout(clientListMessage.timeoutId); // Clear timeout if message was shown
        }
    } catch (error) {
        console.error('Error fetching clients:', error);
        // Display the error prominently on the page
        showMessage(clientListMessage, `Error fetching clients: ${error.message}`, true);
    }
}

async function handleSaveClient(event) {
    event.preventDefault();
    const clientFormMessage = document.getElementById('client-form-message');
    const clientIdField = document.getElementById('clientId');
    const clientId = clientIdField.value;

    const clientData = {
        companyName: document.getElementById('companyName').value.trim(),
        clientName: document.getElementById('clientName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phoneCountryCode: document.getElementById('phoneCountryCode').value,
        phoneNumber: document.getElementById('phoneNumber').value.trim(),
        address: document.getElementById('address').value.trim(),
        city: document.getElementById('city').value.trim(),
        country: document.getElementById('country').value.trim(),
    };

    // Basic frontend validation (more robust validation on backend)
    if (!clientData.companyName || !clientData.clientName || !clientData.email || !clientData.phoneCountryCode || !clientData.phoneNumber || !clientData.address || !clientData.city || !clientData.country) {
        showMessage(clientFormMessage, 'Please fill in all required fields.', true);
        return;
    }

    const method = clientId ? 'PUT' : 'POST';
    const url = clientId ? `${API_URL}/clients/${clientId}` : `${API_URL}/clients`;

    try {
        const token = localStorage.getItem('token');
         if (!token) {
             console.error("Token missing before saving client.");
             throw new Error("Authentication token missing. Cannot save client. Please log in again.");
        }
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(clientData)
        });

        if (response.status === 401) { 
             console.error("Unauthorized access saving client. Token might be invalid or expired.");
             throw new Error("Unauthorized (401). Your session may have expired. Please log out and log in again.");
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        showMessage(clientFormMessage, `Client ${clientId ? 'updated' : 'added'} successfully!`, false);
        resetForm();
        fetchAndDisplayClients(); // Refresh the list

    } catch (error) {
        console.error(`Error ${clientId ? 'updating' : 'adding'} client:`, error);
        showMessage(clientFormMessage, `Error: ${error.message}`, true);
    }
}

function handleTableActions(event) {
    const target = event.target;
    const clientId = target.getAttribute('data-id');

    if (target.classList.contains('edit-btn') && clientId) {
        populateFormForEdit(clientId);
    }

    if (target.classList.contains('delete-btn') && clientId) {
        if (confirm('Are you sure you want to delete this client?')) {
            handleDeleteClient(clientId);
        }
    }
}

async function populateFormForEdit(clientId) {
    const clientFormMessage = document.getElementById('client-form-message');
    try {
        const token = localStorage.getItem('token');
         if (!token) {
             console.error("Token missing before loading client for edit.");
             throw new Error("Authentication token missing. Cannot load client for edit. Please log in again.");
        }
        
        const response = await fetch(`${API_URL}/clients/${clientId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) { 
             console.error("Unauthorized access loading client. Token might be invalid or expired.");
             throw new Error("Unauthorized (401). Your session may have expired. Please log out and log in again.");
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
        document.getElementById('country').value = client.country || '';

        document.getElementById('cancel-edit-button').style.display = 'inline-block';
        document.querySelector('#client-form button[type="submit"]').textContent = 'Update Client';
        window.scrollTo(0, 0); // Scroll to top to see the form

    } catch (error) {
        console.error('Error fetching client details for edit:', error);
        showMessage(clientFormMessage, `Error loading client data: ${error.message}`, true);
    }
}

async function handleDeleteClient(clientId) {
    const clientListMessage = document.getElementById('client-list-message');
    try {
        const token = localStorage.getItem('token');
         if (!token) {
             console.error("Token missing before deleting client.");
             throw new Error("Authentication token missing. Cannot delete client. Please log in again.");
        }
        
        const response = await fetch(`${API_URL}/clients/${clientId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

       if (response.status === 401) { 
             console.error("Unauthorized access deleting client. Token might be invalid or expired.");
             throw new Error("Unauthorized (401). Your session may have expired. Please log out and log in again.");
        }

        if (!response.ok) {
            // Handle cases where deletion fails on the server (e.g., client not found)
            let errorMsg = `HTTP error! status: ${response.status}`;
            try {
                 const errorData = await response.json();
                 errorMsg = errorData.message || errorMsg;
            } catch(e) { /* Ignore if response is not JSON */ }
            throw new Error(errorMsg);
        }

        // Assuming successful deletion returns the ID or a success message
        // const result = await response.json(); 
        showMessage(clientListMessage, 'Client deleted successfully!', false);
        fetchAndDisplayClients(); // Refresh the list

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
         clientFormMessage.style.display = 'none';
         if (clientFormMessage.timeoutId) clearTimeout(clientFormMessage.timeoutId);
    }
}

