// /home/ubuntu/erp/public/offers.js (v12 - Live price updates)

document.addEventListener("DOMContentLoaded", () => {
    console.log("DEBUG (v12): DOMContentLoaded event fired");

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

    // Function to update price for a single row
    function updateAndDisplayItemPrice(rowElement) {
        const isManual = rowElement.dataset.isManual === "true";
        if (isManual) return; // Manual items are not auto-calculated here

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
    }

    // Function to recalculate all item prices (e.g., when global margin changes)
    function recalculateAllPrices() {
        if (!lineItemsBody) return;
        const rows = lineItemsBody.querySelectorAll("tr");
        rows.forEach(row => {
            // Only update if item-specific margin is not set
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
            // Event delegation for quantity and item margin changes
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
        else if (globalMarginInput) globalMarginInput.value = ""; // Clear for new offer

        if (generatePdfBtn) generatePdfBtn.style.display = currentOfferId ? "inline-block" : "none";
        if (generateCsvBtn) generateCsvBtn.style.display = currentOfferId ? "inline-block" : "none";
        
        populateClientDropdown(offerData ? offerData.client : null);
        populateManufacturerDropdown(); 
        showError("");

        if (offerData && offerData.lineItems) {
            offerData.lineItems.forEach(item => {
                // IMPORTANT ASSUMPTION: Backend now sends `basePriceUSDForMarginApplication` with each line item
                // when an offer is fetched for editing.
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

    // Modified addLineItemRow for live pricing
    function addLineItemRow(itemData, isManualEntry = false) {
        if (!lineItemsBody) return;
        const row = lineItemsBody.insertRow();
        const currentItem = itemData || {};

        row.dataset.isManual = isManualEntry;
        // IMPORTANT: Expecting `basePriceUSDForMarginApplication` from backend for non-manual items
        // This is the USD price AFTER 3% protection, BEFORE offer-specific margin.
        row.dataset.basePriceForMargin = isManualEntry ? "0" : (currentItem.basePriceUSDForMarginApplication || "0");
        row.dataset.productId = !isManualEntry && currentItem.productId ? (typeof currentItem.productId === 'object' ? currentItem.productId._id : currentItem.productId) : "";

        row.innerHTML = `
            <td><input type="text" class="form-control item-itemNo" value="${currentItem.itemNo || ""}" ${isManualEntry ? "" : "readonly"}></td>
            <td><input type="text" class="form-control item-description" value="${currentItem.description || ""}" ${isManualEntry ? "" : "readonly"}></td>
            <td><input type="text" class="form-control item-manufacturer" value="${currentItem.manufacturer || ""}" ${isManualEntry ? "" : "readonly"}></td>
            <td><input type="number" class="form-control item-quantity" value="${currentItem.quantity || 1}" min="1"></td>
            <td>
                ${isManualEntry 
                    ? `<input type="number" step="0.01" class="form-control item-unit-price-manual" value="${(currentItem.finalPriceUSD || 0).toFixed(2)}">` 
                    : `<span class="unit-price-display">${(currentItem.finalPriceUSD || 0).toFixed(2)}</span>`}
            </td>
            <td><input type="number" step="0.01" class="form-control item-margin-percent" placeholder="Global" value="${currentItem.marginPercent !== null && currentItem.marginPercent !== undefined ? currentItem.marginPercent : ""}" ${isManualEntry ? "disabled" : ""}></td>
            <td>
                ${isManualEntry 
                    ? `<input type="number" step="0.01" class="form-control item-line-total-manual" value="${(currentItem.lineTotalUSD || 0).toFixed(2)}">` 
                    : `<span class="line-total-display">${(currentItem.lineTotalUSD || 0).toFixed(2)}</span>`}
            </td>
            <td><button type="button" class="btn btn-danger btn-sm remove-item-btn"><i class="fas fa-times"></i></button></td>
        `;
        
        if (!isManualEntry) {
            updateAndDisplayItemPrice(row); // Calculate and display initial price for non-manual items
        }
    }

    async function handleBulkAddItems() {
        const token = getAuthToken();
        if (!token) { showBulkAddStatus("Authentication error.", true); return; }

        const manufacturer = bulkAddManufacturerSelect.value;
        const partNumbersRaw = bulkAddPartNumbersTextarea.value;

        if (!manufacturer) {
            showBulkAddStatus("Please select a manufacturer.", true); return;
        }
        if (!partNumbersRaw.trim()) {
            showBulkAddStatus("Please enter part numbers.", true); return;
        }

        const partNumbers = partNumbersRaw.split(/\s*[\n,;]+\s*/).map(pn => pn.trim()).filter(pn => pn);
        if (partNumbers.length === 0) {
            showBulkAddStatus("No valid part numbers entered.", true); return;
        }

        showBulkAddStatus("Adding items...", false);
        showLoading(true);

        try {
            const response = await fetch("/api/products/bulk-lookup", {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ manufacturer, partNumbers }),
            });
            showLoading(false);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: "Server error during bulk add." }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const products = await response.json();
            let itemsAddedCount = 0;
            let itemsNotFound = [];

            products.forEach(product => {
                if (product && !product.error) {
                    // IMPORTANT ASSUMPTION: The backend /api/products/bulk-lookup now needs to return products
                    // with a `basePriceUSDForMarginApplication` field, pre-calculated by a simplified version
                    // of the offer's price calculation (lowest supplier + 3% protection).
                    // For now, we'll use product.basePrice and assume it's USD and has protection for demo.
                    // This needs alignment with backend for true live pricing on bulk add.
                    const lineItemData = {
                        productId: product._id,
                        itemNo: product.itemNo,
                        description: product.description,
                        manufacturer: product.manufacturer,
                        quantity: 1,
                        // THIS IS A PLACEHOLDER - Backend needs to provide this value properly for bulk-added items
                        basePriceUSDForMarginApplication: product.basePriceUSDForMarginApplication || product.basePrice || 0, 
                        marginPercent: null // Default to global margin
                    };
                    addLineItemRow(lineItemData, false);
                    itemsAddedCount++;
                } else if (product && product.error && product.partNumber) {
                    itemsNotFound.push(product.partNumber);
                }
            });

            let statusMessage = `${itemsAddedCount} item(s) added.`;
            if (itemsNotFound.length > 0) {
                statusMessage += ` Part numbers not found: ${itemsNotFound.join(", ")}.`;
            }
            showBulkAddStatus(statusMessage, itemsNotFound.length > 0 && itemsAddedCount === 0);
            bulkAddPartNumbersTextarea.value = ""; // Clear textarea

        } catch (error) {
            showLoading(false);
            showBulkAddStatus(`Error adding items: ${error.message}`, true);
        }
    }

    async function saveOffer(e) {
        e.preventDefault();
        const token = getAuthToken();
        if (!token) { showError("Authentication error. Please log in again."); return; }

        const offerDetails = {
            clientId: clientSelect.value,
            validityDate: validityInput.value || null,
            terms: termsInput.value,
            status: statusSelect.value,
            globalMarginPercent: parseFloat(globalMarginInput.value) || 0,
            lineItems: [],
        };

        if (!offerDetails.clientId) {
            showError("Client is required."); return;
        }

        const rows = lineItemsBody.querySelectorAll("tr");
        rows.forEach(row => {
            const isManual = row.dataset.isManual === "true";
            const itemNoInput = row.querySelector(".item-itemNo");
            const descriptionInput = row.querySelector(".item-description");
            const manufacturerInput = row.querySelector(".item-manufacturer");
            const quantityInput = row.querySelector(".item-quantity");
            const marginInput = row.querySelector(".item-margin-percent");
            
            const lineItem = {
                isManual: isManual,
                itemNo: itemNoInput ? itemNoInput.value : "",
                description: descriptionInput ? descriptionInput.value : "",
                manufacturer: manufacturerInput ? manufacturerInput.value : "",
                quantity: parseInt(quantityInput.value) || 1,
                marginPercent: marginInput && marginInput.value.trim() !== "" ? parseFloat(marginInput.value) : null,
                // For non-manual, productId is crucial. For manual, unit price is crucial.
                productId: !isManual ? row.dataset.productId : null,
                // For manual items, we'd also need to capture the manually entered price
                // The backend will recalculate prices for non-manual items based on productId, qty, margin.
            };
            if (isManual) {
                const manualUnitPriceInput = row.querySelector(".item-unit-price-manual");
                // Backend expects `finalPriceUSD` for manual items if we want to store it directly.
                // However, current backend `calculateLineItemPrice` sets manual items to 0.
                // This part needs alignment if manual prices are to be saved directly.
                // For now, sending minimal data for manual, backend will handle as per its logic.
            }

            offerDetails.lineItems.push(lineItem);
        });

        if (offerDetails.lineItems.length === 0) {
            showError("At least one line item is required."); return;
        }

        showLoading(true);
        showError("");

        const url = currentOfferId ? `/api/offers/${currentOfferId}` : "/api/offers";
        const method = currentOfferId ? "PUT" : "POST";

        try {
            const response = await fetch(url, {
                method: method,
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify(offerDetails),
            });
            showLoading(false);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: "Server error during save." }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const savedOffer = await response.json();
            alert(`Offer ${currentOfferId ? "updated" : "saved"} successfully! Offer ID: ${savedOffer.offerId}`);
            showOfferList();
        } catch (error) {
            showLoading(false);
            showError(`Error saving offer: ${error.message}. Please try again.`);
        }
    }

    async function loadOfferForEditing(id) {
        const token = getAuthToken();
        if (!token) { showError("Authentication error."); return; }
        showLoading(true);
        showError("");
        try {
            const response = await fetch(`/api/offers/${id}`, { headers: { "Authorization": `Bearer ${token}` } });
            showLoading(false);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: "Server error loading offer." }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const offer = await response.json();
            showOfferForm(offer);
        } catch (error) {
            showLoading(false);
            showError(`Error loading offer: ${error.message}`);
            showOfferList(); 
        }
    }

    async function deleteOffer(id) {
        const token = getAuthToken();
        if (!token) { showError("Authentication error."); return; }
        showLoading(true);
        showError("");
        try {
            const response = await fetch(`/api/offers/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } });
            showLoading(false);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: "Server error deleting offer." }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            alert("Offer deleted successfully.");
            loadOffers();
        } catch (error) {
            showLoading(false);
            showError(`Error deleting offer: ${error.message}`);
        }
    }

    async function generateOfferOutput(id, format) {
        const token = getAuthToken();
        if (!token) { alert("Authentication error."); return; }
        showLoading(true);
        try {
            const response = await fetch(`/api/offers/${id}/${format}`, { headers: { "Authorization": `Bearer ${token}` } });
            showLoading(false);
            if (!response.ok) {
                let errorText = `Error generating ${format.toUpperCase()}: ${response.statusText}`;
                try {
                    const errorHtml = await response.text();
                    if (errorHtml.toLowerCase().includes("internal server error")) {
                         errorText = `Internal Server Error generating ${format.toUpperCase()}. Please check server logs.`
                    } else if (response.headers.get("content-type")?.includes("application/json")) {
                        const errorJson = JSON.parse(errorHtml);
                        errorText = errorJson.message || errorText;
                    }
                } catch(e) { /* ignore parsing error, use statusText */ }
                throw new Error(errorText);
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
            showLoading(false);
            alert(error.message);
        }
    }

    // --- Initialization ---
    if (!checkAuth()) return;
    setupEventListeners();
    showOfferList(); 
});

