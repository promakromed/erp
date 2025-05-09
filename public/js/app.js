const API_URL = 'https://proerp-b0dfb327892c.herokuapp.com/api ';
// const API_URL = 'http://localhost:5000/api'; // For local dev

function getAuthToken() {
    const userInfoString = localStorage.getItem("userInfo");
    if (!userInfoString) return null;

    try {
        const userInfo = JSON.parse(userInfoString);
        return userInfo?.token || null;
    } catch (e) {
        console.error("Failed to parse userInfo from localStorage", e);
        return null;
    }
}

function checkAuth() {
    const currentPath = window.location.pathname;

    // Don't redirect if already on login.html
    if (currentPath.includes("login.html")) return true;

    const token = getAuthToken();

    if (!token) {
        console.warn("No valid token found. Redirecting to login.");
        window.location.href = "/login.html";
        return false;
    }

    const userNameElement = document.getElementById("user-name");
    if (userNameElement) {
        try {
            const userInfo = JSON.parse(localStorage.getItem("userInfo"));
            userNameElement.textContent = userInfo?.name || "User";
        } catch (e) {
            console.error("Failed to set user name:", e);
        }
    }

    return true;
}

document.addEventListener("DOMContentLoaded", () => {
    checkAuth();
});
