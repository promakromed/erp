// API URL - Change this to your server URL when deployed
const API_URL = 'https://proerp-b0dfb327892c.herokuapp.com/api';
// const API_URL = 

// DOM Elements
const loginContainer = document.getElementById("login-container");
const mainContainer = document.getElementById("main-container");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const userNameElement = document.getElementById("user-name");
const logoutBtn = document.getElementById("logout-btn");
const searchForm = document.getElementById("search-form");
const clearBtn = document.getElementById("clear-btn");
const manufacturerSelect = document.getElementById("manufacturer-select"); // Added manufacturer dropdown
const itemNumbersInput = document.getElementById("item-numbers");
const resultsContainer = document.getElementById("results-container");
const noResults = document.getElementById("no-results");
const loading = document.getElementById("loading");
const errorMessage = document.getElementById("error-message");
const resultCount = document.getElementById("result-count");
const resultsHead = document.getElementById("results-head"); // Get the thead element
const resultsBody = document.getElementById("results-body");

// Function to make authenticated API requests
async function fetchWithAuth(url, options = {}) {
  console.log("DEBUG: fetchWithAuth called for URL:", url);
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));
  if (!userInfo || !userInfo.token) {
    console.error("DEBUG: No user info or token found for authenticated request.");
    // Redirect to login or handle appropriately
    checkAuth(); // Re-check auth which might redirect
    throw new Error("Authentication required.");
  }

  const headers = {
    ...options.headers,
    "Authorization": `Bearer ${userInfo.token}`,
  };

  // Add Content-Type if body exists and not already set
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  console.log("DEBUG: Fetching with options:", { ...options, headers });

  const response = await fetch(url, { ...options, headers });

  console.log(`DEBUG: Response status for ${url}: ${response.status}`);

  if (!response.ok) {
    let errorMsg = `Error fetching ${url}: ${response.statusText}`;
    try {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const errorData = await response.json();
        console.error("DEBUG: API Error Response Data:", errorData);
        errorMsg = errorData.message || errorMsg;
      } else {
        errorMsg = await response.text();
        console.error("DEBUG: API Error Response Text:", errorMsg);
      }
    } catch (parseError) {
      console.error("DEBUG: Error parsing error response:", parseError);
    }
    throw new Error(errorMsg);
  }

  // Handle cases where response might be empty (e.g., 204 No Content)
  if (response.status === 204) {
    console.log("DEBUG: Received 204 No Content response.");
    return null; 
  }

  // Assume JSON response for other successful statuses
  try {
    const data = await response.json();
    console.log("DEBUG: Successfully fetched and parsed JSON data:", data);
    return data;
  } catch (jsonError) {
    console.error("DEBUG: Error parsing JSON response:", jsonError);
    throw new Error("Failed to parse server response.");
  }
}

// Fetch and populate manufacturers
async function populateManufacturers() {
  console.log("DEBUG: Attempting to populate manufacturers dropdown.");
  try {
    const manufacturers = await fetchWithAuth(`${API_URL}/search/manufacturers`);
    // Reset dropdown to only contain the placeholder
    manufacturerSelect.innerHTML = '<option value="" disabled selected>-- Select Manufacturer --</option>'; 
    
    if (manufacturers && Array.isArray(manufacturers)) {
      console.log(`DEBUG: Received ${manufacturers.length} manufacturers.`);
      manufacturers.forEach(manufacturer => {
        const option = document.createElement("option");
        option.value = manufacturer;
        option.textContent = manufacturer;
        manufacturerSelect.appendChild(option);
      });
      console.log("DEBUG: Manufacturer dropdown populated.");
    } else {
        console.warn("DEBUG: No manufacturers returned from API or invalid format.");
    }
  } catch (error) {
    console.error("Error fetching or populating manufacturers:", error);
    // Optionally show an error to the user, but dropdown will just remain empty/default
    showError(`Failed to load manufacturers list: ${error.message}`);
  }
}

