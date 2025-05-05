const asyncHandler = require("express-async-handler");
const Offer = require("../models/offerModel");
const Client = require("../models/clientModel");
const Product = require("../models/productModel");
const CustomerPriceList = require("../models/customerPriceListModel");
const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const { PassThrough } = require("stream");
const axios = require("axios"); // Import axios for fetching logo
const fs = require("fs"); // Import fs for checking font file existence

// --- Font Paths ---
const primaryFontPath = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
const boldFontPath = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
const fallbackFont = "Helvetica"; // Default fallback
const fallbackBoldFont = "Helvetica-Bold";

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

const getExchangeRate = async (fromCurrency, toCurrency) => {
    if (fromCurrency === toCurrency) return 1;
    if (fromCurrency === "GBP" && toCurrency === "USD") return 1.25;
    if (fromCurrency === "EUR" && toCurrency === "USD") return 1.10;
    console.warn(`Exchange rate not found for ${fromCurrency} to ${toCurrency}, using 1`);
    return 1;
};

const calculateFinalPriceUSD = async (productDetails, quantity, pricingMethod, marginPercent, customerPriceList) => {
    let basePrice = productDetails.basePrice;
    let baseCurrency = productDetails.baseCurrency;
    let finalPricePerUnitUSD = 0;

    if (pricingMethod === "PriceList" && customerPriceList) {
        const priceListItem = customerPriceList.items.find(
            item => item.itemNo === productDetails.itemNo && item.manufacturer === productDetails.manufacturer
        );
        if (priceListItem) {
            basePrice = priceListItem.price;
            baseCurrency = priceListItem.currency;
        } else {
            console.warn(`Product ${productDetails.itemNo} not found in customer price list. Falling back to default pricing.`);
            basePrice = productDetails.basePrice;
            baseCurrency = productDetails.baseCurrency;
        }
    }

    const rate = await getExchangeRate(baseCurrency, "USD");
    let basePriceUSD = basePrice * rate;

    if (pricingMethod === "Margin") {
        finalPricePerUnitUSD = basePriceUSD * (1 + (marginPercent / 100));
    } else {
        finalPricePerUnitUSD = basePriceUSD;
    }

    return finalPricePerUnitUSD;
};

// --- PDF Generation Helper ---
// Fetches image data from URL
const fetchImage = async (url) => {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return Buffer.from(response.data, 'binary');
    } catch (error) {
        console.error(`Failed to fetch image from ${url}:`, error.message);
        return null;
    }
};

