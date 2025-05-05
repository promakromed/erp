// Global Variables
const API_URL = "."; // Use relative path for API calls
let currentOfferId = null; // To track which offer is being edited

// --- Authentication & Initialization ---

// Check if user is logged in
function checkAuth() {
    const userInfo = localStorage.getItem("userInfo");
    if (!userInfo) {
        console.log("DEBUG: No userInfo found in localStorage, redirecting to login.");
        window.location.href = "login.html";
        return null;
    }
    try {
        const parsedInfo = JSON.parse(userInfo);
        if (!parsedInfo || !parsedInfo.token) {
            console.log("DEBUG: Parsed userInfo invalid or token missing, redirecting to login.");
            localStorage.removeItem("userInfo"); // Clean up invalid item
            window.location.href = "login.html";
            return null;
        }
        console.log("DEBUG: User authenticated.");
        // Display user name (optional)
        const userNameSpan = document.getElementById("user-name");
        if (userNameSpan && parsedInfo.name) {
            userNameSpan.textContent = `Welcome, ${parsedInfo.name}`;
        }
        return parsedInfo; // Return user info including token
    } catch (error) {
        console.error("DEBUG: Error parsing userInfo from localStorage:", error);
        localStorage.removeItem("userInfo");
        window.location.href = "login.html";
        return null;
    }
}

// Logout function
function logout() {
    localStorage.removeItem("userInfo");
    window.location.href = "login.html";
}

// --- API Helper ---
async function fetchApi(endpoint, options = {}) {
    const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
    const token = userInfo.token;

    const defaultHeaders = {
        "Content-Type": "application/json",
    };
    if (token) {
        defaultHeaders["Authorization"] = `Bearer ${token}`;
    }

    options.headers = { ...defaultHeaders, ...options.headers };

    try {
        const response = await fetch(`${API_URL}${endpoint}`, options);
        if (!response.ok) {
            // Try to parse error message from backend
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                // If no JSON body, use status text
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        // Handle no content responses
        if (response.status === 204) {
            return null; 
        }
        // Handle potential binary data (PDF/CSV)
        const contentType = response.headers.get("content-type");
        if (contentType && (contentType.includes("application/pdf") || contentType.includes("text/csv"))) {
            return response; // Return the whole response for blob handling
        }
        return await response.json();
    } catch (error) {
        console.error("API Fetch Error:", error);
        // Display error to user?
        throw error; // Re-throw to be caught by calling function
    }
}

// --- UI Display Functions ---

function displayOffers(offers) {
    const listContainer = document.getElementById("offer-list-container");
    listContainer.innerHTML = "; // Clear previous content

    if (!offers || offers.length === 0) {
        listContainer.innerHTML = 
            `<div class="alert alert-info">No offers found.</div>`;
        return;
    }

    const table = document.createElement("table");
    table.className = "table table-hover";
    table.innerHTML = `
        <thead class="table-light">
            <tr>
                <th>Offer ID</th>
                <th>Client</th>
                <th>Date</th>
                <th>Validity</th>
                <th>Status</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${offers.map(offer => `
                <tr data-offer-id="${offer._id}" class="offer-list-item">
                    <td>${offer.offerId}</td>
                    <td>${offer.client?.companyName || "N/A"}</td>
                    <td>${new Date(offer.createdAt).toLocaleDateString()}</td>
                    <td>${offer.validityDate ? new Date(offer.validityDate).toLocaleDateString() : "N/A"}</td>
                    <td><span class="badge bg-${getOfferStatusColor(offer.status)}">${offer.status}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary view-offer-btn">View/Edit</button>
                        <button class="btn btn-sm btn-danger delete-offer-btn" ${offer.status !== "Draft" ? "disabled" : ""}>Delete</button>
                    </td>
                </tr>
            `).join("")}
        </tbody>
    `;
    listContainer.appendChild(table);

    // Add event listeners for view/delete buttons
    listContainer.querySelectorAll(".view-offer-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation(); // Prevent row click
            const offerId = e.target.closest("tr").dataset.offerId;
            viewOfferDetails(offerId);
        });
    });
    listContainer.querySelectorAll(".delete-offer-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const offerId = e.target.closest("tr").dataset.offerId;
            if (confirm("Are you sure you want to delete this draft offer?")) {
                deleteOffer(offerId);
            }
        });
    });
}

