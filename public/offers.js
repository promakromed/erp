// /home/ubuntu/erp/public/offers.js

document.addEventListener("DOMContentLoaded", () => {
    console.log("DEBUG: DOMContentLoaded event fired");
    checkAuth();
    setupEventListeners();
    loadOffers();
    populateClientDropdown(); // Populate clients when the page loads
});

let currentOfferId = null; // To keep track of the offer being edited

function checkAuth() {
    console.log("DEBUG: checkAuth function called");
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    console.log("DEBUG: localStorage content:", localStorage);
    console.log("DEBUG: Retrieved userInfo:", userInfo);

    if (!userInfo || !userInfo.token) {
        console.error("DEBUG: Token not found in userInfo. Redirecting to login.");
        alert("Authentication token not found. Please log in again.");
        window.location.href = "/login.html";
    } else {
        console.log("DEBUG: Token found in userInfo.");
        // Optionally set default headers for future fetch requests
        // fetchOptions.headers["Authorization"] = `Bearer ${userInfo.token}`;
    }
}

function getAuthToken() {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    return userInfo ? userInfo.token : null;
}

function setupEventListeners() {
    console.log("DEBUG: setupEventListeners function called");
    const createOfferBtn = document.getElementById("create-offer-btn");
    const saveOfferBtn = document.getElementById("save-offer-btn");
    const cancelOfferBtn = document.getElementById("cancel-offer-btn");
    const addItemBtn = document.getElementById("add-item-btn"); // Get the Add Item button

    if (createOfferBtn) {
        console.log("DEBUG: Found create-offer-btn, adding event listener.");
        createOfferBtn.addEventListener("click", () => {
            console.log("DEBUG: Create New Offer button clicked!");
            currentOfferId = null; // Reset current offer ID for new offer
            showOfferForm();
        });
    } else {
        console.error("DEBUG: Could not find create-offer-btn");
    }

    if (saveOfferBtn) {
        console.log("DEBUG: Found save-offer-btn, adding event listener.");
        saveOfferBtn.addEventListener("click", saveOffer);
    } else {
        console.error("DEBUG: Could not find save-offer-btn");
    }

    if (cancelOfferBtn) {
        console.log("DEBUG: Found cancel-offer-btn, adding event listener.");
        cancelOfferBtn.addEventListener("click", () => {
            console.log("DEBUG: Cancel button clicked");
            showOfferList();
        });
    } else {
        console.error("DEBUG: Could not find cancel-offer-btn");
    }

    if (addItemBtn) {
        console.log("DEBUG: Found add-item-btn, adding event listener.");
        addItemBtn.addEventListener("click", () => {
            console.log("DEBUG: Add Item Manually button clicked!");
            addLineItemRow();
        });
    } else {
        console.error("DEBUG: Could not find add-item-btn");
    }
}

