const asyncHandler = require("express-async-handler");
const Offer = require("../models/offerModel");
const Client = require("../models/clientModel");
const Product = require("../models/productModel");
const CustomerPriceList = require("../models/customerPriceListModel");
const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const { Parser } = require("@json2csv/plainjs");
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

const getExchangeRate = async (fromCurrency, toCurrency) => {
    if (fromCurrency === toCurrency) return 1;
    if (fromCurrency === "GBP" && toCurrency === "USD") return 1.25;
    if (fromCurrency === "EUR" && toCurrency === "USD") return 1.10;
    console.warn(`Exchange rate not found for ${fromCurrency} to ${toCurrency}, using 1`);
    return 1;
};

const calculateLineItemPrice = async (itemData, globalMarginPercent, customerPriceList) => {
    if (itemData.itemType === "manual") {
        return {
            ...itemData,
            finalPriceUSD: 0,
            lineTotalUSD: 0,
            basePrice: 0,
            baseCurrency: 'USD'
        };
    }

    if (!itemData.productId) {
        console.error("Missing productId for database item:", itemData);
        throw new Error("Internal error: Product ID missing for database item.");
    }

    const productDetails = await Product.findById(itemData.productId)
        .populate('supplierOffers')
        .select("itemNo description manufacturer basePrice baseCurrency supplierOffers");

    if (!productDetails) {
        console.error(`Product not found for ID: ${itemData.productId}`);
        throw new Error(`Product details not found for item ${itemData.itemNo || itemData.productId}.`);
    }

    let sourceBasePrice = 0; 
    let sourceCurrency = 'USD'; 
    let basePriceUSD_for_margin_calc = 0; 

    const pricingMethod = itemData.pricingMethod || 'Margin';

    // Priority 1: Customer Price List
    if (pricingMethod === "PriceList" && customerPriceList) {
        const priceListItem = customerPriceList.items.find(plItem => plItem.itemNo === productDetails.itemNo);
        if (priceListItem) {
            sourceBasePrice = priceListItem.price;
            sourceCurrency = priceListItem.currency || 'USD';
            console.log(`DEBUG: Using Price List for ${productDetails.itemNo}: ${sourceBasePrice} ${sourceCurrency}`);
            const rate = await getExchangeRate(sourceCurrency, "USD");
            basePriceUSD_for_margin_calc = sourceBasePrice * rate;
            if (sourceCurrency !== "USD") {
                basePriceUSD_for_margin_calc *= 1.03; // Apply 3% currency protection
                console.log(`DEBUG: Applied 3% protection to Price List price. USD for margin: ${basePriceUSD_for_margin_calc.toFixed(2)}`);
            }
        } else {
            console.warn(`Product ${productDetails.itemNo} not found in customer price list. Proceeding to other sources.`);
        }
    }

    // Priority 2: Product's own basePrice (if not found in Price List or if method is Margin, and basePriceUSD_for_margin_calc is still 0)
    if (basePriceUSD_for_margin_calc === 0 && productDetails.basePrice && productDetails.basePrice > 0) {
        sourceBasePrice = productDetails.basePrice;
        sourceCurrency = productDetails.baseCurrency || 'USD';
        console.log(`DEBUG: Using Product's own basePrice for ${productDetails.itemNo}: ${sourceBasePrice} ${sourceCurrency}`);
        const rate = await getExchangeRate(sourceCurrency, "USD");
        basePriceUSD_for_margin_calc = sourceBasePrice * rate;
        if (sourceCurrency !== "USD") {
            basePriceUSD_for_margin_calc *= 1.03; // Apply 3% currency protection
            console.log(`DEBUG: Applied 3% protection to Product's own basePrice. USD for margin: ${basePriceUSD_for_margin_calc.toFixed(2)}`);
        }
    }

    // Priority 3: Lowest Supplier Offer (if basePriceUSD_for_margin_calc is still 0)
    if (basePriceUSD_for_margin_calc === 0) {
        console.log(`DEBUG: No Price List or Product basePrice for ${productDetails.itemNo}. Checking supplierOffers.`);
        if (productDetails.supplierOffers && productDetails.supplierOffers.length > 0) {
            let lowestSupplierPriceUSDWithProtection = Infinity;
            let tempSourceBasePrice = 0;
            let tempSourceCurrency = 'USD';

            for (const supOffer of productDetails.supplierOffers) {
                if (supOffer.originalPrice && supOffer.originalCurrency) { 
                    const supplierRate = await getExchangeRate(supOffer.originalCurrency, "USD");
                    const supplierPriceInUSD = supOffer.originalPrice * supplierRate;
                    let currentSupplierPriceUSDWithProtection = supplierPriceInUSD;
                    if (supOffer.originalCurrency !== "USD") {
                        currentSupplierPriceUSDWithProtection *= 1.03; // Apply 3% currency protection
                    }

                    if (currentSupplierPriceUSDWithProtection < lowestSupplierPriceUSDWithProtection) {
                        lowestSupplierPriceUSDWithProtection = currentSupplierPriceUSDWithProtection;
                        tempSourceBasePrice = supOffer.originalPrice;
                        tempSourceCurrency = supOffer.originalCurrency;
                    }
                }
            }

            if (lowestSupplierPriceUSDWithProtection !== Infinity) {
                sourceBasePrice = tempSourceBasePrice;
                sourceCurrency = tempSourceCurrency;
                basePriceUSD_for_margin_calc = lowestSupplierPriceUSDWithProtection;
                console.log(`DEBUG: Using lowest supplier offer for ${productDetails.itemNo}: Original ${sourceBasePrice} ${sourceCurrency}. USD for margin (with protection): ${basePriceUSD_for_margin_calc.toFixed(2)}`);
            } else {
                console.warn(`DEBUG: No valid prices found in supplierOffers for ${productDetails.itemNo}. Price remains 0.`);
            }
        } else {
            console.warn(`DEBUG: No supplierOffers for ${productDetails.itemNo}. Price remains 0.`);
        }
    }

    let finalPricePerUnitUSD = basePriceUSD_for_margin_calc;
    if (pricingMethod === "Margin") {
        const marginToApply = (itemData.marginPercent !== null && itemData.marginPercent >= 0)
            ? itemData.marginPercent
            : (globalMarginPercent !== null && globalMarginPercent >= 0 ? globalMarginPercent : 0);

        finalPricePerUnitUSD = basePriceUSD_for_margin_calc * (1 + (marginToApply / 100));
        console.log(`DEBUG: Applying margin for ${productDetails.itemNo}: BaseUSD_for_calc=${basePriceUSD_for_margin_calc.toFixed(2)}, Margin=${marginToApply}%, Final=${finalPricePerUnitUSD.toFixed(2)}`);
    }

    const lineTotalUSD = finalPricePerUnitUSD * (itemData.quantity || 0);

    return {
        ...itemData,
        productId: productDetails._id,
        itemNo: productDetails.itemNo,
        description: productDetails.description,
        manufacturer: productDetails.manufacturer,
        basePrice: sourceBasePrice, 
        baseCurrency: sourceCurrency, 
        pricingMethod: pricingMethod,
        marginPercent: (pricingMethod === 'Margin' && itemData.marginPercent !== null) ? itemData.marginPercent : null,
        finalPriceUSD: finalPricePerUnitUSD,
        lineTotalUSD: lineTotalUSD,
    };
};


