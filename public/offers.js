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
    // const addProductBtn = document.getElementById("add-product-btn"); // OLD DB add button - REMOVED
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
    const bulkAddError = document.getElementById("bulk-add-error");
    const bulkAddLoading = document.getElementById("bulk-add-loading");

    // OLD Product Search Modal Elements (Keep refs for now, might remove later)
    const productSearchModal = document.getElementById("product-search-modal");
    const productSearchInput = document.getElementById("product-search-input");
    const productSearchButton = document.getElementById("product-search-button");
    const productSearchResultsBody = document.getElementById("product-search-results");
    const productSearchLoading = document.getElementById("product-search-loading");
    const productSearchError = document.getElementById("product-search-error");

    let currentOfferId = null; // To keep track of the offer being edited
    // let productSearchModalInstance = null; // OLD modal instance

    // --- Utility Functions ---
    function checkAuth() {
        console.log("DEBUG: checkAuth function called");
        const userInfo = JSON.parse(localStorage.getItem("userInfo"));
        console.log("DEBUG: localStorage content:", localStorage);
        console.log("DEBUG: Retrieved userInfo:", userInfo);

        if (!userInfo || !userInfo.token) {
            console.error("DEBUG: Token not found in userInfo. Redirecting to login.");
            alert("Authentication token not found. Please log in again.");
            window.location.href = "/login.html";
            return false;
        } else {
            console.log("DEBUG: Token found in userInfo.");
            if (userNameDisplay) {
                userNameDisplay.textContent = userInfo.name || "User";
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

    function showError(message, element = errorMessage) {
        console.log(`DEBUG: showError called with message: ${message}`);
        if (element) {
            element.textContent = message;
            element.style.display = message ? "block" : "none";
        }
    }

    function showBulkAddLoading(show) {
        if (bulkAddLoading) {
            bulkAddLoading.style.display = show ? "inline-block" : "none";
        }
    }

    function showBulkAddError(message) {
        showError(message, bulkAddError);
    }

    function formatDateEuropean(dateString) {
        if (!dateString) return "N/A";
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return "Invalid Date";
            }
            return date.toLocaleDateString("en-GB");
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return "Invalid Date";
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

        if (offerForm) {
            offerForm.addEventListener("submit", saveOffer);
        } else {
            console.error("DEBUG: Could not find offer-form");
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
                addLineItemRow(); // Add manual row
            });
        } else {
            console.error("DEBUG: Could not find add-item-btn");
        }

        // NEW Bulk Add Listener
        if (bulkAddBtn) {
            bulkAddBtn.addEventListener("click", handleBulkAddItems);
        } else {
            console.error("DEBUG: Could not find bulk-add-btn");
        }

        // OLD Product Search Modal Listeners (Commented out for now)
        /*
        if (productSearchButton) {
            productSearchButton.addEventListener("click", handleProductSearch);
        } else {
            console.error("DEBUG: Could not find product-search-button");
        }
        if (productSearchInput) {
            productSearchInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    handleProductSearch();
                }
            });
        } else {
            console.error("DEBUG: Could not find product-search-input");
        }
        if (productSearchResultsBody) {
            productSearchResultsBody.addEventListener("click", (e) => {
                if (e.target.classList.contains("select-product-btn")) {
                    const productData = JSON.parse(e.target.getAttribute("data-product"));
                    addProductLineItem(productData);
                    if (productSearchModalInstance) {
                        productSearchModalInstance.hide();
                    }
                }
            });
        } else {
            console.error("DEBUG: Could not find product-search-results");
        }
        if (productSearchModal) {
            productSearchModalInstance = new bootstrap.Modal(productSearchModal);
            productSearchModal.addEventListener("hidden.bs.modal", () => {
                if (productSearchInput) productSearchInput.value = "";
                if (productSearchResultsBody) productSearchResultsBody.innerHTML = "";
                if (productSearchError) productSearchError.style.display = "none";
            });
        } else {
            console.error("DEBUG: Could not find product-search-modal");
        }
        */

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

        if (lineItemsBody) {
            lineItemsBody.addEventListener("click", (e) => {
                if (e.target.closest(".remove-item-btn")) {
                    const row = e.target.closest("tr");
                    if (row) {
                        console.log("DEBUG: Remove item button clicked");
                        row.remove();
                        // Add logic to recalculate totals if needed
                    }
                }
            });
            // Add listener for pricing method change
            lineItemsBody.addEventListener("change", (e) => {
                if (e.target.classList.contains("pricing-method")) {
                    console.log("DEBUG: Pricing method changed");
                    const row = e.target.closest("tr");
                    const marginInput = row.querySelector(".margin-percent");
                    if (marginInput) {
                        marginInput.disabled = e.target.value !== "Margin";
                        if (marginInput.disabled) {
                            marginInput.value = ""; // Clear margin if Price List selected
                        }
                    }
                }
            });
        } else {
            console.error("DEBUG: Could not find line-items-body");
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
        offerListContainer.innerHTML = "";
        showError("");
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
                    <th>Offer ID</th>
                    <th>Client Company</th>
                    <th>Date (DD/MM/YYYY)</th>
                    <th>Validity (DD/MM/YYYY)</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;
        const tbody = table.querySelector("tbody");
        offers.forEach(offer => {
            const clientCompany = offer.client ? offer.client.companyName : "N/A";
            const tr = document.createElement("tr");
            const offerDateFormatted = formatDateEuropean(offer.createdAt);
            const validityDateFormatted = formatDateEuropean(offer.validityDate);
            tr.innerHTML = `
                <td>${offer.offerId || "N/A"}</td>
                <td>${clientCompany}</td>
                <td>${offerDateFormatted}</td>
                <td>${validityDateFormatted}</td>
                <td><span class="badge bg-${getStatusColor(offer.status)}">${offer.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-info view-edit-btn" data-id="${offer._id}" title="View/Edit"><i class="fas fa-pencil-alt"></i></button>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${offer._id}" ${offer.status !== "Draft" ? "disabled title=\'Only Draft offers can be deleted\'" : "title=\'Delete\'"}><i class="fas fa-trash-alt"></i></button>
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

    function showOfferForm() {
        console.log("DEBUG: showOfferForm function called");
        if (offerListSection) offerListSection.style.display = "none";
        if (offerFormSection) offerFormSection.style.display = "block";
        if (offerForm) offerForm.reset();
        if (lineItemsBody) lineItemsBody.innerHTML = "";
        if (offerIdDisplay) offerIdDisplay.textContent = "New Offer";
        if (generatePdfBtn) generatePdfBtn.style.display = "none";
        if (generateCsvBtn) generateCsvBtn.style.display = "none";
        currentOfferId = null;
        populateClientDropdown();
        populateManufacturerDropdown(); // NEW: Populate manufacturer dropdown
    }

    function showOfferList() {
        console.log("DEBUG: showOfferList function called");
        if (offerFormSection) offerFormSection.style.display = "none";
        if (offerListSection) offerListSection.style.display = "block";
        loadOffers();
    }

    async function populateClientDropdown() {
        console.log("DEBUG: populateClientDropdown function called");
        const token = getAuthToken();
        if (!token || !clientSelect) return;
        clientSelect.innerHTML = 	"<option value=\"\">Loading Clients...</option>";
        try {
            const response = await fetch("/api/clients", {
                headers: { "Authorization": `Bearer ${token}` },
            });
            if (!response.ok) throw new Error("Failed to fetch clients");
            const clients = await response.json();
            clientSelect.innerHTML = "<option value=\"\">Select Client...</option>";
            clients.forEach(client => {
                const option = document.createElement("option");
                option.value = client._id;
                option.textContent = `${client.companyName || client.clientName || "Unknown Client"} (ID: ${client._id.slice(-6)})`;
                clientSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Error populating client dropdown:", error);
            clientSelect.innerHTML = "<option value=\"\">Error loading clients</option>";
            showError("Error loading clients for dropdown. Please try again.");
        }
    }

    // NEW: Populate Manufacturer Dropdown
    async function populateManufacturerDropdown() {
        console.log("DEBUG: populateManufacturerDropdown function called");
        const token = getAuthToken();
        if (!token || !bulkAddManufacturerSelect) {
            console.error("DEBUG: Token or manufacturer select element not found");
            return;
        }
        bulkAddManufacturerSelect.innerHTML = "<option value=\"\">Loading Manufacturers...</option>";
        try {
            const response = await fetch("/api/products/manufacturers", {
                headers: { "Authorization": `Bearer ${token}` },
            });
            if (!response.ok) throw new Error("Failed to fetch manufacturers");
            const manufacturers = await response.json();
            bulkAddManufacturerSelect.innerHTML = "<option value=\"\">Select Manufacturer...</option>";
            manufacturers.forEach(manufacturer => {
                const option = document.createElement("option");
                option.value = manufacturer;
                option.textContent = manufacturer;
                bulkAddManufacturerSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Error populating manufacturer dropdown:", error);
            bulkAddManufacturerSelect.innerHTML = "<option value=\"\">Error loading manufacturers</option>";
            showError("Error loading manufacturers for dropdown. Please try again.");
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
        if (!clientSelect || !validityInput || !termsInput || !statusSelect || !globalMarginInput || !lineItemsBody) {
            console.error("DEBUG: One or more form elements not found in saveOffer");
            showError("Form error. Please refresh the page.");
            return;
        }

        const lineItemsData = [];
        const rows = lineItemsBody.querySelectorAll("tr");
        let formIsValid = true;

        rows.forEach((row, index) => {
            console.log(`DEBUG: Processing row ${index + 1}`);
            const itemType = row.dataset.itemType;
            const quantityInput = row.querySelector(".quantity");
            const quantity = parseInt(quantityInput?.value, 10) || 0;

            if (quantity <= 0) {
                showError(`Invalid quantity for item ${index + 1}. Must be greater than 0.`);
                quantityInput?.classList.add("is-invalid");
                formIsValid = false;
                return;
            } else {
                 quantityInput?.classList.remove("is-invalid");
            }

            const item = {
                itemType: itemType,
                quantity: quantity,
            };

            if (itemType === "database") {
                console.log(`DEBUG: Row ${index + 1} is database type`);
                item.productId = row.dataset.productId;
                item.itemNo = row.querySelector(".item-no")?.textContent; // Get from text content
                item.description = row.querySelector(".description")?.textContent; // Get from text content
                item.manufacturer = row.querySelector(".manufacturer")?.textContent; // Get from text content
                item.pricingMethod = row.querySelector(".pricing-method")?.value;
                item.marginPercent = null;
                console.log(`DEBUG: Row ${index + 1} pricing method: ${item.pricingMethod}`);

                if (item.pricingMethod === "Margin") {
                    const marginInput = row.querySelector(".margin-percent");
                    const marginValue = parseFloat(marginInput?.value);
                    console.log(`DEBUG: Row ${index + 1} margin input value: ${marginInput?.value}, parsed: ${marginValue}`);
                    if (!isNaN(marginValue) && marginValue >= 0) {
                        item.marginPercent = marginValue;
                    } else if (marginInput?.value.trim() !== "") {
                        showError(`Invalid margin percentage for item ${index + 1}. Must be a non-negative number.`);
                        marginInput?.classList.add("is-invalid");
                        formIsValid = false;
                        return;
                    } else {
                        marginInput?.classList.remove("is-invalid");
                        // If margin method selected but no value, use global margin (handled backend? or here?)
                        // For now, send null if per-item margin is not validly entered.
                    }
                }
                // Send base price/currency for backend calculation/validation
                item.basePrice = parseFloat(row.dataset.basePrice) || 0;
                item.baseCurrency = row.dataset.baseCurrency || "USD";
                console.log(`DEBUG: Row ${index + 1} database item data:`, item);
            } else { // Manual
                console.log(`DEBUG: Row ${index + 1} is manual type`);
                const itemNoInput = row.querySelector(".item-no");
                const descriptionInput = row.querySelector(".description");
                item.itemNo = itemNoInput?.value.trim();
                item.description = descriptionInput?.value.trim();
                if (!item.description) {
                     showError(`Description is required for manual item ${index + 1}.`);
                     descriptionInput?.classList.add("is-invalid");
                     formIsValid = false;
                     return;
                } else {
                    descriptionInput?.classList.remove("is-invalid");
                }
                console.log(`DEBUG: Row ${index + 1} manual item data:`, item);
            }
            lineItemsData.push(item);
        });

        if (!formIsValid) {
            console.error("DEBUG: Form validation failed.");
            return;
        }

        const globalMarginValue = parseFloat(globalMarginInput.value);
        const offerData = {
            clientId: clientSelect.value,
            validityDate: validityInput.value,
            terms: termsInput.value,
            status: statusSelect.value || "Draft",
            globalMarginPercent: (!isNaN(globalMarginValue) && globalMarginValue >= 0) ? globalMarginValue : null,
            lineItems: lineItemsData,
        };

        console.log("DEBUG: Saving offer data:", JSON.stringify(offerData, null, 2));

        const url = currentOfferId ? `/api/offers/${currentOfferId}` : "/api/offers";
        const method = currentOfferId ? "PUT" : "POST";

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
                let errorMsg = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.message || JSON.stringify(errorData);
                } catch (e) {
                    errorMsg = await response.text();
                    if (errorMsg.toLowerCase().includes("<!doctype html")) {
                        errorMsg = "Server returned an HTML error page. Check server logs.";
                    }
                }
                throw new Error(errorMsg);
            }
            const savedOffer = await response.json();
            console.log("DEBUG: Offer saved successfully:", savedOffer);
            showOfferList();
        } catch (error) {
            console.error("Error saving offer:", error);
            showLoading(false);
            let displayError = `Error saving offer: ${error.message}. Please try again.`;
            if (error.message.includes("<")) {
                displayError = "Error saving offer: Server returned an unexpected response. Please check server logs or contact support.";
            }
            showError(displayError);
        }
    }

    async function loadOfferForEditing(id) {
        console.log(`DEBUG: loadOfferForEditing called for ID: ${id}`);
        const token = getAuthToken();
        if (!token) {
            showError("Authentication error. Please log in again.");
            return;
        }
        showLoading(true);
        showError("");
        try {
            const response = await fetch(`/api/offers/${id}`, {
                headers: { "Authorization": `Bearer ${token}` },
            });
            showLoading(false);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const offer = await response.json();
            console.log("DEBUG: Fetched offer for editing:", offer);

            if (offerForm) offerForm.reset();
            if (clientSelect) clientSelect.value = offer.client?._id || "";
            if (validityInput) validityInput.value = offer.validityDate ? offer.validityDate.split("T")[0] : "";
            if (termsInput) termsInput.value = offer.terms || "";
            if (statusSelect) statusSelect.value = offer.status || "Draft";
            if (globalMarginInput) globalMarginInput.value = offer.globalMarginPercent ?? "";
            if (offerIdDisplay) offerIdDisplay.textContent = `Editing Offer: ${offer.offerId}`;

            if (lineItemsBody) {
                lineItemsBody.innerHTML = "";
                offer.lineItems.forEach(item => {
                    console.log(`DEBUG: Loading line item for editing:`, item);
                    if (item.itemType === "database") {
                        const productData = {
                            _id: item.productId,
                            itemNo: item.itemNo,
                            description: item.description,
                            manufacturer: item.manufacturer,
                            basePrice: item.basePrice,
                            baseCurrency: item.baseCurrency
                        };
                        // Pass pricing method and margin used when saving
                        addDatabaseLineItem(productData, item.quantity, item.pricingMethod, item.marginPercent);
                    } else {
                        addLineItemRow(item.itemNo, item.description, item.quantity);
                    }
                });
            }

            currentOfferId = offer._id;
            if (generatePdfBtn) generatePdfBtn.style.display = "inline-block";
            if (generateCsvBtn) generateCsvBtn.style.display = "inline-block";
            showOfferForm();
            populateManufacturerDropdown(); // Ensure manufacturer dropdown is populated on edit
        } catch (error) {
            console.error(`Error fetching offer ${id}:`, error);
            showLoading(false);
            showError(`Error loading offer details: ${error.message}. Please try again.`);
        }
    }

    async function deleteOffer(id) {
        console.log(`DEBUG: deleteOffer called for ID: ${id}`);
        const token = getAuthToken();
        if (!token) {
            showError("Authentication error. Please log in again.");
            return;
        }
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
            console.log(`DEBUG: Offer ${id} deleted successfully`);
            loadOffers();
        } catch (error) {
            console.error(`Error deleting offer ${id}:`, error);
            showLoading(false);
            showError(`Error deleting offer: ${error.message}. Please try again.`);
        }
    }

    // Function to add a new line item row (Manual Entry)
    function addLineItemRow(itemNo = "", description = "", quantity = 1) {
        console.log("DEBUG: addLineItemRow (manual) called");
        if (!lineItemsBody) return;
        const row = document.createElement("tr");
        row.dataset.itemType = "manual";
        row.innerHTML = `
            <td><input type="text" class="form-control form-control-sm item-no" value="${itemNo}"></td>
            <td><input type="text" class="form-control form-control-sm description" value="${description}"></td>
            <td>Manual</td> <!-- Manufacturer column -->
            <td><input type="number" class="form-control form-control-sm quantity" min="1" value="${quantity}"></td>
            <td>
                <select class="form-select form-select-sm pricing-method" disabled>
                    <option value="Manual">Manual</option>
                </select>
            </td>
            <td><input type="number" class="form-control form-control-sm margin-percent" disabled></td>
            <td class="unit-price">N/A</td>
            <td class="line-total">N/A</td>
            <td><button type="button" class="btn btn-danger btn-sm remove-item-btn"><i class="fas fa-trash-alt"></i></button></td>
        `;
        lineItemsBody.appendChild(row);
    }

    // NEW: Function to add a line item row from Database (via Bulk Add)
    function addDatabaseLineItem(product, quantity = 1, pricingMethod = "Margin", marginPercent = null) {
        console.log(`DEBUG: addDatabaseLineItem called for product: ${product.itemNo}, quantity: ${quantity}, method: ${pricingMethod}, margin: ${marginPercent}`);
        if (!lineItemsBody || !product) {
            console.error("DEBUG: lineItemsBody or product data missing in addDatabaseLineItem");
            return;
        }
        const row = document.createElement("tr");
        row.dataset.itemType = "database";
        row.dataset.productId = product._id;
        row.dataset.basePrice = product.basePrice || 0;
        row.dataset.baseCurrency = product.baseCurrency || "USD";

        const isMarginSelected = pricingMethod === "Margin";
        const marginValue = marginPercent !== null ? marginPercent : "";

        row.innerHTML = `
            <td class="item-no">${product.itemNo || "N/A"}</td>
            <td class="description">${product.description || "N/A"}</td>
            <td class="manufacturer">${product.manufacturer || "N/A"}</td>
            <td><input type="number" class="form-control form-control-sm quantity" min="1" value="${quantity}"></td>
            <td>
                <select class="form-select form-select-sm pricing-method">
                    <option value="PriceList">Price List</option> <!-- TODO: Check if price list exists for client/product -->
                    <option value="Margin" ${isMarginSelected ? "selected" : ""}>Margin</option>
                </select>
            </td>
            <td><input type="number" class="form-control form-control-sm margin-percent" min="0" step="0.01" value="${marginValue}" ${!isMarginSelected ? "disabled" : ""}></td>
            <td class="unit-price">TBD</td> <!-- Placeholder, will be calculated by backend -->
            <td class="line-total">TBD</td> <!-- Placeholder, will be calculated by backend -->
            <td><button type="button" class="btn btn-danger btn-sm remove-item-btn"><i class="fas fa-trash-alt"></i></button></td>
        `;
        lineItemsBody.appendChild(row);
    }

    // NEW: Handler for Bulk Add Items button
    async function handleBulkAddItems() {
        console.log("DEBUG: handleBulkAddItems called");
        const token = getAuthToken();
        if (!token) {
            showBulkAddError("Authentication error. Please log in again.");
            return;
        }
        if (!bulkAddManufacturerSelect || !bulkAddPartNumbersTextarea) {
            console.error("DEBUG: Bulk add elements not found");
            showBulkAddError("UI error. Please refresh the page.");
            return;
        }

        const manufacturer = bulkAddManufacturerSelect.value;
        const partNumbersRaw = bulkAddPartNumbersTextarea.value.trim();

        if (!manufacturer) {
            showBulkAddError("Please select a manufacturer.");
            return;
        }
        if (!partNumbersRaw) {
            showBulkAddError("Please paste part numbers.");
            return;
        }

        // Split by newline or comma, trim whitespace, remove empty strings
        const partNumbers = partNumbersRaw.split(/[\n,]+/).map(pn => pn.trim()).filter(pn => pn);

        if (partNumbers.length === 0) {
            showBulkAddError("No valid part numbers found after parsing.");
            return;
        }

        console.log(`DEBUG: Bulk adding for manufacturer: ${manufacturer}, part numbers:`, partNumbers);
        showBulkAddLoading(true);
        showBulkAddError("");

        try {
            const response = await fetch("/api/products/bulk-lookup", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ manufacturer, partNumbers }),
            });

            showBulkAddLoading(false);

            if (!response.ok) {
                let errorMsg = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.message || JSON.stringify(errorData);
                } catch (e) { /* Ignore if response is not JSON */ }
                throw new Error(errorMsg);
            }

            const foundProducts = await response.json();
            console.log("DEBUG: Bulk lookup results:", foundProducts);

            if (foundProducts.length === 0) {
                showBulkAddError("No products found for the given manufacturer and part numbers.");
                return;
            }

            // Add found products to the table
            foundProducts.forEach(product => {
                addDatabaseLineItem(product); // Add with default quantity 1, method Margin
            });

            // Clear textarea after successful add
            bulkAddPartNumbersTextarea.value = "";

            // Notify about missing items
            const foundPartNumbers = new Set(foundProducts.map(p => p.itemNo));
            const missingPartNumbers = partNumbers.filter(pn => !foundPartNumbers.has(pn));
            if (missingPartNumbers.length > 0) {
                showBulkAddError(`Note: Products added. Could not find items for part numbers: ${missingPartNumbers.join(", ")}`);
            }

        } catch (error) {
            console.error("Error during bulk add:", error);
            showBulkAddLoading(false);
            showBulkAddError(`Error adding products: ${error.message}. Please try again.`);
        }
    }

    // OLD Product Search Functions (Commented out for now)
    /*
    async function handleProductSearch() { ... }
    function displayProductSearchResults(products) { ... }
    function showProductSearchLoading(show) { ... }
    function showProductSearchError(message) { ... }
    function addProductLineItem(productData, quantity = 1, pricingMethod = "Margin", marginPercent = null, finalPrice = null, lineTotal = null) { ... }
    */

    async function generateOfferOutput(id, format) {
        console.log(`DEBUG: generateOfferOutput called for ID: ${id}, format: ${format}`);
        const token = getAuthToken();
        if (!token) {
            showError("Authentication error. Please log in again.");
            return;
        }
        showLoading(true);
        showError("");
        try {
            const response = await fetch(`/api/offers/${id}/${format}`, {
                headers: { "Authorization": `Bearer ${token}` },
            });
            showLoading(false);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            // Provide a filename
            const filename = `offer_${id}.${format}`;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            console.log(`DEBUG: ${format.toUpperCase()} generated and download initiated for offer ${id}`);
        } catch (error) {
            console.error(`Error generating ${format}:`, error);
            showLoading(false);
            showError(`Error generating ${format}: ${error.message}. Please try again.`);
        }
    }

    // --- Initialization ---
    console.log("DEBUG: Starting initialization");
    if (checkAuth()) {
        console.log("DEBUG: Authentication check passed");
        setupEventListeners();
        showOfferList(); // Show the list by default
    } else {
        console.error("DEBUG: Authentication check failed. Initialization stopped.");
    }
    console.log("DEBUG: Initialization complete");
});

