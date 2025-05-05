const asyncHandler = require("express-async-handler");
const Offer = require("../models/offerModel");
const Client = require("../models/clientModel");
const Product = require("../models/productModel");
const CustomerPriceList = require("../models/customerPriceListModel");
const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const { Parser } = require("@json2csv/plainjs"); // Use plainjs version for sync
const { PassThrough } = require("stream");
const fs = require("fs");
const path = require("path");

// --- Font Paths ---
const primaryFontPath = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
const boldFontPath = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
const fallbackFont = "Helvetica";
const fallbackBoldFont = "Helvetica-Bold";

// --- Logo Path ---
const localLogoPath = path.join(__dirname, "..", "public", "images", "logo.jpg");

// --- Helper Functions --- 

const generateNextOfferId = async () => {
    const date = new Date();
    const prefix = `OFFER-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}-`;
    const lastOffer = await Offer.findOne({ offerId: { $regex: `^${prefix}` } }).sort({ createdAt: -1 });
    let nextNum = 1;
    if (lastOffer) {
        const lastNum = parseInt(lastOffer.offerId.split('-').pop(), 10);
        if (!isNaN(lastNum)) {
            nextNum = lastNum + 1;
        }
    }
    return `${prefix}${nextNum.toString().padStart(3, '0')}`;
};

// Placeholder for exchange rate - replace with a real API call in production
const getExchangeRate = async (fromCurrency, toCurrency) => {
    if (fromCurrency === toCurrency) return 1;
    // Add more realistic rates or integrate an API
    if (fromCurrency === "GBP" && toCurrency === "USD") return 1.25;
    if (fromCurrency === "EUR" && toCurrency === "USD") return 1.10;
    console.warn(`Exchange rate not found for ${fromCurrency} to ${toCurrency}, using 1`);
    return 1;
};

// Enhanced Price Calculation Logic
const calculateLineItemPrice = async (itemData, globalMarginPercent, customerPriceList) => {
    if (itemData.itemType === "manual") {
        // Manual items - pricing TBD, return 0 for now
        return {
            ...itemData,
            finalPriceUSD: 0,
            lineTotalUSD: 0,
            basePrice: 0, // Ensure these are set
            baseCurrency: 'USD'
        };
    }

    if (!itemData.productId) {
        console.error("Missing productId for database item:", itemData);
        throw new Error("Internal error: Product ID missing for database item.");
    }

    const productDetails = await Product.findById(itemData.productId).select("itemNo description manufacturer basePrice baseCurrency");
    if (!productDetails) {
        console.error(`Product not found for ID: ${itemData.productId}`);
        throw new Error(`Product details not found for item ${itemData.itemNo || itemData.productId}.`);
    }

    let effectiveBasePrice = productDetails.basePrice || 0;
    let effectiveBaseCurrency = productDetails.baseCurrency || 'USD';
    const pricingMethod = itemData.pricingMethod || 'Margin'; // Default to Margin if not specified

    // 1. Check Price List if applicable
    if (pricingMethod === "PriceList" && customerPriceList) {
        const priceListItem = customerPriceList.items.find(
            plItem => plItem.itemNo === productDetails.itemNo // Assuming product.itemNo is reliable
            // Add manufacturer check if needed: && plItem.manufacturer === productDetails.manufacturer
        );
        if (priceListItem) {
            effectiveBasePrice = priceListItem.price;
            effectiveBaseCurrency = priceListItem.currency || 'USD';
            console.log(`DEBUG: Using Price List price for ${productDetails.itemNo}: ${effectiveBasePrice} ${effectiveBaseCurrency}`);
        } else {
            console.warn(`Product ${productDetails.itemNo} not found in customer price list. Using default base price.`);
            // Keep productDetails.basePrice and baseCurrency
        }
    }

    // 2. Convert base price to USD
    const rate = await getExchangeRate(effectiveBaseCurrency, "USD");
    const basePriceUSD = effectiveBasePrice * rate;

    // 3. Apply Margin if applicable
    let finalPricePerUnitUSD = basePriceUSD;
    if (pricingMethod === "Margin") {
        // Use per-item margin if provided and valid, otherwise use global margin if valid
        const marginToApply = (itemData.marginPercent !== null && itemData.marginPercent >= 0)
            ? itemData.marginPercent
            : (globalMarginPercent !== null && globalMarginPercent >= 0 ? globalMarginPercent : 0);

        finalPricePerUnitUSD = basePriceUSD * (1 + (marginToApply / 100));
        console.log(`DEBUG: Applying margin for ${productDetails.itemNo}: BaseUSD=${basePriceUSD}, Margin=${marginToApply}%, Final=${finalPricePerUnitUSD}`);
    }

    // 4. Calculate line total
    const lineTotalUSD = finalPricePerUnitUSD * (itemData.quantity || 0);

    // Return the updated item data with calculated prices
    return {
        ...itemData,
        productId: productDetails._id, // Ensure productId is set
        itemNo: productDetails.itemNo,
        description: productDetails.description,
        manufacturer: productDetails.manufacturer,
        basePrice: productDetails.basePrice, // Store original base price for reference
        baseCurrency: productDetails.baseCurrency,
        pricingMethod: pricingMethod,
        marginPercent: (pricingMethod === 'Margin' && itemData.marginPercent !== null) ? itemData.marginPercent : null, // Store only if explicitly set
        finalPriceUSD: finalPricePerUnitUSD,
        lineTotalUSD: lineTotalUSD,
    };
};