const generatePdfStream = async (offer, companyDetails) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = new PassThrough();
    doc.pipe(stream);

    let currentFont = fallbackFont;
    let currentBoldFont = fallbackBoldFont;
    try {
        if (fs.existsSync(primaryFontPath)) {
            doc.registerFont('DejaVuSans', primaryFontPath);
            currentFont = 'DejaVuSans';
        }
        if (fs.existsSync(boldFontPath)) {
            doc.registerFont('DejaVuSans-Bold', boldFontPath);
            currentBoldFont = 'DejaVuSans-Bold';
        }
    } catch (fontError) {
        console.error("ERROR: Failed to register fonts:", fontError);
    }
    doc.font(currentFont);

    let logoAdded = false;
    try {
        if (fs.existsSync(localLogoPath)) {
            doc.image(localLogoPath, 50, 45, { width: 100 });
            logoAdded = true;
        }
    } catch (imgError) {
        console.error("Error embedding local logo:", imgError.message);
    }

    const companyTopMargin = logoAdded ? 50 : 50;
    doc.font(currentFont).fontSize(14).text(companyDetails.name, { align: 'right' });
    doc.fontSize(9).text(companyDetails.address, { align: 'right' });
    doc.text(companyDetails.phone, { align: 'right' });
    doc.text(companyDetails.email, { align: 'right' });
    doc.moveDown(2);

    const headerStartY = doc.y;
    doc.font(currentFont).fontSize(18).text(`Offer: ${offer.offerId}`, 50, headerStartY, { align: 'left' });
    doc.fontSize(10).text(`Date: ${offer.createdAt.toLocaleDateString('en-GB')}`, 50, headerStartY + 25);
    if (offer.validityDate) {
        doc.text(`Valid Until: ${offer.validityDate.toLocaleDateString('en-GB')}`, 50, headerStartY + 40);
    }
    doc.moveDown(3);

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

    doc.moveTo(qtyCol, doc.y + 5).lineTo(doc.page.width - itemCol, doc.y + 5).strokeColor('#cccccc').stroke();
    doc.moveDown();
    doc.font(currentBoldFont).fontSize(10);
    doc.text("Total Offer Value (USD):", qtyCol, doc.y, { width: lineTotalCol - qtyCol, align: 'right' });
    doc.text(`$${totalOfferValue.toFixed(2)}`, lineTotalCol, doc.y, { align: 'right' });
    doc.font(currentFont);
    doc.moveDown(2);

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

    if (data.length === 0) {
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
    return '\ufeff' + csv;
};


// GET /api/offers
const getOffers = asyncHandler(async (req, res) => {
    const offers = await Offer.find({}).populate("client", "clientName companyName").sort({ createdAt: -1 });
    res.json(offers);
});