async function loadOffers() {
    console.log("DEBUG: loadOffers function called");
    const token = getAuthToken();
    if (!token) {
        console.error("DEBUG: No token found in loadOffers");
        return;
    }

    const offerListContainer = document.getElementById("offer-list-container");
    const loadingIndicator = document.getElementById("loading-indicator");
    const errorMessage = document.getElementById("error-message");

    offerListContainer.innerHTML = ""; // Clear previous list
    errorMessage.textContent = "";
    loadingIndicator.style.display = "block";

    try {
        const response = await fetch("/api/offers", {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        loadingIndicator.style.display = "none";

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const offers = await response.json();
        console.log("DEBUG: Fetched offers:", offers);
        displayOffers(offers);
    } catch (error) {
        console.error("Error fetching offers:", error);
        loadingIndicator.style.display = "none";
        errorMessage.textContent = `Error fetching offers: ${error.message}. Please try again.`;
    }
}

function displayOffers(offers) {
    console.log("DEBUG: displayOffers function called");
    const offerListContainer = document.getElementById("offer-list-container");
    offerListContainer.innerHTML = ""; // Clear previous content

    if (!offers || offers.length === 0) {
        offerListContainer.innerHTML = "<p>No offers found.</p>";
        return;
    }

    const table = document.createElement("table");
    table.className = "table table-striped table-bordered";
    table.innerHTML = `
        <thead>
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
        </tbody>
    `;

    const tbody = table.querySelector("tbody");
    offers.forEach(offer => {
        const clientName = offer.client ? offer.client.clientName : "N/A"; // Handle potential missing client data
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${offer.offerId || "N/A"}</td>
            <td>${clientName}</td>
            <td>${new Date(offer.offerDate).toLocaleDateString()}</td>
            <td>${new Date(offer.validityDate).toLocaleDateString()}</td>
            <td>${offer.status}</td>
            <td>
                <button class="btn btn-sm btn-info view-edit-btn" data-id="${offer._id}">View/Edit</button>
                <button class="btn btn-sm btn-danger delete-btn" data-id="${offer._id}" ${offer.status !== "Draft" ? "disabled" : ""}>Delete</button>
                <button class="btn btn-sm btn-secondary pdf-btn" data-id="${offer._id}">PDF</button>
                <button class="btn btn-sm btn-secondary csv-btn" data-id="${offer._id}">CSV</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    offerListContainer.appendChild(table);

    // Add event listeners for action buttons
    offerListContainer.querySelectorAll(".view-edit-btn").forEach(button => {
        button.addEventListener("click", (e) => {
            const id = e.target.getAttribute("data-id");
            console.log(`DEBUG: View/Edit button clicked for offer ID: ${id}`);
            loadOfferForEditing(id);
        });
    });

    offerListContainer.querySelectorAll(".delete-btn").forEach(button => {
        button.addEventListener("click", (e) => {
            const id = e.target.getAttribute("data-id");
            console.log(`DEBUG: Delete button clicked for offer ID: ${id}`);
            if (confirm("Are you sure you want to delete this offer?")) {
                deleteOffer(id);
            }
        });
    });

    offerListContainer.querySelectorAll(".pdf-btn").forEach(button => {
        button.addEventListener("click", (e) => {
            const id = e.target.getAttribute("data-id");
            console.log(`DEBUG: PDF button clicked for offer ID: ${id}`);
            generateOfferOutput(id, "pdf");
        });
    });

    offerListContainer.querySelectorAll(".csv-btn").forEach(button => {
        button.addEventListener("click", (e) => {
            const id = e.target.getAttribute("data-id");
            console.log(`DEBUG: CSV button clicked for offer ID: ${id}`);
            generateOfferOutput(id, "csv");
        });
    });
}

function showOfferForm() {
    console.log("DEBUG: showOfferForm function called");
    document.getElementById("offer-list-section").style.display = "none";
    document.getElementById("offer-form-section").style.display = "block";
    document.getElementById("offer-form").reset(); // Clear form fields
    document.getElementById("line-items-body").innerHTML = ""; // Clear line items
    document.getElementById("offer-id-display").textContent = "New Offer"; // Reset offer ID display
    currentOfferId = null; // Ensure we are creating a new offer
}

function showOfferList() {
    console.log("DEBUG: showOfferList function called");
    document.getElementById("offer-form-section").style.display = "none";
    document.getElementById("offer-list-section").style.display = "block";
    loadOffers(); // Refresh the list
}

async function populateClientDropdown() {
    console.log("DEBUG: populateClientDropdown function called");
    const token = getAuthToken();
    if (!token) return;

    const clientSelect = document.getElementById("offer-client");
    clientSelect.innerHTML = "<option value=\"\">Select Client...</option>"; // Clear existing options

    try {
        const response = await fetch("/api/clients", {
            headers: { "Authorization": `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to fetch clients");
        const clients = await response.json();
        clients.forEach(client => {
            const option = document.createElement("option");
            option.value = client._id;
            option.textContent = `${client.clientName} (${client.companyName})`;
            clientSelect.appendChild(option);
        });
        console.log("DEBUG: Client dropdown populated");
    } catch (error) {
        console.error("Error populating client dropdown:", error);
        alert("Error loading clients for dropdown. Please try again.");
    }
}

async function saveOffer(event) {
    event.preventDefault(); // Prevent default form submission
    console.log("DEBUG: saveOffer function called");
    const token = getAuthToken();
    if (!token) {
        alert("Authentication token missing. Cannot save offer. Please log in again.");
        return;
    }

    const offerData = {
        client: document.getElementById("offer-client").value,
        offerDate: new Date().toISOString(), // Or use a date picker
        validityDate: document.getElementById("offer-validity").value,
        terms: document.getElementById("offer-terms").value,
        status: document.getElementById("offer-status").value || "Draft",
        pricingMethod: document.getElementById("offer-pricing-method").value,
        marginPercent: document.getElementById("offer-margin").value || 0,
        lineItems: [],
    };

    // --- Collect Line Items --- 
    const lineItemRows = document.querySelectorAll("#line-items-body tr");
    console.log(`DEBUG: Found ${lineItemRows.length} line item rows`);
    lineItemRows.forEach((row, index) => {
        const itemNumberInput = row.querySelector("input[name='itemNumber']");
        const descriptionInput = row.querySelector("input[name='description']");
        const quantityInput = row.querySelector("input[name='quantity']");
        const unitPriceInput = row.querySelector("input[name='unitPrice']"); // Optional, might be calculated

        // Basic validation - ensure required fields are present
        if (itemNumberInput && quantityInput && itemNumberInput.value && quantityInput.value) {
            const lineItem = {
                itemNumber: itemNumberInput.value,
                description: descriptionInput ? descriptionInput.value : '', // Handle optional description
                quantity: parseInt(quantityInput.value, 10),
                // unitPrice: unitPriceInput ? parseFloat(unitPriceInput.value) : undefined // Only include if provided
            };
            console.log(`DEBUG: Adding line item ${index}:`, lineItem);
            offerData.lineItems.push(lineItem);
        } else {
             console.warn(`DEBUG: Skipping incomplete line item row ${index}`);
        }
    });
     console.log("DEBUG: Collected line items:", offerData.lineItems);
    // --- End Collect Line Items ---

    // Basic validation
    if (!offerData.client || !offerData.validityDate) {
        alert("Please select a client and enter a validity date.");
        return;
    }

    const method = currentOfferId ? "PUT" : "POST";
    const url = currentOfferId ? `/api/offers/${currentOfferId}` : "/api/offers";

    console.log(`DEBUG: Saving offer. Method: ${method}, URL: ${url}, Data:`, offerData);

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(offerData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const savedOffer = await response.json();
        console.log("DEBUG: Offer saved successfully:", savedOffer);
        alert(`Offer ${currentOfferId ? 'updated' : 'created'} successfully! Offer ID: ${savedOffer.offerId}`);
        currentOfferId = savedOffer._id; // Update current ID if creating
        document.getElementById("offer-id-display").textContent = `Offer ID: ${savedOffer.offerId}`;
        // Optionally reload the form with the saved data or switch to list view
        // loadOfferForEditing(savedOffer._id); // Reload form with saved data
        showOfferList(); // Go back to list view after saving

    } catch (error) {
        console.error("Error saving offer:", error);
        alert(`Error saving offer: ${error.message}. Please try again.`);
    }
}

async function loadOfferForEditing(id) {
    console.log(`DEBUG: loadOfferForEditing called for ID: ${id}`);
    const token = getAuthToken();
    if (!token) return;

    try {
        const response = await fetch(`/api/offers/${id}`, {
            headers: { "Authorization": `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to fetch offer details");
        const offer = await response.json();
        console.log("DEBUG: Fetched offer for editing:", offer);

        showOfferForm(); // Switch to form view
        currentOfferId = offer._id; // Set the current offer ID

        // Populate form fields
        document.getElementById("offer-id-display").textContent = `Offer ID: ${offer.offerId}`;
        document.getElementById("offer-client").value = offer.client._id; // Assuming client is populated
        document.getElementById("offer-validity").value = offer.validityDate.split('T')[0]; // Format date YYYY-MM-DD
        document.getElementById("offer-terms").value = offer.terms || "";
        document.getElementById("offer-status").value = offer.status;
        document.getElementById("offer-pricing-method").value = offer.pricingMethod || "Margin";
        document.getElementById("offer-margin").value = offer.marginPercent || "";

        // Populate line items
        const lineItemsBody = document.getElementById("line-items-body");
        lineItemsBody.innerHTML = ""; // Clear existing items
        if (offer.lineItems && offer.lineItems.length > 0) {
            offer.lineItems.forEach(item => {
                addLineItemRow(item); // Add row with existing item data
            });
        }
        console.log("DEBUG: Offer form populated for editing");

    } catch (error) {
        console.error("Error loading offer for editing:", error);
        alert("Error loading offer details. Please try again.");
        showOfferList(); // Go back to list if loading fails
    }
}

async function deleteOffer(id) {
    console.log(`DEBUG: deleteOffer called for ID: ${id}`);
    const token = getAuthToken();
    if (!token) return;

    try {
        const response = await fetch(`/api/offers/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        console.log("DEBUG: Offer deleted successfully");
        alert("Offer deleted successfully!");
        loadOffers(); // Refresh the list

    } catch (error) {
        console.error("Error deleting offer:", error);
        alert(`Error deleting offer: ${error.message}. Please try again.`);
    }
}

// --- Add Line Item Functionality ---
function addLineItemRow(item = null) {
    console.log("DEBUG: addLineItemRow called. Item data:", item);
    const lineItemsBody = document.getElementById("line-items-body");
    const newRow = document.createElement("tr");

    // Populate with item data if provided (for editing), otherwise empty fields
    const itemNumber = item ? item.itemNumber : "";
    const description = item ? item.description : "";
    const quantity = item ? item.quantity : 1; // Default quantity to 1 for new rows
    // const unitPrice = item ? item.unitPrice : ""; // If tracking unit price on frontend

    newRow.innerHTML = `
        <td><input type="text" name="itemNumber" class="form-control form-control-sm" placeholder="Item No." value="${itemNumber}" required></td>
        <td><input type="text" name="description" class="form-control form-control-sm" placeholder="Description" value="${description}"></td>
        <td><input type="number" name="quantity" class="form-control form-control-sm" placeholder="Qty" value="${quantity}" min="1" required></td>
        <!-- <td><input type="number" name="unitPrice" class="form-control form-control-sm" placeholder="Unit Price (USD)" value="${unitPrice}" step="0.01"></td> -->
        <td><button type="button" class="btn btn-sm btn-danger remove-item-btn">Remove</button></td>
    `;

    lineItemsBody.appendChild(newRow);
    console.log("DEBUG: Added new line item row to the table");

    // Add event listener for the remove button on the new row
    newRow.querySelector(".remove-item-btn").addEventListener("click", (e) => {
        console.log("DEBUG: Remove item button clicked");
        e.target.closest("tr").remove();
        console.log("DEBUG: Line item row removed");
    });
}
// --- End Add Line Item Functionality ---

async function generateOfferOutput(id, format) {
    console.log(`DEBUG: generateOfferOutput called for ID: ${id}, Format: ${format}`);
    const token = getAuthToken();
    if (!token) {
        alert("Authentication token missing. Cannot generate output.");
        return;
    }

    const url = `/api/offers/${id}/${format}`;
    const loadingIndicator = document.getElementById("loading-indicator");
    const errorMessage = document.getElementById("error-message");

    loadingIndicator.style.display = "block";
    errorMessage.textContent = "";

    try {
        const response = await fetch(url, {
            headers: { "Authorization": `Bearer ${token}` },
        });

        loadingIndicator.style.display = "none";

        if (!response.ok) {
            // Try to parse error message from JSON, otherwise use status text
            let errorMsg = `HTTP error! status: ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.message || errorMsg;
            } catch (e) {
                // Ignore if response is not JSON
            }
            throw new Error(errorMsg);
        }

        // Handle file download
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = downloadUrl;
        // Extract filename from content-disposition header if available, otherwise generate one
        const disposition = response.headers.get('content-disposition');
        let filename = `offer-${id}.${format}`;
        if (disposition && disposition.indexOf('attachment') !== -1) {
            const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
            const matches = filenameRegex.exec(disposition);
            if (matches != null && matches[1]) {
                filename = matches[1].replace(/['"]/g, '');
            }
        }
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        a.remove();
        console.log(`DEBUG: ${format.toUpperCase()} file downloaded as ${filename}`);

    } catch (error) {
        console.error(`Error generating ${format}:`, error);
        loadingIndicator.style.display = "none";
        errorMessage.textContent = `Error generating ${format}: ${error.message}. Please check server logs for details.`;
        alert(`Error generating ${format}: ${error.message}`);
    }
}

