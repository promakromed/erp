// public/js/app.js

function getAuthToken() {
    const userInfoString = localStorage.getItem("userInfo");
    if (!userInfoString) return null;

    try {
        const userInfo = JSON.parse(userInfoString);
        return userInfo.token || null;
    } catch (e) {
        console.error("Failed to parse userInfo:", e);
        return null;
    }
}

function checkAuth() {
    const currentPath = window.location.pathname;

    // Skip auth on login page
    if (currentPath.includes("login.html")) return true;

    const token = getAuthToken();

    if (!token) {
        console.warn("No token → Redirecting to login.html");
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
    checkAuth();
});