function getOfferStatusColor(status) {
    switch (status) {
        case "Draft": return "secondary";
        case "Sent": return "primary";
        case "Accepted": return "success";
        case "Rejected": return "danger";
        case "Expired": return "warning";
        default: return "light";
    }
}

function populateClientDropdown(clients) {
    const select = document.getElementById("offer-client-select");
    select.innerHTML = "; // Clear existing options
    select.appendChild(new Option("-- Select Client --", "")); // Add default option
    clients.forEach(client => {
        select.appendChild(new Option(`${client.companyName} (${client.clientName})`, client._id));
    });
}

function showOfferList() {
    document.getElementById("offer-list-container").style.display = "block";
    document.getElementById("offer-details-container").style.display = "none";
    currentOfferId = null; // Reset current offer ID
    loadOffers(); // Refresh list
}

function showOfferForm(title = "Create Offer", offerData = null) {
    document.getElementById("offer-list-container").style.display = "none";
    document.getElementById("offer-details-container").style.display = "block";
    document.getElementById("offer-form-title").textContent = title;
    
    // Reset form
    document.getElementById("offer-form").reset();
    document.getElementById("offer-line-items").innerHTML = "; // Clear line items
    currentOfferId = offerData ? offerData._id : null;

    // Populate form if editing
    if (offerData) {
        document.getElementById("offer-client-select").value = offerData.client?._id || "";
        document.getElementById("offer-validity-date").value = offerData.validityDate ? offerData.validityDate.split("T")[0] : "";
        document.getElementById("offer-terms").value = offerData.terms || "";
        // TODO: Populate line items
        // TODO: Show/hide buttons based on status (e.g., disable save if not Draft)
        document.getElementById("generate-pdf-btn").style.display = "inline-block";
        document.getElementById("generate-csv-btn").style.display = "inline-block";
    } else {
        document.getElementById("generate-pdf-btn").style.display = "none";
        document.getElementById("generate-csv-btn").style.display = "none";
    }
    
    // Fetch clients for dropdown if creating new or if needed
    if (!offerData || !document.getElementById("offer-client-select").options.length > 1) {
         loadClientsForDropdown();
    }
}

// --- Data Loading Functions ---

async function loadOffers() {
    try {
        const offers = await fetchApi("/api/offers");
        displayOffers(offers);
    } catch (error) {
        console.error("Failed to load offers:", error);
        document.getElementById("offer-list-container").innerHTML = 
            `<div class="alert alert-danger">Error loading offers: ${error.message}</div>`;
    }
}

async function loadClientsForDropdown() {
    try {
        const clients = await fetchApi("/api/clients");
        populateClientDropdown(clients);
    } catch (error) {
        console.error("Failed to load clients for dropdown:", error);
        // Handle error - maybe disable client selection?
    }
}

async function viewOfferDetails(offerId) {
    try {
        const offer = await fetchApi(`/api/offers/${offerId}`);
        showOfferForm(`View/Edit Offer: ${offer.offerId}`, offer);
    } catch (error) {
        console.error("Failed to load offer details:", error);
        alert(`Error loading offer: ${error.message}`);
    }
}

// --- Action Functions ---

