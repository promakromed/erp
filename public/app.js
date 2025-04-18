// API URL - Change this to your server URL when deployed
const API_URL = 'http://localhost:5000/api';

// DOM Elements
const loginContainer = document.getElementById('login-container');
const mainContainer = document.getElementById('main-container');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const userNameElement = document.getElementById('user-name');
const logoutBtn = document.getElementById('logout-btn');
const searchForm = document.getElementById('search-form');
const clearBtn = document.getElementById('clear-btn');
const itemNumbersInput = document.getElementById('item-numbers');
const resultsContainer = document.getElementById('results-container');
const noResults = document.getElementById('no-results');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const resultCount = document.getElementById('result-count');
const resultsBody = document.getElementById('results-body');

// Check if user is logged in
function checkAuth() {
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  
  if (userInfo && userInfo.token) {
    // User is logged in
    loginContainer.style.display = 'none';
    mainContainer.style.display = 'block';
    userNameElement.textContent = userInfo.name;
    return true;
  } else {
    // User is not logged in
    loginContainer.style.display = 'block';
    mainContainer.style.display = 'none';
    return false;
  }
}

// Format number with commas for thousands
function formatNumber(number) {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Handle login form submission
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  try {
    loginError.style.display = 'none';
    
    const response = await fetch(`${API_URL}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Invalid email or password');
    }
    
    // Save user info to localStorage
    localStorage.setItem('userInfo', JSON.stringify(data));
    
    // Update UI
    checkAuth();
    
    // Clear form
    loginForm.reset();
    
  } catch (error) {
    loginError.textContent = error.message;
    loginError.style.display = 'block';
  }
});

// Handle logout
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('userInfo');
  checkAuth();
});

// Handle search form submission
searchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const itemInput = itemNumbersInput.value.trim();
  
  if (!itemInput) {
    showError('Please enter at least one item number');
    return;
  }
  
  // Parse input - split by commas or newlines
  const itemNumbers = itemInput.split(/[\n,]+/).filter(item => item.trim() !== '');
  
  if (itemNumbers.length > 100) {
    showError('Please limit your search to 100 items or less for better performance');
    return;
  }
  
  // Show loading indicator
  showLoading();
  
  try {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    
    if (!userInfo || !userInfo.token) {
      throw new Error('You must be logged in to search products');
    }
    
    const response = await fetch(`${API_URL}/products/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userInfo.token}`,
      },
      body: JSON.stringify({ itemNumbers }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Error searching products');
    }
    
    // Display results
    displayResults(data);
    
  } catch (error) {
    showError(error.message);
  } finally {
    // Hide loading indicator
    hideLoading();
  }
});

// Handle clear button click
clearBtn.addEventListener('click', () => {
  itemNumbersInput.value = '';
  resultsContainer.style.display = 'none';
  noResults.style.display = 'none';
  errorMessage.style.display = 'none';
});

// Display search results
function displayResults(products) {
  // Clear previous results
  resultsBody.innerHTML = '';
  
  if (!products || products.length === 0) {
    // Show no results message
    noResults.style.display = 'block';
    resultsContainer.style.display = 'none';
    return;
  }
  
  // Hide no results message and show results table
  noResults.style.display = 'none';
  resultsContainer.style.display = 'block';
  
  // Update result count
  resultCount.textContent = `Found ${products.length} product${products.length === 1 ? '' : 's'}`;
  
  // Create document fragment for better performance
  const fragment = document.createDocumentFragment();
  
  // Add each result to the table
  products.forEach(product => {
    const row = document.createElement('tr');
    
    // Determine winner class
    let winnerClass = '';
    if (product.winner === 'MRS') {
      winnerClass = 'winner-mrs';
    } else if (product.winner === 'Mizala') {
      winnerClass = 'winner-mizala';
    } else if (product.winner === 'Equal') {
      winnerClass = 'winner-equal';
    }
    
    // Format prices with commas for thousands and 2 decimal places
    const mrsPrice = typeof product.mrsPrice === 'number' 
      ? '$' + formatNumber(product.mrsPrice.toFixed(2))
      : 'N/A';
    
    const mizalaPrice = typeof product.mizalaPrice === 'number' 
      ? '$' + formatNumber(product.mizalaPrice.toFixed(2))
      : 'N/A';
    
    // Create row content
    row.innerHTML = `
      <td>${product.itemNo}</td>
      <td>${product.description}</td>
      <td>${product.size}</td>
      <td>${product.manufacturer}</td>
      <td>${product.brand}</td>
      <td>${mrsPrice}</td>
      <td>${mizalaPrice}</td>
      <td class="${winnerClass}">${product.winner}</td>
    `;
    
    fragment.appendChild(row);
  });
  
  // Append all rows at once for better performance
  resultsBody.appendChild(fragment);
}

// Show error message
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
}

// Hide error message
function hideError() {
  errorMessage.style.display = 'none';
}

// Show loading indicator
function showLoading() {
  loading.style.display = 'block';
  resultsContainer.style.display = 'none';
  noResults.style.display = 'none';
  errorMessage.style.display = 'none';
}

// Hide loading indicator
function hideLoading() {
  loading.style.display = 'none';
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  // Check if user is logged in
  checkAuth();
  
  // Allow pressing Enter in the textarea to trigger search
  itemNumbersInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.ctrlKey) {
      searchForm.dispatchEvent(new Event('submit'));
    }
  });
});
