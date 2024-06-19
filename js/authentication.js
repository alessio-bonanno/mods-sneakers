const usernameInput = document.getElementById("username-input");
const passwordInput = document.getElementById("password-input");
const shouldRememberBox = document.getElementById("remember-choice");
const loginButton = document.getElementById("login-button");
const endpoints = {
    login: "/api/v1/login",
    sessionInfo: "/api/v1/session"
};



const spinner = document.createElement("span");
spinner.className = "spinner-border text-light";

function toggleSpinner()
{
    if(spinner.parentElement) return spinner.remove();
    loginButton.append(spinner);
}

function saveSession(sessionId)
{
    localStorage.setItem("auth", JSON.stringify({ sessionId }));
}

async function validateCredentials()
{
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    if(!username.length || !password.length) return new Toast("info", "L'username e la password devono avere almeno 1 carattere").render();

    toggleSpinner();

    const body = JSON.stringify({
        username: usernameInput.value,
        password: btoa(passwordInput.value), // algoritmo indecifrabile
        shouldRemember: shouldRememberBox.checked
    });
    const res = await fetch(endpoints.login, { method: "post", body, headers: { "Content-Type": "application/json" } });

    toggleSpinner();

    if(res.status >= 200 && res.status < 300)
    {
        saveSession(sessionId);
        location.href = "/";
    }
    else if(res.status == 401) new Toast("danger", "Username o Password errati").render();
    else new Toast("danger", "Errore imprevisto").render();
}

async function getIsUserAuthenticated()
{
    const auth = localStorage.getItem("auth");
    if(!auth || !auth.sessionId) return;

    const body = JSON.stringify({ sessionId: auth.sessionId });
    const res = await fetch(endpoints.sessionInfo, { method: "post", body, headers: { "Content-Type": "application/json" } });

    return res.status >= 200 && res.status < 300;
}


loginButton.addEventListener("click", validateCredentials);
window.addEventListener("load", async () =>
{
    if(!await getIsUserAuthenticated()) return;

    // use other icons in the navbar
});