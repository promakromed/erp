function getAuthToken() {
    try {
        const userInfo = JSON.parse(localStorage.getItem("userInfo"));
        return userInfo?.token || null;
    } catch (e) {
        console.error("Failed to parse userInfo:", e);
        return null;
    }
}

function checkAuth() {
    const currentPath = window.location.pathname;
    if (currentPath.includes("login.html")) return true;

    const token = getAuthToken();

    if (!token) {
        console.warn("No token found. Redirecting to /login.html");
        window.location.href = "/login.html";
        return false;
    }

    const userNameElement = document.getElementById("user-name");
    if (userNameElement && token) {
        try {
            const userInfo = JSON.parse(localStorage.getItem("userInfo"));
            userNameElement.textContent = userInfo.name || "User";
        } catch (e) {}
    }

    return true;
}
