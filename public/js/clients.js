// Set API URL based on environment
const API_URL = 'https://proerp-b0dfb327892c.herokuapp.com/api ';
// const API_URL = 'http://localhost:5000/api'; // For local dev

// DOM Elements
const loginContainer = document.getElementById("login-container");
const mainContainer = document.getElementById("main-container");
const logoutButton = document.getElementById("logout-button");

// Client Form Elements
const clientForm = document.getElementById("client-form");
const clientIdField = document.getElementById("clientId");
const companyNameInput = document.getElementById("companyName");
const clientNameInput = document.getElementById("clientName");
const emailInput = document.getElementById("email");
const phoneCountryCodeSelect = document.getElementById("phoneCountryCode");
const phoneNumberInput = document.getElementById("phoneNumber");
const addressInput = document.getElementById("address");
const cityInput = document.getElementById("city");
const countrySelect = document.getElementById("country");
const saveClientBtn = document.querySelector("#client-form button[type='submit']");
const cancelEditButton = document.getElementById("cancel-edit-button");

// Table Elements
const clientTableBody = document.querySelector('#client-table tbody');
const clientListMessage = document.getElementById('client-list-message');
const clientFormMessage = document.getElementById('client-form-message');

// Helper Functions
function getAuthToken() {
    const userInfoString = localStorage.getItem('userInfo');
    if (!userInfoString) return null;
    try {
        const userInfo = JSON.parse(userInfoString);
        return userInfo.token || null;
    } catch (e) {
        console.error("Failed to parse userInfo:", e);
        return null;
    }
}

function showMessage(element, message, isError = false) {
    if (!element) return;
    element.textContent = message;
    element.className = isError ? 'message error' : 'message success';
    element.style.display = 'block';

    if (element.timeoutId) clearTimeout(element.timeoutId);
    element.timeoutId = setTimeout(() => {
        element.style.display = 'none';
        element.textContent = '';
    }, 5000);
}

function checkAuth() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = '/login.html';
        return false;
    }

    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            userNameElement.textContent = userInfo?.name || "User";
        } catch (e) {}
    }

    if (loginContainer) loginContainer.style.display = "none";
    if (mainContainer) mainContainer.style.display = "block";

    return true;
}

function populatePhoneCountryCodes() {
    const phoneCountryCodeSelect = document.getElementById('phoneCountryCode');
    if (!phoneCountryCodeSelect) return;

    phoneCountryCodeSelect.innerHTML = '<option value="">Code</option>';

    countryCallingCodes.forEach(country => {
        const option = document.createElement('option');
        option.value = country.code;
        option.textContent = country.name;
        phoneCountryCodeSelect.appendChild(option);
    });
}

function populateCountries() {
    const countrySelect = document.getElementById('country');
    if (!countrySelect) return;

    countrySelect.innerHTML = '<option value="">Select Country</option>';
    countries.forEach(countryName => {
        const option = document.createElement('option');
        option.value = countryName;
        option.textContent = countryName;
        countrySelect.appendChild(option);
    });
}

