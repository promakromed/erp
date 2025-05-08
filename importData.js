const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Product = require("./models/productModel");

dotenv.config();

const connectDB = async () => {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
};

const products = [
    {
        itemNo: "00.1001",
        manufacturer: "Thermo",
        description: "High Temp Sensor",
        basePrice: 120.50,
        baseCurrency: "USD"
    },
    {
        itemNo: "00.1003",
        manufacturer: "Thermo",
        description: "Pressure Gauge",
        basePrice: 85.75,
        baseCurrency: "EUR"
    },
    {
        itemNo: "S1001",
        manufacturer: "Siemens",
        description: "Control Module",
        basePrice: 200,
        baseCurrency: "GBP"
    }
];

const importData = async () => {
    try {
        await Product.deleteMany({});
        await Product.insertMany(products);
        console.log("✅ Products imported successfully!");
        process.exit();
    } catch (error) {
        console.error("❌ Error importing products:", error.message);
        process.exit(1);
    }
};

const destroyData = async () => {
    try {
        await Product.deleteMany({});
        console.log("✅ All products deleted!");
        process.exit();
    } catch (error) {
        console.error("❌ Error deleting products:", error.message);
        process.exit(1);
    }
};

if (process.argv[2] === "-d") {
    destroyData();
} else {
    connectDB().then(importData);
}
