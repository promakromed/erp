const asyncHandler = require("express-async-handler");
const Offer = require("../models/offerModel");
const Client = require("../models/clientModel");
const Product = require("../models/productModel");
const CustomerPriceList = require("../models/customerPriceListModel");
const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const { PassThrough } = require("stream");
const axios = require("axios"); // Import axios for fetching logo

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
    doc.fontSize(14).text(companyDetails.name, { align: 'right' });
    doc.fontSize(9).text(companyDetails.address, { align: 'right' });
    doc.text(companyDetails.phone, { align: 'right' });
    doc.text(companyDetails.email, { align: 'right' });
    doc.moveDown(2);

    // --- Offer Header ---
    const headerStartY = doc.y;
    doc.fontSize(18).text(`Offer: ${offer.offerId}`, 50, headerStartY, { align: 'left' });
    doc.fontSize(10).text(`Date: ${offer.createdAt.toLocaleDateString()}`, 50, headerStartY + 25);
    if (offer.validityDate) {
        doc.text(`Valid Until: ${offer.validityDate.toLocaleDateString()}`, 50, headerStartY + 40);
    }
    doc.moveDown(3); // Extra space after header block

    // --- Client Details ---
    const clientBoxWidth = 250;
    doc.fontSize(10).text("Bill To:", 50, doc.y);
    doc.rect(50, doc.y + 2, clientBoxWidth, 70).stroke(); // Box around client details
    doc.text(offer.client.companyName, 55, doc.y + 5, { width: clientBoxWidth - 10 });
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
    doc.fontSize(12).text("Items:", { underline: true });
    doc.moveDown();

    const tableTop = doc.y;
    const itemCol = 50;
    const descriptionCol = 120;
    const qtyCol = 340;
    const unitPriceCol = 400;
    const lineTotalCol = 480;
    const tableBottomMargin = 50; // Margin from page bottom

    const drawTableHeader = () => {
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text("Item No", itemCol, doc.y, { width: descriptionCol - itemCol });
        doc.text("Description", descriptionCol, doc.y, { width: qtyCol - descriptionCol });
        doc.text("Qty", qtyCol, doc.y, { width: unitPriceCol - qtyCol, align: 'right' });
        doc.text("Unit Price", unitPriceCol, doc.y, { width: lineTotalCol - unitPriceCol, align: 'right' });
        doc.text("Line Total", lineTotalCol, doc.y, { align: 'right' });
        doc.font('Helvetica');
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
            doc.heightOfString(item.itemNo, { width: descriptionCol - itemCol }),
            doc.heightOfString(item.description, { width: qtyCol - descriptionCol })
        ) + 5; // Add padding

        // Check if item fits on the current page
        if (y + itemHeight > doc.page.height - tableBottomMargin) {
            doc.addPage();
            drawTableHeader();
        }

        doc.fontSize(9);
        doc.text(item.itemNo, itemCol, doc.y, { width: descriptionCol - itemCol });
        doc.text(item.description, descriptionCol, doc.y, { width: qtyCol - descriptionCol });
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
    }

    // --- Offer Total ---
    doc.moveTo(qtyCol, doc.y + 5).lineTo(doc.page.width - itemCol, doc.y + 5).strokeColor('#cccccc').stroke();
    doc.moveDown();
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text("Total Offer Value (USD):", qtyCol, doc.y, { width: lineTotalCol - qtyCol, align: 'right' });
    doc.text(`$${totalOfferValue.toFixed(2)}`, lineTotalCol, doc.y, { align: 'right' });
    doc.font('Helvetica');
    doc.moveDown(2);

    // --- Terms & Conditions ---
    // Check if terms fit
    const termsHeight = doc.heightOfString(offer.terms || "", { width: doc.page.width - 100 });
    if (doc.y + termsHeight + 20 > doc.page.height - tableBottomMargin) {
        doc.addPage();
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

const addOfferLineItem = asyncHandler(async (req, res) => {
    const { productId, quantity, pricingMethod, marginPercent } = req.body;
    if (!productId || !quantity || !pricingMethod) { res.status(400); throw new Error("ProductId, quantity, pricingMethod required."); }
    if (pricingMethod === "Margin" && marginPercent === undefined) { res.status(400); throw new Error("Margin required for Margin method."); }

    const offer = await Offer.findById(req.params.id).populate('client');
    if (!offer) { res.status(404); throw new Error("Offer not found."); }
    if (offer.status !== 'Draft') { res.status(400); throw new Error(`Cannot modify offer with status: ${offer.status}.`); }

    const product = await Product.findById(productId);
    if (!product) { res.status(404); throw new Error("Product not found."); }

    if (offer.lineItems.some(item => item.product.toString() === productId)) {
        res.status(400); throw new Error("Product already exists in offer. Update quantity or remove first.");
    }

    let customerPriceList = null;
    if (pricingMethod === "PriceList") {
        customerPriceList = await CustomerPriceList.findOne({ client: offer.client._id });
        if (!customerPriceList) { res.status(400); throw new Error("Customer price list not found."); }
    }

    let basePrice = 0, baseCurrency = "USD";
    if (product.winner && product.offers && product.offers[product.winner]) {
        const parts = product.offers[product.winner].split(' ');
        if (parts.length === 2) { basePrice = parseFloat(parts[0]); baseCurrency = parts[1]; }
        else { throw new Error(`Could not parse base price for product ${product.itemNo}`); }
    } else { throw new Error(`No winning price found for product ${product.itemNo}`); }

    const productDetails = { itemNo: product.itemNo, manufacturer: product.manufacturer, basePrice, baseCurrency };
    const finalPriceUSD = await calculateFinalPriceUSD(productDetails, quantity, pricingMethod, pricingMethod === "Margin" ? marginPercent : 0, customerPriceList);

    const newLineItem = { product: productId, quantity, description: product.description, itemNo: product.itemNo, manufacturer: product.manufacturer, basePrice, baseCurrency, pricingMethod, marginPercent: pricingMethod === "Margin" ? marginPercent : undefined, finalPriceUSD };
    offer.lineItems.push(newLineItem);
    // Mongoose assigns _id to subdocument here
    const updatedOffer = await offer.save();
    const populatedOffer = await Offer.findById(updatedOffer._id).populate("client").populate("lineItems.product");
    res.status(201).json(populatedOffer);
});

const updateOfferLineItem = asyncHandler(async (req, res) => {
    const { quantity, pricingMethod, marginPercent } = req.body;
    const lineItemId = req.params.itemId; // Use subdocument _id

    const offer = await Offer.findById(req.params.id).populate('client');
    if (!offer) { res.status(404); throw new Error("Offer not found."); }
    if (offer.status !== 'Draft') { res.status(400); throw new Error(`Cannot modify offer with status: ${offer.status}.`); }

    const lineItem = offer.lineItems.id(lineItemId);
    if (!lineItem) { res.status(404); throw new Error("Line item not found."); }

    let needsRecalculation = false;
    if (quantity !== undefined) {
        if (quantity <= 0) { res.status(400); throw new Error("Quantity must be > 0."); }
        if (lineItem.quantity !== quantity) {
             lineItem.quantity = quantity;
             needsRecalculation = true;
        }
    }

    const newPricingMethod = pricingMethod || lineItem.pricingMethod;
    const newMarginPercent = marginPercent !== undefined ? marginPercent : lineItem.marginPercent;

    if (pricingMethod || marginPercent !== undefined) {
        if (newPricingMethod === "Margin" && newMarginPercent === undefined) { res.status(400); throw new Error("Margin required for Margin method."); }
        if (lineItem.pricingMethod !== newPricingMethod || lineItem.marginPercent !== newMarginPercent) {
            needsRecalculation = true;
        }
    }

    if (needsRecalculation) {
        let customerPriceList = null;
        if (newPricingMethod === "PriceList") {
            customerPriceList = await CustomerPriceList.findOne({ client: offer.client._id });
            if (!customerPriceList) { res.status(400); throw new Error("Customer price list not found."); }
        }

        const product = await Product.findById(lineItem.product);
        if (!product) { res.status(404); throw new Error("Original product not found."); }

        let basePrice = 0, baseCurrency = "USD";
        if (product.winner && product.offers && product.offers[product.winner]) {
            const parts = product.offers[product.winner].split(' ');
            if (parts.length === 2) { basePrice = parseFloat(parts[0]); baseCurrency = parts[1]; }
            else { throw new Error(`Could not parse base price for product ${product.itemNo}`); }
        } else { throw new Error(`No winning price found for product ${product.itemNo}`); }

        const productDetails = { itemNo: product.itemNo, manufacturer: product.manufacturer, basePrice, baseCurrency };
        lineItem.finalPriceUSD = await calculateFinalPriceUSD(productDetails, lineItem.quantity, newPricingMethod, newPricingMethod === "Margin" ? newMarginPercent : 0, customerPriceList);
        lineItem.pricingMethod = newPricingMethod;
        lineItem.marginPercent = newPricingMethod === "Margin" ? newMarginPercent : undefined;
        lineItem.basePrice = basePrice;
        lineItem.baseCurrency = baseCurrency;
    }

    const updatedOffer = await offer.save();
    const populatedOffer = await Offer.findById(updatedOffer._id).populate("client").populate("lineItems.product");
    res.json(populatedOffer);
});

const removeOfferLineItem = asyncHandler(async (req, res) => {
    const lineItemId = req.params.itemId;
    const offer = await Offer.findById(req.params.id);
    if (!offer) { res.status(404); throw new Error("Offer not found."); }
    if (offer.status !== 'Draft') { res.status(400); throw new Error(`Cannot modify offer with status: ${offer.status}.`); }

    const lineItem = offer.lineItems.id(lineItemId);
    if (!lineItem) { res.status(404); throw new Error("Line item not found."); }

    lineItem.deleteOne();

    const updatedOffer = await offer.save();
    const populatedOffer = await Offer.findById(updatedOffer._id).populate("client").populate("lineItems.product");
    res.json(populatedOffer);
});

const generateOfferPDF = asyncHandler(async (req, res) => {
    const offer = await Offer.findById(req.params.id)
        .populate("client")
        .populate("lineItems.product", "size brand");
    if (!offer) { res.status(404); throw new Error("Offer not found."); }

    const companyDetails = {
        name: "Pro Makromed Sağlık Ürünleri",
        address: "Esenşehir, Güneyli Sk. No:15/1, 34776 Ümraniye/İstanbul, Türkiye",
        phone: "+90 216 344 91 51",
        email: "sales@promakromed.com",
        logoUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSMbA5enbVJzPfAwNCnvqbCGK1hBRqmONJo6wyJMTZl9zfv_l3gGA&s=10&ec=72940544"
    };

    try {
        const pdfStream = await generatePdfStream(offer, companyDetails);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="Offer_${offer.offerId}.pdf"`);
        pdfStream.pipe(res);
    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500); throw new Error("Failed to generate PDF.");
    }
});

const generateOfferCSV = asyncHandler(async (req, res) => {
     const offer = await Offer.findById(req.params.id)
        .populate("client", "companyName")
        .populate("lineItems.product", "size brand");
    if (!offer) { res.status(404); throw new Error("Offer not found."); }

    const { AsyncParser } = require("@json2csv/node");
    const companyName = "Pro Makromed Sağlık Ürünleri";

    try {
        const fields = [
            { label: "Company", value: "companyName" },
            { label: "Offer ID", value: "offerId" },
            { label: "Client Company", value: "client.companyName" },
            { label: "Status", value: "status" },
            { label: "Validity Date", value: "validityDate" },
            { label: "Item No", value: "itemNo" },
            { label: "Description", value: "description" },
            { label: "Manufacturer", value: "manufacturer" },
            { label: "Brand", value: "product.brand" },
            { label: "Size", value: "product.size" },
            { label: "Quantity", value: "quantity" },
            { label: "Unit Price (USD)", value: (row) => row.finalPriceUSD.toFixed(2) }, // Ensure formatting
            { label: "Line Total (USD)", value: (row) => (row.quantity * row.finalPriceUSD).toFixed(2) }
        ];

        const data = offer.lineItems.map(item => ({
            ...item.toObject(),
            companyName: companyName,
            offerId: offer.offerId,
            client: offer.client,
            status: offer.status,
            validityDate: offer.validityDate ? offer.validityDate.toISOString().split('T')[0] : '',
            product: item.product ? item.product.toObject() : {}
        }));

        const parser = new AsyncParser({ fields });
        const csv = await parser.parse(data).promise();

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="Offer_${offer.offerId}.csv"`);
        res.status(200).send(csv);
    } catch (error) {
        console.error("Error generating CSV:", error);
        res.status(500); throw new Error("Failed to generate CSV.");
    }
});

module.exports = {
    createOffer, getOffers, getOfferById, updateOffer, deleteOffer,
    addOfferLineItem, updateOfferLineItem, removeOfferLineItem,
    generateOfferPDF, generateOfferCSV
};

