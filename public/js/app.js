// public/js/app.js

function getAuthToken() {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    return userInfo?.token || null;
}

function checkAuth() {
    const currentPath = window.location.pathname;

    // Skip auth check on login.html
    if (currentPath.includes("login.html")) return true;

    const token = getAuthToken();

    if (!token) {
        console.warn("No token found. Redirecting to login...");
        window.location.href = "/login.html";
        return false;
    }

    const userNameElement = document.getElementById("user-name");
    if (userNameElement) {
        try {
            const userInfo = JSON.parse(localStorage.getItem("userInfo"));
            userNameElement.textContent = userInfo.name || "User";
        } catch (e) {}
    }

    return true;
}

document.addEventListener("DOMContentLoaded", () => {
    const logoutButton = document.getElementById("logout-button");
    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            localStorage.removeItem("userInfo");
            window.location.href = "/login.html";
        });
    }
});