const generatePdfStream = async (offer, companyDetails) => {
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
        // Keep using fallback fonts
    }

    // Set default font
    doc.font(currentFont);

    // --- Logo --- 
    let logoData = null;
    if (companyDetails.logoUrl) {
        logoData = await fetchImage(companyDetails.logoUrl);
    }
    if (logoData) {
        try {
            // Embed the logo - adjust position and size as needed
            doc.image(logoData, 50, 45, { width: 100 }); // Example position (left side)
        } catch (imgError) {
            console.error("Error embedding logo:", imgError.message);
        }
    }

    // --- Company Details (Right Aligned) ---
    const companyTopMargin = logoData ? 50 : 50; // Adjust top margin if logo exists
    doc.font(currentFont).fontSize(14).text(companyDetails.name, { align: 'right' });
    doc.fontSize(9).text(companyDetails.address, { align: 'right' });
    doc.text(companyDetails.phone, { align: 'right' });
    doc.text(companyDetails.email, { align: 'right' });
    doc.moveDown(2);

    // --- Offer Header ---
    const headerStartY = doc.y;
    doc.font(currentFont).fontSize(18).text(`Offer: ${offer.offerId}`, 50, headerStartY, { align: 'left' });
    doc.fontSize(10).text(`Date: ${offer.createdAt.toLocaleDateString('en-GB')}`, 50, headerStartY + 25); // Use en-GB for DD/MM/YYYY
    if (offer.validityDate) {
        doc.text(`Valid Until: ${offer.validityDate.toLocaleDateString('en-GB')}`, 50, headerStartY + 40); // Use en-GB for DD/MM/YYYY
    }
    doc.moveDown(3); // Extra space after header block

    // --- Client Details ---
    const clientBoxWidth = 250;
    doc.font(currentFont).fontSize(10).text("Bill To:", 50, doc.y);
    doc.rect(50, doc.y + 2, clientBoxWidth, 70).stroke(); // Box around client details
    doc.text(offer.client.companyName || '', 55, doc.y + 5, { width: clientBoxWidth - 10 });
    if (offer.client.clientName) doc.text(offer.client.clientName, 55, doc.y, { width: clientBoxWidth - 10 });
    if (offer.client.address) doc.text(offer.client.address, 55, doc.y, { width: clientBoxWidth - 10 });
    doc.text(`${offer.client.city || ''}, ${offer.client.country || ''}`, 55, doc.y, { width: clientBoxWidth - 10 });
    if (offer.client.email) doc.text(offer.client.email, 55, doc.y, { width: clientBoxWidth - 10 });
    // Use fullPhoneNumber if available from client model
    const clientPhone = offer.client.fullPhoneNumber || (offer.client.phoneCountryCode && offer.client.phoneNumber ? `${offer.client.phoneCountryCode} ${offer.client.phoneNumber}` : '');
    if (clientPhone) doc.text(clientPhone, 55, doc.y, { width: clientBoxWidth - 10 });
    doc.y = doc.y + 75; // Move below the client box
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
    const tableBottomMargin = 50; // Margin from page bottom

    const drawTableHeader = () => {
        doc.font(currentBoldFont).fontSize(9); // Use bold font for header
        doc.text("Item No", itemCol, doc.y, { width: descriptionCol - itemCol });
        doc.text("Description", descriptionCol, doc.y, { width: qtyCol - descriptionCol });
        doc.text("Qty", qtyCol, doc.y, { width: unitPriceCol - qtyCol, align: 'right' });
        doc.text("Unit Price", unitPriceCol, doc.y, { width: lineTotalCol - unitPriceCol, align: 'right' });
        doc.text("Line Total", lineTotalCol, doc.y, { align: 'right' });
        doc.font(currentFont); // Switch back to regular font
        doc.moveDown(0.5);
        doc.moveTo(itemCol, doc.y).lineTo(doc.page.width - itemCol, doc.y).strokeColor('#cccccc').stroke();
        doc.moveDown(0.5);
    };

    drawTableHeader();

    let totalOfferValue = 0;
    offer.lineItems.forEach(item => {
        const lineTotal = item.quantity * item.finalPriceUSD;
        totalOfferValue += lineTotal;
        const y = doc.y;
        const itemHeight = Math.max(
            doc.heightOfString(item.itemNo || '', { width: descriptionCol - itemCol }),
            doc.heightOfString(item.description || '', { width: qtyCol - descriptionCol })
        ) + 5; // Add padding

        // Check if item fits on the current page
        if (y + itemHeight > doc.page.height - tableBottomMargin) {
            doc.addPage();
            doc.font(currentFont); // Ensure font is reset on new page
            drawTableHeader();
        }

        doc.fontSize(9);
        doc.text(item.itemNo || '', itemCol, doc.y, { width: descriptionCol - itemCol });
        doc.text(item.description || '', descriptionCol, doc.y, { width: qtyCol - descriptionCol });
        doc.text(item.quantity.toString(), qtyCol, doc.y, { width: unitPriceCol - qtyCol, align: 'right' });
        doc.text(`$${item.finalPriceUSD.toFixed(2)}`, unitPriceCol, doc.y, { width: lineTotalCol - unitPriceCol, align: 'right' });
        doc.text(`$${lineTotal.toFixed(2)}`, lineTotalCol, doc.y, { align: 'right' });
        doc.moveDown(0.5);
        doc.moveTo(itemCol, doc.y).lineTo(doc.page.width - itemCol, doc.y).strokeColor('#eeeeee').stroke();
        doc.moveDown(0.5);
    });

    // Check if total fits
    if (doc.y + 30 > doc.page.height - tableBottomMargin) {
        doc.addPage();
        doc.font(currentFont); // Ensure font is reset on new page
    }

    // --- Offer Total ---
    doc.moveTo(qtyCol, doc.y + 5).lineTo(doc.page.width - itemCol, doc.y + 5).strokeColor('#cccccc').stroke();
    doc.moveDown();
    doc.font(currentBoldFont).fontSize(10); // Use bold font for total
    doc.text("Total Offer Value (USD):", qtyCol, doc.y, { width: lineTotalCol - qtyCol, align: 'right' });
    doc.text(`$${totalOfferValue.toFixed(2)}`, lineTotalCol, doc.y, { align: 'right' });
    doc.font(currentFont); // Switch back to regular font
    doc.moveDown(2);

    // --- Terms & Conditions ---
    // Check if terms fit
    const termsHeight = doc.heightOfString(offer.terms || "", { width: doc.page.width - 100 });
    if (doc.y + termsHeight + 20 > doc.page.height - tableBottomMargin) {
        doc.addPage();
        doc.font(currentFont); // Ensure font is reset on new page
    }
    doc.fontSize(9).text("Terms & Conditions:", { underline: true });
    doc.moveDown(0.5);
    doc.text(offer.terms || "", { align: 'left' });

    // Finalize PDF
    doc.end();

    return stream;
};

