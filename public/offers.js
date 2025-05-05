// /home/ubuntu/erp/public/offers.js

document.addEventListener("DOMContentLoaded", () => {
    console.log("DEBUG: DOMContentLoaded event fired");

    // --- Element References ---
    // Ensure all element references are fetched *after* DOM is loaded
    const offerListSection = document.getElementById("offer-list-section");
    const offerFormSection = document.getElementById("offer-form-section");
    const offerListContainer = document.getElementById("offer-list-container");
    const offerForm = document.getElementById("offer-form");
    const lineItemsBody = document.getElementById("line-items-body");
    const offerIdDisplay = document.getElementById("offer-id-display");
    const clientSelect = document.getElementById("offer-client");
    const validityInput = document.getElementById("offer-validity");
    const termsInput = document.getElementById("offer-terms");
    const statusSelect = document.getElementById("offer-status");
    const pricingMethodSelect = document.getElementById("offer-pricing-method");
    const marginInput = document.getElementById("offer-margin");
    const createOfferBtn = document.getElementById("create-offer-btn");
    const saveOfferBtn = document.getElementById("save-offer-btn");
    const cancelOfferBtn = document.getElementById("cancel-offer-btn");
    const addItemBtn = document.getElementById("add-item-btn");
    const generatePdfBtn = document.getElementById("generate-pdf-btn");
    const generateCsvBtn = document.getElementById("generate-csv-btn");
    const loadingIndicator = document.getElementById("loading-indicator");
    const errorMessage = document.getElementById("error-message");
    const logoutButton = document.getElementById("logout-button");
    const userNameDisplay = document.getElementById("user-name");

    let currentOfferId = null; // To keep track of the offer being edited

    // --- Utility Functions ---
    function checkAuth() {
        console.log("DEBUG: checkAuth function called");
        const userInfo = JSON.parse(localStorage.getItem("userInfo"));
        console.log("DEBUG: localStorage content:", localStorage);
        console.log("DEBUG: Retrieved userInfo:", userInfo);

        if (!userInfo || !userInfo.token) {
            console.error("DEBUG: Token not found in userInfo. Redirecting to login.");
            alert("Authentication token not found. Please log in again.");
            window.location.href = "/login.html"; // Redirect to login if no token
            return false;
        } else {
            console.log("DEBUG: Token found in userInfo.");
            if (userNameDisplay) {
                userNameDisplay.textContent = userInfo.name || "User"; // Display user name
            }
            return true;
        }
    }

    function getAuthToken() {
        const userInfo = JSON.parse(localStorage.getItem("userInfo"));
        return userInfo ? userInfo.token : null;
    }

    function showLoading(show) {
        if (loadingIndicator) {
            loadingIndicator.style.display = show ? "block" : "none";
        }
    }

    function showError(message) {
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = message ? "block" : "none";
        }
    }

    // --- Event Listener Setup ---
    function setupEventListeners() {
        console.log("DEBUG: setupEventListeners function called");

        if (createOfferBtn) {
            createOfferBtn.addEventListener("click", () => {
                console.log("DEBUG: Create New Offer button clicked!");
                currentOfferId = null;
                showOfferForm();
            });
        } else {
            console.error("DEBUG: Could not find create-offer-btn");
        }

        if (saveOfferBtn) {
            // Use submit event on the form instead of click on button
            offerForm.addEventListener("submit", saveOffer);
        } else {
            console.error("DEBUG: Could not find save-offer-btn or offer-form");
        }

        if (cancelOfferBtn) {
            cancelOfferBtn.addEventListener("click", () => {
                console.log("DEBUG: Cancel button clicked");
                showOfferList();
            });
        } else {
            console.error("DEBUG: Could not find cancel-offer-btn");
        }

        if (addItemBtn) {
            addItemBtn.addEventListener("click", () => {
                console.log("DEBUG: Add Item Manually button clicked!");
                addLineItemRow();
            });
        } else {
            console.error("DEBUG: Could not find add-item-btn");
        }

        if (generatePdfBtn) {
            generatePdfBtn.addEventListener("click", () => {
                if (currentOfferId) {
                    console.log(`DEBUG: PDF button clicked for offer ID: ${currentOfferId}`);
                    generateOfferOutput(currentOfferId, "pdf");
                } else {
                    console.error("DEBUG: Cannot generate PDF, currentOfferId is null");
                }
            });
        } else {
            console.error("DEBUG: Could not find generate-pdf-btn");
        }

        if (generateCsvBtn) {
            generateCsvBtn.addEventListener("click", () => {
                if (currentOfferId) {
                    console.log(`DEBUG: CSV button clicked for offer ID: ${currentOfferId}`);
                    generateOfferOutput(currentOfferId, "csv");
                } else {
                    console.error("DEBUG: Cannot generate CSV, currentOfferId is null");
                }
            });
        } else {
            console.error("DEBUG: Could not find generate-csv-btn");
        }

        if (logoutButton) {
            logoutButton.addEventListener("click", () => {
                console.log("DEBUG: Logout button clicked");
                localStorage.removeItem("userInfo");
                window.location.href = "/login.html";
            });
        } else {
            console.error("DEBUG: Could not find logout-button");
        }
    }

    // --- Core Logic Functions ---
    async function loadOffers() {
        console.log("DEBUG: loadOffers function called");
        const token = getAuthToken();
        if (!token) {
            console.error("DEBUG: No token found in loadOffers");
            showError("Authentication error. Please log in again.");
            return;
        }

        if (!offerListContainer) {
            console.error("DEBUG: offerListContainer not found");
            return;
        }

        offerListContainer.innerHTML = ""; // Clear previous list
        showError(""); // Clear previous errors
        showLoading(true);

        try {
            const response = await fetch("/api/offers", {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            showLoading(false);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const offers = await response.json();
            console.log("DEBUG: Fetched offers:", offers);
            displayOffers(offers);
        } catch (error) {
            console.error("Error fetching offers:", error);
            showLoading(false);
            showError(`Error fetching offers: ${error.message}. Please try again.`);
        }
    }

    function displayOffers(offers) {
        console.log("DEBUG: displayOffers function called");
        if (!offerListContainer) return;

        offerListContainer.innerHTML = ""; // Clear previous content

        if (!offers || offers.length === 0) {
            offerListContainer.innerHTML = "<p>No offers found.</p>";
            return;
        }

        const table = document.createElement("table");
        table.className = "table table-striped table-bordered table-hover"; // Added hover effect
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
            const clientName = offer.client ? offer.client.clientName : "N/A";
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${offer.offerId || "N/A"}</td>
                <td>${clientName}</td>
                <td>${new Date(offer.offerDate).toLocaleDateString()}</td>
                <td>${new Date(offer.validityDate).toLocaleDateString()}</td>
                <td><span class="badge bg-${getStatusColor(offer.status)}">${offer.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-info view-edit-btn" data-id="${offer._id}" title="View/Edit"><i class="bi bi-pencil-square"></i></button>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${offer._id}" ${offer.status !== "Draft" ? "disabled title=\'Only Draft offers can be deleted\'" : "title=\'Delete\'"}><i class="bi bi-trash"></i></button>
                    <button class="btn btn-sm btn-secondary pdf-btn" data-id="${offer._id}" title="Generate PDF"><i class="bi bi-file-pdf"></i></button>
                    <button class="btn btn-sm btn-success csv-btn" data-id="${offer._id}" title="Generate CSV"><i class="bi bi-file-earmark-spreadsheet"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        offerListContainer.appendChild(table);

        // Add event listeners for action buttons using event delegation for efficiency
        offerListContainer.addEventListener("click", (e) => {
            const targetButton = e.target.closest("button");
            if (!targetButton) return;

            const id = targetButton.getAttribute("data-id");
            if (!id) return;

            if (targetButton.classList.contains("view-edit-btn")) {
                console.log(`DEBUG: View/Edit button clicked for offer ID: ${id}`);
                loadOfferForEditing(id);
            } else if (targetButton.classList.contains("delete-btn")) {
                console.log(`DEBUG: Delete button clicked for offer ID: ${id}`);
                if (confirm("Are you sure you want to delete this offer?")) {
                    deleteOffer(id);
                }
            } else if (targetButton.classList.contains("pdf-btn")) {
                console.log(`DEBUG: PDF button clicked for offer ID: ${id}`);
                generateOfferOutput(id, "pdf");
            } else if (targetButton.classList.contains("csv-btn")) {
                console.log(`DEBUG: CSV button clicked for offer ID: ${id}`);
                generateOfferOutput(id, "csv");
            }
        });
    }

    // Helper function for status badge color
    function getStatusColor(status) {
        switch (status) {
            case 'Draft': return 'secondary';
            case 'Sent': return 'primary';
            case 'Accepted': return 'success';
            case 'Rejected': return 'danger';
            case 'Expired': return 'warning';
            default: return 'light';
        }
    }

    function showOfferForm() {
        console.log("DEBUG: showOfferForm function called");
        if (offerListSection) offerListSection.style.display = "none";
        if (offerFormSection) offerFormSection.style.display = "block";
        if (offerForm) offerForm.reset();
        if (lineItemsBody) lineItemsBody.innerHTML = "";
        if (offerIdDisplay) offerIdDisplay.textContent = "New Offer";
        if (generatePdfBtn) generatePdfBtn.style.display = "none"; // Hide generate buttons for new offer
        if (generateCsvBtn) generateCsvBtn.style.display = "none";
        currentOfferId = null;
        populateClientDropdown(); // Ensure clients are loaded when form is shown
    }

    function showOfferList() {
        console.log("DEBUG: showOfferList function called");
        if (offerFormSection) offerFormSection.style.display = "none";
        if (offerListSection) offerListSection.style.display = "block";
        loadOffers(); // Refresh the list
    }

    async function populateClientDropdown() {
        console.log("DEBUG: populateClientDropdown function called");
        const token = getAuthToken();
        if (!token || !clientSelect) return;

        // Avoid re-populating if already done (optional optimization)
        // if (clientSelect.options.length > 1) return;

        clientSelect.innerHTML = "<option value=\"\">Loading Clients...</option>"; // Clear existing options

        try {
            const response = await fetch("/api/clients", {
                headers: { "Authorization": `Bearer ${token}` },
            });
            if (!response.ok) throw new Error("Failed to fetch clients");
            const clients = await response.json();

            clientSelect.innerHTML = "<option value=\"\">Select Client...</option>"; // Reset after loading
            clients.forEach(client => {
                const option = document.createElement("option");
                option.value = client._id;
                option.textContent = `${client.clientName} (${client.companyName})`;
                clientSelect.appendChild(option);
            });
            console.log("DEBUG: Client dropdown populated");
        } catch (error) {
            console.error("Error populating client dropdown:", error);
            clientSelect.innerHTML = "<option value=\"\">Error loading clients</option>";
            showError("Error loading clients for dropdown. Please try again.");
        }
    }

    async function saveOffer(event) {
        event.preventDefault();
        console.log("DEBUG: saveOffer function called");
        const token = getAuthToken();
        if (!token) {
            showError("Authentication token missing. Cannot save offer. Please log in again.");
            return;
        }

        // Ensure all required elements exist before proceeding
        if (!clientSelect || !validityInput || !termsInput || !statusSelect || !pricingMethodSelect || !marginInput || !lineItemsBody) {
            console.error("DEBUG: One or more form elements not found in saveOffer");
            showError("Form error. Please refresh the page.");
            return;
        }

        const offerData = {
            clientId: clientSelect.value, // *** FIXED: Use clientId instead of client ***
            offerDate: new Date().toISOString(),
            validityDate: validityInput.value,
            terms: termsInput.value,
            status: statusSelect.value || "Draft",
            pricingMethod: pricingMethodSelect.value,
            marginPercent: marginInput.value || 0,
            lineItems: [],
        };

        // Collect Line Items
        const lineItemRows = lineItemsBody.querySelectorAll("tr");
        console.log(`DEBUG: Found ${lineItemRows.length} line item rows`);
        lineItemRows.forEach((row, index) => {
            const itemNumberInput = row.querySelector("input[name='itemNumber']");
            const descriptionInput = row.querySelector("input[name='description']");
            const quantityInput = row.querySelector("input[name='quantity']");

            if (itemNumberInput && quantityInput && itemNumberInput.value && quantityInput.value) {
                const lineItem = {
                    itemNumber: itemNumberInput.value,
                    description: descriptionInput ? descriptionInput.value : '',
                    quantity: parseInt(quantityInput.value, 10),
                };
                if (!isNaN(lineItem.quantity) && lineItem.quantity > 0) {
                     console.log(`DEBUG: Adding line item ${index}:`, lineItem);
                     offerData.lineItems.push(lineItem);
                } else {
                    console.warn(`DEBUG: Skipping line item row ${index} due to invalid quantity`);
                }
            } else {
                 console.warn(`DEBUG: Skipping incomplete line item row ${index}`);
            }
        });
        console.log("DEBUG: Collected line items:", offerData.lineItems);

        // Basic validation
        if (!offerData.clientId || !offerData.validityDate) { // *** FIXED: Check clientId ***
            alert("Please select a client and enter a validity date.");
            return;
        }

        const method = currentOfferId ? "PUT" : "POST";
        const url = currentOfferId ? `/api/offers/${currentOfferId}` : "/api/offers";

        console.log(`DEBUG: Saving offer. Method: ${method}, URL: ${url}, Data:`, offerData);
        showLoading(true);
        showError("");

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(offerData),
            });

            showLoading(false);

            if (!response.ok) {
                // Attempt to parse JSON error first
                let errorMsg = `HTTP error! status: ${response.status} ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.message || errorMsg;
                } catch (jsonError) {
                    // If not JSON, maybe it's HTML? Read as text.
                    try {
                        const textError = await response.text();
                        // Basic check for HTML to provide a more helpful message
                        if (textError.trim().startsWith("<!DOCTYPE") || textError.trim().startsWith("<html>")) {
                            errorMsg = `Server returned an HTML error page (status: ${response.status}). Check server logs.`;
                        } else {
                            errorMsg = textError.substring(0, 200); // Show beginning of text error
                        }
                    } catch (textErrorErr) {
                        // Fallback if reading text fails
                    }
                }
                throw new Error(errorMsg);
            }

            const savedOffer = await response.json();
            console.log("DEBUG: Offer saved successfully:", savedOffer);
            alert(`Offer ${currentOfferId ? 'updated' : 'created'} successfully! Offer ID: ${savedOffer.offerId}`);
            showOfferList(); // Go back to list view after saving

        } catch (error) {
            console.error("Error saving offer:", error);
            showLoading(false);
            showError(`Error saving offer: ${error.message}. Please try again.`);
        }
    }

    async function loadOfferForEditing(id) {
        console.log(`DEBUG: loadOfferForEditing called for ID: ${id}`);
        const token = getAuthToken();
        if (!token) return;

        showLoading(true);
        showError("");

        try {
            const response = await fetch(`/api/offers/${id}`, {
                headers: { "Authorization": `Bearer ${token}` },
            });

            showLoading(false);

            if (!response.ok) throw new Error("Failed to fetch offer details");
            const offer = await response.json();
            console.log("DEBUG: Fetched offer for editing:", offer);

            // Ensure form elements exist before populating
            if (!offerFormSection || !offerForm || !clientSelect || !validityInput || !termsInput || !statusSelect || !pricingMethodSelect || !marginInput || !lineItemsBody || !offerIdDisplay || !generatePdfBtn || !generateCsvBtn) {
                 console.error("DEBUG: One or more form elements not found in loadOfferForEditing");
                 showError("Form error. Please refresh the page.");
                 return;
            }

            showOfferForm(); // Switch to form view first
            currentOfferId = offer._id;

            // Populate form fields
            offerIdDisplay.textContent = `Offer ID: ${offer.offerId}`;
            // Ensure client dropdown is populated before setting value
            await populateClientDropdown(); // Wait for clients to load if needed
            clientSelect.value = offer.client._id; // Assuming client is populated
            validityInput.value = offer.validityDate.split('T')[0];
            termsInput.value = offer.terms || "";
            statusSelect.value = offer.status;
            pricingMethodSelect.value = offer.pricingMethod || "Margin";
            marginInput.value = offer.marginPercent || "";

            // Populate line items
            lineItemsBody.innerHTML = ""; // Clear existing items
            if (offer.lineItems && offer.lineItems.length > 0) {
                offer.lineItems.forEach(item => {
                    addLineItemRow(item);
                });
            }

            // Show generate buttons only when editing an existing offer
            generatePdfBtn.style.display = "inline-block";
            generateCsvBtn.style.display = "inline-block";

            console.log("DEBUG: Offer form populated for editing");

        } catch (error) {
            console.error("Error loading offer for editing:", error);
            showLoading(false);
            showError("Error loading offer details. Please try again.");
            showOfferList(); // Go back to list if loading fails
        }
    }

    async function deleteOffer(id) {
        console.log(`DEBUG: deleteOffer called for ID: ${id}`);
        const token = getAuthToken();
        if (!token) return;

        showLoading(true);
        showError("");

        try {
            const response = await fetch(`/api/offers/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` },
            });

            showLoading(false);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            console.log("DEBUG: Offer deleted successfully");
            alert("Offer deleted successfully!");
            loadOffers(); // Refresh the list

        } catch (error) {
            console.error("Error deleting offer:", error);
            showLoading(false);
            showError(`Error deleting offer: ${error.message}. Please try again.`);
        }
    }

    function addLineItemRow(item = null) {
        console.log("DEBUG: addLineItemRow called. Item data:", item);
        if (!lineItemsBody) {
            console.error("DEBUG: lineItemsBody not found in addLineItemRow");
            return;
        }

        const newRow = document.createElement("tr");
        const itemNumber = item ? item.itemNo : "";
        const description = item ? item.description : "";
        const quantity = item ? item.quantity : 1;

        newRow.innerHTML = `
            <td><input type="text" name="itemNumber" class="form-control form-control-sm" placeholder="Item No." value="${itemNumber}" required></td>
            <td><input type="text" name="description" class="form-control form-control-sm" placeholder="Description" value="${description}"></td>
            <td><input type="number" name="quantity" class="form-control form-control-sm" placeholder="Qty" value="${quantity}" min="1" required></td>
            <td><button type="button" class="btn btn-sm btn-danger remove-item-btn" title="Remove Item"><i class="bi bi-x-circle"></i></button></td>
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

    async function generateOfferOutput(id, format) {
        console.log(`DEBUG: generateOfferOutput called for ID: ${id}, Format: ${format}`);
        const token = getAuthToken();
        if (!token) {
            showError("Authentication token missing. Cannot generate output.");
            return;
        }

        const url = `/api/offers/${id}/${format}`;
        showLoading(true);
        showError("");

        try {
            const response = await fetch(url, {
                headers: { "Authorization": `Bearer ${token}` },
            });

            showLoading(false);

            if (!response.ok) {
                let errorMsg = `HTTP error! status: ${response.status} ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.message || errorMsg;
                } catch (e) { /* Ignore if response is not JSON */ }
                throw new Error(errorMsg);
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = downloadUrl;
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
            showLoading(false);
            showError(`Error generating ${format}: ${error.message}. Please check server logs for details.`);
        }
    }

    // --- Initial Setup ---
    if (checkAuth()) { // Only proceed if authenticated
        setupEventListeners();
        showOfferList(); // Show the list view by default
        // Add Bootstrap icons link dynamically
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css';
        document.head.appendChild(link);
    }

}); // End of DOMContentLoaded

