// offers_v26.js
// Fixes part number parsing in bulk add.
// Implements multi-supplier price selection modal and global margin with individual override.

document.addEventListener("DOMContentLoaded", () => {
    console.log("DEBUG (v26): DOMContentLoaded event fired");

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
            console.log("DEBUG (v26): Raw response from /api/offers:", responseData);

            if (!response.ok) {
                throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
            }
            displayOffers(responseData);
        } catch (error) {
            showLoading(false);
            showError(`Error fetching offers: ${error.message}`);
            console.error("DEBUG (v26): Error in loadOffers:", error);
            if (offerListContainer) {
                offerListContainer.innerHTML = `<p class="text-center text-danger">Error loading offers: ${error.message}</p>`;
            }
        }
    }

    function displayOffers(offersData) {
        if (!offerListContainer) {
            console.error("DEBUG (v26): offerListContainer element not found!");
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
            console.log(`DEBUG (v26): Raw response from /api/offers/${offerId}:`, responseData);

            if (!response.ok) {
                throw new Error(responseData.message || `HTTP error! status: ${response.status} - ${response.statusText}`);
            }
            showOfferForm(responseData);
        } catch (error) {
            showLoading(false);
            showError(`Error loading offer for editing: ${error.message}`);
            console.error("DEBUG (v26): Error in loadOfferForEditing:", error);
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
            console.error("DEBUG (v26): Error populating client dropdown:", error);
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
            console.error("DEBUG (v26): Error populating manufacturer dropdown:", error);
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
        newRow.className = "line-item-row";

        const itemNumber = itemData.itemNo || itemData.partNumber || "";
        const description = itemData.description || "";
        const quantity = itemData.quantity || 1;
        const basePriceForMargin = parseFloat(itemData.basePriceForMargin) || 0; // This will be set after supplier selection
        const marginPercent = itemData.marginPercent !== undefined ? itemData.marginPercent : (bulkAddGlobalMargin !== null ? bulkAddGlobalMargin : (parseFloat(globalMarginInput?.value) || 0));
        const unitPrice = basePriceForMargin * (1 + marginPercent / 100);
        const lineTotal = unitPrice * quantity;

        newRow.dataset.basePriceForMargin = basePriceForMargin.toFixed(4); // Store with precision
        newRow.dataset.isManual = isManualEntry.toString();
        newRow.dataset.productId = itemData.productId || itemData._id || ""; // Store product ID if available

        newRow.innerHTML = `
            <td><input type="text" class="form-control item-number" value="${itemNumber}" ${isManualEntry ? "" : "readonly"}></td>
            <td><input type="text" class="form-control item-description" value="${description}" ${isManualEntry ? "" : "readonly"}></td>
            <td><input type="number" class="form-control item-quantity" value="${quantity}" min="1"></td>
            <td><input type="number" class="form-control item-margin-percent" value="${marginPercent.toFixed(2)}" step="0.01"></td>
            <td class="unit-price-display">${unitPrice.toFixed(2)}</td>
            <td class="line-total-display">${lineTotal.toFixed(2)}</td>
            <td><button type="button" class="btn btn-danger btn-sm remove-item-btn"><i class="fas fa-times"></i></button></td>
        `;

        const quantityInput = newRow.querySelector(".item-quantity");
        const marginInput = newRow.querySelector(".item-margin-percent");

        quantityInput.addEventListener("change", () => updateAndDisplayItemPrice(newRow));
        marginInput.addEventListener("change", () => updateAndDisplayItemPrice(newRow));
        
        // Initial calculation for display
        updateAndDisplayItemPrice(newRow);
    }

    // --- Event Listeners ---
    if (showCreateOfferFormBtn) {
        showCreateOfferFormBtn.addEventListener("click", () => showOfferForm());
    }

    if (offerForm) {
        offerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!checkAuth()) return;
            const token = getAuthToken();
            showLoading(true);
            showError("");

            const lineItems = [];
            const rows = lineItemsBody.querySelectorAll("tr.line-item-row");
            rows.forEach(row => {
                const itemNumberInput = row.querySelector(".item-number");
                const descriptionInput = row.querySelector(".item-description");
                const quantityInput = row.querySelector(".item-quantity");
                const marginInput = row.querySelector(".item-margin-percent");
                
                lineItems.push({
                    itemNo: itemNumberInput.value,
                    description: descriptionInput.value,
                    quantity: parseInt(quantityInput.value),
                    marginPercent: parseFloat(marginInput.value),
                    basePriceForMargin: parseFloat(row.dataset.basePriceForMargin) || 0,
                    isManual: row.dataset.isManual === "true",
                    productId: row.dataset.productId || null
                });
            });

            const offerData = {
                client: clientSelect.value,
                validityDate: validityInput.value,
                terms: termsInput.value,
                status: statusSelect.value,
                globalMarginPercent: parseFloat(globalMarginInput.value) || 0,
                lineItems: lineItems
            };

            const method = currentOfferId ? "PUT" : "POST";
            const url = currentOfferId ? `/api/offers/${currentOfferId}` : "/api/offers";

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(offerData)
                });
                showLoading(false);
                const responseData = await response.json();
                if (!response.ok) {
                    throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
                }
                alert(`Offer ${currentOfferId ? "updated" : "created"} successfully!`);
                showOfferList();
            } catch (error) {
                showLoading(false);
                showError(`Error saving offer: ${error.message}`);
                console.error("DEBUG (v26): Error saving offer:", error);
            }
        });
    }

    if (cancelOfferBtn) {
        cancelOfferBtn.addEventListener("click", () => showOfferList());
    }

    if (deleteOfferBtn) {
        deleteOfferBtn.addEventListener("click", async () => {
            if (!currentOfferId || !confirm("Are you sure you want to delete this offer?")) return;
            if (!checkAuth()) return;
            const token = getAuthToken();
            showLoading(true);
            showError("");
            try {
                const response = await fetch(`/api/offers/${currentOfferId}`, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${token}` }
                });
                showLoading(false);
                if (!response.ok) {
                    const responseData = await response.json();
                    throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
                }
                alert("Offer deleted successfully!");
                showOfferList();
            } catch (error) {
                showLoading(false);
                showError(`Error deleting offer: ${error.message}`);
                console.error("DEBUG (v26): Error deleting offer:", error);
            }
        });
    }

    if (addItemBtn) {
        addItemBtn.addEventListener("click", () => addLineItemRow({}, true)); // Add a manual, empty row
    }

    if (lineItemsBody) {
        lineItemsBody.addEventListener("click", (e) => {
            if (e.target.closest(".remove-item-btn")) {
                e.target.closest("tr.line-item-row").remove();
            }
        });
    }

    if (offerListContainer) {
        offerListContainer.addEventListener("click", (e) => {
            const editButton = e.target.closest(".edit-offer-btn");
            const deleteButton = e.target.closest(".delete-offer-btn");
            const pdfButton = e.target.closest(".pdf-offer-btn");
            const csvButton = e.target.closest(".csv-offer-btn");

            if (editButton) {
                const offerId = editButton.dataset.id;
                loadOfferForEditing(offerId);
            } else if (deleteButton) {
                const offerId = deleteButton.dataset.id;
                // This delete is for the list view, might need a separate handler or reuse logic
                if (confirm("Are you sure you want to delete this offer from the list?")) {
                    currentOfferId = offerId; // Set it for the delete function
                    deleteOfferBtn.click(); // Trigger the form's delete logic
                }
            } else if (pdfButton) {
                const offerId = pdfButton.dataset.id;
                window.open(`/api/offers/${offerId}/pdf`, "_blank");
            } else if (csvButton) {
                const offerId = csvButton.dataset.id;
                window.open(`/api/offers/${offerId}/csv`, "_blank");
            }
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            localStorage.removeItem("userInfo");
            window.location.href = "/login.html";
        });
    }

    // --- Bulk Add Functionality ---
    async function handleBulkAdd() {
        if (!checkAuth()) return;
        const token = getAuthToken();
        const manufacturer = bulkAddManufacturerSelect.value;
        const partNumbersRaw = bulkAddPartNumbersTextarea.value;

        if (!manufacturer) {
            showBulkAddStatus("Please select a manufacturer.", true);
            return;
        }
        if (!partNumbersRaw.trim()) {
            showBulkAddStatus("Please enter part numbers.", true);
            return;
        }

        // **FIXED PART NUMBER PARSING HERE**
        const partNumbers = partNumbersRaw
            .split(/\r?\n/)
            .map(pn => pn.trim())
            .filter(pn => pn !== "");

        if (partNumbers.length === 0) {
            showBulkAddStatus("No valid part numbers entered after trimming.", true);
            return;
        }

        showLoading(true);
        showBulkAddStatus("Processing...", false);

        try {
            // 1. Prompt for Global Margin for this bulk add operation
            const globalMarginForBulk = await promptForGlobalMargin();
            bulkAddGlobalMargin = globalMarginForBulk; // Store for use in addLineItemRow

            const response = await fetch("/api/products/bulk-by-manufacturer", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ manufacturer, partNumbers })
            });

            showLoading(false);
            const results = await response.json();

            if (!response.ok) {
                throw new Error(results.message || `Error fetching bulk products: ${response.status}`);
            }

            let itemsAddedCount = 0;
            for (const productInfo of results) {
                if (productInfo.found && productInfo.suppliers && productInfo.suppliers.length > 0) {
                    let selectedSupplierPrice = null;
                    if (productInfo.suppliers.length === 1) {
                        selectedSupplierPrice = productInfo.suppliers[0].usdPriceWithProtection;
                    } else {
                        // Multiple suppliers, prompt user
                        const chosenSupplier = await promptForSupplierSelection(productInfo.partNumber, productInfo.suppliers);
                        if (chosenSupplier) {
                            selectedSupplierPrice = chosenSupplier.usdPriceWithProtection;
                        }
                    }

                    if (selectedSupplierPrice !== null) {
                        const lineItemData = {
                            partNumber: productInfo.partNumber,
                            description: productInfo.description || "", // Assuming backend might send description
                            quantity: 1, // Default quantity
                            basePriceForMargin: selectedSupplierPrice,
                            marginPercent: bulkAddGlobalMargin, // Apply the bulk-add global margin
                            productId: productInfo.productId || null // Assuming backend might send product ID
                        };
                        addLineItemRow(lineItemData, false); // false for not manual entry
                        itemsAddedCount++;
                    }
                } else {
                    console.warn(`DEBUG (v26): Part number ${productInfo.partNumber} not found or no suppliers.`);
                }
            }

            if (itemsAddedCount > 0) {
                showBulkAddStatus(`${itemsAddedCount} item(s) added. You can adjust individual margins below.`, false);
            } else {
                showBulkAddStatus("0 items added. Check part numbers or supplier availability.", true);
            }
            bulkAddPartNumbersTextarea.value = ""; // Clear textarea

        } catch (error) {
            showLoading(false);
            showBulkAddStatus(`Error during bulk add: ${error.message}`, true);
            console.error("DEBUG (v26): Error in handleBulkAdd:", error);
        }
        bulkAddGlobalMargin = null; // Reset after operation
    }

    if (bulkAddBtn) {
        bulkAddBtn.addEventListener("click", handleBulkAdd);
    }

    // --- Modal Creation Helper (using Bootstrap's JS for modals) ---
    function createModal(id, title, bodyHtml, footerButtons = []) {
        // Remove existing modal if any
        const existingModal = document.getElementById(id);
        if (existingModal) existingModal.remove();

        const modalHtml = `
            <div class="modal fade" id="${id}" tabindex="-1" aria-labelledby="${id}Label" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="${id}Label">${title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            ${bodyHtml}
                        </div>
                        <div class="modal-footer">
                            ${footerButtons.map(btn => `<button type="button" class="btn ${btn.className}" id="${btn.id}">${btn.text}</button>`).join("")}
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML("beforeend", modalHtml);
        return new bootstrap.Modal(document.getElementById(id));
    }

    // --- Modal Prompts for Bulk Add ---
    async function promptForGlobalMargin() {
        return new Promise((resolve) => {
            const modalId = "global-margin-prompt-modal";
            const title = "Set Global Margin for Bulk Add";
            const bodyHtml = `
                <p>Enter the global margin percentage to apply to all newly added items. You can override this for individual items later.</p>
                <div class="mb-3">
                    <label for="bulk-add-global-margin-input" class="form-label">Global Margin (%)</label>
                    <input type="number" class="form-control" id="bulk-add-global-margin-input" value="0" step="0.01">
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
                                
                                `<span class="badge bg-success rounded-pill ms-2">Winner</span>` : ""}
                        </div>
                        <input class="form-check-input me-1" type="radio" name="supplierSelect-${partNumber}" value="${index}" ${supplier.isWinner ? "checked" : ""}>
                    </label>
                `;
            });
            bodyHtml += `</div>`;

            const footerButtons = [
                { id: `confirm-supplier-select-btn-${partNumber.replace(/[^a-zA-Z0-9]/g, "")}`, text: "Select this Supplier", className: "btn-primary" }
            ];

            const bsModal = createModal(modalId, title, bodyHtml, footerButtons);

            document.getElementById(`confirm-supplier-select-btn-${partNumber.replace(/[^a-zA-Z0-9]/g, "")}`).onclick = () => {
                const selectedRadio = document.querySelector(`input[name="supplierSelect-${partNumber}"]:checked`);
                if (selectedRadio) {
                    const selectedSupplier = suppliers[parseInt(selectedRadio.value)];
                    bsModal.hide();
                    resolve(selectedSupplier);
                } else {
                    alert("Please select a supplier."); // Should not happen if one is pre-checked
                    resolve(null); // Or re-prompt, but for now resolve null
                }
            };
            bsModal.show();
        });
    }

    // --- Initialization ---
    if (checkAuth()) {
        if (window.location.hash === "#new") {
            showOfferForm();
        } else {
            const offerIdMatch = window.location.hash.match(/^#edit\/(.+)$/);
            if (offerIdMatch) {
                loadOfferForEditing(offerIdMatch[1]);
            } else {
                showOfferList();
            }
        }
    }

    window.addEventListener("hashchange", () => {
        if (checkAuth()) {
            if (window.location.hash === "#new") {
                showOfferForm();
            } else {
                const offerIdMatch = window.location.hash.match(/^#edit\/(.+)$/);
                if (offerIdMatch) {
                    loadOfferForEditing(offerIdMatch[1]);
                } else if (window.location.hash === "") { // Or some other condition for list view
                    showOfferList();
                }
            }
        }
    });

});