// --- PDF Generation Helper (No changes needed here for calculation) ---
const generatePdfStream = async (offer, companyDetails) => {
    // ... (Existing PDF generation code remains the same)
    // It now relies on offer.lineItems having finalPriceUSD calculated
    const doc = new PDFDocument({ margin: 50 });
    const stream = new PassThrough();
    doc.pipe(stream);

    // --- Font Registration ---
    let currentFont = fallbackFont;
    let currentBoldFont = fallbackBoldFont;
    try {
        if (fs.existsSync(primaryFontPath)) {
            doc.registerFont('DejaVuSans', primaryFontPath);
            currentFont = 'DejaVuSans';
            console.log("DEBUG: Registered DejaVuSans font.");
        } else {
            console.warn(`WARN: Font file not found at ${primaryFontPath}, using fallback ${fallbackFont}.`);
        }
        if (fs.existsSync(boldFontPath)) {
            doc.registerFont('DejaVuSans-Bold', boldFontPath);
            currentBoldFont = 'DejaVuSans-Bold';
            console.log("DEBUG: Registered DejaVuSans-Bold font.");
        } else {
            console.warn(`WARN: Font file not found at ${boldFontPath}, using fallback ${fallbackBoldFont}.`);
        }
    } catch (fontError) {
        console.error("ERROR: Failed to register fonts:", fontError);
    }
    doc.font(currentFont);

    // --- Logo (from local file) --- 
    let logoAdded = false;
    try {
        if (fs.existsSync(localLogoPath)) {
            doc.image(localLogoPath, 50, 45, { width: 100 });
            logoAdded = true;
            console.log("DEBUG: Added local logo to PDF.");
        } else {
            console.warn(`WARN: Local logo file not found at ${localLogoPath}. Skipping logo in PDF.`);
        }
    } catch (imgError) {
        console.error("Error embedding local logo:", imgError.message);
    }

    // --- Company Details ---
    const companyTopMargin = logoAdded ? 50 : 50;
    doc.font(currentFont).fontSize(14).text(companyDetails.name, { align: 'right' });
    doc.fontSize(9).text(companyDetails.address, { align: 'right' });
    doc.text(companyDetails.phone, { align: 'right' });
    doc.text(companyDetails.email, { align: 'right' });
    doc.moveDown(2);

    // --- Offer Header ---
    const headerStartY = doc.y;
    doc.font(currentFont).fontSize(18).text(`Offer: ${offer.offerId}`, 50, headerStartY, { align: 'left' });
    doc.fontSize(10).text(`Date: ${offer.createdAt.toLocaleDateString('en-GB')}`, 50, headerStartY + 25);
    if (offer.validityDate) {
        doc.text(`Valid Until: ${offer.validityDate.toLocaleDateString('en-GB')}`, 50, headerStartY + 40);
    }
    doc.moveDown(3);

    // --- Client Details ---
    const clientBoxWidth = 250;
    doc.font(currentFont).fontSize(10).text("Bill To:", 50, doc.y);
    doc.rect(50, doc.y + 2, clientBoxWidth, 70).stroke();
    doc.text(offer.client.companyName || '', 55, doc.y + 5, { width: clientBoxWidth - 10 });
    if (offer.client.clientName) doc.text(offer.client.clientName, 55, doc.y, { width: clientBoxWidth - 10 });
    if (offer.client.address) doc.text(offer.client.address, 55, doc.y, { width: clientBoxWidth - 10 });
    doc.text(`${offer.client.city || ''}, ${offer.client.country || ''}`, 55, doc.y, { width: clientBoxWidth - 10 });
    if (offer.client.email) doc.text(offer.client.email, 55, doc.y, { width: clientBoxWidth - 10 });
    const clientPhone = offer.client.fullPhoneNumber || (offer.client.phoneCountryCode && offer.client.phoneNumber ? `${offer.client.phoneCountryCode} ${offer.client.phoneNumber}` : '');
    if (clientPhone) doc.text(clientPhone, 55, doc.y, { width: clientBoxWidth - 10 });
    doc.y = doc.y + 75;
    doc.moveDown(2);

    // --- Line Items Table ---
    doc.font(currentFont).fontSize(12).text("Items:", { underline: true });
    doc.moveDown();

    const tableTop = doc.y;
    const itemCol = 50;
    const descriptionCol = 120;
    const qtyCol = 340;
    const unitPriceCol = 400;
    const lineTotalCol = 480;
    const tableBottomMargin = 50;

    const drawTableHeader = () => {
        doc.font(currentBoldFont).fontSize(9);
        doc.text("Item No", itemCol, doc.y, { width: descriptionCol - itemCol });
        doc.text("Description", descriptionCol, doc.y, { width: qtyCol - descriptionCol });
        doc.text("Qty", qtyCol, doc.y, { width: unitPriceCol - qtyCol, align: 'right' });
        doc.text("Unit Price", unitPriceCol, doc.y, { width: lineTotalCol - unitPriceCol, align: 'right' });
        doc.text("Line Total", lineTotalCol, doc.y, { align: 'right' });
        doc.font(currentFont);
        doc.moveDown(0.5);
        doc.moveTo(itemCol, doc.y).lineTo(doc.page.width - itemCol, doc.y).strokeColor('#cccccc').stroke();
        doc.moveDown(0.5);
    };

    drawTableHeader();

    let totalOfferValue = 0;
    offer.lineItems.forEach(item => {
        // Use the pre-calculated lineTotalUSD
        const lineTotal = item.lineTotalUSD || 0;
        totalOfferValue += lineTotal;
        const y = doc.y;
        const itemHeight = Math.max(
            doc.heightOfString(item.itemNo || '', { width: descriptionCol - itemCol }),
            doc.heightOfString(item.description || '', { width: qtyCol - descriptionCol })
        ) + 5;

        if (y + itemHeight > doc.page.height - tableBottomMargin) {
            doc.addPage();
            doc.font(currentFont);
            drawTableHeader();
        }

        doc.fontSize(9);
        doc.text(item.itemNo || '', itemCol, doc.y, { width: descriptionCol - itemCol });
        doc.text(item.description || '', descriptionCol, doc.y, { width: qtyCol - descriptionCol });
        doc.text(item.quantity.toString(), qtyCol, doc.y, { width: unitPriceCol - qtyCol, align: 'right' });
        doc.text(`$${(item.finalPriceUSD || 0).toFixed(2)}`, unitPriceCol, doc.y, { width: lineTotalCol - unitPriceCol, align: 'right' });
        doc.text(`$${lineTotal.toFixed(2)}`, lineTotalCol, doc.y, { align: 'right' });
        doc.moveDown(0.5);
        doc.moveTo(itemCol, doc.y).lineTo(doc.page.width - itemCol, doc.y).strokeColor('#eeeeee').stroke();
        doc.moveDown(0.5);
    });

    if (doc.y + 30 > doc.page.height - tableBottomMargin) {
        doc.addPage();
        doc.font(currentFont);
    }

    // --- Offer Total ---
    doc.moveTo(qtyCol, doc.y + 5).lineTo(doc.page.width - itemCol, doc.y + 5).strokeColor('#cccccc').stroke();
    doc.moveDown();
    doc.font(currentBoldFont).fontSize(10);
    doc.text("Total Offer Value (USD):", qtyCol, doc.y, { width: lineTotalCol - qtyCol, align: 'right' });
    doc.text(`$${totalOfferValue.toFixed(2)}`, lineTotalCol, doc.y, { align: 'right' });
    doc.font(currentFont);
    doc.moveDown(2);

    // --- Terms & Conditions ---
    const termsHeight = doc.heightOfString(offer.terms || "", { width: doc.page.width - 100 });
    if (doc.y + termsHeight + 20 > doc.page.height - tableBottomMargin) {
        doc.addPage();
        doc.font(currentFont);
    }
    doc.fontSize(9).text("Terms & Conditions:", { underline: true });
    doc.moveDown(0.5);
    doc.text(offer.terms || "", { align: 'left' });

    doc.end();
    return stream;
};