// --- Controller Functions ---

const createOffer = asyncHandler(async (req, res) => {
    const { clientId, validityDate, terms } = req.body;
    if (!clientId) { res.status(400); throw new Error("Client ID is required."); }
    const clientExists = await Client.findById(clientId);
    if (!clientExists) { res.status(404); throw new Error("Client not found."); }
    const offerId = await generateNextOfferId();
    const offer = new Offer({ offerId, client: clientId, validityDate, terms: terms || undefined });
    const createdOffer = await offer.save();
    res.status(201).json(createdOffer);
});

const getOffers = asyncHandler(async (req, res) => {
    const offers = await Offer.find({}).populate("client", "clientName companyName").sort({ createdAt: -1 });
    res.json(offers);
});

const getOfferById = asyncHandler(async (req, res) => {
    const offer = await Offer.findById(req.params.id)
        .populate("client")
        .populate("lineItems.product", "itemNo description manufacturer size brand offers winner");
    if (!offer) { res.status(404); throw new Error("Offer not found."); }
    res.json(offer);
});

const updateOffer = asyncHandler(async (req, res) => {
    const { clientId, validityDate, terms, status } = req.body;
    const offer = await Offer.findById(req.params.id);
    if (!offer) { res.status(404); throw new Error("Offer not found."); }
    if (offer.status !== 'Draft' && status === 'Draft') {
        // Allow reverting to draft? Maybe not.
    }
    if (offer.status !== 'Draft' && (clientId || validityDate || terms)) {
        // Prevent changing core details after sending? Optional.
        // res.status(400); throw new Error(`Cannot modify details of offer with status: ${offer.status}.`);
    }
    if (clientId) {
        const clientExists = await Client.findById(clientId);
        if (!clientExists) { res.status(404); throw new Error("Client not found."); }
        offer.client = clientId;
    }
    offer.validityDate = validityDate !== undefined ? validityDate : offer.validityDate;
    offer.terms = terms !== undefined ? terms : offer.terms;
    offer.status = status || offer.status;
    const updatedOffer = await offer.save();
    res.json(updatedOffer);
});

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

// Add Offer Line Item (Manual Entry - Placeholder for now)
const addManualOfferLineItem = asyncHandler(async (req, res) => {
    const { itemNumber, description, quantity } = req.body;
    const offerId = req.params.id;

    if (!itemNumber || !description || !quantity) {
        res.status(400);
        throw new Error("Item number, description, and quantity are required for manual entry.");
    }

    const offer = await Offer.findById(offerId);
    if (!offer) {
        res.status(404);
        throw new Error("Offer not found.");
    }
    if (offer.status !== 'Draft') {
        res.status(400);
        throw new Error(`Cannot modify offer with status: ${offer.status}.`);
    }

    // For manual items, we don't have a product link or base price from DB
    // We'll store the provided details and maybe a default price or $0
    const newLineItem = {
        // product: null, // No product link for manual items
        itemNo: itemNumber,
        description: description,
        manufacturer: "Manual Entry", // Indicate manual entry
        quantity: parseInt(quantity, 10),
        basePrice: 0, // Placeholder - pricing needs more thought for manual items
        baseCurrency: "USD",
        pricingMethod: "Margin", // Default or needs to be specified?
        marginPercent: 0,
        finalPriceUSD: 0, // Placeholder - needs calculation logic
    };

    offer.lineItems.push(newLineItem);
    const updatedOffer = await offer.save();
    res.status(201).json(updatedOffer);
});

// Update Offer Line Item (Placeholder - needs specific logic for manual vs product items)
const updateOfferLineItem = asyncHandler(async (req, res) => {
    const { quantity } = req.body;
    const offerId = req.params.id;
    const lineItemId = req.params.itemId; // Assuming frontend sends a unique ID for the row

    const offer = await Offer.findById(offerId);
    if (!offer) { res.status(404); throw new Error("Offer not found."); }
    if (offer.status !== 'Draft') { res.status(400); throw new Error(`Cannot modify offer with status: ${offer.status}.`); }

    // Find the line item - This needs refinement. How to identify manual vs product items?
    // Using index for now, but this is fragile.
    const itemIndex = offer.lineItems.findIndex(item => item._id && item._id.toString() === lineItemId);

    if (itemIndex === -1) {
        res.status(404); throw new Error("Line item not found.");
    }

    if (quantity !== undefined) {
        if (quantity <= 0) { res.status(400); throw new Error("Quantity must be > 0."); }
        offer.lineItems[itemIndex].quantity = quantity;
        // Recalculate finalPriceUSD if needed
        // offer.lineItems[itemIndex].finalPriceUSD = calculateNewPrice(...);
    }

    // Add logic for updating other fields like description, itemNo for manual items?

    const updatedOffer = await offer.save();
    res.json(updatedOffer);
});