async function fetchAndDisplayClients() {
    if (!clientListMessage) return;
    showMessage(clientListMessage, 'Loading clients...', false);

    try {
        const token = getAuthToken();
        if (!token) {
            checkAuth();
            return;
        }

        const response = await fetch(`${API_URL}/clients`, {
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
            const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const clients = await response.json();

        if (!clientTableBody) return;
        clientTableBody.innerHTML = "";

        if (clients.length === 0) {
            showMessage(clientListMessage, "No clients found.");
            return;
        }

        clients.forEach(client => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${client.companyName}</td>
                <td>${client.clientName || 'N/A'}</td>
                <td>${client.email || 'N/A'}</td>
                <td>${client.phoneCountryCode || ''} ${client.phoneNumber || ''}</td>
                <td>${client.address || 'N/A'}</td>
                <td>${client.city || 'N/A'}</td>
                <td>${client.country || 'N/A'}</td>
                <td class="action-buttons">
                    <button data-id="${client._id}" class="btn btn-sm btn-warning edit-btn">Edit</button>
                    <button data-id="${client._id}" class="btn btn-sm btn-danger delete-btn">Delete</button>
                </td>
            `;
            clientTableBody.appendChild(row);
        });

        clientListMessage.style.display = 'none';
    } catch (error) {
        showMessage(clientListMessage, `Error fetching clients: ${error.message}`, true);
    }
}

async function handleSaveClient(event) {
    event.preventDefault();
    const token = getAuthToken();
    if (!token) {
        checkAuth();
        return;
    }

    const clientId = clientIdField.value.trim();
    const clientData = {
        companyName: companyNameInput.value.trim(),
        clientName: clientNameInput.value.trim(),
        email: emailInput.value.trim(),
        phoneCountryCode: phoneCountryCodeSelect.value,
        phoneNumber: phoneNumberInput.value.trim(),
        address: addressInput.value.trim(),
        city: cityInput.value.trim(),
        country: countrySelect.value.trim()
    };

    if (!clientData.companyName || !clientData.email || !clientData.phoneNumber || !clientData.address || !clientData.city || !clientData.country) {
        showMessage(clientFormMessage, "All fields except client name are required.", true);
        return;
    }

    if (!isValidEmail(clientData.email)) {
        showMessage(clientFormMessage, "Please enter a valid email address.", true);
        return;
    }

    if (!isValidPhoneNumber(clientData.phoneNumber)) {
        showMessage(clientFormMessage, "Please enter a valid phone number.", true);
        return;
    }

    showMessage(clientFormMessage, clientId ? "Updating client..." : "Adding client...", false);
    saveClientBtn.disabled = true;
    saveClientBtn.textContent = clientId ? "Saving Changes..." : "Saving...";

    try {
        const url = clientId ? `${API_URL}/clients/${clientId}` : `${API_URL}/clients`;
        const method = clientId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(clientData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: "Server error" }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const savedClient = await response.json();
        showMessage(clientFormMessage, clientId ? "Client updated successfully!" : "Client added successfully!", false);
        fetchAndDisplayClients();
        resetForm();
    } catch (error) {
        showMessage(clientFormMessage, `Error saving client: ${error.message}`, true);
        saveClientBtn.disabled = false;
        saveClientBtn.textContent = clientId ? "Save Changes" : "Save Client";
    }
}

function resetForm() {
    clientIdField.value = "";
    clientNameInput.value = "";
    companyNameInput.value = "";
    emailInput.value = "";
    phoneCountryCodeSelect.value = "+90";
    phoneNumberInput.value = "";
    addressInput.value = "";
    cityInput.value = "";
    countrySelect.value = "Turkey";
    if (cancelEditButton) cancelEditButton.style.display = "none";
    saveClientBtn.textContent = "Save Client";
    saveClientBtn.disabled = false;
}

async function populateFormForEdit(clientId) {
    const token = getAuthToken();
    if (!token) return;

    showMessage(clientFormMessage, "Loading client data...", false);

    try {
        const response = await fetch(`${API_URL}/clients/${clientId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: "HTTP error" }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const client = await response.json();
        clientIdField.value = client._id;
        companyNameInput.value = client.companyName;
        clientNameInput.value = client.clientName || "";
        emailInput.value = client.email || "";
        phoneCountryCodeSelect.value = client.phoneCountryCode || "+90";
        phoneNumberInput.value = client.phoneNumber || "";
        addressInput.value = client.address || "";
        cityInput.value = client.city || "";
        countrySelect.value = client.country || "Turkey";
        if (cancelEditButton) cancelEditButton.style.display = "inline-block";
        saveClientBtn.textContent = "Save Changes";
    } catch (error) {
        showMessage(clientFormMessage, `Failed to load client: ${error.message}`, true);
    }
}

async function handleDeleteClient(clientId) {
    if (!confirm("Are you sure you want to delete this client?")) return;

    const token = getAuthToken();
    if (!token) return;

    showMessage(clientListMessage, "Deleting client...", false);

    try {
        const response = await fetch(`${API_URL}/clients/${clientId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: "HTTP error" }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        showMessage(clientListMessage, "Client deleted successfully!", false);
        fetchAndDisplayClients();
    } catch (error) {
        showMessage(clientListMessage, `Error deleting client: ${error.message}`, true);
    }
}

function logout() {
    localStorage.removeItem("userInfo");
    window.location.href = "/login.html";
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
    checkAuth();
    populatePhoneCountryCodes();
    populateCountries();
    fetchAndDisplayClients();

    if (clientForm) clientForm.addEventListener("submit", handleSaveClient);
    if (cancelEditButton) cancelEditButton.addEventListener("click", resetForm);
    if (logoutButton) logoutButton.addEventListener("click", logout);
});

// Validation functions
function isValidEmail(email) {
    const re = /^\S+@\S+\.\S+$/;
    return re.test(String(email).toLowerCase());
}

function isValidPhoneNumber(phone) {
    return phone && phone.replace(/\D/g, '').length >= 7;
}