// --- CSV Generation Helper ---
const generateCsvString = async (offer) => {
    const fields = [
        { label: 'Offer ID', value: 'offerId' },
        { label: 'Client Company', value: 'client.companyName' },
        { label: 'Offer Date', value: 'createdAtFormatted' },
        { label: 'Validity Date', value: 'validityDateFormatted' },
        { label: 'Status', value: 'status' },
        { label: 'Item No', value: 'lineItems.itemNo' },
        { label: 'Description', value: 'lineItems.description' },
        { label: 'Quantity', value: 'lineItems.quantity' },
        { label: 'Unit Price (USD)', value: 'lineItems.finalPriceUSD' },
        { label: 'Line Total (USD)', value: 'lineItems.lineTotalUSD' },
        { label: 'Pricing Method', value: 'lineItems.pricingMethod' },
        { label: 'Margin %', value: 'lineItems.marginPercent' },
    ];

    // Prepare data for CSV - flatten line items
    const data = offer.lineItems.map(item => ({
        offerId: offer.offerId,
        client: { companyName: offer.client?.companyName || 'N/A' },
        createdAtFormatted: offer.createdAt ? offer.createdAt.toLocaleDateString('en-GB') : 'N/A',
        validityDateFormatted: offer.validityDate ? offer.validityDate.toLocaleDateString('en-GB') : 'N/A',
        status: offer.status,
        lineItems: {
            itemNo: item.itemNo || 'N/A',
            description: item.description || 'N/A',
            quantity: item.quantity || 0,
            finalPriceUSD: (item.finalPriceUSD || 0).toFixed(2),
            lineTotalUSD: (item.lineTotalUSD || 0).toFixed(2),
            pricingMethod: item.pricingMethod || 'N/A',
            marginPercent: item.marginPercent !== null ? item.marginPercent.toFixed(2) : 'N/A',
        }
    }));

    if (data.length === 0) { // Handle offers with no items
        data.push({
            offerId: offer.offerId,
            client: { companyName: offer.client?.companyName || 'N/A' },
            createdAtFormatted: offer.createdAt ? offer.createdAt.toLocaleDateString('en-GB') : 'N/A',
            validityDateFormatted: offer.validityDate ? offer.validityDate.toLocaleDateString('en-GB') : 'N/A',
            status: offer.status,
            lineItems: { itemNo: 'No items', description: '', quantity: '', finalPriceUSD: '', lineTotalUSD: '', pricingMethod: '', marginPercent: '' }
        });
    }

    const parser = new Parser({ fields, header: true, eol: '\r\n' });
    const csv = parser.parse(data);

    // Add UTF-8 BOM for Excel compatibility
    return '\ufeff' + csv;
};