// GET /api/offers/:id
const getOfferById = asyncHandler(async (req, res) => {
    const offer = await Offer.findById(req.params.id)
        .populate("client")
        .populate({
            path: 'lineItems.productId',
            select: 'itemNo description manufacturer basePrice baseCurrency supplierOffers'
        });

    if (offer) {
        res.json(offer);
    } else {
        res.status(404);
        throw new Error("Offer not found");
    }
});

// POST /api/offers
const createOffer = asyncHandler(async (req, res) => {
    const {
        clientId,
        validityDate,
        terms,
        status,
        globalMarginPercent,
        lineItems
    } = req.body;

    if (!clientId) {
        res.status(400);
        throw new Error("Client ID is required");
    }
    if (!lineItems || lineItems.length === 0) {
        res.status(400);
        throw new Error("At least one line item is required");
    }

    const clientExists = await Client.findById(clientId);
    if (!clientExists) {
        res.status(404);
        throw new Error("Client not found");
    }

    let customerPriceList = null;
    // if (clientExists.priceListId) { 
    //     customerPriceList = await CustomerPriceList.findById(clientExists.priceListId);
    // }

    const processedLineItems = [];
    for (const item of lineItems) {
        const processedItem = await calculateLineItemPrice(item, globalMarginPercent, customerPriceList);
        processedLineItems.push(processedItem);
    }

    const offerId = await generateNextOfferId();

    const offer = new Offer({
        offerId,
        client: clientId,
        validityDate,
        terms,
        status,
        globalMarginPercent,
        lineItems: processedLineItems,
        user: req.user._id, 
    });

    const createdOffer = await offer.save();
    res.status(201).json(createdOffer);
});

// PUT /api/offers/:id
const updateOffer = asyncHandler(async (req, res) => {
    const {
        clientId,
        validityDate,
        terms,
        status,
        globalMarginPercent,
        lineItems
    } = req.body;

    const offer = await Offer.findById(req.params.id);

    if (!offer) {
        res.status(404);
        throw new Error("Offer not found");
    }

    if (clientId) {
        const clientExists = await Client.findById(clientId);
        if (!clientExists) {
            res.status(404);
            throw new Error("Client not found");
        }
        offer.client = clientId;
    }

    let customerPriceList = null;
    // if (offer.client && offer.client.priceListId) { 
    //     customerPriceList = await CustomerPriceList.findById(offer.client.priceListId);
    // }

    const processedLineItems = [];
    if (lineItems && lineItems.length > 0) {
        for (const item of lineItems) {
            const processedItem = await calculateLineItemPrice(item, globalMarginPercent !== undefined ? globalMarginPercent : offer.globalMarginPercent, customerPriceList);
            processedLineItems.push(processedItem);
        }
        offer.lineItems = processedLineItems;
    }


    offer.validityDate = validityDate !== undefined ? validityDate : offer.validityDate;
    offer.terms = terms !== undefined ? terms : offer.terms;
    offer.status = status !== undefined ? status : offer.status;
    offer.globalMarginPercent = globalMarginPercent !== undefined ? globalMarginPercent : offer.globalMarginPercent;
    
    const updatedOffer = await offer.save();
    res.json(updatedOffer);
});

// DELETE /api/offers/:id
const deleteOffer = asyncHandler(async (req, res) => {
    const offer = await Offer.findById(req.params.id);
    if (offer) {
        if (offer.status !== "Draft") {
            res.status(400);
            throw new Error("Only Draft offers can be deleted.");
        }
        await offer.deleteOne(); 
        res.json({ message: "Offer removed" });
    } else {
        res.status(404);
        throw new Error("Offer not found");
    }
});

// GET /api/offers/:id/pdf
const generateOfferPdf = asyncHandler(async (req, res) => {
    const offer = await Offer.findById(req.params.id)
        .populate("client")
        .populate({
            path: 'lineItems.productId',
            select: 'itemNo description manufacturer basePrice baseCurrency supplierOffers'
        });

    if (!offer) {
        res.status(404);
        throw new Error("Offer not found");
    }

    const companyDetails = {
        name: "PRO MAKROMED Sağlık Ürünleri",
        address: "Esenşehir, Güneyli Sk. No:15/1, 34776 Ümraniye/İstanbul, Türkiye",
        phone: "+90 216 344 91 51",
        email: "sales@promakromed.com",
    };

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=offer_${offer.offerId || req.params.id}.pdf`);

    const pdfStream = await generatePdfStream(offer, companyDetails);
    pdfStream.pipe(res);
});

// GET /api/offers/:id/csv
const generateOfferCsv = asyncHandler(async (req, res) => {
    const offer = await Offer.findById(req.params.id)
        .populate("client", "companyName") 
        .populate({
            path: 'lineItems.productId',
            select: 'itemNo description manufacturer basePrice baseCurrency supplierOffers'
        });

    if (!offer) {
        res.status(404);
        throw new Error("Offer not found");
    }

    const csvString = await generateCsvString(offer);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=offer_${offer.offerId || req.params.id}.csv`);
    res.send(csvString);
});


module.exports = {
    getOffers,
    getOfferById,
    createOffer,
    updateOffer,
    deleteOffer,
    generateOfferPdf,
    generateOfferCsv,
};