// Remove Offer Line Item (Placeholder)
const removeOfferLineItem = asyncHandler(async (req, res) => {
    const offerId = req.params.id;
    const lineItemId = req.params.itemId; // Assuming frontend sends a unique ID for the row

    const offer = await Offer.findById(offerId);
    if (!offer) { res.status(404); throw new Error("Offer not found."); }
    if (offer.status !== 'Draft') { res.status(400); throw new Error(`Cannot modify offer with status: ${offer.status}.`); }

    // Remove the line item - Needs refinement for identification
    const initialLength = offer.lineItems.length;
    offer.lineItems = offer.lineItems.filter(item => !(item._id && item._id.toString() === lineItemId));

    if (offer.lineItems.length === initialLength) {
        res.status(404); throw new Error("Line item not found to remove.");
    }

    const updatedOffer = await offer.save();
    res.json(updatedOffer);
});

// Generate PDF for Offer
const generateOfferPdf = asyncHandler(async (req, res) => {
    const offer = await Offer.findById(req.params.id).populate('client');
    if (!offer) { res.status(404); throw new Error("Offer not found."); }

    // Fetch company details (replace with actual logic if stored elsewhere)
    const companyDetails = {
        name: "Pro Makromed Sağlık Ürünleri",
        address: "Esenşehir, Güneyli Sk. No:15/1, 34776 Ümraniye/İstanbul, Türkiye",
        phone: "+90 216 344 91 51",
        email: "sales@promakromed.com",
        logoUrl: "https://promakromed.com/wp-content/uploads/2023/05/logo-promakro-sf.png" // Replace with your actual logo URL
    };

    const pdfStream = await generatePdfStream(offer, companyDetails);
    const filename = `Offer_${offer.offerId}_${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    pdfStream.pipe(res);
});

// Generate CSV for Offer
const generateOfferCsv = asyncHandler(async (req, res) => {
    const offer = await Offer.findById(req.params.id).populate('client').populate('lineItems.product');
    if (!offer) { res.status(404); throw new Error("Offer not found."); }

    // UTF-8 BOM to help Excel with Turkish characters
    const BOM = "\ufeff"; 
    let csvContent = BOM + "Item No,Description,Manufacturer,Quantity,Unit Price (USD),Line Total (USD)\n";
    let totalValue = 0;

    offer.lineItems.forEach(item => {
        const lineTotal = item.quantity * item.finalPriceUSD;
        totalValue += lineTotal;
        // Ensure fields are properly quoted if they contain commas or quotes
        const itemNo = `"${(item.itemNo || '').replace(/"/g, '""')}"`;
        const description = `"${(item.description || '').replace(/"/g, '""')}"`;
        const manufacturer = `"${(item.manufacturer || '').replace(/"/g, '""')}"`;
        csvContent += `${itemNo},${description},${manufacturer},${item.quantity},${item.finalPriceUSD.toFixed(2)},${lineTotal.toFixed(2)}\n`;
    });

    csvContent += `\n,,,Total Offer Value (USD):,${totalValue.toFixed(2)}\n`;
    csvContent += `\nClient:,${offer.client.companyName || offer.client.clientName}\n`;
    csvContent += `Offer ID:,${offer.offerId}\n`;
    csvContent += `Date:,${offer.createdAt.toLocaleDateString('en-GB')}\n`;
    csvContent += `Validity:,${offer.validityDate ? offer.validityDate.toLocaleDateString('en-GB') : 'N/A'}\n`;
    csvContent += `Status:,${offer.status}\n`;

    const filename = `Offer_${offer.offerId}_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8'); // Specify UTF-8 charset
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
});

module.exports = {
    createOffer,
    getOffers,
    getOfferById,
    updateOffer,
    deleteOffer,
    addManualOfferLineItem, // Use this for manual adds
    updateOfferLineItem,
    removeOfferLineItem,
    generateOfferPdf,
    generateOfferCsv,
};