// --- Controller Functions ---

// GET /api/offers
const getOffers = asyncHandler(async (req, res) => {
    const offers = await Offer.find({}).populate("client", "clientName companyName").sort({ createdAt: -1 });
    res.json(offers);
});

// GET /api/offers/:id
const getOfferById = asyncHandler(async (req, res) => {
    const offer = await Offer.findById(req.params.id)
        .populate("client") // Populate full client details
        // No need to populate product here, details are stored in line item
        // .populate("lineItems.productId", "itemNo description manufacturer basePrice baseCurrency");

    if (!offer) { res.status(404); throw new Error("Offer not found."); }
    res.json(offer);
});

// POST /api/offers
const createOffer = asyncHandler(async (req, res) => {
    const { clientId, validityDate, terms, status, globalMarginPercent, lineItems } = req.body;

    if (!clientId) { res.status(400); throw new Error("Client ID is required."); }
    const clientExists = await Client.findById(clientId);
    if (!clientExists) { res.status(404); throw new Error("Client not found."); }

    // Fetch customer price list once
    const customerPriceList = await CustomerPriceList.findOne({ client: clientId });

    // Process line items: Calculate prices
    const processedLineItems = await Promise.all(
        (lineItems || []).map(item =>
            calculateLineItemPrice(item, globalMarginPercent, customerPriceList)
        )
    );

    const offerId = await generateNextOfferId();

    const offer = new Offer({
        offerId,
        client: clientId,
        validityDate,
        terms: terms || undefined,
        status: status || "Draft",
        globalMarginPercent: (globalMarginPercent !== null && globalMarginPercent >= 0) ? globalMarginPercent : null,
        lineItems: processedLineItems,
    });

    const createdOffer = await offer.save();
    // Populate client before sending response
    const populatedOffer = await Offer.findById(createdOffer._id).populate("client");
    res.status(201).json(populatedOffer);
});

