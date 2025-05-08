// /home/ubuntu/erp/public/offers.js (v17 - DEBUGGING for bulk add display)

document.addEventListener("DOMContentLoaded", () => {
    console.log("DEBUG (v17): DOMContentLoaded event fired");

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
    const addItemBtn = document.getElementById("add-item-btn");
    const generatePdfBtn = document.getElementById("generate-pdf-btn");
    const generateCsvBtn = document.getElementById("generate-csv-btn");
    const loadingIndicator = document.getElementById("loading-indicator");
    const errorMessage = document.getElementById("error-message");
    const logoutButton = document.getElementById("logout-button");
    const userNameDisplay = document.getElementById("user-name");

    const bulkAddManufacturerSelect = document.getElementById("bulk-add-manufacturer");
    const bulkAddPartNumbersTextarea = document.getElementById("bulk-add-part-numbers");
    const bulkAddBtn = document.getElementById("bulk-add-button");
    const bulkAddStatus = document.getElementById("bulk-add-status");

    let currentOfferId = null;

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

    function updateAndDisplayItemPrice(rowElement) {
        const isManual = rowElement.dataset.isManual === "true";
        if (isManual && !rowElement.querySelector(".item-number").value && !rowElement.querySelector(".item-description").value) {
            // Blank manual row, do nothing for price yet
        }

        const basePriceForMargin = parseFloat(rowElement.dataset.basePriceForMargin) || 0;
        const quantityInput = rowElement.querySelector(".item-quantity");
        const marginInput = rowElement.querySelector(".item-margin-percent");
        const unitPriceDisplay = rowElement.querySelector(".unit-price-display");
        const lineTotalDisplay = rowElement.querySelector(".line-total-display");

        const quantity = parseInt(quantityInput.value) || 0;
        let itemMarginPercent = marginInput.value.trim() !== "" ? parseFloat(marginInput.value) : null;
        
        let effectiveMarginPercent = 0;
        if (itemMarginPercent !== null && !isNaN(itemMarginPercent)) {
            effectiveMarginPercent = itemMarginPercent;
        } else {
            effectiveMarginPercent = parseFloat(globalMarginInput.value) || 0;
        }

        const unitPrice = basePriceForMargin * (1 + effectiveMarginPercent / 100);
        const lineTotal = unitPrice * quantity;

        if (unitPriceDisplay) unitPriceDisplay.textContent = unitPrice.toFixed(2);
        if (lineTotalDisplay) lineTotalDisplay.textContent = lineTotal.toFixed(2);
        console.log("DEBUG: updateAndDisplayItemPrice - Row: ", rowElement, "BasePrice: ", basePriceForMargin, "Qty: ", quantity, "Margin%: ", effectiveMarginPercent, "UnitPrice: ", unitPrice, "LineTotal: ", lineTotal);
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

    function setupEventListeners() {
        if (createOfferBtn) createOfferBtn.addEventListener("click", () => { currentOfferId = null; showOfferForm(); });
        if (offerForm) offerForm.addEventListener("submit", saveOffer);
        if (cancelOfferBtn) cancelOfferBtn.addEventListener("click", showOfferList);
        if (addItemBtn) addItemBtn.addEventListener("click", () => addLineItemRow(undefined, true));
        if (bulkAddBtn) bulkAddBtn.addEventListener("click", handleBulkAddItems);
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
            lineItemsBody.addEventListener("input", (e) => {
                if (e.target.classList.contains("item-quantity") || e.target.classList.contains("item-margin-percent")) {
                    const row = e.target.closest("tr");
                    if (row) updateAndDisplayItemPrice(row);
                }
            });
        }
        if (globalMarginInput) {
            globalMarginInput.addEventListener("input", recalculateAllPrices);
        }

        if (offerListContainer) {
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
    }

    async function loadOffers() {
        const token = getAuthToken();
        if (!token) { showError("Authentication error. Please log in again."); return; }
        if (!offerListContainer) return;
        offerListContainer.innerHTML = "";
        showError("");
        showLoading(true);
        try {
            const response = await fetch("/api/offers", { headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" } });
            showLoading(false);
            if (!response.ok) {
                let errorData = { message: `HTTP error! status: ${response.status}` };
                try { errorData = await response.json(); } catch (e) { /* ignore */ }
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const offers = await response.json();
            displayOffers(offers);
        } catch (error) {
            showLoading(false);
            showError(`Error fetching offers: ${error.message}. Please try again.`);
        }
    }

    function displayOffers(offers) {
        if (!offerListContainer) return;
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
        if (offerListSection) offerListSection.style.display = "none";
        if (offerFormSection) offerFormSection.style.display = "block";
        if (offerForm) offerForm.reset();
        if (lineItemsBody) lineItemsBody.innerHTML = "";
        
        currentOfferId = offerData ? offerData._id : null;
        if (offerIdDisplay) offerIdDisplay.textContent = currentOfferId ? `Editing Offer ID: ${offerData.offerId || "N/A"}` : "Creating New Offer";
        if (validityInput && offerData) validityInput.value = offerData.validityDate ? offerData.validityDate.split("T")[0] : "";
        if (termsInput && offerData) termsInput.value = offerData.terms || "";
        if (statusSelect && offerData) statusSelect.value = offerData.status || "Draft";
        if (globalMarginInput && offerData) globalMarginInput.value = offerData.globalMarginPercent !== undefined ? offerData.globalMarginPercent : "";
        else if (globalMarginInput) globalMarginInput.value = ""; 

        if (generatePdfBtn) generatePdfBtn.style.display = currentOfferId ? "inline-block" : "none";
        if (generateCsvBtn) generateCsvBtn.style.display = currentOfferId ? "inline-block" : "none";
        
        populateClientDropdown(offerData ? offerData.client : null);
        populateManufacturerDropdown(); 
        showError("");

        if (offerData && offerData.lineItems) {
            offerData.lineItems.forEach(item => {
                addLineItemRow(item, item.isManual === undefined ? false : item.isManual);
            });
        } else {
            // addLineItemRow(undefined, true); // Optionally add a blank manual row
        }
    }

    function showOfferList() {
        if (offerListSection) offerListSection.style.display = "block";
        if (offerFormSection) offerFormSection.style.display = "none";
        loadOffers();
    }

    async function populateClientDropdown(selectedClientRef = null) {
        const token = getAuthToken();
        if (!token || !clientSelect) return;
        clientSelect.innerHTML = "<option value=\"\">Select Client...</option>"; 
        try {
            const response = await fetch("/api/clients", { headers: { "Authorization": `Bearer ${token}` } });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const clients = await response.json();
            clients.forEach(client => {
                const option = document.createElement("option");
                option.value = client._id;
                const contactInfo = client.clientName || client.contactPerson || "N/A"; 
                option.textContent = `${client.companyName} (${contactInfo})`;
                const selectedClientId = selectedClientRef ? (selectedClientRef._id || selectedClientRef) : null;
                if (selectedClientId && client._id === selectedClientId) {
                    option.selected = true;
                }
                clientSelect.appendChild(option);
            });
        } catch (error) {
            showError("Could not load clients for dropdown.");
        }
    }

    async function populateManufacturerDropdown() {
        const token = getAuthToken();
        if (!token || !bulkAddManufacturerSelect) return;
        bulkAddManufacturerSelect.innerHTML = "<option value=\"\">Select Manufacturer...</option>";
        try {
            const response = await fetch("/api/products/manufacturers", { headers: { "Authorization": `Bearer ${token}` } });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const manufacturers = await response.json();
            manufacturers.forEach(manufacturer => {
                const option = document.createElement("option");
                option.value = manufacturer; 
                option.textContent = manufacturer;
                bulkAddManufacturerSelect.appendChild(option);
            });
        } catch (error) {
            showBulkAddStatus("Could not load manufacturers.", true);
        }
    }

    function addLineItemRow(itemData, isManualEntry = false) {
        console.log("DEBUG: addLineItemRow - Called with itemData:", JSON.parse(JSON.stringify(itemData || {})), "isManualEntry:", isManualEntry);
        if (!lineItemsBody) return;
        const row = lineItemsBody.insertRow();

        let productRef = {}; 
        let basePriceUSD = 0;
        let initialQuantity = 1;
        let initialMargin = 
            console.log("DEBUG: addLineItemRow - Initial productRef:", JSON.parse(JSON.stringify(productRef)));

        if (isManualEntry) {
            console.log("DEBUG: addLineItemRow - Manual Entry branch");
        } else if (itemData && itemData.data && typeof itemData.data === 'object') { 
            console.log("DEBUG: addLineItemRow - Bulk Add branch (itemData.data exists)");
            productRef = itemData.data; 
            basePriceUSD = productRef.basePriceUSDForMarginApplication || 0;
        } else if (itemData && itemData.productId && typeof itemData.productId === 'object') { 
            console.log("DEBUG: addLineItemRow - Editing Offer branch (itemData.productId is object)");
            productRef = itemData.productId;
            basePriceUSD = itemData.basePriceUSDForMarginApplication !== undefined ? itemData.basePriceUSDForMarginApplication : (productRef.basePriceUSDForMarginApplication || 0);
            initialQuantity = itemData.quantity || 1;
            initialMargin = itemData.marginPercent !== undefined && itemData.marginPercent !== null ? itemData.marginPercent.toString() : 
        } else if (itemData && typeof itemData === 'object' && !itemData.data && !itemData.productId) { 
             console.log("DEBUG: addLineItemRow - Fallback branch (itemData is object, no .data or .productId)");
             productRef = itemData;
             basePriceUSD = productRef.basePriceUSDForMarginApplication || 0;
        } else {
            console.log("DEBUG: addLineItemRow - No specific data branch matched, itemData:", JSON.parse(JSON.stringify(itemData || {})));
        }
        console.log("DEBUG: addLineItemRow - Final productRef before use:", JSON.parse(JSON.stringify(productRef)));
        console.log("DEBUG: addLineItemRow - BasePriceUSD determined:", basePriceUSD);

        row.dataset.isManual = isManualEntry.toString();
        row.dataset.basePriceForMargin = basePriceUSD.toString(); 
        row.dataset.productId = productRef._id || ""; 

        const itemNoValue = productRef.itemNo || 
        const manufacturerValue = productRef.manufacturer || 
        const descriptionValue = productRef.description || 
        console.log("DEBUG: addLineItemRow - Values for HTML - itemNo:", itemNoValue, "manufacturer:", manufacturerValue, "description:", descriptionValue);

        row.innerHTML = `
            <td><input type="text" class="form-control item-number" value="${itemNoValue}" ${isManualEntry ? "" : "readonly"}></td>
            <td><input type="text" class="form-control item-manufacturer" value="${manufacturerValue}" ${isManualEntry ? "" : "readonly"}></td>
            <td><input type="text" class="form-control item-description" value="${descriptionValue}" ${isManualEntry ? "" : "readonly"}></td>
            <td><input type="number" class="form-control item-quantity" value="${initialQuantity}" min="1"></td>
            <td><input type="number" step="0.01" class="form-control item-margin-percent" value="${initialMargin}" placeholder="Global"></td>
            <td><span class="unit-price-display">0.00</span></td>
            <td><span class="line-total-display">0.00</span></td>
            <td><button type="button" class="btn btn-danger btn-sm remove-item-btn"><i class="fas fa-trash-alt"></i></button></td>
        `;
        
        updateAndDisplayItemPrice(row);
    }

    async function saveOffer(event) {
        event.preventDefault();
        const token = getAuthToken();
        if (!token) { showError("Authentication error. Please log in again."); return; }

        const client = clientSelect.value;
        if (!client) {
            showError("Client is required.");
            return;
        }

        const lineItems = [];
        const rows = lineItemsBody.querySelectorAll("tr");
        if (rows.length === 0) {
            showError("At least one line item is required.");
            return;
        }
        let validItems = true;
        rows.forEach(row => {
            const isManual = row.dataset.isManual === "true";
            const productId = isManual ? null : row.dataset.productId;
            const itemNoInput = row.querySelector(".item-number");
            const descriptionInput = row.querySelector(".item-description");
            const quantityInput = row.querySelector(".item-quantity");
            
            const itemNo = itemNoInput.value;
            const description = descriptionInput.value;
            const quantity = parseInt(quantityInput.value);
            const marginPercent = row.querySelector(".item-margin-percent").value;

            if (!description || !quantity) {
                if(isManual && !itemNo && !description && !quantity) { return; }
                showError("Description and quantity are required for all non-blank items.");
                validItems = false;
                return; 
            }
            if (quantity <= 0) {
                showError("Quantity must be greater than 0 for all items.");
                validItems = false;
                return;
            }

            lineItems.push({
                productId: productId,
                itemNo: itemNo,
                description: description,
                quantity: quantity,
                marginPercent: marginPercent.trim() === "" ? null : parseFloat(marginPercent),
                isManual: isManual,
                basePriceUSDForMarginApplication: parseFloat(row.dataset.basePriceForMargin) || 0 
            });
        });

        if (!validItems) return; 
        if (lineItems.length === 0 && rows.length > 0) { 
             showError("At least one non-blank line item is required.");
             return;
        }

        const offerData = {
            client: client,
            validityDate: validityInput.value,
            terms: termsInput.value,
            status: statusSelect.value,
            globalMarginPercent: globalMarginInput.value.trim() === "" ? null : parseFloat(globalMarginInput.value),
            lineItems: lineItems,
        };

        const url = currentOfferId ? `/api/offers/${currentOfferId}` : "/api/offers";
        const method = currentOfferId ? "PUT" : "POST";

        showLoading(true);
        showError("");
        try {
            const response = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify(offerData),
            });
            showLoading(false);
            if (!response.ok) {
                let errorData = { message: `Server error: ${response.status}` };
                try { errorData = await response.json(); } catch (e) { /* ignore */ }
                throw new Error(errorData.message || `Server error: ${response.status}. Please check data.`);
            }
            const savedOffer = await response.json();
            alert("Offer saved successfully!");
            showOfferList();
        } catch (error) {
            showLoading(false);
            showError(`Error saving offer: ${error.message}. Please try again.`);
        }
    }

    async function loadOfferForEditing(id) {
        const token = getAuthToken();
        if (!token) { showError("Authentication error. Please log in again."); return; }
        showLoading(true);
        showError("");
        try {
            const response = await fetch(`/api/offers/${id}`, { headers: { "Authorization": `Bearer ${token}` } });
            showLoading(false);
            if (!response.ok) {
                let errorData = { message: `HTTP error! status: ${response.status}` };
                try { errorData = await response.json(); } catch (e) { /* ignore */ }
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const offer = await response.json();
            showOfferForm(offer);
        } catch (error) {
            showLoading(false);
            showError(`Error loading offer: ${error.message}. Please try again.`);
        }
    }

    async function deleteOffer(id) {
        const token = getAuthToken();
        if (!token) { showError("Authentication error. Please log in again."); return; }
        showLoading(true);
        showError("");
        try {
            const response = await fetch(`/api/offers/${id}`, { 
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            showLoading(false);
            if (!response.ok) {
                let errorData = { message: `HTTP error! status: ${response.status}` };
                try { errorData = await response.json(); } catch (e) { /* ignore */ }
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            alert("Offer deleted successfully!");
            loadOffers(); 
        } catch (error) {
            showLoading(false);
            showError(`Error deleting offer: ${error.message}. Please try again.`);
        }
    }

    async function handleBulkAddItems() {
        const token = getAuthToken();
        if (!token) { showError("Authentication error. Please log in again."); return; }
        const manufacturer = bulkAddManufacturerSelect.value;
        const partNumbers = bulkAddPartNumbersTextarea.value.split(/[\n,]+/).map(pn => pn.trim()).filter(pn => pn);

        if (!manufacturer) {
            showBulkAddStatus("Please select a manufacturer.", true);
            return;
        }
        if (partNumbers.length === 0) {
            showBulkAddStatus("Please enter at least one part number.", true);
            return;
        }
        console.log("DEBUG: handleBulkAddItems - Manufacturer:", manufacturer, "PartNumbers:", partNumbers);

        showLoading(true);
        showBulkAddStatus("Looking up products...");
        try {
            const response = await fetch("/api/products/bulk-lookup", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ manufacturer, partNumbers }),
            });
            showLoading(false);
            if (!response.ok) {
                let errorData = { message: `Server error: ${response.status}` };
                try { errorData = await response.json(); } catch (e) { /* ignore */ }
                throw new Error(errorData.message || `Server error: ${response.status}`);
            }
            const products = await response.json();
            console.log("DEBUG: handleBulkAddItems - Products received from backend:", JSON.parse(JSON.stringify(products)));
            if (products.length === 0) {
                showBulkAddStatus("No products found for the given criteria.", true);
            } else {
                products.forEach(product => {
                    console.log("DEBUG: handleBulkAddItems - Calling addLineItemRow for product:", JSON.parse(JSON.stringify(product)));
                    addLineItemRow({ data: product }, false);
                }); 
                showBulkAddStatus(`Added ${products.length} products.`, false);
            }
        } catch (error) {
            showLoading(false);
            showBulkAddStatus(`Error adding bulk items: ${error.message}`, true);
            console.error("DEBUG: handleBulkAddItems - Error:", error);
        }
    }

    async function generateOfferOutput(offerId, format) {
        const token = getAuthToken();
        if (!token) { showError("Authentication error. Please log in again."); return; }
        showLoading(true);
        showError("");
        try {
            const response = await fetch(`/api/offers/${offerId}/${format}`, { 
                headers: { "Authorization": `Bearer ${token}` }
            });
            showLoading(false);
            if (!response.ok) {
                let errorText = `Error generating ${format.toUpperCase()}: ${response.status}`;
                try {
                    const errorBlob = await response.blob();
                    if (errorBlob.type === "text/html" || errorBlob.type === "application/json") {
                        errorText = await errorBlob.text(); 
                    }
                } catch (e) { /* ignore */ }
                throw new Error(errorText);
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
            showLoading(false);
            showError(`Error generating ${format.toUpperCase()}: ${error.message}. Please try again.`);
        }
    }

    function initApp() {
        if (!checkAuth()) return;
        setupEventListeners();
        showOfferList();
    }

    initApp();

});