async function saveOffer(event) {
    event.preventDefault();
    const offerData = {
        clientId: document.getElementById("offer-client-select").value,
        validityDate: document.getElementById("offer-validity-date").value || null,
        terms: document.getElementById("offer-terms").value,
        // TODO: Collect line item data
        // status: ? // Handle status updates separately?
    };

    try {
        let savedOffer;
        if (currentOfferId) {
            // Update existing offer
            savedOffer = await fetchApi(`/api/offers/${currentOfferId}`, {
                method: "PUT",
                body: JSON.stringify(offerData),
            });
            alert("Offer updated successfully!");
        } else {
            // Create new offer
            savedOffer = await fetchApi("/api/offers", {
                method: "POST",
                body: JSON.stringify(offerData),
            });
            alert("Offer created successfully!");
            currentOfferId = savedOffer._id; // Set current ID for potential further edits
        }
        // Optionally refresh the form with the saved data or go back to list
        viewOfferDetails(savedOffer._id); // Refresh form with latest data
        // showOfferList(); // Or go back to list
    } catch (error) {
        console.error("Failed to save offer:", error);
        alert(`Error saving offer: ${error.message}`);
    }
}

async function deleteOffer(offerId) {
    try {
        await fetchApi(`/api/offers/${offerId}`, { method: "DELETE" });
        alert("Offer deleted successfully.");
        loadOffers(); // Refresh the list
    } catch (error) {
        console.error("Failed to delete offer:", error);
        alert(`Error deleting offer: ${error.message}`);
    }
}

async function generateOutput(format) {
    if (!currentOfferId) return;
    const url = `/api/offers/${currentOfferId}/${format}`;
    try {
        const response = await fetchApi(url, { headers: {} }); // Let fetchApi handle auth
        
        if (!response.ok) {
             throw new Error(`Failed to generate ${format.toUpperCase()}. Status: ${response.status}`);
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = downloadUrl;
        // Extract filename from content-disposition header if available
        const disposition = response.headers.get("content-disposition");
        let filename = `offer_${currentOfferId}.${format}`;
        if (disposition && disposition.indexOf("attachment") !== -1) {
            const filenameRegex = /filename[^;=\n]*=(([""])(?:\\.|[^\2])*?\2|[^;\n]*)/;
            const matches = filenameRegex.exec(disposition);
            if (matches != null && matches[1]) {
                filename = matches[1].replace(/[""]/g, ");
            }
        }
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        a.remove();

    } catch (error) {
        console.error(`Failed to generate ${format}:`, error);
        alert(`Error generating ${format.toUpperCase()}: ${error.message}`);
    }
}

// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
    const userInfo = checkAuth();
    if (!userInfo) return; // Stop if not authenticated

    // Setup logout button
    const logoutButton = document.getElementById("logout-button");
    if (logoutButton) {
        logoutButton.addEventListener("click", logout);
    }

    // Setup navigation highlighting (simple version)
    const navLinks = document.querySelectorAll(".navbar-nav .nav-link");
    navLinks.forEach(link => {
        if (link.href === window.location.href) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });

    // Setup Offer Page specific listeners
    const createOfferBtn = document.getElementById("create-offer-btn");
    const cancelOfferBtn = document.getElementById("cancel-offer-btn");
    const offerForm = document.getElementById("offer-form");
    const generatePdfBtn = document.getElementById("generate-pdf-btn");
    const generateCsvBtn = document.getElementById("generate-csv-btn");

    if (createOfferBtn) {
        createOfferBtn.addEventListener("click", () => showOfferForm("Create New Offer"));
    }
    if (cancelOfferBtn) {
        cancelOfferBtn.addEventListener("click", showOfferList);
    }
    if (offerForm) {
        offerForm.addEventListener("submit", saveOffer);
    }
    if (generatePdfBtn) {
        generatePdfBtn.addEventListener("click", () => generateOutput("pdf"));
    }
     if (generateCsvBtn) {
        generateCsvBtn.addEventListener("click", () => generateOutput("csv"));
    }

    // Initial load
    loadOffers();
    // Pre-load clients for the dropdown in create form
    loadClientsForDropdown(); 
});

