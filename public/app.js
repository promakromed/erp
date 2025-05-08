// Set API URL based on environment
const API_URL = "https://proerp-b0dfb327892c.herokuapp.com/api ";
// const API_URL = "http://localhost:5000/api"; // For local development

// DOM Elements
const loginContainer = document.getElementById("login-container");
const mainContainer = document.getElementById("main-container");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const userNameElement = document.getElementById("user-name");
const logoutBtn = document.getElementById("logout-btn");

const searchForm = document.getElementById("search-form");
const clearBtn = document.getElementById("clear-btn");
const manufacturerSelect = document.getElementById("manufacturer-select"); 
const itemNumbersInput = document.getElementById("item-numbers");
const resultsContainer = document.getElementById("results-container");
const noResults = document.getElementById("no-results");
const loadingIndicator = document.getElementById("loading-indicator");
const errorMessage = document.getElementById("error-message");
const resultCount = document.getElementById("result-count");
const resultsHead = document.getElementById("results-head"); 
const resultsBody = document.getElementById("results-body");
const exportCsvBtn = document.getElementById("export-csv-btn"); 

let currentSearchCriteria = null;

// Function to make authenticated API requests
async function fetchWithAuth(url, options = {}) {
    console.log(`DEBUG: fetchWithAuth - Requesting ${url}`);
    
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    if (!userInfo || !userInfo.token) {
        console.error("Authentication token missing");
        checkAuth();
        throw new Error("Authentication required");
    }

    const headers = {
        ...options.headers,
        "Authorization": `Bearer ${userInfo.token}`,
    };

    if (options.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    try {
        const response = await fetch(url, { ...options, headers });
        console.log(`Response status for ${url}: ${response.status}`);

        if (!response.ok) {
            let errorMsg = `HTTP error! Status: ${response.status}`;
            try {
                const contentType = response.headers.get("content-type");
                if (contentType?.includes("application/json")) {
                    const errorData = await response.json();
                    errorMsg = errorData.message || errorMsg;
                } else {
                    errorMsg = await response.text();
                }
            } catch (parseErr) {
                console.warn("Failed to parse error response:", parseErr);
            }
            throw new Error(errorMsg);
        }

        if (response.status === 204) return null;

        return await response.json();
    } catch (err) {
        console.error(`Fetch error at ${url}:`, err.message);
        throw err;
    }
}

// Check auth status and redirect accordingly
function checkAuth() {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));

    if (!userInfo || !userInfo.token) {
        console.warn("User is not logged in.");
        window.location.href = "/login.html";
        return false;
    }

    console.log("User is authenticated:", userInfo.name);
    localStorage.setItem("userInfo", JSON.stringify(userInfo));
    if (userNameElement) userNameElement.textContent = userInfo.name;
    if (loginContainer) loginContainer.style.display = "none";
    if (mainContainer) mainContainer.style.display = "block";

    return true;
}

// Handle login form submission
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        if (!email || !password) {
            showError("Email and password are required.");
            return;
        }

        try {
            const res = await fetch(`${API_URL}/users/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Invalid credentials");
            }

            localStorage.setItem("userInfo", JSON.stringify(data));
            window.location.href = "/offers.html"; // Redirect after successful login
        } catch (err) {
            showError(err.message);
        }
    });
}

// Handle logout
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("userInfo");
        window.location.href = "/login.html";
    });
}

// Show error message
function showError(message) {
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = "block";
    }
    console.error("ERROR:", message);
}

// Hide error message
function hideError() {
    if (errorMessage) errorMessage.style.display = "none";
}

// Show loading indicator
function showLoading() {
    if (loadingIndicator) loadingIndicator.style.display = "block";
}

// Hide loading indicator
function hideLoading() {
    if (loadingIndicator) loadingIndicator.style.display = "none";
}

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
    console.log("DEBUG: DOMContentLoaded - Initializing app...");
    checkAuth(); // Ensure user is logged in
});
