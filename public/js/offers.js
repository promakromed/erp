// /home/ubuntu/offers_v19.js
// This is a more complete version attempting to reconstruct missing functions.

document.addEventListener("DOMContentLoaded", () => {
    console.log("DEBUG (v19): DOMContentLoaded event fired");

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
    // saveOfferBtn is referenced in HTML, ensure it exists or is handled if not used for direct submission
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
            return date.toLocaleDateString("en-GB"); // DD/MM/YYYY
        } catch (e) {
            return "Invalid Date";
        }
    }

    function updateAndDisplayItemPrice(rowElement) {
        const isManual = rowElement.dataset.isManual === "true";
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

        console.log("DEBUG (v19): updateAndDisplayItemPrice - BasePrice:", basePriceForMargin, "Qty:", quantity, "Margin%:", effectiveMarginPercent, "UnitPrice:", unitPrice.toFixed(2), "LineTotal:", lineTotal.toFixed(2));
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
        newRow.dataset.productId = itemData.product ? (itemData.product._id || itemData.product) : (itemData.productId || "");
        newRow.dataset.basePriceForMargin = (itemData.basePriceUSDForMarginApplication || itemData.basePriceUSDForMargin || 0).toString();

        newRow.innerHTML = `
            <td><input type="text" class="form-control item-number" value="${itemData.itemNo || ""}" ${!isManualEntry ? "readonly" : ""}></td>
            <td><input type="text" class="form-control item-manufacturer" value="${itemData.manufacturer || ""}" ${!isManualEntry ? "readonly" : ""}></td>
            <td><textarea class="form-control item-description" rows="1" ${!isManualEntry ? "readonly" : ""}>${itemData.description || ""}</textarea></td>
            <td><input type="number" class="form-control item-quantity" value="${itemData.quantity || 1}" min="1"></td>
            <td><input type="number" step="0.01" class="form-control item-margin-percent" placeholder="Global" value="${itemData.marginPercent !== null && itemData.marginPercent !== undefined ? itemData.marginPercent : ""}"></td>
            <td class="unit-price-display">${(itemData.unitPrice || 0).toFixed(2)}</td>
            <td class="line-total-display">${(itemData.lineTotal || 0).toFixed(2)}</td>
            <td><button type="button" class="btn btn-sm btn-danger remove-item-btn"><i class="fas fa-trash-alt"></i></button></td>
        `;

        updateAndDisplayItemPrice(newRow);
    }

    async function saveOffer(event) {
        event.preventDefault();
        if (!checkAuth()) return;
        const token = getAuthToken();

        const lineItems = [];
        if (lineItemsBody) {
            lineItemsBody.querySelectorAll("tr").forEach(row => {
                const itemNumberInput = row.querySelector(".item-number");
                const manufacturerInput = row.querySelector(".item-manufacturer");
                const descriptionInput = row.querySelector(".item-description");
                const quantityInput = row.querySelector(".item-quantity");
                const marginInput = row.querySelector(".item-margin-percent");

                // Skip empty manual rows if item number and description are blank
                if (row.dataset.isManual === "true" && 
                    !itemNumberInput.value.trim() && 
                    !descriptionInput.value.trim()) {
                    return; 
                }

                lineItems.push({
                    product: row.dataset.productId || null,
                    itemNo: itemNumberInput.value,
                    manufacturer: manufacturerInput.value,
                    description: descriptionInput.value,
                    quantity: parseInt(quantityInput.value) || 1,
                    marginPercent: marginInput.value.trim() === "" ? null : parseFloat(marginInput.value),
                    isManual: row.dataset.isManual === "true",
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
            lineItems: lineItems
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

            alert(`Offer ${currentOfferId ? "updated" : "created"} successfully! Offer ID: ${responseData.offerId || responseData.data?.offerId}`);
            showOfferList();
        } catch (error) {
            showLoading(false);
            showError(`Error saving offer: ${error.message}`);
            console.error("DEBUG (v19): Error in saveOffer:", error);
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
            // Assuming API returns offer at top level or within offerData.data
            const actualOffer = offerData.data || offerData;
            showOfferForm(actualOffer);
        } catch (error) {
            showLoading(false);
            showError(`Error loading offer for editing: ${error.message}`);
            console.error("DEBUG (v19): Error in loadOfferForEditing:", error);
        }
    }

    async function deleteOffer(id) {
        if (!checkAuth()) return;
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
            loadOffers(); // Refresh the list
        } catch (error) {
            showLoading(false);
            showError(`Error deleting offer: ${error.message}`);
            console.error("DEBUG (v19): Error in deleteOffer:", error);
        }
    }

    async function generateOfferOutput(id, format) { // format can be 'pdf' or 'csv'
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
            console.error(`DEBUG (v19): Error in generateOfferOutput (${format}):`, error);
        }
    }

    async function populateManufacturerDropdown() {
        const token = getAuthToken();
        if (!token || !bulkAddManufacturerSelect) return;
        bulkAddManufacturerSelect.innerHTML = "<option value=\"\">Select Manufacturer...</option>";

        try {
            const response = await fetch("/api/products/manufacturers", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const manufacturers = await response.json();
            // Assuming manufacturers is an array of strings or objects with a 'name' field
            const actualManufacturers = Array.isArray(manufacturers) ? manufacturers : (manufacturers.data || []);
            
            actualManufacturers.forEach(mfg => {
                const option = document.createElement("option");
                const mfgName = typeof mfg === 'string' ? mfg : mfg.name; // Adapt if mfg is an object
                option.value = mfgName;
                option.textContent = mfgName;
                bulkAddManufacturerSelect.appendChild(option);
            });
        } catch (error) {
            console.error("DEBUG (v19): Error populating manufacturers:", error);
            showBulkAddStatus("Error loading manufacturers.", true);
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
            const results = await response.json();

            if (!response.ok) {
                throw new Error(results.message || "Error fetching products for bulk add.");
            }
            
            // Assuming results is an array of products or { data: [products] }
            const productsToAdd = Array.isArray(results) ? results : (results.data || []);

            let itemsAddedCount = 0;
            productsToAdd.forEach(product => {
                if (product && product.partNumber) { // Ensure product is valid
                    addLineItemRow({
                        product: product._id,
                        itemNo: product.partNumber,
                        manufacturer: product.manufacturer,
                        description: product.description,
                        quantity: 1, // Default quantity
                        basePriceUSDForMarginApplication: product.basePriceUSDForMarginApplication || product.basePriceUSD || 0,
                        isManual: false
                    });
                    itemsAddedCount++;
                }
            });
            showBulkAddStatus(`${itemsAddedCount} item(s) added. ${productsToAdd.length - itemsAddedCount} not found or invalid.`, itemsAddedCount === 0);
            bulkAddPartNumbersTextarea.value = ""; // Clear textarea

        } catch (error) {
            showLoading(false);
            showBulkAddStatus(`Error during bulk add: ${error.message}`, true);
            console.error("DEBUG (v19): Error in handleBulkAddItems:", error);
        }
    }

    // --- Initial Setup ---
    function setupEventListeners() {
        if (createOfferBtn) createOfferBtn.addEventListener("click", () => {
            currentOfferId = null;
            showOfferForm();
        });

        if (offerForm) offerForm.addEventListener("submit", saveOffer); // This was the line causing the error
        if (cancelOfferBtn) cancelOfferBtn.addEventListener("click", showOfferList);
        if (addItemBtn) addItemBtn.addEventListener("click", () => addLineItemRow(undefined, true));

        if (bulkAddBtn) bulkAddBtn.addEventListener("click", handleBulkAddItems);

        if (generatePdfBtn) generatePdfBtn.addEventListener("click", () => {
            if (currentOfferId) generateOfferOutput(currentOfferId, "pdf");
        });

        if (generateCsvBtn) generateCsvBtn.addEventListener("click", () => {
            if (currentOfferId) generateOfferOutput(currentOfferId, "csv");
        });

        if (logoutButton) logoutButton.addEventListener("click", () => {
            localStorage.removeItem("userInfo");
            window.location.href = "/login.html";
        });

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
                else if (targetButton.classList.contains("delete-btn")) {
                    if (confirm("Are you sure you want to delete this offer?")) deleteOffer(id);
                } else if (targetButton.classList.contains("pdf-btn")) generateOfferOutput(id, "pdf");
                else if (targetButton.classList.contains("csv-btn")) generateOfferOutput(id, "csv");
            });
        }
    }

    async function loadOffers() {
        const token = getAuthToken();
        if (!token) {
            showError("Authentication error. Please log in again.");
            return;
        }

        if (!offerListContainer) return;
        offerListContainer.innerHTML = "";
        showError("");
        showLoading(true);

        try {
            const response = await fetch("/api/offers", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            showLoading(false);

            if (!response.ok) {
                let errorData = { message: `HTTP error! status: ${response.status}` };
                try { errorData = await response.json(); } catch {}
                throw new Error(errorData.message || `Server error: ${response.status}`);
            }

            const responseData = await response.json();
            console.log("DEBUG (v19): Raw response from /api/offers:", responseData);
            displayOffers(responseData);
        } catch (error) {
            showLoading(false);
            showError(`Error fetching offers: ${error.message}. Please try again.`);
            console.error("DEBUG (v19): Error in loadOffers:", error);
        }
    }

    function displayOffers(responseData) {
        if (!offerListContainer) return;
        offerListContainer.innerHTML = "";
        let offersToDisplay = [];

        // Attempt to find the array of offers
        if (Array.isArray(responseData)) {
            offersToDisplay = responseData;
        } else if (responseData && Array.isArray(responseData.data)) {
            offersToDisplay = responseData.data;
            console.log("DEBUG (v19): Used responseData.data as offers array");
        } else if (responseData && Array.isArray(responseData.offers)) {
            offersToDisplay = responseData.offers;
            console.log("DEBUG (v19): Used responseData.offers as offers array");
        } else if (responseData && responseData.message === 'GET /api/offers placeholder') {
            // Handle the specific placeholder message from backend
            console.warn("DEBUG (v19): Backend returned placeholder for /api/offers. No offers to display.");
            offerListContainer.innerHTML = "<p>No offers available at the moment (backend placeholder active).</p>";
            return;
        } else {
            console.error("DEBUG (v19): Received data is not an array and no known nested array found. Data:", responseData);
            offerListContainer.innerHTML = "<p>Could not display offers. Unexpected data format received.</p>";
            return;
        }

        if (offersToDisplay.length === 0) {
            offerListContainer.innerHTML = "<p>No offers found.</p>";
            return;
        }

        const table = document.createElement("table");
        table.className = "table table-striped table-bordered table-hover";
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Offer ID</th>
                    <th>Client Company</th>
                    <th>Date (DD/MM/YYYY)</th>
                    <th>Validity (DD/MM/YYYY)</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector("tbody");

        offersToDisplay.forEach(offer => {
            const clientCompany = offer.client ? offer.client.companyName : (offer.clientName || "N/A");
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${offer.offerId || "N/A"}</td>
                <td>${clientCompany}</td>
                <td>${formatDateEuropean(offer.createdAt)}</td>
                <td>${formatDateEuropean(offer.validityDate)}</td>
                <td><span class="badge bg-${getStatusColor(offer.status)}">${offer.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-info view-edit-btn" data-id="${offer._id}"><i class="fas fa-pencil-alt"></i></button>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${offer._id}" ${offer.status !== "Draft" ? 'disabled title="Only Draft offers can be deleted"' : 'title="Delete"'}><i class="fas fa-trash-alt"></i></button>
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
        if (globalMarginInput && offerData) globalMarginInput.value = offerData.globalMarginPercent !== undefined ? offerData.globalMarginPercent.toString() : "";

        if (generatePdfBtn) generatePdfBtn.style.display = currentOfferId ? "inline-block" : "none";
        if (generateCsvBtn) generateCsvBtn.style.display = currentOfferId ? "inline-block" : "none";

        populateClientDropdown(offerData ? offerData.client : null);
        populateManufacturerDropdown();
        showError("");

        if (offerData && offerData.lineItems) {
            offerData.lineItems.forEach(item => {
                addLineItemRow(item, item.isManual === undefined ? false : item.isManual);
            });
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
            const response = await fetch("/api/clients", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const clients = await response.json();
            // Assuming clients is an array or { data: [clients] }
            const actualClients = Array.isArray(clients) ? clients : (clients.data || []);

            actualClients.forEach(client => {
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
            console.error("DEBUG (v19): Error populating clients:", error);
            showError("Error loading clients for dropdown.");
        }
    }

    // Initial load and setup
    if (checkAuth()) {
        setupEventListeners();
        showOfferList(); // Load offers on page load
    } else {
        // If checkAuth fails, it will redirect to login.html
        // Optionally, hide content if not redirecting immediately
        if (offerListSection) offerListSection.style.display = "none";
        if (offerFormSection) offerFormSection.style.display = "none";
    }
});