// PUT /api/offers/:id
const updateOffer = asyncHandler(async (req, res) => {
    const { clientId, validityDate, terms, status, globalMarginPercent, lineItems } = req.body;
    const offer = await Offer.findById(req.params.id);

    if (!offer) { res.status(404); throw new Error("Offer not found."); }

    // Basic validation/checks (can be expanded)
    // if (offer.status !== 'Draft' && ...) { /* potentially restrict updates */ }

    // Fetch customer price list if client changes or if needed for calculations
    const targetClientId = clientId || offer.client;
    const customerPriceList = await CustomerPriceList.findOne({ client: targetClientId });

    // Process line items: Recalculate prices
    const processedLineItems = await Promise.all(
        (lineItems || []).map(item =>
            calculateLineItemPrice(item, globalMarginPercent, customerPriceList)
        )
    );

    // Update offer fields
    if (clientId) {
        const clientExists = await Client.findById(clientId);
        if (!clientExists) { res.status(404); throw new Error("Client not found."); }
        offer.client = clientId;
    }
    offer.validityDate = validityDate !== undefined ? validityDate : offer.validityDate;
    offer.terms = terms !== undefined ? terms : offer.terms;
    offer.status = status || offer.status;
    offer.globalMarginPercent = (globalMarginPercent !== null && globalMarginPercent >= 0) ? globalMarginPercent : offer.globalMarginPercent;
    offer.lineItems = processedLineItems;

    const updatedOffer = await offer.save();
    // Populate client before sending response
    const populatedOffer = await Offer.findById(updatedOffer._id).populate("client");
    res.json(populatedOffer);
});

// DELETE /api/offers/:id
const deleteOffer = asyncHandler(async (req, res) => {
    const offer = await Offer.findById(req.params.id);
    if (!offer) { res.status(404); throw new Error("Offer not found."); }
    if (offer.status !== 'Draft') {
        res.status(400);
        throw new Error(`Cannot delete offer with status: ${offer.status}.`);
    }
    await offer.deleteOne();
    res.json({ message: "Offer removed." });
});

// GET /api/offers/:id/pdf
const generateOfferPdf = asyncHandler(async (req, res) => {
    const offer = await Offer.findById(req.params.id).populate('client');
    if (!offer) { res.status(404); throw new Error('Offer not found'); }
    if (!offer.client) { res.status(400); throw new Error('Client details missing for this offer'); }

    // Dummy company details - replace with actual data source if needed
    const companyDetails = {
        name: "PRO MAKROMED Sağlık Ürünleri",
        address: "Esenşehir, Güneyli Sk. No:15/1, 34776 Ümraniye/İstanbul, Türkiye",
        phone: "+90 216 344 91 51",
        email: "sales@promakromed.com"
    };

    const pdfStream = await generatePdfStream(offer, companyDetails);
    const filename = `Offer_${offer.offerId || req.params.id}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    pdfStream.pipe(res);
});

// GET /api/offers/:id/csv
const generateOfferCsv = asyncHandler(async (req, res) => {
    const offer = await Offer.findById(req.params.id).populate('client', 'companyName');
    if (!offer) { res.status(404); throw new Error('Offer not found'); }

    const csvString = await generateCsvString(offer);
    const filename = `Offer_${offer.offerId || req.params.id}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8'); // Ensure UTF-8 charset
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvString);
});

module.exports = {
    createOffer,
    getOffers,
    getOfferById,
    updateOffer,
    deleteOffer,
    generateOfferPdf,
    generateOfferCsv,
    // addManualOfferLineItem, // Keep commented out unless specifically needed
    // updateOfferLineItem,   // Keep commented out unless specifically needed
};

