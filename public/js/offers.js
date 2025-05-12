document.addEventListener("DOMContentLoaded", () => {
    console.log("DEBUG (v18-forEachFix): DOMContentLoaded event fired");

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

        if (isManual &&
            !rowElement.querySelector(".item-number").value.trim() &&
            !rowElement.querySelector(".item-description").value.trim()) {
            return;
        }

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

        console.log("DEBUG (v18-forEachFix): updateAndDisplayItemPrice - Row:", rowElement,
            "BasePrice:", basePriceForMargin,
            "Qty:", quantity,
            "Margin%:", effectiveMarginPercent,
            "UnitPrice:", unitPrice.toFixed(2),
            "LineTotal:", lineTotal.toFixed(2));
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
        if (createOfferBtn) createOfferBtn.addEventListener("click", () => {
            currentOfferId = null;
            showOfferForm();
        });

        if (offerForm) offerForm.addEventListener("submit", saveOffer);
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
                try {
                    errorData = await response.json();
                } catch {}
                throw new Error(errorData.message || `Server error: ${response.status}`);
            }

            const responseData = await response.json(); // Changed variable name to avoid confusion
            console.log("DEBUG (v18-forEachFix): Raw response from /api/offers:", responseData);
            displayOffers(responseData);
        } catch (error) {
            showLoading(false);
            showError(`Error fetching offers: ${error.message}. Please try again.`);
            console.error("DEBUG (v18-forEachFix): Error in loadOffers:", error);
        }
    }

    function displayOffers(responseData) { // Changed parameter name
        if (!offerListContainer) return;
        offerListContainer.innerHTML = "";

        let offersToDisplay = [];
        if (Array.isArray(responseData)) {
            offersToDisplay = responseData;
        } else if (responseData && Array.isArray(responseData.data)) { // Check for common nesting like { data: [...] }
            offersToDisplay = responseData.data;
            console.log("DEBUG (v18-forEachFix): Used responseData.data as offers array");
        } else if (responseData && Array.isArray(responseData.offers)) { // Check for common nesting like { offers: [...] }
            offersToDisplay = responseData.offers;
            console.log("DEBUG (v18-forEachFix): Used responseData.offers as offers array");
        } else {
            console.error("DEBUG (v18-forEachFix): Received data is not an array and no known nested array found. Data:", responseData);
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
            const clientCompany = offer.client ? offer.client.companyName : "N/A";
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

        if (offerIdDisplay)
            offerIdDisplay.textContent = currentOfferId ?
                `Editing Offer ID: ${offerData.offerId || "N/A"}` : "Creating New Offer";

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
            const response = await fetch("/api/products/manufacturers", {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const manufacturers = await response.json();
            manufacturers.sort().forEach(manufacturer => {
                const option = document.createElement("option");
                option.value = manufacturer;
                option.textContent = manufacturer;
                bulkAddManufacturerSelect.appendChild(option);
            });
        } catch (error) {
            showBulkAddStatus("Could not load manufacturers.", true);
        }
    }

    // The rest of the file was truncated in the input, so I cannot reproduce it here.
    // Assuming addLineItemRow, saveOffer, handleBulkAddItems, generateOfferOutput, deleteOffer, loadOfferForEditing etc. were here.
    // It's crucial that the user provides the complete file if further issues exist in those functions.

    // --- Initialization ---
    if (checkAuth()) {
        showOfferList();
        setupEventListeners();
    } else {
        showError("Authentication failed. Please login.");
    }
});