// Check if user is logged in
function checkAuth() {
  console.log("DEBUG: checkAuth called.");
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));
  
  if (userInfo && userInfo.token) {
    // User is logged in
    console.log("DEBUG: User is logged in.", userInfo.name);
    loginContainer.style.display = "none";
    mainContainer.style.display = "block";
    userNameElement.textContent = userInfo.name;
    populateManufacturers(); // Populate manufacturers after successful login check
    return true;
  } else {
    // User is not logged in
    console.log("DEBUG: User is not logged in.");
    loginContainer.style.display = "block";
    mainContainer.style.display = "none";
    return false;
  }
}

// Handle login form submission
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  console.log("DEBUG: Login form submitted.");
  
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  
  try {
    loginError.style.display = "none";
    console.log("DEBUG: Attempting login for email:", email);
    
    // Use fetch directly for login as it doesn"t require prior auth
    const response = await fetch(`${API_URL}/users/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    console.log(`DEBUG: Login response status: ${response.status}`);
    
    if (!response.ok) {
      console.error("DEBUG: Login failed.", data);
      throw new Error(data.message || "Invalid email or password");
    }
    
    console.log("DEBUG: Login successful.", data);
    // Save user info to localStorage
    localStorage.setItem("userInfo", JSON.stringify(data));
    
    // Update UI (which will also call populateManufacturers)
    checkAuth();
    
    // Clear form
    loginForm.reset();
    
  } catch (error) {
    console.error("DEBUG: Login error:", error);
    loginError.textContent = error.message;
    loginError.style.display = "block";
  }
});

// Handle logout
logoutBtn.addEventListener("click", () => {
  console.log("DEBUG: Logout button clicked.");
  localStorage.removeItem("userInfo");
  checkAuth();
});

// Handle search form submission
searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  console.log("DEBUG: Search form submitted.");
  
  const selectedManufacturer = manufacturerSelect.value; // Get selected manufacturer
  console.log("DEBUG: Selected Manufacturer:", selectedManufacturer);

  // --- OBLIGATORY CHECK --- 
  if (!selectedManufacturer) {
    showError("Please select a manufacturer");
    return; // Stop if no manufacturer is selected
  }
  // --- END OBLIGATORY CHECK ---

  const itemInput = itemNumbersInput.value.trim();
  console.log("DEBUG: Item Input:", itemInput);
  
  if (!itemInput) {
    showError("Please enter at least one item number");
    return;
  }
  
  // Parse input - split by commas or newlines
  const itemNumbers = itemInput.split(/[\n,]+/).map(item => item.trim()).filter(item => item !== "");
  console.log("DEBUG: Parsed Item Numbers:", itemNumbers);
  
  if (itemNumbers.length === 0) {
      showError("Please enter valid item numbers.");
      return;
  }
  
  if (itemNumbers.length > 100) {
    showError("Please limit your search to 100 items or less for better performance");
    return;
  }
  
  // Show loading indicator
  showLoading();
  
  try {
    // Prepare request body including the manufacturer
    const requestBody = {
        itemNumbers: itemNumbers,
        manufacturer: selectedManufacturer // Include selected manufacturer
    };
    console.log("DEBUG: Sending search request with body:", requestBody);

    // Use fetchWithAuth for the search request
    const data = await fetchWithAuth(`${API_URL}/search`, {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    console.log("DEBUG: Search response data received:", data);
    
    // Display results using the new structure
    displayResults(data.products, data.suppliers);
    
  } catch (error) {
    console.error("Search fetch error:", error);
    showError(error.message || "An unknown error occurred during search.");
  } finally {
    hideLoading();
  }
});

// Handle clear button click
clearBtn.addEventListener("click", () => {
  console.log("DEBUG: Clear button clicked.");
  itemNumbersInput.value = "";
  manufacturerSelect.value = ""; // Reset manufacturer dropdown to placeholder
  resultsContainer.style.display = "none";
  noResults.style.display = "none";
  errorMessage.style.display = "none";
});

// Display search results with dynamic columns
function displayResults(products, suppliers) {
  console.log("DEBUG: Displaying results.", { numProducts: products?.length, suppliers });
  // Clear previous results and headers
  resultsHead.innerHTML = "";
  resultsBody.innerHTML = "";
  
  if (!products || products.length === 0) {
    console.log("DEBUG: No products found to display.");
    noResults.style.display = "block";
    resultsContainer.style.display = "none";
    return;
  }
  
  noResults.style.display = "none";
  resultsContainer.style.display = "block";
  resultCount.textContent = `Found ${products.length} product${products.length === 1 ? "" : "s"}`;

  // --- Generate Dynamic Headers ---
  console.log("DEBUG: Generating table headers.");
  const headerRow = document.createElement("tr");
  const fixedHeaders = ["Item Number", "Description", "Size", "Manufacturer", "Brand"];
  
  // Add fixed headers
  fixedHeaders.forEach(text => {
    const th = document.createElement("th");
    th.textContent = text;
    headerRow.appendChild(th);
  });

  // Add dynamic supplier headers (sort suppliers alphabetically for consistent order)
  const sortedSuppliers = suppliers.sort();
  console.log("DEBUG: Sorted suppliers for headers:", sortedSuppliers);
  sortedSuppliers.forEach(supplierName => {
    const th = document.createElement("th");
    th.textContent = `${supplierName} Price`;
    headerRow.appendChild(th);
  });

  // Add winner header
  const winnerTh = document.createElement("th");
  winnerTh.textContent = "Winner";
  headerRow.appendChild(winnerTh);

  resultsHead.appendChild(headerRow);
  console.log("DEBUG: Table headers generated.");
  // --- End Header Generation ---

  // --- Populate Table Body ---
  console.log("DEBUG: Populating table body.");
  const fragment = document.createDocumentFragment();
  
  products.forEach((product, index) => {
    console.log(`DEBUG: Processing product row ${index}:`, product.itemNo);
    const row = document.createElement("tr");
    
    // Add fixed columns data
    row.innerHTML = `
      <td>${product.itemNo}</td>
      <td>${product.description}</td>
      <td>${product.size || "N/A"}</td>
      <td>${product.manufacturer || "N/A"}</td>
      <td>${product.brand || "N/A"}</td>
    `;

    // Add dynamic supplier columns data
    sortedSuppliers.forEach(supplierName => {
      const td = document.createElement("td");
      // Get the price string from the product.offers object
      const priceString = product.offers[supplierName] || "N/A";
      td.textContent = priceString;
      console.log(`DEBUG: Product ${product.itemNo}, Supplier ${supplierName}, Price: ${priceString}`);
      row.appendChild(td);
    });

    // Add winner column data
    const winnerTd = document.createElement("td");
    let winnerClass = "";
    if (product.winner && product.winner !== "N/A") {
        winnerClass = `winner-${product.winner.toLowerCase().replace(/\s+/g, "-")}`;
    }
    winnerTd.className = winnerClass;
    winnerTd.textContent = product.winner || "N/A";
    console.log(`DEBUG: Product ${product.itemNo}, Winner: ${product.winner}`);
    row.appendChild(winnerTd);
    
    fragment.appendChild(row);
  });
  
  resultsBody.appendChild(fragment);
  console.log("DEBUG: Table body populated.");
  // --- End Body Population ---
}

// Show error message
function showError(message) {
  console.error("DEBUG: Showing error message:", message);
  errorMessage.textContent = message;
  errorMessage.style.display = "block";
}

// Hide error message
function hideError() {
  errorMessage.style.display = "none";
}

// Show loading indicator
function showLoading() {
  console.log("DEBUG: Showing loading indicator.");
  loading.style.display = "block";
  resultsContainer.style.display = "none";
  noResults.style.display = "none";
  errorMessage.style.display = "none";
}

// Hide loading indicator
function hideLoading() {
  console.log("DEBUG: Hiding loading indicator.");
  loading.style.display = "none";
}

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  console.log("DEBUG: DOMContentLoaded event fired. Initializing app.");
  checkAuth(); // Initial check on page load
  
  // Add Ctrl+Enter shortcut for search
  itemNumbersInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.ctrlKey) {
      console.log("DEBUG: Ctrl+Enter detected in item numbers input.");
      searchForm.dispatchEvent(new Event("submit"));
    }
  });
});

