// /home/ubuntu/erp/public/offers.js

document.addEventListener("DOMContentLoaded", () => {
    console.log("DEBUG: DOMContentLoaded event fired");

    // --- Element References ---
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
    const globalMarginInput = document.getElementById("offer-global-margin");
    const createOfferBtn = document.getElementById("create-offer-btn");
    const saveOfferBtn = document.getElementById("save-offer-btn");
    const cancelOfferBtn = document.getElementById("cancel-offer-btn");
    const addItemBtn = document.getElementById("add-item-btn"); // Manual add
    const generatePdfBtn = document.getElementById("generate-pdf-btn");
    const generateCsvBtn = document.getElementById("generate-csv-btn");
    const loadingIndicator = document.getElementById("loading-indicator");
    const errorMessage = document.getElementById("error-message");
    const logoutButton = document.getElementById("logout-button");
    const userNameDisplay = document.getElementById("user-name");

    // NEW Bulk Add Elements
    const bulkAddManufacturerSelect = document.getElementById("bulk-add-manufacturer");
    const bulkAddPartNumbersTextarea = document.getElementById("bulk-add-part-numbers");
    const bulkAddBtn = document.getElementById("bulk-add-button"); 
    const bulkAddStatus = document.getElementById("bulk-add-status");

    let currentOfferId = null;

    // --- Utility Functions ---
    function checkAuth() {
        console.log("DEBUG: checkAuth function called");
        const userInfo = JSON.parse(localStorage.getItem("userInfo"));
        if (!userInfo || !userInfo.token) {
            console.error("DEBUG: Token not found. Redirecting to login.");
            alert("Authentication token not found. Please log in again.");
            window.location.href = "/login.html";
            return false;
        }
        if (userNameDisplay) userNameDisplay.textContent = userInfo.name || "User";
        return true;
    }

    function getAuthToken() {
        const userInfo = JSON.parse(localStorage.getItem("userInfo"));
        return userInfo ? userInfo.token : null;
    }

    function showLoading(show) {
        if (loadingIndicator) loadingIndicator.style.display = show ? "block" : "none";
    }

    function showError(message, element = errorMessage) {
        console.log(`DEBUG: showError called with message: ${message}`);
        if (element) {
            element.textContent = message;
            element.style.display = message ? "block" : "none";
        }
    }

    function showBulkAddStatus(message, isError = false) {
        if (bulkAddStatus) {
            bulkAddStatus.textContent = message;
            bulkAddStatus.className = `mt-2 small ${isError ? "text-danger" : "text-success"}`;
            bulkAddStatus.style.display = message ? "block" : "none";
        }
    }

    function formatDateEuropean(dateString) {
        if (!dateString) return "N/A";
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return "Invalid Date";
            return date.toLocaleDateString("en-GB");
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return "Invalid Date";
        }
    }

    // --- Event Listener Setup ---
    function setupEventListeners() {
        console.log("DEBUG: setupEventListeners function called");
        if (createOfferBtn) createOfferBtn.addEventListener("click", () => { currentOfferId = null; showOfferForm(); });
        if (offerForm) offerForm.addEventListener("submit", saveOffer);
        if (cancelOfferBtn) cancelOfferBtn.addEventListener("click", showOfferList);
        if (addItemBtn) addItemBtn.addEventListener("click", () => addLineItemRow()); // Add manual row
        if (bulkAddBtn) {
            bulkAddBtn.addEventListener("click", handleBulkAddItems);
        } else {
            console.log("DEBUG: Could not find bulk-add-button during setupEventListeners");
        }
        if (generatePdfBtn) generatePdfBtn.addEventListener("click", () => { if (currentOfferId) generateOfferOutput(currentOfferId, "pdf"); });
        if (generateCsvBtn) generateCsvBtn.addEventListener("click", () => { if (currentOfferId) generateOfferOutput(currentOfferId, "csv"); });
        if (logoutButton) logoutButton.addEventListener("click", () => { localStorage.removeItem("userInfo"); window.location.href = "/login.html"; });

        if (lineItemsBody) {
            lineItemsBody.addEventListener("click", (e) => {
                if (e.target.closest(".remove-item-btn")) {
                    const row = e.target.closest("tr");
                    if (row) row.remove();
                }
            });
            lineItemsBody.addEventListener("change", (e) => {
                if (e.target.classList.contains("pricing-method")) {
                    const row = e.target.closest("tr");
                    const marginInput = row.querySelector(".margin-percent");
                    if (marginInput) {
                        marginInput.disabled = e.target.value !== "Margin";
                        if (marginInput.disabled) marginInput.value = "";
                    }
                }
            });
        }
    }

    // --- Core Logic Functions ---
    async function loadOffers() {
        console.log("DEBUG: loadOffers function called");
        const token = getAuthToken();
        if (!token) { showError("Authentication error. Please log in again."); return; }
        if (!offerListContainer) { console.error("DEBUG: offerListContainer not found in loadOffers"); return; }
        offerListContainer.innerHTML = "";
        showError("");
        showLoading(true);
        try {
            const response = await fetch("/api/offers", { headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" } });
            showLoading(false);
            if (!response.ok) {
                let errorData = { message: `HTTP error! status: ${response.status}` };
                try { errorData = await response.json(); } catch (e) { console.warn("Could not parse error JSON from /api/offers"); }
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const offers = await response.json();
            displayOffers(offers);
        } catch (error) {
            console.error("Error fetching offers:", error);
            showLoading(false);
            showError(`Error fetching offers: ${error.message}. Please try again.`);
        }
    }

    function displayOffers(offers) {
        console.log("DEBUG: displayOffers function called");
        if (!offerListContainer) { console.error("DEBUG: offerListContainer not found in displayOffers"); return; }
        offerListContainer.innerHTML = "";
        if (!offers || offers.length === 0) {
            offerListContainer.innerHTML = "<p>No offers found.</p>";
            return;
        }
        const table = document.createElement("table");
        table.className = "table table-striped table-bordered table-hover";
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Offer ID</th><th>Client Company</th><th>Date (DD/MM/YYYY)</th><th>Validity (DD/MM/YYYY)</th><th>Status</th><th>Actions</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector("tbody");
        offers.forEach(offer => {
            const clientCompany = offer.client ? offer.client.companyName : "N/A";
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${offer.offerId || "N/A"}</td>
                <td>${clientCompany}</td>
                <td>${formatDateEuropean(offer.createdAt)}</td>
                <td>${formatDateEuropean(offer.validityDate)}</td>
                <td><span class="badge bg-${getStatusColor(offer.status)}">${offer.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-info view-edit-btn" data-id="${offer._id}" title="View/Edit"><i class="fas fa-pencil-alt"></i></button>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${offer._id}" ${offer.status !== "Draft" ? "disabled title=\"Only Draft offers can be deleted\"" : "title=\"Delete\""}><i class="fas fa-trash-alt"></i></button>
                    <button class="btn btn-sm btn-secondary pdf-btn" data-id="${offer._id}" title="Generate PDF"><i class="fas fa-file-pdf"></i></button>
                    <button class="btn btn-sm btn-success csv-btn" data-id="${offer._id}" title="Generate CSV"><i class="fas fa-file-csv"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        offerListContainer.appendChild(table);
        offerListContainer.addEventListener("click", (e) => {
            const targetButton = e.target.closest("button");
            if (!targetButton) return;
            const id = targetButton.getAttribute("data-id");
            if (!id) return;
            if (targetButton.classList.contains("view-edit-btn")) loadOfferForEditing(id);
            else if (targetButton.classList.contains("delete-btn")) { if (confirm("Are you sure you want to delete this offer?")) deleteOffer(id); }
            else if (targetButton.classList.contains("pdf-btn")) generateOfferOutput(id, "pdf");
            else if (targetButton.classList.contains("csv-btn")) generateOfferOutput(id, "csv");
        });
    }

    function getStatusColor(status) {
        switch (status) {
            case "Draft": return "secondary";
            case "Sent": return "primary";
            case "Accepted": return "success";
            case "Rejected": return "danger";
            case "Expired": return "warning";
            default: return "light";
        }
    }

    function showOfferForm(offerData = null) {
        console.log("DEBUG: showOfferForm function called. Offer data:", offerData);
        if (offerListSection) offerListSection.style.display = "none";
        if (offerFormSection) offerFormSection.style.display = "block";
        if (offerForm) offerForm.reset();
        if (lineItemsBody) lineItemsBody.innerHTML = "";
        
        currentOfferId = offerData ? offerData._id : null;
        if (offerIdDisplay) offerIdDisplay.textContent = currentOfferId ? `Editing Offer ID: ${offerData.offerId}` : "Creating New Offer";
        if (validityInput && offerData) validityInput.value = offerData.validityDate ? offerData.validityDate.split("T")[0] : "";
        if (termsInput && offerData) termsInput.value = offerData.terms || "";
        if (statusSelect && offerData) statusSelect.value = offerData.status || "Draft";
        if (globalMarginInput && offerData) globalMarginInput.value = offerData.globalMarginPercent || "";

        if (generatePdfBtn) generatePdfBtn.style.display = currentOfferId ? "inline-block" : "none";
        if (generateCsvBtn) generateCsvBtn.style.display = currentOfferId ? "inline-block" : "none";
        
        populateClientDropdown(offerData ? offerData.client : null);
        populateManufacturerDropdown(); 
        showError("");

        if (offerData && offerData.lineItems) {
            offerData.lineItems.forEach(item => addLineItemRow(item, false)); // false for not manual
        }
    }

    function showOfferList() {
        console.log("DEBUG: showOfferList function called");
        if (offerListSection) offerListSection.style.display = "block";
        if (offerFormSection) offerFormSection.style.display = "none";
        loadOffers();
    }

    async function populateClientDropdown(selectedClientId = null) {
        console.log("DEBUG: populateClientDropdown function called");
        const token = getAuthToken();
        if (!token || !clientSelect) { console.error("DEBUG: Token or clientSelect not found in populateClientDropdown"); return; }
        clientSelect.innerHTML = "<option value=\"\">Select Client...</option>"; 
        try {
            const response = await fetch("/api/clients", { headers: { "Authorization": `Bearer ${token}` } });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const clients = await response.json();
            clients.forEach(client => {
                const option = document.createElement("option");
                option.value = client._id;
                option.textContent = `${client.companyName} (${client.contactName || 'N/A'})`;
                if (selectedClientId && (client._id === selectedClientId || client._id === selectedClientId._id)) {
                    option.selected = true;
                }
                clientSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Error populating client dropdown:", error);
            showError("Could not load clients for dropdown.");
        }
    }

    async function populateManufacturerDropdown() {
        console.log("DEBUG: populateManufacturerDropdown function called");
        const token = getAuthToken();
        if (!token || !bulkAddManufacturerSelect) { console.error("DEBUG: Token or bulkAddManufacturerSelect not found"); return; }
        bulkAddManufacturerSelect.innerHTML = "<option value=\"\">Select Manufacturer...</option>";
        try {
            // Assuming an endpoint /api/products/manufacturers exists and returns a list of unique manufacturer names
            const response = await fetch("/api/products/manufacturers", { headers: { "Authorization": `Bearer ${token}` } });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const manufacturers = await response.json();
            manufacturers.forEach(manufacturer => {
                const option = document.createElement("option");
                option.value = manufacturer; // Assuming manufacturer is a string
                option.textContent = manufacturer;
                bulkAddManufacturerSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Error populating manufacturer dropdown:", error);
            showBulkAddStatus("Could not load manufacturers.", true);
        }
    }

    function addLineItemRow(itemData = {}, isManual = true) {
        console.log("DEBUG: addLineItemRow called. Item data:", itemData, "Is manual:", isManual);
        if (!lineItemsBody) { console.error("DEBUG: lineItemsBody not found in addLineItemRow"); return; }

        const row = lineItemsBody.insertRow();
        row.dataset.itemId = itemData.product ? itemData.product._id : (itemData._id || `manual_${Date.now()}`);
        row.dataset.isManual = isManual;

        // Columns: Item No, Manufacturer, Description, Qty, Unit Price (USD), Pricing Method, Margin %, Line Total (USD), Actions
        const itemNo = isManual ? "" : (itemData.product ? itemData.product.itemNumber : (itemData.itemNumber || ""));
        // CORRECTED MAPPING HERE:
        const manufacturer = isManual ? "N/A" : (itemData.product ? itemData.product.manufacturer : (itemData.manufacturer || "N/A"));
        const description = isManual ? "" : (itemData.product ? itemData.product.description : (itemData.description || ""));
        
        console.log(`DEBUG: Item No: ${itemNo}, Manufacturer: ${manufacturer}, Description: ${description}`);

        row.innerHTML = `
            <td><input type="text" class="form-control item-number" value="${itemNo}" ${!isManual ? 'readonly' : ''} placeholder="Item No."></td>
            <td><input type="text" class="form-control manufacturer" value="${manufacturer}" ${!isManual ? 'readonly' : ''} placeholder="Manuf."></td>
            <td><input type="text" class="form-control description" value="${description}" ${!isManual ? 'readonly' : ''} placeholder="Description"></td>
            <td><input type="number" class="form-control quantity" value="${itemData.quantity || 1}" min="1" placeholder="Qty"></td>
            <td class="unit-price">${itemData.unitPriceUSD ? parseFloat(itemData.unitPriceUSD).toFixed(2) : 'TBD'}</td>
            <td>
                <select class="form-select pricing-method" ${isManual ? 'disabled' : ''}>
                    <option value="Margin" ${itemData.pricingMethod === 'Margin' ? 'selected' : ''}>Margin</option>
                    <option value="PriceList" ${itemData.pricingMethod === 'PriceList' ? 'selected' : ''}>Price List</option>
                </select>
            </td>
            <td><input type="number" class="form-control margin-percent" value="${itemData.marginPercent || ''}" placeholder="%" ${isManual || itemData.pricingMethod === 'PriceList' ? 'disabled' : ''}></td>
            <td class="line-total">${itemData.lineTotalUSD ? parseFloat(itemData.lineTotalUSD).toFixed(2) : 'TBD'}</td>
            <td><button type="button" class="btn btn-sm btn-danger remove-item-btn"><i class="fas fa-times"></i></button></td>
        `;
    }

    async function handleBulkAddItems() {
        console.log("DEBUG: handleBulkAddItems function called");
        const token = getAuthToken();
        if (!token) { showError("Authentication error."); return; }
        if (!bulkAddManufacturerSelect || !bulkAddPartNumbersTextarea) { 
            console.error("DEBUG: Manufacturer select or part numbers textarea not found."); 
            showBulkAddStatus("Error: UI elements for bulk add not found.", true);
            return; 
        }

        const manufacturer = bulkAddManufacturerSelect.value;
        const partNumbersRaw = bulkAddPartNumbersTextarea.value;

        if (!manufacturer) {
            showBulkAddStatus("Please select a manufacturer.", true);
            return;
        }
        if (!partNumbersRaw.trim()) {
            showBulkAddStatus("Please paste part numbers.", true);
            return;
        }

        const partNumbers = partNumbersRaw.split(/\n|,|\s+/).map(pn => pn.trim()).filter(pn => pn);
        if (partNumbers.length === 0) {
            showBulkAddStatus("No valid part numbers entered.", true);
            return;
        }

        showLoading(true);
        showBulkAddStatus("Looking up products...");

        try {
            const response = await fetch("/api/products/bulk-lookup", {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ manufacturer, partNumbers })
            });
            showLoading(false);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Server error: ${response.status}`);
            }
            const productsFound = await response.json();
            console.log("DEBUG: Products found from bulk lookup:", productsFound);

            if (productsFound.length === 0) {
                showBulkAddStatus("No products found for the given manufacturer and part numbers.", true);
                return;
            }

            productsFound.forEach(product => {
                // We pass the whole product object as itemData.product for consistency with how existing items are loaded.
                // The addLineItemRow function will then extract itemNumber, description, manufacturer from product.
                // Ensure the product object from backend has 'itemNumber', 'description', 'manufacturer' fields.
                addLineItemRow({ product: product, quantity: 1, pricingMethod: 'Margin' }, false); 
            });
            showBulkAddStatus(`${productsFound.length} product(s) added.`, false);
            bulkAddPartNumbersTextarea.value = ""; // Clear textarea after adding

        } catch (error) {
            console.error("Error during bulk add:", error);
            showLoading(false);
            showBulkAddStatus(`Error: ${error.message}`, true);
        }
    }


    async function saveOffer(event) {
        event.preventDefault();
        console.log("DEBUG: saveOffer function called");
        const token = getAuthToken();
        if (!token) { showError("Authentication error. Please log in again."); return; }

        const offerData = {
            client: clientSelect.value,
            validityDate: validityInput.value,
            terms: termsInput.value,
            status: statusSelect.value,
            globalMarginPercent: parseFloat(globalMarginInput.value) || 0,
            lineItems: []
        };

        if (currentOfferId) {
            offerData._id = currentOfferId;
        }

        const rows = lineItemsBody.querySelectorAll("tr");
        rows.forEach(row => {
            const itemNumberInput = row.querySelector(".item-number");
            const descriptionInput = row.querySelector(".description");
            const manufacturerInput = row.querySelector(".manufacturer"); // Added for data collection
            const quantityInput = row.querySelector(".quantity");
            const pricingMethodSelect = row.querySelector(".pricing-method");
            const marginPercentInput = row.querySelector(".margin-percent");

            const lineItem = {
                itemNumber: itemNumberInput ? itemNumberInput.value : "",
                description: descriptionInput ? descriptionInput.value : "",
                manufacturer: manufacturerInput ? manufacturerInput.value : "N/A", // Collect manufacturer
                quantity: quantityInput ? parseInt(quantityInput.value) : 1,
                isManual: row.dataset.isManual === "true",
                product: row.dataset.isManual === "true" ? null : row.dataset.itemId // Store product ID if not manual
            };

            if (!lineItem.isManual) {
                lineItem.pricingMethod = pricingMethodSelect ? pricingMethodSelect.value : "Margin";
                lineItem.marginPercent = marginPercentInput && !marginPercentInput.disabled ? parseFloat(marginPercentInput.value) : null;
            } else {
                 // For manual items, ensure these are not sent or are explicitly null if backend expects them
                lineItem.pricingMethod = null;
                lineItem.marginPercent = null;
            }
            
            console.log("DEBUG: Collected line item:", lineItem);
            offerData.lineItems.push(lineItem);
        });
        
        console.log("DEBUG: Offer data to save:", offerData);

        showLoading(true);
        showError("");

        try {
            const url = currentOfferId ? `/api/offers/${currentOfferId}` : "/api/offers";
            const method = currentOfferId ? "PUT" : "POST";
            const response = await fetch(url, {
                method: method,
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify(offerData)
            });
            showLoading(false);
            if (!response.ok) {
                let errorData = { message: `Server error: ${response.status}` };
                try { 
                    const text = await response.text();
                    console.log("DEBUG: Save error response text:", text);
                    errorData = JSON.parse(text); 
                } catch (e) { 
                    console.warn("Could not parse error JSON from save offer:", e, "Raw text:", errorData.rawText);
                }
                throw new Error(errorData.message || `Server error: ${response.status}`);
            }
            const savedOffer = await response.json();
            console.log("DEBUG: Offer saved successfully:", savedOffer);
            showOfferList();
            alert("Offer saved successfully!");
        } catch (error) {
            console.error("Error saving offer:", error);
            showLoading(false);
            showError(`Error saving offer: ${error.message}. Please try again.`);
        }
    }

    async function loadOfferForEditing(id) {
        console.log("DEBUG: loadOfferForEditing function called with ID:", id);
        const token = getAuthToken();
        if (!token) { showError("Authentication error."); return; }
        showLoading(true);
        try {
            const response = await fetch(`/api/offers/${id}`, { headers: { "Authorization": `Bearer ${token}` } });
            showLoading(false);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const offer = await response.json();
            console.log("DEBUG: Offer loaded for editing:", offer);
            showOfferForm(offer);
        } catch (error) {
            console.error("Error loading offer for editing:", error);
            showLoading(false);
            showError(`Error loading offer: ${error.message}`);
        }
    }

    async function deleteOffer(id) {
        console.log("DEBUG: deleteOffer function called with ID:", id);
        const token = getAuthToken();
        if (!token) { showError("Authentication error."); return; }
        showLoading(true);
        try {
            const response = await fetch(`/api/offers/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } });
            showLoading(false);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            alert("Offer deleted successfully.");
            loadOffers();
        } catch (error) {
            console.error("Error deleting offer:", error);
            showLoading(false);
            showError(`Error deleting offer: ${error.message}`);
        }
    }

    async function generateOfferOutput(offerId, format) {
        console.log(`DEBUG: generateOfferOutput called for offer ID ${offerId}, format ${format}`);
        const token = getAuthToken();
        if (!token) { showError("Authentication error."); return; }
        showLoading(true);
        try {
            const response = await fetch(`/api/offers/${offerId}/${format}`, { headers: { "Authorization": `Bearer ${token}` } });
            showLoading(false);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error generating ${format.toUpperCase()}`);
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = `offer_${offerId}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (error) {
            console.error(`Error generating ${format}:`, error);
            showLoading(false);
            showError(`Error generating ${format.toUpperCase()}: ${error.message}`);
        }
    }

    // --- Initialization ---
    if (checkAuth()) {
        if (offerListSection && offerFormSection) { // Only run offer logic if on offers page
             console.log("DEBUG: Offers page detected, initializing.");
            setupEventListeners();
            showOfferList(); 
        } else {
            console.log("DEBUG: Not on offers page, or core elements missing.");
        }
    } else {
        // If checkAuth fails and redirects, this part might not be reached, which is fine.
        console.log("DEBUG: Auth check failed, not initializing offer page logic.");
    }
});

