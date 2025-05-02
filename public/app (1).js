// API URL - Change this to your server URL when deployed
const API_URL = 
'https://proerp-b0dfb327892c.herokuapp.com/api
';

// DOM Elements
const loginContainer = document.getElementById(
'login-container
');
const mainContainer = document.getElementById(
'main-container
');
const loginForm = document.getElementById(
'login-form
');
const loginError = document.getElementById(
'login-error
');
const userNameElement = document.getElementById(
'user-name
');
const logoutBtn = document.getElementById(
'logout-btn
');
const searchForm = document.getElementById(
'search-form
');
const clearBtn = document.getElementById(
'clear-btn
');
const itemNumbersInput = document.getElementById(
'item-numbers
');
const resultsContainer = document.getElementById(
'results-container
');
const noResults = document.getElementById(
'no-results
');
const loading = document.getElementById(
'loading
');
const errorMessage = document.getElementById(
'error-message
');
const resultCount = document.getElementById(
'result-count
');
const resultsHead = document.getElementById(
'results-head
'); // Get the thead element
const resultsBody = document.getElementById(
'results-body
');

// Check if user is logged in
function checkAuth() {
  const userInfo = JSON.parse(localStorage.getItem(
'userInfo
'));
  
  if (userInfo && userInfo.token) {
    // User is logged in
    loginContainer.style.display = 
'none
';
    mainContainer.style.display = 
'block
';
    userNameElement.textContent = userInfo.name;
    return true;
  } else {
    // User is not logged in
    loginContainer.style.display = 
'block
';
    mainContainer.style.display = 
'none
';
    return false;
  }
}

// Handle login form submission
loginForm.addEventListener(
'submit
', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById(
'email
').value;
  const password = document.getElementById(
'password
').value;
  
  try {
    loginError.style.display = 
'none
';
    
    const response = await fetch(`${API_URL}/users/login`, {
      method: 
'POST
',
      headers: {
        
'Content-Type
': 
'application/json
',
      },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 
'Invalid email or password
');
    }
    
    // Save user info to localStorage
    localStorage.setItem(
'userInfo
', JSON.stringify(data));
    
    // Update UI
    checkAuth();
    
    // Clear form
    loginForm.reset();
    
  } catch (error) {
    loginError.textContent = error.message;
    loginError.style.display = 
'block
';
  }
});

// Handle logout
logoutBtn.addEventListener(
'click
', () => {
  localStorage.removeItem(
'userInfo
');
  checkAuth();
});

// Handle search form submission
searchForm.addEventListener(
'submit
', async (e) => {
  e.preventDefault();
  
  const itemInput = itemNumbersInput.value.trim();
  
  if (!itemInput) {
    showError(
'Please enter at least one item number
');
    return;
  }
  
  // Parse input - split by commas or newlines
  const itemNumbers = itemInput.split(/[\n,]+/).filter(item => item.trim() !== 
''
);
  
  if (itemNumbers.length > 100) {
    showError(
'Please limit your search to 100 items or less for better performance
');
    return;
  }
  
  // Show loading indicator
  showLoading();
  
  try {
    const userInfo = JSON.parse(localStorage.getItem(
'userInfo
'));
    
    if (!userInfo || !userInfo.token) {
      throw new Error(
'You must be logged in to search products
');
    }
    
    const response = await fetch(`${API_URL}/search`, {
      method: 
'POST
',
      headers: {
        
'Content-Type
': 
'application/json
',
        
'Authorization
': `Bearer ${userInfo.token}`,
      },
      body: JSON.stringify({ itemNumbers }),
    });

    
    const data = await response.json(); // Expect { products: [], suppliers: [] }
    
    if (!response.ok) {
      let errorMsg = 
'Error searching products
';
      try {
        const contentType = response.headers.get(
"content-type"
);
        if (contentType && contentType.indexOf(
"application/json"
) !== -1) {
            const errorData = data; // Already parsed if response.ok is false and it's JSON
            errorMsg = errorData.message || errorMsg;
        } else {
            errorMsg = await response.text();
        }
      } catch (parseError) {
        console.error(
"Error parsing error response:
", parseError);
        errorMsg = response.statusText || errorMsg;
      }
      throw new Error(errorMsg);
    }
    
    // Display results using the new structure
    displayResults(data.products, data.suppliers);
    
  } catch (error) {
    console.error(
"Search fetch error:
", error);
    showError(error.message || 
"An unknown error occurred during search.
");
  } finally {
    hideLoading();
  }
});

// Handle clear button click
clearBtn.addEventListener(
'click
', () => {
  itemNumbersInput.value = 
''
;
  resultsContainer.style.display = 
'none
';
  noResults.style.display = 
'none
';
  errorMessage.style.display = 
'none
';
});

// Display search results with dynamic columns
function displayResults(products, suppliers) {
  // Clear previous results and headers
  resultsHead.innerHTML = 
''
;
  resultsBody.innerHTML = 
''
;
  
  if (!products || products.length === 0) {
    noResults.style.display = 
'block
';
    resultsContainer.style.display = 
'none
';
    return;
  }
  
  noResults.style.display = 
'none
';
  resultsContainer.style.display = 
'block
';
  resultCount.textContent = `Found ${products.length} product${products.length === 1 ? 
''
 : 
's
'}`;

  // --- Generate Dynamic Headers ---
  const headerRow = document.createElement(
'tr
');
  const fixedHeaders = [
'Item Number
', 
'Description
', 
'Size
', 
'Manufacturer
', 
'Brand
'];
  
  // Add fixed headers
  fixedHeaders.forEach(text => {
    const th = document.createElement(
'th
');
    th.textContent = text;
    headerRow.appendChild(th);
  });

  // Add dynamic supplier headers (sort suppliers alphabetically for consistent order)
  const sortedSuppliers = suppliers.sort();
  sortedSuppliers.forEach(supplierName => {
    const th = document.createElement(
'th
');
    th.textContent = `${supplierName} Price`;
    headerRow.appendChild(th);
  });

  // Add winner header
  const winnerTh = document.createElement(
'th
');
  winnerTh.textContent = 
'Winner
';
  headerRow.appendChild(winnerTh);

  resultsHead.appendChild(headerRow);
  // --- End Header Generation ---

  // --- Populate Table Body ---
  const fragment = document.createDocumentFragment();
  
  products.forEach(product => {
    const row = document.createElement(
'tr
');
    
    // Add fixed columns data
    row.innerHTML = `
      <td>${product.itemNo}</td>
      <td>${product.description}</td>
      <td>${product.size || 
'N/A
'}</td>
      <td>${product.manufacturer || 
'N/A
'}</td>
      <td>${product.brand || 
'N/A
'}</td>
    `;

    // Add dynamic supplier columns data
    sortedSuppliers.forEach(supplierName => {
      const td = document.createElement(
'td
');
      // Get the price string from the product.offers object
      td.textContent = product.offers[supplierName] || 
'N/A
'; 
      row.appendChild(td);
    });

    // Add winner column data
    const winnerTd = document.createElement(
'td
');
    let winnerClass = 
''
;
    if (product.winner && product.winner !== 
'N/A
') {
        winnerClass = `winner-${product.winner.toLowerCase().replace(/\s+/g, 
'-')}`;
    }
    winnerTd.className = winnerClass;
    winnerTd.textContent = product.winner || 
'N/A
';
    row.appendChild(winnerTd);
    
    fragment.appendChild(row);
  });
  
  resultsBody.appendChild(fragment);
  // --- End Body Population ---
}

// Show error message
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 
'block
';
}

// Hide error message
function hideError() {
  errorMessage.style.display = 
'none
';
}

// Show loading indicator
function showLoading() {
  loading.style.display = 
'block
';
  resultsContainer.style.display = 
'none
';
  noResults.style.display = 
'none
';
  errorMessage.style.display = 
'none
';
}

// Hide loading indicator
function hideLoading() {
  loading.style.display = 
'none
';
}

// Initialize the app
document.addEventListener(
'DOMContentLoaded
', () => {
  checkAuth();
  
  itemNumbersInput.addEventListener(
'keydown
', (event) => {
    if (event.key === 
'Enter
' && event.ctrlKey) {
      searchForm.dispatchEvent(new Event(
'submit
'));
    }
  });
});

