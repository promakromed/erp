// /home/ubuntu/erp/public/offers.js (v11 - Fixed client dropdown contact display)

document.addEventListener("DOMContentLoaded", () => {
    console.log("DEBUG (v11): DOMContentLoaded event fired");

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

    const bulkAddManufacturerSelect = document.getElementById("bulk-add-manufacturer");
    const bulkAddPartNumbersTextarea = document.getElementById("bulk-add-part-numbers");
    const bulkAddBtn = document.getElementById("bulk-add-button"); 
    const bulkAddStatus = document.getElementById("bulk-add-status");

    let currentOfferId = null;

    function checkAuth() {
        console.log("DEBUG (v11): checkAuth function called");
        const userInfo = JSON.parse(localStorage.getItem("userInfo"));
        if (!userInfo || !userInfo.token) {
            console.error("DEBUG (v11): Token not found. Redirecting to login.");
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
        console.log(`DEBUG (v11): showError called with message: ${message}`);
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

    function setupEventListeners() {
        console.log("DEBUG (v11): setupEventListeners function called");
        if (createOfferBtn) createOfferBtn.addEventListener("click", () => { currentOfferId = null; showOfferForm(); });
        if (offerForm) offerForm.addEventListener("submit", saveOffer);
        if (cancelOfferBtn) cancelOfferBtn.addEventListener("click", showOfferList);
        if (addItemBtn) addItemBtn.addEventListener("click", () => addLineItemRow(undefined, true));
        if (bulkAddBtn) {
            bulkAddBtn.addEventListener("click", handleBulkAddItems);
        } else {
            console.log("DEBUG (v11): Could not find bulk-add-button during setupEventListeners");
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
        console.log("DEBUG (v11): loadOffers function called");
        const token = getAuthToken();
        if (!token) { showError("Authentication error. Please log in again."); return; }
        if (!offerListContainer) { console.error("DEBUG (v11): offerListContainer not found in loadOffers"); return; }
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
        console.log("DEBUG (v11): displayOffers function called");
        if (!offerListContainer) { console.error("DEBUG (v11): offerListContainer not found in displayOffers"); return; }
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
        console.log("DEBUG (v11): showOfferForm function called. Offer data:", offerData ? JSON.stringify(offerData).substring(0, 200) + "..." : null);
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

        if (generatePdfBtn) generatePdfBtn.style.display = currentOfferId ? "inline-block" : "none";
        if (generateCsvBtn) generateCsvBtn.style.display = currentOfferId ? "inline-block" : "none";
        
        populateClientDropdown(offerData ? offerData.client : null);
        populateManufacturerDropdown(); 
        showError("");

        if (offerData && offerData.lineItems) {
            console.log("DEBUG (v11): Populating existing line items for offer:", offerData.lineItems);
            offerData.lineItems.forEach(item => addLineItemRow(item, item.isManual === undefined ? false : item.isManual));
        }
    }

    function showOfferList() {
        console.log("DEBUG (v11): showOfferList function called");
        if (offerListSection) offerListSection.style.display = "block";
        if (offerFormSection) offerFormSection.style.display = "none";
        loadOffers();
    }

    async function populateClientDropdown(selectedClientRef = null) {
        console.log("DEBUG (v11): populateClientDropdown called with selectedClientRef:", selectedClientRef);
        const token = getAuthToken();
        if (!token || !clientSelect) { console.error("DEBUG (v11): Token or clientSelect not found"); return; }
        clientSelect.innerHTML = "<option value=\"\">Select Client...</option>"; 
        try {
            const response = await fetch("/api/clients", { headers: { "Authorization": `Bearer ${token}` } });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const clients = await response.json();
            clients.forEach(client => {
                const option = document.createElement("option");
                option.value = client._id;
                // CORRECTED: Use client.clientName (main contact) or client.contactPerson (secondary) from the model
                const contactInfo = client.clientName || client.contactPerson || "N/A"; 
                option.textContent = `${client.companyName} (${contactInfo})`;
                const selectedClientId = selectedClientRef ? (selectedClientRef._id || selectedClientRef) : null;
                if (selectedClientId && client._id === selectedClientId) {
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
        console.log("DEBUG (v11): populateManufacturerDropdown function called");
        const token = getAuthToken();
        if (!token || !bulkAddManufacturerSelect) { console.error("DEBUG (v11): Token or bulkAddManufacturerSelect not found"); return; }
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
            console.error("Error populating manufacturer dropdown:", error);
            showBulkAddStatus("Could not load manufacturers.", true);
        }
    }

    function addLineItemRow(itemData, isManual = true) {
        console.log(`DEBUG (v11): addLineItemRow called. Is manual: ${isManual}. Item data:`, itemData ? JSON.stringify(itemData).substring(0,200) + "..." : "undefined");
        if (!lineItemsBody) {
            console.error("CRITICAL (v11): lineItemsBody not found. Cannot add row.");
            return;
        }

        const row = lineItemsBody.insertRow();
        const currentItemData = itemData || {};
        
        let productSource = {}; 
        if (!isManual) {
            if (currentItemData.product && typeof currentItemData.product === 'object') {
                productSource = currentItemData.product;
            } else if (currentItemData.productId && typeof currentItemData.productId === 'object') {
                 productSource = currentItemData.productId; 
            } else {
                productSource = currentItemData; 
            }
        }
        console.log(`DEBUG (v11): Product source for row:`, productSource ? JSON.stringify(productSource).substring(0,200) + "..." : "{}");

        row.dataset.itemId = !isManual && productSource && productSource._id ? productSource._id : (currentItemData._id || `manual_${Date.now()}`);
        row.dataset.isManual = String(isManual);

        let itemNoVal = "", manufVal = "", descVal = "", qtyVal = 1;
        let unitPriceDisplay = "TBD", pricingMethodVal = "Margin", marginPercentVal = "";
        let lineTotalDisplay = "TBD";
        let inputsReadOnly = !isManual;
        let pricingControlsDisabled = isManual;
        let marginInputDisabled = isManual || pricingMethodVal !== "Margin";

        if (isManual) {
            itemNoVal = currentItemData.itemNo || "";
            manufVal = currentItemData.manufacturer || "";
            descVal = currentItemData.description || "";
            qtyVal = currentItemData.quantity || 1;
            pricingMethodVal = currentItemData.pricingMethod || "Margin";
            marginPercentVal = currentItemData.marginPercent !== null && currentItemData.marginPercent !== undefined ? currentItemData.marginPercent : "";
            unitPriceDisplay = currentItemData.finalPriceUSD !== undefined ? `$${parseFloat(currentItemData.finalPriceUSD).toFixed(2)}` : "TBD";
            lineTotalDisplay = currentItemData.lineTotalUSD !== undefined ? `$${parseFloat(currentItemData.lineTotalUSD).toFixed(2)}` : "TBD";
        } else { 
            itemNoVal = productSource.itemNumber || productSource.itemNo || "N/A";
            manufVal = productSource.manufacturer || "N/A";
            descVal = productSource.description || "N/A";
            qtyVal = currentItemData.quantity || 1;
            pricingMethodVal = currentItemData.pricingMethod || "Margin";
            marginPercentVal = currentItemData.marginPercent !== null && currentItemData.marginPercent !== undefined ? currentItemData.marginPercent : "";
            unitPriceDisplay = currentItemData.finalPriceUSD !== undefined ? `$${parseFloat(currentItemData.finalPriceUSD).toFixed(2)}` : "TBD";
            lineTotalDisplay = currentItemData.lineTotalUSD !== undefined ? `$${parseFloat(currentItemData.lineTotalUSD).toFixed(2)}` : "TBD";
        }
        marginInputDisabled = isManual || pricingMethodVal !== "Margin";

        const itemNoCell = row.insertCell();
        const itemNoInput = document.createElement("input");
        itemNoInput.type = "text";
        itemNoInput.className = "form-control form-control-sm item-no-input";
        itemNoInput.value = itemNoVal;
        itemNoInput.readOnly = inputsReadOnly;
        itemNoInput.required = true;
        itemNoCell.appendChild(itemNoInput);

        const manufacturerCell = row.insertCell();
        const manufacturerInput = document.createElement("input");
        manufacturerInput.type = "text";
        manufacturerInput.className = "form-control form-control-sm manufacturer-input";
        manufacturerInput.value = manufVal;
        manufacturerInput.readOnly = inputsReadOnly;
        manufacturerInput.required = true;
        manufacturerCell.appendChild(manufacturerInput);

        const descriptionCell = row.insertCell();
        const descriptionInput = document.createElement("input");
        descriptionInput.type = "text";
        descriptionInput.className = "form-control form-control-sm description-input";
        descriptionInput.value = descVal;
        descriptionInput.readOnly = inputsReadOnly;
        descriptionInput.required = true;
        descriptionCell.appendChild(descriptionInput);

        const quantityCell = row.insertCell();
        const quantityInput = document.createElement("input");
        quantityInput.type = "number";
        quantityInput.className = "form-control form-control-sm quantity-input";
        quantityInput.value = qtyVal;
        quantityInput.min = "1";
        quantityInput.required = true;
        quantityCell.appendChild(quantityInput);

        const pricingCell = row.insertCell();
        pricingCell.className = "pricing-cell"; 
        const pricingMethodSelect = document.createElement("select");
        pricingMethodSelect.className = "form-select form-select-sm pricing-method-select";
        pricingMethodSelect.innerHTML = `
            <option value="Margin" ${pricingMethodVal === "Margin" ? "selected" : ""}>Margin</option>
            <option value="PriceList" ${pricingMethodVal === "PriceList" ? "selected" : ""}>Price List</option>
        `;
        pricingMethodSelect.disabled = pricingControlsDisabled;
        pricingCell.appendChild(pricingMethodSelect);

        const marginPercentInput = document.createElement("input");
        marginPercentInput.type = "number";
        marginPercentInput.className = "form-control form-control-sm margin-percent-input ms-1";
        marginPercentInput.placeholder = "%";
        marginPercentInput.value = marginPercentVal;
        marginPercentInput.min = "0";
        marginPercentInput.step = "0.01";
        marginPercentInput.style.width = "70px";
        marginPercentInput.disabled = marginInputDisabled;
        pricingCell.appendChild(marginPercentInput);

        pricingMethodSelect.addEventListener("change", (e) => {
            marginPercentInput.disabled = isManual || e.target.value !== "Margin";
            if (e.target.value !== "Margin") {
                marginPercentInput.value = ""; 
            }
        });

        const unitPriceCell = row.insertCell();
        unitPriceCell.className = "unit-price-cell text-end";
        unitPriceCell.textContent = unitPriceDisplay;

        const lineTotalCell = row.insertCell();
        lineTotalCell.className = "line-total-cell text-end";
        lineTotalCell.textContent = lineTotalDisplay;

        const actionCell = row.insertCell();
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "btn btn-danger btn-sm remove-item-btn";
        removeBtn.innerHTML = "&times;";
        removeBtn.title = "Remove Item";
        actionCell.appendChild(removeBtn);
        console.log(`DEBUG (v11): Row added for itemNo: ${itemNoVal}, isManual: ${isManual}`);
    }

    async function handleBulkAddItems() {
        console.log("DEBUG (v11): handleBulkAddItems function called");
        const token = getAuthToken();
        const manufacturer = bulkAddManufacturerSelect.value;
        const partNumbersText = bulkAddPartNumbersTextarea.value.trim();

        if (!manufacturer) {
            showBulkAddStatus("Please select a manufacturer.", true);
            return;
        }
        if (!partNumbersText) {
            showBulkAddStatus("Please enter part numbers.", true);
            return;
        }

        const partNumbersArray = partNumbersText.split(/\n|,|\s+/).map(pn => pn.trim()).filter(pn => pn);
        if (partNumbersArray.length === 0) {
            showBulkAddStatus("No valid part numbers entered.", true);
            return;
        }

        showBulkAddStatus("Adding items...", false);
        showLoading(true);

        try {
            const response = await fetch("/api/products/bulk-lookup", {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ manufacturer, partNumbers: partNumbersArray }), 
            });
            showLoading(false);
            const result = await response.json(); 

            if (!response.ok) {
                throw new Error(result.message || `Error looking up products: ${response.status}`);
            }

            let itemsAddedCount = 0;
            let itemsNotFound = [];

            result.forEach(product => {
                if (product.found) {
                    addLineItemRow({ product: product.data, quantity: 1, pricingMethod: "Margin" }, false);
                    itemsAddedCount++;
                } else {
                    itemsNotFound.push(product.itemNumber);
                }
            });

            let statusMessage = `${itemsAddedCount} item(s) added.`;
            if (itemsNotFound.length > 0) {
                statusMessage += ` ${itemsNotFound.length} item(s) not found: ${itemsNotFound.join(", ")}.`;
            }
            showBulkAddStatus(statusMessage, itemsNotFound.length > 0 && itemsAddedCount === 0);
            if (itemsAddedCount > 0) {
                bulkAddPartNumbersTextarea.value = "";
            }

        } catch (error) {
            console.error("Error in bulk add (v11):", error);
            showLoading(false);
            if (error instanceof SyntaxError && error.message.includes("Unexpected token")) {
                showBulkAddStatus("Error: Could not process response from server (unexpected format). Please check server logs.", true);
            } else {
                showBulkAddStatus(`Error: ${error.message}`, true);
            }
        }
    }

    async function saveOffer(event) {
        event.preventDefault();
        console.log("DEBUG (v11): saveOffer function called");
        const token = getAuthToken();
        if (!token) { showError("Authentication error. Please log in again."); return; }

        const clientId = clientSelect.value;
        const validityDate = validityInput.value;
        const terms = termsInput.value;
        const status = statusSelect.value;
        const globalMarginPercent = parseFloat(globalMarginInput.value) || 0;

        if (!clientId) { 
            showError("Please select a client.");
            return;
        }

        const lineItems = [];
        const rows = lineItemsBody.querySelectorAll("tr");
        let formIsValid = true;

        rows.forEach(row => {
            const isManual = row.dataset.isManual === "true";
            const lineItemId = isManual ? null : row.dataset.itemId; 
            
            const itemNoInput = row.querySelector(".item-no-input");
            const descriptionInput = row.querySelector(".description-input");
            const manufacturerInput = row.querySelector(".manufacturer-input");
            const quantityInput = row.querySelector(".quantity-input");
            const pricingMethodSelect = row.querySelector(".pricing-method-select");
            const marginPercentInput = row.querySelector(".margin-percent-input");

            const itemNo = itemNoInput ? itemNoInput.value.trim() : "";
            const description = descriptionInput ? descriptionInput.value.trim() : "";
            const manufacturer = manufacturerInput ? manufacturerInput.value.trim() : "";
            const quantity = quantityInput ? parseInt(quantityInput.value, 10) : 0;
            const pricingMethod = pricingMethodSelect ? pricingMethodSelect.value : "Margin";
            const marginPercent = (pricingMethod === "Margin" && marginPercentInput && marginPercentInput.value !== "") 
                                ? parseFloat(marginPercentInput.value) 
                                : null;

            if (!itemNo || !description || !manufacturer || quantity <= 0) {
                if (!isManual) { 
                    showError("All fields (Item No, Description, Manufacturer, Quantity > 0) are required for each line item.");
                    formIsValid = false;
                    return; 
                }
            }
            
            const lineItem = {
                itemNo: itemNo, 
                description: description,
                manufacturer: manufacturer,
                quantity: quantity,
                isManual: isManual,
                productId: lineItemId, 
                pricingMethod: pricingMethod,
                marginPercent: marginPercent,
            };
            lineItems.push(lineItem);
            console.log("DEBUG (v11): Collected line item for save:", JSON.stringify(lineItem));
        });

        if (!formIsValid) return;

        if (lineItems.length === 0) {
            showError("Please add at least one line item to the offer.");
            return;
        }

        const offerData = {
            clientId: clientId, 
            validityDate: validityDate || null, 
            terms,
            status,
            globalMarginPercent,
            lineItems,
        };
        console.log("DEBUG (v11): Offer data to save:", JSON.stringify(offerData));

        const url = currentOfferId ? `/api/offers/${currentOfferId}` : "/api/offers";
        const method = currentOfferId ? "PUT" : "POST";

        showLoading(true);
        showError("");

        try {
            const response = await fetch(url, {
                method: method,
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify(offerData),
            });
            showLoading(false);
            const responseText = await response.text(); 
            console.log("DEBUG (v11): Save response text:", responseText.substring(0, 500)); 

            if (!response.ok) {
                let errorData = { message: `Server error: ${response.status}` };
                try {
                    errorData = JSON.parse(responseText); 
                } catch (e) {
                    console.warn(`Could not parse error JSON from save offer (v11): ${e.message}`);
                    if (responseText.toLowerCase().includes("internal server error")) {
                         errorData.message = "Internal Server Error. Please check server logs.";
                    } else if (responseText.toLowerCase().includes("bad request")) {
                         errorData.message = "Server error: 400. Please check data.";
                    } else if (responseText.length < 200) { 
                        errorData.message = responseText;
                    }
                }
                throw new Error(errorData.message || `Server error: ${response.status}`);
            }
            
            let savedOfferData = {};
            try {
                savedOfferData = JSON.parse(responseText);
            } catch (e) {
                console.warn("Could not parse success JSON from save offer (v11), but response was OK.");
            }

            alert(savedOfferData.message || "Offer saved successfully!");
            showOfferList();
        } catch (error) {
            console.error(`Error saving offer (v11): ${error.name}: ${error.message}`);
            showLoading(false);
            showError(`Error saving offer: ${error.message}. Please try again.`);
        }
    }

    async function loadOfferForEditing(id) {
        console.log(`DEBUG (v11): loadOfferForEditing called for ID: ${id}`);
        const token = getAuthToken();
        if (!token) { showError("Authentication error. Please log in again."); return; }
        showLoading(true);
        showError("");
        try {
            const response = await fetch(`/api/offers/${id}`, { headers: { "Authorization": `Bearer ${token}` } });
            showLoading(false);
            if (!response.ok) {
                let errorData = { message: `HTTP error! status: ${response.status}` };
                try { errorData = await response.json(); } catch (e) { console.warn("Could not parse error JSON from /api/offers/:id"); }
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const offer = await response.json();
            showOfferForm(offer);
        } catch (error) {
            console.error("Error fetching offer for editing:", error);
            showLoading(false);
            showError(`Error fetching offer: ${error.message}. Please try again.`);
        }
    }

    async function deleteOffer(id) {
        console.log(`DEBUG (v11): deleteOffer called for ID: ${id}`);
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
                try { errorData = await response.json(); } catch (e) { console.warn("Could not parse error JSON from delete offer"); }
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            alert("Offer deleted successfully!");
            loadOffers();
        } catch (error) {
            console.error("Error deleting offer:", error);
            showLoading(false);
            showError(`Error deleting offer: ${error.message}. Please try again.`);
        }
    }

    async function generateOfferOutput(id, format) {
        console.log(`DEBUG (v11): generateOfferOutput called for ID: ${id}, Format: ${format}`);
        const token = getAuthToken();
        if (!token) { showError("Authentication error. Please log in again."); return; }
        showLoading(true);
        showError("");
        try {
            const response = await fetch(`/api/offers/${id}/${format}`, { 
                headers: { "Authorization": `Bearer ${token}` }
            });
            showLoading(false);
            if (!response.ok) {
                let errorData = { message: `HTTP error! status: ${response.status}` };
                try { errorData = await response.json(); } catch (e) { console.warn(`Could not parse error JSON from generate ${format}`); }
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = `offer_${id}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (error) {
            console.error(`Error generating ${format}:`, error);
            showLoading(false);
            showError(`Error generating ${format}: ${error.message}. Please try again.`);
        }
    }

    // --- Initialization ---
    if (!checkAuth()) return;
    setupEventListeners();
    showOfferList(); 
});

