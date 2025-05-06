// /home/ubuntu/erp/public/offers.js (v5)

document.addEventListener("DOMContentLoaded", () => {
    console.log("DEBUG (v5): DOMContentLoaded event fired");

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
        console.log("DEBUG (v5): checkAuth function called");
        const userInfo = JSON.parse(localStorage.getItem("userInfo"));
        if (!userInfo || !userInfo.token) {
            console.error("DEBUG (v5): Token not found. Redirecting to login.");
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
        console.log(`DEBUG (v5): showError called with message: ${message}`);
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
        console.log("DEBUG (v5): setupEventListeners function called");
        if (createOfferBtn) createOfferBtn.addEventListener("click", () => { currentOfferId = null; showOfferForm(); });
        if (offerForm) offerForm.addEventListener("submit", saveOffer);
        if (cancelOfferBtn) cancelOfferBtn.addEventListener("click", showOfferList);
        if (addItemBtn) addItemBtn.addEventListener("click", () => addLineItemRow(undefined, true));
        if (bulkAddBtn) {
            bulkAddBtn.addEventListener("click", handleBulkAddItems);
        } else {
            console.log("DEBUG (v5): Could not find bulk-add-button during setupEventListeners");
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
    }

    async function loadOffers() {
        console.log("DEBUG (v5): loadOffers function called");
        const token = getAuthToken();
        if (!token) { showError("Authentication error. Please log in again."); return; }
        if (!offerListContainer) { console.error("DEBUG (v5): offerListContainer not found in loadOffers"); return; }
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
        console.log("DEBUG (v5): displayOffers function called");
        if (!offerListContainer) { console.error("DEBUG (v5): offerListContainer not found in displayOffers"); return; }
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
        console.log("DEBUG (v5): showOfferForm function called. Offer data:", offerData ? JSON.stringify(offerData).substring(0, 200) + "..." : null);
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
            console.log("DEBUG (v5): Populating existing line items for offer:", offerData.lineItems);
            offerData.lineItems.forEach(item => addLineItemRow(item, item.isManual === undefined ? false : item.isManual)); // Pass isManual flag
        }
    }

    function showOfferList() {
        console.log("DEBUG (v5): showOfferList function called");
        if (offerListSection) offerListSection.style.display = "block";
        if (offerFormSection) offerFormSection.style.display = "none";
        loadOffers();
    }

    async function populateClientDropdown(selectedClientRef = null) {
        console.log("DEBUG (v5): populateClientDropdown called with selectedClientRef:", selectedClientRef);
        const token = getAuthToken();
        if (!token || !clientSelect) { console.error("DEBUG (v5): Token or clientSelect not found"); return; }
        clientSelect.innerHTML = "<option value=\"\">Select Client...</option>"; 
        try {
            const response = await fetch("/api/clients", { headers: { "Authorization": `Bearer ${token}` } });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const clients = await response.json();
            clients.forEach(client => {
                const option = document.createElement("option");
                option.value = client._id;
                // Attempt to display CompanyName (ContactPersonName or ClientNumber or N/A)
                const contactInfo = client.contactPersonName || client.contactName || client.clientNumber || "N/A";
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
        console.log("DEBUG (v5): populateManufacturerDropdown function called");
        const token = getAuthToken();
        if (!token || !bulkAddManufacturerSelect) { console.error("DEBUG (v5): Token or bulkAddManufacturerSelect not found"); return; }
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

    // addLineItemRow (v5 - Corrected ItemNo population)
    function addLineItemRow(itemData, isManual = true) {
        console.log(`DEBUG (v5): addLineItemRow called. Is manual: ${isManual}. Item data:`, itemData ? JSON.stringify(itemData).substring(0,200) + "..." : "undefined");
        if (!lineItemsBody) {
            console.error("CRITICAL (v5): lineItemsBody not found. Cannot add row.");
            return;
        }

        const row = lineItemsBody.insertRow();
        const currentItemData = itemData || {};
        
        let productSource = {}; // This will hold the product details for non-manual items
        if (!isManual) {
            // If itemData.product is an object (like from bulk add), use it directly.
            // If itemData itself is the product (like from loading an existing offer), use itemData.
            if (currentItemData.product && typeof currentItemData.product === 'object') {
                productSource = currentItemData.product;
            } else {
                productSource = currentItemData; // This assumes itemData contains product fields directly
            }
        }
        console.log(`DEBUG (v5): Product source for row:`, productSource ? JSON.stringify(productSource).substring(0,200) + "..." : "{}");

        row.dataset.itemId = !isManual && productSource && productSource._id ? productSource._id : (currentItemData._id || `manual_${Date.now()}`);
        row.dataset.isManual = String(isManual);

        // Initialize values
        let itemNoVal = "", manufVal = "", descVal = "", qtyVal = 1;
        let unitPriceDisplay = "TBD", pricingMethodVal = "Margin", marginPercentVal = "";
        let lineTotalDisplay = "TBD";
        let inputsReadOnly = !isManual;
        let pricingControlsDisabled = isManual;

        if (isManual) {
            console.log("DEBUG (v5): Manual item row setup.");
            pricingMethodVal = "Margin";
            marginPercentVal = "";
        } else {
            console.log("DEBUG (v5): Non-manual item row setup.");
            itemNoVal = productSource.itemNumber || productSource.itemNo || "N/A"; // CRITICAL FIX: Ensure itemNoVal is populated
            manufVal = productSource.manufacturer || "N/A";
            descVal = productSource.description || "N/A";
            qtyVal = currentItemData.quantity !== undefined ? currentItemData.quantity : 1;
            unitPriceDisplay = currentItemData.finalPriceUSD !== undefined ? parseFloat(currentItemData.finalPriceUSD).toFixed(2) : (currentItemData.unitPriceUSD !== undefined ? parseFloat(currentItemData.unitPriceUSD).toFixed(2) : 'TBD');
            pricingMethodVal = currentItemData.pricingMethod || "Margin";
            
            if (pricingMethodVal === 'PriceList') {
                marginPercentVal = ""; 
            } else { 
                marginPercentVal = currentItemData.marginPercent !== undefined && currentItemData.marginPercent !== null 
                                   ? currentItemData.marginPercent 
                                   : (globalMarginInput ? globalMarginInput.value : "");
            }
            lineTotalDisplay = currentItemData.lineTotalUSD !== undefined ? parseFloat(currentItemData.lineTotalUSD).toFixed(2) : 'TBD';
        }

        console.log(`DEBUG (v5): Final values for row - ItemNo: ${itemNoVal}, Manuf: ${manufVal}, Desc: ${descVal}, Qty: ${qtyVal}, UnitPrice: ${unitPriceDisplay}, PricingMethod: ${pricingMethodVal}, Margin%: ${marginPercentVal}, LineTotal: ${lineTotalDisplay}`);

        // 1. Item No.
        let cell1 = row.insertCell();
        let input1 = document.createElement("input");
        input1.type = "text"; input1.className = "form-control form-control-sm item-number"; input1.value = itemNoVal;
        if (inputsReadOnly) input1.readOnly = true;
        input1.placeholder = "Item No."; cell1.appendChild(input1);

        // 2. Manufacturer
        let cell2 = row.insertCell();
        let input2 = document.createElement("input");
        input2.type = "text"; input2.className = "form-control form-control-sm manufacturer"; input2.value = manufVal;
        if (inputsReadOnly) input2.readOnly = true;
        input2.placeholder = "Manuf."; cell2.appendChild(input2);

        // 3. Description
        let cell3 = row.insertCell();
        let input3 = document.createElement("input");
        input3.type = "text"; input3.className = "form-control form-control-sm description"; input3.value = descVal;
        if (inputsReadOnly) input3.readOnly = true;
        input3.placeholder = "Description"; cell3.appendChild(input3);

        // 4. Qty
        let cell4 = row.insertCell();
        let input4 = document.createElement("input");
        input4.type = "number"; input4.className = "form-control form-control-sm quantity"; input4.value = qtyVal;
        input4.min = "1"; input4.placeholder = "Qty"; cell4.appendChild(input4);

        // 5. Pricing (Combined Cell for Method and Margin)
        let cell5_pricing = row.insertCell();
        const pricingControlsDiv = document.createElement("div");
        pricingControlsDiv.className = "line-item-controls";

        const pricingMethodSelect = document.createElement("select");
        pricingMethodSelect.className = "form-select form-select-sm pricing-method";
        if (pricingControlsDisabled) pricingMethodSelect.disabled = true;
        ["Margin", "PriceList"].forEach(method => {
            let option = document.createElement("option");
            option.value = method; option.textContent = method === "PriceList" ? "Price List" : method;
            if (pricingMethodVal === method) option.selected = true;
            pricingMethodSelect.appendChild(option);
        });
        pricingControlsDiv.appendChild(pricingMethodSelect);

        const marginPercentInput = document.createElement("input");
        marginPercentInput.type = "number"; marginPercentInput.className = "form-control form-control-sm margin-percent";
        marginPercentInput.value = marginPercentVal;
        marginPercentInput.min = "0"; marginPercentInput.step = "0.01";
        marginPercentInput.placeholder = "%";
        pricingControlsDiv.appendChild(marginPercentInput);
        cell5_pricing.appendChild(pricingControlsDiv);
        
        const updateMarginInputState = () => {
            const isPriceList = pricingMethodSelect.value === 'PriceList';
            marginPercentInput.disabled = pricingControlsDisabled || isPriceList;
            marginPercentInput.style.display = (pricingControlsDisabled || isPriceList) ? 'none' : 'inline-block';
            if (isPriceList) marginPercentInput.value = '';
        };

        pricingMethodSelect.addEventListener('change', updateMarginInputState);
        updateMarginInputState(); // Set initial state

        // 6. Unit Price (USD) - Display only
        let cell6_unitPrice = row.insertCell();
        cell6_unitPrice.className = "unit-price";
        cell6_unitPrice.textContent = unitPriceDisplay;

        // 7. Line Total (USD) - Display only
        let cell7_lineTotal = row.insertCell();
        cell7_lineTotal.className = "line-total";
        cell7_lineTotal.textContent = lineTotalDisplay;

        // 8. Actions
        let cell8_action = row.insertCell();
        const removeButton = document.createElement("button");
        removeButton.type = "button"; removeButton.className = "btn btn-danger btn-sm remove-item-btn";
        const iconRemove = document.createElement("i");
        iconRemove.className = "fas fa-times";
        removeButton.appendChild(iconRemove);
        cell8_action.appendChild(removeButton);
        
        console.log(`DEBUG (v5): addLineItemRow finished for itemNo: ${itemNoVal}`);
    }

    async function handleBulkAddItems() {
        console.log("DEBUG (v5): handleBulkAddItems function called");
        const token = getAuthToken();
        if (!token) { showError("Authentication error."); return; }
        if (!bulkAddManufacturerSelect || !bulkAddPartNumbersTextarea) { 
            console.error("DEBUG (v5): Manufacturer select or part numbers textarea not found."); 
            showBulkAddStatus("Error: UI elements for bulk add not found.", true);
            return; 
        }

        const manufacturerValue = bulkAddManufacturerSelect.value;
        const partNumbersRaw = bulkAddPartNumbersTextarea.value;

        if (!manufacturerValue) {
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
                body: JSON.stringify({ manufacturer: manufacturerValue, partNumbers })
            });
            showLoading(false);
            if (!response.ok) {
                let errorData = { message: `Server error: ${response.status}` };
                try { errorData = await response.json(); } catch(e){ console.warn("Could not parse error from bulk-lookup");}
                throw new Error(errorData.message || `Server error: ${response.status}`);
            }
            const productsFound = await response.json();
            console.log("DEBUG (v5): Products found from bulk lookup:", productsFound);

            if (productsFound.length === 0) {
                showBulkAddStatus("No products found for the given manufacturer and part numbers.", true);
                return;
            }

            productsFound.forEach(product => {
                // Pass the product directly, quantity, and pricing method. isManual is false.
                addLineItemRow({ product: product, quantity: 1, pricingMethod: 'Margin' }, false); 
            });
            showBulkAddStatus(`${productsFound.length} product(s) added.`, false);
            bulkAddPartNumbersTextarea.value = "";

        } catch (error) {
            console.error("Error during bulk add:", error);
            showLoading(false);
            showBulkAddStatus(`Error: ${error.message}`, true);
        }
    }

    // saveOffer (v5 - Corrected itemNumber collection)
    async function saveOffer(event) {
        event.preventDefault();
        console.log("DEBUG (v5): saveOffer function called");
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
        
        if (!offerData.client) {
            showError("Please select a client.");
            return;
        }

        try { 
            const rows = lineItemsBody.querySelectorAll("tr");
            if (rows.length === 0) {
                showError("Please add at least one line item to the offer.");
                return;
            }

            rows.forEach(row => {
                const itemNumberInput = row.querySelector(".item-number");
                const descriptionInput = row.querySelector(".description");
                const manufacturerInput = row.querySelector(".manufacturer");
                const quantityInput = row.querySelector(".quantity");
                const lineItemControls = row.querySelector(".line-item-controls");
                const pricingMethodSelect = lineItemControls ? lineItemControls.querySelector(".pricing-method") : null;
                const marginPercentInput = lineItemControls ? lineItemControls.querySelector(".margin-percent") : null;
    
                const isManualItem = row.dataset.isManual === "true";
    
                const lineItem = {
                    itemNumber: itemNumberInput ? itemNumberInput.value.trim() : "", // CRITICAL: Read from input
                    description: descriptionInput ? descriptionInput.value.trim() : "",
                    manufacturer: manufacturerInput ? manufacturerInput.value.trim() : "",
                    quantity: quantityInput && quantityInput.value.trim() !== "" ? parseInt(quantityInput.value) : 0,
                    isManual: isManualItem,
                    product: isManualItem ? null : row.dataset.itemId 
                };

                if (!lineItem.itemNumber || lineItem.itemNumber === "N/A" || !lineItem.description || !lineItem.manufacturer) {
                    showError("All line items must have valid Item No., Description, and Manufacturer.");
                    throw new Error("Incomplete line item data: Missing item details.");
                }
                if (lineItem.quantity < 1) {
                    showError("Line item quantity must be at least 1.");
                    throw new Error("Invalid line item quantity.");
                }
    
                if (isManualItem) {
                    lineItem.pricingMethod = "Margin"; 
                    lineItem.marginPercent = null;    
                } else {
                    lineItem.pricingMethod = pricingMethodSelect ? pricingMethodSelect.value : "Margin";
                    if (lineItem.pricingMethod === "Margin") {
                        if (marginPercentInput && !marginPercentInput.disabled && marginPercentInput.value.trim() !== "") {
                            lineItem.marginPercent = parseFloat(marginPercentInput.value);
                        } else {
                            lineItem.marginPercent = null; 
                        }
                    } else { 
                        lineItem.marginPercent = null;
                    }
                }
                
                console.log("DEBUG (v5): Collected line item for save:", JSON.stringify(lineItem));
                offerData.lineItems.push(lineItem);
            });

        } catch (lineItemError) {
            console.error("Error processing line items for save (v5):", lineItemError.message);
            showLoading(false);
            return; 
        }
        
        console.log("DEBUG (v5): Offer data to save:", JSON.stringify(offerData));

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
                    console.log("DEBUG (v5): Save error response text:", text);
                    errorData = JSON.parse(text); 
                } catch (e) { 
                    console.warn("Could not parse error JSON from save offer (v5):", e);
                }
                throw new Error(errorData.message || `Server error: ${response.status}`);
            }
            const savedOffer = await response.json();
            console.log("DEBUG (v5): Offer saved successfully:", savedOffer);
            showOfferList();
            alert("Offer saved successfully!");
        } catch (error) {
            console.error("Error saving offer (v5):", error);
            showLoading(false);
            showError(`Error saving offer: ${error.message}. Please try again.`);
        }
    }

    async function loadOfferForEditing(id) {
        console.log("DEBUG (v5): loadOfferForEditing function called with ID:", id);
        const token = getAuthToken();
        if (!token) { showError("Authentication error."); return; }
        showLoading(true);
        try {
            const response = await fetch(`/api/offers/${id}`, { headers: { "Authorization": `Bearer ${token}` } });
            showLoading(false);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const offer = await response.json();
            console.log("DEBUG (v5): Offer loaded for editing:", offer);
            showOfferForm(offer);
        } catch (error) {
            console.error("Error loading offer for editing:", error);
            showLoading(false);
            showError(`Error loading offer: ${error.message}`);
        }
    }

    async function deleteOffer(id) {
        console.log("DEBUG (v5): deleteOffer function called with ID:", id);
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
        console.log(`DEBUG (v5): generateOfferOutput called for offer ID ${offerId}, format ${format}`);
        const token = getAuthToken();
        if (!token) { showError("Authentication error."); return; }
        showLoading(true);
        try {
            const response = await fetch(`/api/offers/${offerId}/${format}`, { headers: { "Authorization": `Bearer ${token}` } });
            showLoading(false);
            if (!response.ok) {
                let errorData = { message: `Error generating ${format.toUpperCase()}` };
                try{ errorData = await response.json(); } catch(e){ console.warn("Could not parse error from generate output"); }
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

    if (checkAuth()) {
        if (offerListSection && offerFormSection) {
             console.log("DEBUG (v5): Offers page detected, initializing.");
            setupEventListeners();
            showOfferList(); 
        } else {
            console.log("DEBUG (v5): Not on offers page, or core elements missing.");
        }
    } else {
        console.log("DEBUG (v5): Auth check failed, not initializing offer page logic.");
    }
});

