// public/js/countryData.js

// Country calling codes (e.g., +90 Turkey)
const countryCallingCodes = [
    { code: "+1", name: "USA (+1)" },
    { code: "+44", name: "UK (+44)" },
    { code: "+90", name: "Turkey (+90)" },
    { code: "+91", name: "India (+91)" },
    { code: "+49", name: "Germany (+49)" },
    { code: "+33", name: "+33 France" },
    { code: "+39", name: "+39 Italy" },
    { code: "+31", name: "+31 Netherlands" },
    { code: "+41", name: "+41 Switzerland" },
    // Add more as needed
];

// Full list of countries (used in client form)
const countries = [
    "Turkey",
    "Germany",
    "United Kingdom",
    "United States",
    "France",
    "Italy",
    "Netherlands",
    "Switzerland",
    "Canada",
    "Japan",
    "China",
    "India",
    "Other"
].sort(); // Sort alphabetically

// Optional: Export as module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { countryCallingCodes, countries };
}
