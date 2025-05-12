// offers_v21.js
// Corrects displayOffers to build a table within the div#offer-list-container

document.addEventListener("DOMContentLoaded", () => {
    console.log("DEBUG (v21): DOMContentLoaded event fired");

    // --- Element References ---
    const offerListSection = document.getElementById("offer-list-section");
    const offerFormSection = document.getElementById("offer-form-section");
    const offerListContainer = document.getElementById("offer-list-container"); // This is a DIV
    const offerForm = document.getElementById("offer-form");
    const lineItemsBody = document.getElementById("line-items-body");
    const offerIdDisplay = document.getElementById("offer-id-display");
    const clientSelect = document.getElementById("offer-client");
    const validityInput = document.getElementById("offer-validity");
    const termsInput = document.getElementById("offer-terms");
    const statusSelect = document.getElementById("offer-status");
    const globalMarginInput = document.getElementById("offer-global-margin");
    const createOfferBtn = document.getElementById("create-offer-btn");
    const cancelOfferBtn = document.getElementById("cancel-offer-btn");
    const addItemBtn = document.getElementById("add-item-btn");
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
            return date.toLocaleDateString("en-GB"); // DD/MM/YYYY
        } catch (e) {
            return "Invalid Date";
        }
    }

    // --- UI Switching ---
    function showOfferList() {
        if (offerListSection) offerListSection.style.display = "block";
        if (offerFormSection) offerFormSection.style.display = "none";
        currentOfferId = null;
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
        } else {
            currentOfferId = null;
            if (offerIdDisplay) offerIdDisplay.textContent = "New Offer";
        }
        populateClientDropdown(offerToEdit ? (offerToEdit.client?._id || offerToEdit.client) : null);
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
            console.log("DEBUG (v21): Raw response from /api/offers:", responseData);

            if (!response.ok) {
                throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
            }
            displayOffers(responseData);
        } catch (error) {
            showLoading(false);
            showError(`Error fetching offers: ${error.message}`);
            console.error("DEBUG (v21): Error in loadOffers:", error);
            if (offerListContainer) {
                offerListContainer.innerHTML = `<p class="text-center text-danger">Error loading offers: ${error.message}</p>`;
            }
        }
    }

    function displayOffers(offersData) {
        if (!offerListContainer) {
            console.error("DEBUG (v21): offerListContainer element not found!");
            return;
        }
        offerListContainer.innerHTML = ""; // Clear the div

        const offers = Array.isArray(offersData) ? offersData : (offersData.data || []);

        if (offers.length === 0) {
            let message = "No offers found.";
            if (offersData && offersData.message === "GET /api/offers placeholder") {
                 message = "No offers available at the moment (backend placeholder active).";
            }
            offerListContainer.innerHTML = `<p class="text-center">${message}</p>`;
            return;
        }

        // Create table elements dynamically
        const table = document.createElement("table");
        table.className = "table table-striped table-hover"; // Add Bootstrap classes
        
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
            const clientName = (offer.client && offer.client.name) ? offer.client.name : (offer.clientName || "N/A");
            
            row.innerHTML = `
                <td>${offer.offerId || "N/A"}</td>
                <td>${clientName}</td>
                <td>${offer.status || "N/A"}</td>
                <td>${formatDateEuropean(offer.validityDate)}</td>
                <td>${formatDateEuropean(offer.updatedAt)}</td>
                <td>
                    <button class="btn btn-sm btn-info edit-offer-btn" data-id="${offer._id}"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger delete-offer-btn" data-id="${offer._id}"><i class="fas fa-trash-alt"></i></button>
                    <button class="btn btn-sm btn-secondary pdf-offer-btn" data-id="${offer._id}"><i class="fas fa-file-pdf"></i></button>
                    <button class="btn btn-sm btn-success csv-offer-btn" data-id="${offer._id}"><i class="fas fa-file-csv"></i></button>
                </td>
            `;
        });

        offerListContainer.appendChild(table); // Append the new table to the div
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
                option.textContent = client.name || client.companyName || "Unnamed Client";
                if (client._id === selectedClientId) {
                    option.selected = true;
                }
                clientSelect.appendChild(option);
            });
        } catch (error) {
            console.error("DEBUG (v21): Error populating client dropdown:", error);
            showError("Could not load clients for dropdown.");
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
        let effectiveMarginPercent = itemMarginPercent ?? parseFloat(globalMarginInput.value) ?? 0;

        if (isNaN(effectiveMarginPercent)) effectiveMarginPercent = 0;

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
        newRow.dataset.basePriceForMargin = (itemData.basePriceUSDForMarginApplication || itemData.basePriceUSDForMargin || itemData.basePrice || 0).toString();

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
                throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
            }
            alert(`Offer ${currentOfferId ? "updated" : "created"} successfully! Offer ID: ${responseData.offerId || responseData._id}`);
            showOfferList();
        } catch (error) {
            showLoading(false);
            showError(`Error saving offer: ${error.message}`);
            console.error("DEBUG (v21): Error in saveOffer:", error);
        }
    }

    async function loadOfferForEditing(id) {
        if (!checkAuth()) return;
        const token = getAuthToken();
        showLoading(true);
        showError("");
        try {
            const response = await fetch(`/api/offers/${id}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            showLoading(false);
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || `HTTP error! status: ${response.status}`);
            }
            const offerData = await response.json();
            showOfferForm(offerData);
        } catch (error) {
            showLoading(false);
            showError(`Error loading offer for editing: ${error.message}`);
            console.error("DEBUG (v21): Error in loadOfferForEditing:", error);
        }
    }

    async function deleteOffer(id) {
        if (!checkAuth() || !confirm("Are you sure you want to delete this offer?")) return;
        const token = getAuthToken();
        showLoading(true);
        showError("");
        try {
            const response = await fetch(`/api/offers/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            showLoading(false);
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || `HTTP error! status: ${response.status}`);
            }
            alert("Offer deleted successfully.");
            loadOffers();
        } catch (error) {
            showLoading(false);
            showError(`Error deleting offer: ${error.message}`);
            console.error("DEBUG (v21): Error in deleteOffer:", error);
        }
    }

    async function generateOfferOutput(id, format) {
        if (!checkAuth()) return;
        const token = getAuthToken();
        showLoading(true);
        showError("");
        try {
            const response = await fetch(`/api/offers/${id}/${format}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            showLoading(false);
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || `HTTP error! status: ${response.status}`);
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `offer_${id}.${format}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            showLoading(false);
            showError(`Error generating ${format.toUpperCase()}: ${error.message}`);
            console.error(`DEBUG (v21): Error generating ${format} output:`, error);
        }
    }
    
    async function populateManufacturerDropdown() {
        if (!bulkAddManufacturerSelect) return;
        const token = getAuthToken();
        if (!token) return;
        bulkAddManufacturerSelect.innerHTML = "<option value=\"\">Loading manufacturers...</option>";
        try {
            const response = await fetch("/api/products/manufacturers", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Failed to load manufacturers");
            const manufacturers = await response.json();
            const actualManufacturers = Array.isArray(manufacturers) ? manufacturers : (manufacturers.data || []);
            bulkAddManufacturerSelect.innerHTML = "<option value=\"\">Select Manufacturer...</option>";
            actualManufacturers.forEach(mfg => {
                const option = document.createElement("option");
                const mfgName = typeof mfg === "string" ? mfg : (mfg.name || mfg);
                option.value = mfgName;
                option.textContent = mfgName;
                bulkAddManufacturerSelect.appendChild(option);
            });
        } catch (error) {
            console.error("DEBUG (v21): Error populating manufacturer dropdown:", error);
            bulkAddManufacturerSelect.innerHTML = "<option value=\"\">Error loading</option>";
            showBulkAddStatus("Could not load manufacturers for bulk add.", true);
        }
    }

    async function handleBulkAddItems() {
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
        const partNumbers = partNumbersText.split(/\s*[\n,;]+\s*/).map(pn => pn.trim()).filter(pn => pn);
        if (partNumbers.length === 0) {
            showBulkAddStatus("No valid part numbers entered.", true);
            return;
        }

        showLoading(true);
        showBulkAddStatus("Processing...", false);

        try {
            const response = await fetch("/api/products/byManufacturerAndPartNumbers", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ manufacturer, partNumbers })
            });
            showLoading(false);
            const products = await response.json();
            if (!response.ok) {
                throw new Error(products.message || "Error fetching products for bulk add");
            }
            
            const actualProducts = Array.isArray(products) ? products : (products.data || []);
            if (actualProducts.length === 0) {
                showBulkAddStatus("No products found for the given criteria.", true);
                return;
            }
            actualProducts.forEach(product => {
                const itemData = {
                    productId: product._id,
                    itemNo: product.itemNo,
                    manufacturer: product.manufacturer,
                    description: product.description,
                    quantity: 1,
                    marginPercent: null,
                    basePriceUSDForMarginApplication: product.basePriceUSDForMarginApplication || product.basePrice || 0, 
                    isManual: false
                };
                addLineItemRow(itemData, false);
            });
            showBulkAddStatus(`${actualProducts.length} items added. Adjust quantities and margins as needed.`, false);
            bulkAddPartNumbersTextarea.value = "";

        } catch (error) {
            showLoading(false);
            showBulkAddStatus(`Error bulk adding items: ${error.message}`, true);
            console.error("DEBUG (v21): Error in handleBulkAddItems:", error);
        }
    }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        if (createOfferBtn) {
            createOfferBtn.addEventListener("click", () => showOfferForm());
        }
        if (cancelOfferBtn) {
            cancelOfferBtn.addEventListener("click", showOfferList);
        }
        if (offerForm) {
            offerForm.addEventListener("submit", saveOffer);
        }
        if (addItemBtn) {
            addItemBtn.addEventListener("click", () => addLineItemRow({}, true));
        }
        if (globalMarginInput) {
            globalMarginInput.addEventListener("change", recalculateAllPrices);
        }
        if (lineItemsBody) {
            lineItemsBody.addEventListener("click", (event) => {
                if (event.target.closest(".remove-item-btn")) {
                    event.target.closest("tr").remove();
                    recalculateAllPrices(); 
                }
            });
            lineItemsBody.addEventListener("change", (event) => {
                if (event.target.classList.contains("item-quantity") || event.target.classList.contains("item-margin-percent")) {
                    updateAndDisplayItemPrice(event.target.closest("tr"));
                }
            });
        }
        if (offerListContainer) {
            offerListContainer.addEventListener("click", (event) => {
                const targetButton = event.target.closest("button");
                if (!targetButton) return;

                const offerId = targetButton.dataset.id;
                if (targetButton.classList.contains("edit-offer-btn")) {
                    loadOfferForEditing(offerId);
                }
                if (targetButton.classList.contains("delete-offer-btn")) {
                    deleteOffer(offerId);
                }
                if (targetButton.classList.contains("pdf-offer-btn")) {
                    generateOfferOutput(offerId, "pdf");
                }
                if (targetButton.classList.contains("csv-offer-btn")) {
                    generateOfferOutput(offerId, "csv");
                }
            });
        }
        if (logoutButton) {
            logoutButton.addEventListener("click", () => {
                localStorage.removeItem("userInfo");
                window.location.href = "/login.html";
            });
        }
        if (bulkAddBtn) {
            bulkAddBtn.addEventListener("click", handleBulkAddItems);
        }
    }

    // --- Initial Page Load ---
    if (checkAuth()) {
        showOfferList();
        populateClientDropdown();
        populateManufacturerDropdown();
        setupEventListeners();
    } else {
        // Redirects in checkAuth
    }
});

