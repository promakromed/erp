// offers_v23.js
// Updates client dropdown to use displayName virtual property from Client model.

document.addEventListener("DOMContentLoaded", () => {
    console.log("DEBUG (v23): DOMContentLoaded event fired");

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

        if (offerToEdit) {
            currentOfferId = offerToEdit._id;
            if (offerIdDisplay) offerIdDisplay.textContent = offerToEdit.offerId || "Editing Offer";
            if (clientSelect) clientSelect.value = offerToEdit.client?._id || offerToEdit.client;
            if (validityInput) validityInput.value = offerToEdit.validityDate ? offerToEdit.validityDate.split("T")[0] : "";
            if (termsInput) termsInput.value = offerToEdit.terms || "";
            if (statusSelect) statusSelect.value = offerToEdit.status || "Draft";
            if (globalMarginInput) globalMarginInput.value = offerToEdit.globalMarginPercent || 0;
            
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
            console.log("DEBUG (v23): Raw response from /api/offers:", responseData);

            if (!response.ok) {
                throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
            }
            displayOffers(responseData);
        } catch (error) {
            showLoading(false);
            showError(`Error fetching offers: ${error.message}`);
            console.error("DEBUG (v23): Error in loadOffers:", error);
            if (offerListContainer) {
                offerListContainer.innerHTML = `<p class="text-center text-danger">Error loading offers: ${error.message}</p>`;
            }
        }
    }

    function displayOffers(offersData) {
        if (!offerListContainer) {
            console.error("DEBUG (v23): offerListContainer element not found!");
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
            // Use displayName from the populated client object if available
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
            console.log(`DEBUG (v23): Raw response from /api/offers/${offerId}:`, responseData);

            if (!response.ok) {
                throw new Error(responseData.message || `HTTP error! status: ${response.status} - ${response.statusText}`);
            }
            showOfferForm(responseData);
        } catch (error) {
            showLoading(false);
            showError(`Error loading offer for editing: ${error.message}`);
            console.error("DEBUG (v23): Error in loadOfferForEditing:", error);
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
                // MODIFIED: Prioritize displayName, then companyName, then clientName
                option.textContent = client.displayName || client.companyName || client.clientName || "Unnamed Client (".concat(client._id.slice(-4), ")");
                if (client._id === selectedClientId) {
                    option.selected = true;
                }
                clientSelect.appendChild(option);
            });
        } catch (error) {
            console.error("DEBUG (v23): Error populating client dropdown:", error);
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
            console.error("DEBUG (v23): Error populating manufacturer dropdown:", error);
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
        let globalMarginValue = globalMarginInput?.value.trim() !== "" ? parseFloat(globalMarginInput.value) : 0;
        if (isNaN(globalMarginValue)) globalMarginValue = 0;

        let effectiveMarginPercent = itemMarginPercent ?? globalMarginValue;

        const unitPrice = basePriceForMargin * (1 + effectiveMarginPercent / 100);
        const lineTotal = unitPrice * quantity;

        if (unitPriceDisplay) unitPriceDisplay.textContent = unitPrice.toFixed(2);
        if (lineTotalDisplay) lineTotalDisplay.textContent = lineTotal.toFixed(2);
    }

    function recalculateAllPrices() {
        if (!lineItemsBody) return;
        const rows = lineItemsBody.querySelectorAll("tr");
        rows.forEach(row => {
            const marginInput = row.querySelector(".item-margin-percent");
            if (!marginInput || marginInput.value.trim() === "") { 
                updateAndDisplayItemPrice(row);
            }
        });
    }

    function addLineItemRow(itemData = {}, isManualEntry = false) {
        if (!lineItemsBody) return;
        const newRow = lineItemsBody.insertRow();
        newRow.dataset.isManual = isManualEntry.toString();
        newRow.dataset.productId = itemData.productId || (itemData.product?._id || "");
        let basePriceForMarginCalc = itemData.basePriceUSDForMarginApplication || itemData.basePriceUSDForMargin || itemData.basePrice || 0;
        newRow.dataset.basePriceForMargin = basePriceForMarginCalc.toString();

        newRow.innerHTML = `
            <td><input type="text" class="form-control item-number" value="${itemData.itemNo || ""}" ${!isManualEntry && itemData.itemNo ? "readonly" : ""}></td>
            <td><input type="text" class="form-control item-manufacturer" value="${itemData.manufacturer || ""}" ${!isManualEntry && itemData.manufacturer ? "readonly" : ""}></td>
            <td><textarea class="form-control item-description" rows="1" ${!isManualEntry && itemData.description ? "readonly" : ""}>${itemData.description || ""}</textarea></td>
            <td><input type="number" class="form-control item-quantity" value="${itemData.quantity || 1}" min="1"></td>
            <td><input type="number" step="0.01" class="form-control item-margin-percent" placeholder="Global" value="${itemData.marginPercent !== null && itemData.marginPercent !== undefined ? itemData.marginPercent : ""}"></td>
            <td class="unit-price-display">${(itemData.finalPriceUSD || 0).toFixed(2)}</td>
            <td class="line-total-display">${(itemData.lineTotalUSD || 0).toFixed(2)}</td>
            <td><button type="button" class="btn btn-sm btn-danger remove-item-btn"><i class="fas fa-trash-alt"></i></button></td>
        `;
        updateAndDisplayItemPrice(newRow);
    }

    async function saveOffer(event) {
        event.preventDefault();
        if (!checkAuth()) return;
        const token = getAuthToken();

        const lineItemsData = [];
        if (lineItemsBody) {
            lineItemsBody.querySelectorAll("tr").forEach(row => {
                const itemNumberInput = row.querySelector(".item-number");
                const manufacturerInput = row.querySelector(".item-manufacturer");
                const descriptionInput = row.querySelector(".item-description");
                const quantityInput = row.querySelector(".item-quantity");
                const marginInput = row.querySelector(".item-margin-percent");
                
                if (row.dataset.isManual === "true" && !itemNumberInput.value.trim() && !descriptionInput.value.trim()) {
                    return; 
                }

                lineItemsData.push({
                    productId: row.dataset.productId || null,
                    itemNo: itemNumberInput.value,
                    manufacturer: manufacturerInput.value,
                    description: descriptionInput.value,
                    quantity: parseInt(quantityInput.value) || 1,
                    marginPercent: marginInput.value.trim() === "" ? null : parseFloat(marginInput.value),
                    isManual: row.dataset.isManual === "true",
                    basePrice: row.dataset.isManual === "true" ? (parseFloat(row.dataset.basePriceForMargin) || 0) : undefined, 
                    baseCurrency: row.dataset.isManual === "true" ? "USD" : undefined, 
                    basePriceUSDForMarginApplication: parseFloat(row.dataset.basePriceForMargin) || 0 
                });
            });
        }

        const offerPayload = {
            client: clientSelect.value,
            validityDate: validityInput.value,
            terms: termsInput.value,
            status: statusSelect.value,
            globalMarginPercent: parseFloat(globalMarginInput.value) || 0,
            lineItems: lineItemsData
        };

        const method = currentOfferId ? "PUT" : "POST";
        const endpoint = currentOfferId ? `/api/offers/${currentOfferId}` : "/api/offers";

        showLoading(true);
        showError("");

        try {
            const response = await fetch(endpoint, {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(offerPayload)
            });
            showLoading(false);
            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.message || `HTTP error! status: ${response.status} - ${responseData.error || response.statusText}`);
            }
            alert("Offer saved successfully!");
            showOfferList(); 
        } catch (error) {
            showLoading(false);
            showError(`Error saving offer: ${error.message}`);
            console.error("DEBUG (v23): Error in saveOffer:", error);
        }
    }

    async function deleteOffer(offerId) {
        if (!checkAuth() || !confirm("Are you sure you want to delete this offer?")) return;
        const token = getAuthToken();
        showLoading(true);
        showError("");
        try {
            const response = await fetch(`/api/offers/${offerId}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            showLoading(false);
            if (!response.ok) {
                const responseData = await response.json().catch(() => ({})); 
                throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
            }
            alert("Offer deleted successfully!");
            loadOffers(); 
        } catch (error) {
            showLoading(false);
            showError(`Error deleting offer: ${error.message}`);
            console.error("DEBUG (v23): Error in deleteOffer:", error);
        }
    }

    async function handleBulkAdd() {
        if (!checkAuth()) return;
        const token = getAuthToken();
        const manufacturer = bulkAddManufacturerSelect.value;
        const partNumbersText = bulkAddPartNumbersTextarea.value;

        if (!manufacturer) {
            showBulkAddStatus("Please select a manufacturer.", true);
            return;
        }
        if (!partNumbersText.trim()) {
            showBulkAddStatus("Please enter part numbers.", true);
            return;
        }

        const partNumbers = partNumbersText.split(/[,\n\s]+/).map(pn => pn.trim()).filter(pn => pn);
        if (partNumbers.length === 0) {
            showBulkAddStatus("No valid part numbers entered.", true);
            return;
        }

        showLoading(true);
        showBulkAddStatus("Processing items...");

        try {
            const response = await fetch("/api/products/bulk-by-manufacturer", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ manufacturer, itemNumbers: partNumbers })
            });
            showLoading(false);
            const products = await response.json();

            if (!response.ok) {
                throw new Error(products.message || "Error fetching products for bulk add.");
            }

            let itemsAddedCount = 0;
            let itemsNotFound = [];
            products.forEach(product => {
                if (product && product._id) { 
                    const itemData = {
                        productId: product._id,
                        itemNo: product.itemNo,
                        manufacturer: product.manufacturer,
                        description: product.description,
                        quantity: 1, 
                        basePrice: product.basePrice, 
                        baseCurrency: product.baseCurrency,
                        basePriceUSDForMargin: product.basePriceUSD, 
                        finalPriceUSD: 0, 
                        lineTotalUSD: 0   
                    };
                    addLineItemRow(itemData, false);
                    itemsAddedCount++;
                } else if (product && product.itemNo && !product._id) { 
                    itemsNotFound.push(product.itemNo);
                }
            });
            
            let statusMessage = `${itemsAddedCount} item(s) added.`;
            if (itemsNotFound.length > 0) {
                statusMessage += ` ${itemsNotFound.length} item(s) not found: ${itemsNotFound.join(", ")}.`;
            }
            showBulkAddStatus(statusMessage, itemsNotFound.length > 0 && itemsAddedCount === 0);
            bulkAddPartNumbersTextarea.value = ""; 

        } catch (error) {
            showLoading(false);
            showBulkAddStatus(`Error during bulk add: ${error.message}`, true);
            console.error("DEBUG (v23): Error in handleBulkAdd:", error);
        }
    }

    // --- Event Listeners ---
    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            localStorage.removeItem("userInfo");
            window.location.href = "/login.html";
        });
    }

    if (offerForm) {
        offerForm.addEventListener("submit", saveOffer);
    }

    if (addItemBtn) {
        addItemBtn.addEventListener("click", () => addLineItemRow({}, true));
    }

    if (lineItemsBody) {
        lineItemsBody.addEventListener("click", (event) => {
            if (event.target.closest(".remove-item-btn")) {
                event.target.closest("tr").remove();
            }
        });
        lineItemsBody.addEventListener("change", (event) => {
            if (event.target.classList.contains("item-quantity") || event.target.classList.contains("item-margin-percent")) {
                updateAndDisplayItemPrice(event.target.closest("tr"));
            }
        });
    }

    if (globalMarginInput) {
        globalMarginInput.addEventListener("change", recalculateAllPrices);
    }

    if (offerListContainer) { 
        offerListContainer.addEventListener("click", (event) => {
            const editButton = event.target.closest(".edit-offer-btn");
            const deleteButton = event.target.closest(".delete-offer-btn");
            const pdfButton = event.target.closest(".pdf-offer-btn");
            const csvButton = event.target.closest(".csv-offer-btn");

            if (editButton) {
                const offerId = editButton.dataset.id;
                loadOfferForEditing(offerId);
            }
            if (deleteButton) {
                const offerId = deleteButton.dataset.id;
                deleteOffer(offerId);
            }
            if (pdfButton) {
                const offerId = pdfButton.dataset.id;
                window.open(`/api/offers/${offerId}/pdf`, "_blank");
            }
            if (csvButton) {
                const offerId = csvButton.dataset.id;
                window.location.href = `/api/offers/${offerId}/csv`;
            }
        });
    }

    if (showCreateOfferFormBtn) {
        showCreateOfferFormBtn.addEventListener("click", () => {
            showOfferForm(null); 
        });
    }

    if (cancelOfferBtn) {
        cancelOfferBtn.addEventListener("click", () => {
            showOfferList();
        });
    }

    if (bulkAddBtn) {
        bulkAddBtn.addEventListener("click", handleBulkAdd);
    }

    // --- Initial Load ---
    if (!checkAuth()) return; 
    
    if (window.location.hash === "#new") {
        showOfferForm(null); 
    } else {
        showOfferList(); 
    }
});

