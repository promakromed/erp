// offers_v25.js
// Implements multi-supplier price selection modal and global margin with individual override.

document.addEventListener("DOMContentLoaded", () => {
    console.log("DEBUG (v25): DOMContentLoaded event fired");

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
    const globalMarginInput = document.getElementById("offer-global-margin"); // Existing global margin for the offer itself
    
    const createOfferBtn = document.getElementById("create-offer-btn"); 
    const saveOfferBtn = document.getElementById("save-offer-btn");     
    const cancelOfferBtn = document.getElementById("cancel-offer-btn");
    const deleteOfferBtn = document.getElementById("delete-offer-btn");
    const addItemBtn = document.getElementById("add-item-btn");
    const generatePdfBtn = document.getElementById("generate-pdf-btn");
    const generateCsvBtn = document.getElementById("generate-csv-btn");

    const showCreateOfferFormBtn = document.getElementById("show-create-offer-form-btn"); 

    const loadingIndicator = document.getElementById("loading-indicator");
    const errorMessage = document.getElementById("error-message");
    const logoutButton = document.getElementById("logout-button");
    const userNameDisplay = document.getElementById("user-name");
    const bulkAddManufacturerSelect = document.getElementById("bulk-add-manufacturer");
    const bulkAddPartNumbersTextarea = document.getElementById("bulk-add-part-numbers");
    const bulkAddBtn = document.getElementById("bulk-add-button");
    const bulkAddStatus = document.getElementById("bulk-add-status");

    let currentOfferId = null; 
    let bulkAddGlobalMargin = null; // To store the global margin for the current bulk add operation

    // --- Utility Functions ---
    function checkAuth() {
        const userInfo = JSON.parse(localStorage.getItem("userInfo"));
        if (!userInfo || !userInfo.token) {
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
            return "Invalid Date";
        }
    }

    // --- UI Switching ---
    function showOfferList() {
        if (offerListSection) offerListSection.style.display = "block";
        if (offerFormSection) offerFormSection.style.display = "none";
        currentOfferId = null;
        if (window.location.hash === "#new") {
            window.location.hash = ""; 
        }
        loadOffers();
    }

    function showOfferForm(offerToEdit = null) {
        if (offerListSection) offerListSection.style.display = "none";
        if (offerFormSection) offerFormSection.style.display = "block";
        if (offerForm) offerForm.reset();
        if (lineItemsBody) lineItemsBody.innerHTML = "";
        showError("");
        showBulkAddStatus("");
        bulkAddGlobalMargin = null; // Reset for new form view

        if (offerToEdit) {
            currentOfferId = offerToEdit._id;
            if (offerIdDisplay) offerIdDisplay.textContent = offerToEdit.offerId || "Editing Offer";
            if (clientSelect) clientSelect.value = offerToEdit.client?._id || offerToEdit.client;
            if (validityInput) validityInput.value = offerToEdit.validityDate ? offerToEdit.validityDate.split("T")[0] : "";
            if (termsInput) termsInput.value = offerToEdit.terms || "";
            if (statusSelect) statusSelect.value = offerToEdit.status || "Draft";
            if (globalMarginInput) globalMarginInput.value = offerToEdit.globalMarginPercent || 0; // This is offer-level global margin
            
            offerToEdit.lineItems.forEach(item => addLineItemRow(item, item.isManual));

            if (createOfferBtn) createOfferBtn.classList.add("d-none");
            if (saveOfferBtn) saveOfferBtn.classList.remove("d-none");
            if (deleteOfferBtn) deleteOfferBtn.classList.remove("d-none");
            if (cancelOfferBtn) cancelOfferBtn.classList.remove("d-none");
            if (generatePdfBtn) generatePdfBtn.classList.remove("d-none");
            if (generateCsvBtn) generateCsvBtn.classList.remove("d-none");

        } else { 
            currentOfferId = null;
            if (offerIdDisplay) offerIdDisplay.textContent = "Creating New Offer";
            if (globalMarginInput) globalMarginInput.value = 0; // Default for new offer
            
            if (createOfferBtn) createOfferBtn.classList.remove("d-none");
            if (saveOfferBtn) saveOfferBtn.classList.add("d-none");
            if (deleteOfferBtn) deleteOfferBtn.classList.add("d-none");
            if (cancelOfferBtn) cancelOfferBtn.classList.remove("d-none");
            if (generatePdfBtn) generatePdfBtn.classList.add("d-none"); 
            if (generateCsvBtn) generateCsvBtn.classList.add("d-none"); 
        }
        populateClientDropdown(offerToEdit ? (offerToEdit.client?._id || offerToEdit.client) : null);
        populateManufacturerDropdown();
    }

    // --- Core Offer Functions ---
    async function loadOffers() {
        if (!checkAuth()) return;
        const token = getAuthToken();
        showLoading(true);
        showError("");

        try {
            const response = await fetch("/api/offers", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            showLoading(false);
            const responseData = await response.json();
            console.log("DEBUG (v25): Raw response from /api/offers:", responseData);

            if (!response.ok) {
                throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
            }
            displayOffers(responseData);
        } catch (error) {
            showLoading(false);
            showError(`Error fetching offers: ${error.message}`);
            console.error("DEBUG (v25): Error in loadOffers:", error);
            if (offerListContainer) {
                offerListContainer.innerHTML = `<p class="text-center text-danger">Error loading offers: ${error.message}</p>`;
            }
        }
    }

    function displayOffers(offersData) {
        if (!offerListContainer) {
            console.error("DEBUG (v25): offerListContainer element not found!");
            return;
        }
        offerListContainer.innerHTML = ""; 

        const offers = Array.isArray(offersData) ? offersData : (offersData.data || []);

        if (offers.length === 0) {
            let message = "No offers found.";
            if (offersData && offersData.message === "GET /api/offers placeholder") {
                 message = "No offers available at the moment (backend placeholder active).";
            }
            offerListContainer.innerHTML = `<p class="text-center">${message}</p>`;
            return;
        }

        const table = document.createElement("table");
        table.className = "table table-striped table-hover";
        
        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        const headers = ["Offer ID", "Client", "Status", "Validity Date", "Last Updated", "Actions"];
        headers.forEach(headerText => {
            const th = document.createElement("th");
            th.textContent = headerText;
            headerRow.appendChild(th);
        });

        const tbody = table.createTBody();
        offers.forEach(offer => {
            const row = tbody.insertRow();
            const clientNameToDisplay = (offer.client && offer.client.displayName) 
                                      ? offer.client.displayName 
                                      : (offer.client && (offer.client.companyName || offer.client.clientName)) 
                                          ? (offer.client.companyName || offer.client.clientName) 
                                          : "N/A";
            
            row.innerHTML = `
                <td>${offer.offerId || "N/A"}</td>
                <td>${clientNameToDisplay}</td>
                <td>${offer.status || "N/A"}</td>
                <td>${formatDateEuropean(offer.validityDate)}</td>
                <td>${formatDateEuropean(offer.updatedAt)}</td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-info edit-offer-btn" data-id="${offer._id}"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger delete-offer-btn" data-id="${offer._id}"><i class="fas fa-trash-alt"></i></button>
                    <button class="btn btn-sm btn-secondary pdf-offer-btn" data-id="${offer._id}"><i class="fas fa-file-pdf"></i></button>
                    <button class="btn btn-sm btn-success csv-offer-btn" data-id="${offer._id}"><i class="fas fa-file-csv"></i></button>
                </td>
            `;
        });

        offerListContainer.appendChild(table);
    }

    async function loadOfferForEditing(offerId) {
        if (!checkAuth()) return;
        const token = getAuthToken();
        showLoading(true);
        showError("");
        try {
            const response = await fetch(`/api/offers/${offerId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            showLoading(false);
            const responseData = await response.json();
            console.log(`DEBUG (v25): Raw response from /api/offers/${offerId}:`, responseData);

            if (!response.ok) {
                throw new Error(responseData.message || `HTTP error! status: ${response.status} - ${response.statusText}`);
            }
            showOfferForm(responseData);
        } catch (error) {
            showLoading(false);
            showError(`Error loading offer for editing: ${error.message}`);
            console.error("DEBUG (v25): Error in loadOfferForEditing:", error);
        }
    }

    async function populateClientDropdown(selectedClientId = null) {
        if (!clientSelect) return;
        const token = getAuthToken();
        if (!token) return;

        try {
            const response = await fetch("/api/clients", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Failed to load clients");
            const clients = await response.json();
            const actualClients = Array.isArray(clients) ? clients : (clients.data || []);

            clientSelect.innerHTML = "<option value=\"\">Select Client...</option>";
            actualClients.forEach(client => {
                const option = document.createElement("option");
                option.value = client._id;
                option.textContent = client.displayName || client.companyName || client.clientName || "Unnamed Client (".concat(client._id.slice(-4), ")");
                if (client._id === selectedClientId) {
                    option.selected = true;
                }
                clientSelect.appendChild(option);
            });
        } catch (error) {
            console.error("DEBUG (v25): Error populating client dropdown:", error);
            showError("Could not load clients for dropdown.");
        }
    }

    async function populateManufacturerDropdown() {
        if (!bulkAddManufacturerSelect) return;
        const token = getAuthToken();
        if (!token) return;
        try {
            const response = await fetch("/api/products/manufacturers", { 
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Failed to load manufacturers");
            const manufacturers = await response.json();
            bulkAddManufacturerSelect.innerHTML = "<option value=\"\">Select Manufacturer...</option>";
            manufacturers.forEach(m => {
                const option = document.createElement("option");
                option.value = m;
                option.textContent = m;
                bulkAddManufacturerSelect.appendChild(option);
            });
        } catch (error) {
            console.error("DEBUG (v25): Error populating manufacturer dropdown:", error);
        }
    }
    
    function updateAndDisplayItemPrice(rowElement) {
        const basePriceForMargin = parseFloat(rowElement.dataset.basePriceForMargin) || 0;
        const quantityInput = rowElement.querySelector(".item-quantity");
        const marginInput = rowElement.querySelector(".item-margin-percent");
        const unitPriceDisplay = rowElement.querySelector(".unit-price-display");
        const lineTotalDisplay = rowElement.querySelector(".line-total-display");

        const quantity = parseInt(quantityInput.value) || 0;
        let itemMarginPercent = marginInput?.value.trim() !== "" ? parseFloat(marginInput.value) : null;
        
        // Use offer-level global margin if item-specific margin is not set
        let offerWideGlobalMargin = globalMarginInput?.value.trim() !== "" ? parseFloat(globalMarginInput.value) : 0;
        if (isNaN(offerWideGlobalMargin)) offerWideGlobalMargin = 0;

        let effectiveMarginPercent = itemMarginPercent ?? offerWideGlobalMargin;

        const unitPrice = basePriceForMargin * (1 + effectiveMarginPercent / 100);
        const lineTotal = unitPrice * quantity;

        if (unitPriceDisplay) unitPriceDisplay.textContent = unitPrice.toFixed(2);
        if (lineTotalDisplay) lineTotalDisplay.textContent = lineTotal.toFixed(2);
    }

    function recalculateAllPricesBasedOnOfferGlobalMargin() {
        if (!lineItemsBody) return;
        const rows = lineItemsBody.querySelectorAll("tr");
        rows.forEach(row => {
            const marginInput = row.querySelector(".item-margin-percent");
            // Only update if the item doesn't have its own specific margin set
            if (!marginInput || marginInput.value.trim() === "") { 
                updateAndDisplayItemPrice(row);
            }
        });
    }

    if (globalMarginInput) {
        globalMarginInput.addEventListener("change", recalculateAllPricesBasedOnOfferGlobalMargin);
    }

    function addLineItemRow(itemData = {}, isManualEntry = false) {
        if (!lineItemsBody) return;
        const newRow = lineItemsBody.insertRow();
        newRow.dataset.isManual = isManualEntry.toString();
        newRow.dataset.productId = itemData.productId || (itemData.product?._id || "");
        
        // For bulk-added items, basePriceForMargin will be set after supplier selection
        // For manually added or loaded items, it might come from itemData
        let basePriceForMarginCalc = itemData.basePriceForMargin || itemData.basePriceUSDForMarginApplication || itemData.basePriceUSDForMargin || itemData.basePrice || 0;
        newRow.dataset.basePriceForMargin = basePriceForMarginCalc.toString();

        // If it's a bulk-added item, use the bulkAddGlobalMargin for initial display
        // Otherwise, use itemData.marginPercent or fallback to offer-level globalMarginInput
        let initialMarginPercent = "";
        if (itemData.source === "bulk-add" && bulkAddGlobalMargin !== null) {
            initialMarginPercent = bulkAddGlobalMargin;
        } else if (itemData.marginPercent !== undefined && itemData.marginPercent !== null) {
            initialMarginPercent = itemData.marginPercent;
        } 
        // If still no margin, it will default to using the offer-level global margin in updateAndDisplayItemPrice

        newRow.innerHTML = `
            <td><input type="text" class="form-control item-number" value="${itemData.itemNo || itemData.partNumber || ""}" ${!isManualEntry && (itemData.itemNo || itemData.partNumber) ? "readonly" : ""}></td>
            <td><input type="text" class="form-control item-manufacturer" value="${itemData.manufacturer || ""}" ${!isManualEntry && itemData.manufacturer ? "readonly" : ""}></td>
            <td><input type="text" class="form-control item-description" value="${itemData.description || ""}" ${!isManualEntry && itemData.description ? "readonly" : ""}></td>
            <td><input type="number" class="form-control item-quantity" value="${itemData.quantity || 1}" min="1"></td>
            <td><input type="text" class="form-control item-margin-percent" value="${initialMarginPercent}" placeholder="Global"></td>
            <td class="unit-price-display">0.00</td>
            <td class="line-total-display">0.00</td>
            <td><button class="btn btn-sm btn-danger remove-item-btn"><i class="fas fa-times"></i></button></td>
        `;

        updateAndDisplayItemPrice(newRow);

        newRow.querySelector(".item-quantity").addEventListener("change", () => updateAndDisplayItemPrice(newRow));
        newRow.querySelector(".item-margin-percent").addEventListener("change", () => updateAndDisplayItemPrice(newRow));
        newRow.querySelector(".remove-item-btn").addEventListener("click", () => newRow.remove());
        
        // For manual entries, allow editing of number, manufacturer, description
        if (isManualEntry) {
            newRow.querySelector(".item-number").readOnly = false;
            newRow.querySelector(".item-manufacturer").readOnly = false;
            newRow.querySelector(".item-description").readOnly = false;
            // For manual entries, base price is typically entered by user or fetched differently
            // We might need a field for base price input for truly manual items if not product-linked
            const basePriceInput = document.createElement("input");
            basePriceInput.type = "number";
            basePriceInput.className = "form-control item-base-price-manual";
            basePriceInput.placeholder = "Base Price (USD)";
            basePriceInput.value = basePriceForMarginCalc > 0 ? basePriceForMarginCalc : "";
            basePriceInput.addEventListener("change", (e) => {
                newRow.dataset.basePriceForMargin = parseFloat(e.target.value) || 0;
                updateAndDisplayItemPrice(newRow);
            });
            const tdBasePrice = document.createElement("td");
            tdBasePrice.appendChild(basePriceInput);
            // Insert this before the margin column, adjust column spans or add new header if needed
            // For now, this is just a conceptual addition for manual price setting
        }
        return newRow;
    }

    // --- MODAL CREATION AND HANDLING ---
    function createModal(id, title, bodyContentHtml, footerButtons = []) {
        // Remove existing modal with the same id to prevent duplicates
        const existingModal = document.getElementById(id);
        if (existingModal) existingModal.remove();

        const modalElement = document.createElement("div");
        modalElement.className = "modal fade";
        modalElement.id = id;
        modalElement.tabIndex = -1;
        modalElement.setAttribute("aria-labelledby", `${id}-label`);
        modalElement.setAttribute("aria-hidden", "true");

        modalElement.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="${id}-label">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        ${bodyContentHtml}
                    </div>
                    <div class="modal-footer">
                        ${footerButtons.map(btn => `<button type="button" class="btn ${btn.className}" id="${btn.id}">${btn.text}</button>`).join("")}
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modalElement);
        return new bootstrap.Modal(modalElement);
    }

    async function promptForGlobalMargin() {
        return new Promise((resolve) => {
            const modalId = "global-margin-prompt-modal";
            const title = "Set Global Margin for Bulk Add";
            const bodyHtml = `
                <p>Please enter the global margin percentage to apply to the newly added items. You can override this for individual items later.</p>
                <div class="mb-3">
                    <label for="bulk-add-global-margin-input" class="form-label">Global Margin (%):</label>
                    <input type="number" class="form-control" id="bulk-add-global-margin-input" value="0" min="0" step="0.01">
                </div>
            `;
            const footerButtons = [
                { id: "confirm-global-margin-btn", text: "Confirm Margin", className: "btn-primary" }
            ];
            
            const bsModal = createModal(modalId, title, bodyHtml, footerButtons);

            document.getElementById("confirm-global-margin-btn").onclick = () => {
                const marginValue = parseFloat(document.getElementById("bulk-add-global-margin-input").value);
                bsModal.hide();
                resolve(isNaN(marginValue) ? 0 : marginValue);
            };
            bsModal.show();
        });
    }

    async function promptForSupplierSelection(partNumber, suppliers) {
        return new Promise((resolve) => {
            const modalId = `supplier-select-modal-${partNumber.replace(/[^a-zA-Z0-9]/g, "")}`;
            const title = `Select Supplier for Part: ${partNumber}`;
            let bodyHtml = `<p>Multiple suppliers found. Please select one:</p><div class="list-group">`;

            suppliers.forEach((supplier, index) => {
                bodyHtml += `
                    <label class="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${supplier.supplier}</strong><br>
                            <small>Original: ${supplier.originalPrice.toFixed(2)} ${supplier.originalCurrency}</small><br>
                            <small>USD (incl. 3% protection): ${supplier.usdPriceWithProtection.toFixed(2)} USD</small>
                            ${supplier.isWinner ? 
(Content truncated due to size limit. Use line ranges to read in chunks)
