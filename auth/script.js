const popoverInputErrorTemplate = `
<div id="signup-error-popover" style="display: contents;">
    <div class="popover bs-popover-bottom"><div class="popover-arrow"></div></div>
    <div class="error-input">
        <span><i class="bi bi-exclamation-circle-fill"></i>{text}</span>
    </div>
</div>
`;



const panelContainer = document.getElementById("panel-container");
function showPanel(panelName)
{
    Array.from(panelContainer.children).forEach(panel =>
        panel.setAttribute("style", `display: ${panel.id == `${panelName}-panel` ? "visible" : "none"};`)
    );
}

function getAuthenticationError(errorCode)
{
    switch(errorCode)
    {
        case 10: return "Username non trovato";
        case 11: return "Password errata";
        case 12: return "Non esiste utente con l'email inserita";
        default: return "Errore sconosciuto";
    }
}


const loginPanel = {
    usernameInput: document.getElementById("username-login-input"),
    passwordInput: document.getElementById("password-login-input"),
    shouldRememberBox: document.getElementById("remember-choice"),

    async send()
    {
        const username = this.usernameInput.value.trim().toLowerCase();
        const password = this.passwordInput.value.trim();
        if(!username.length || !password.length) return;

        toggleSpinner(loginButton);

        const body = JSON.stringify({
            username,
            password: btoa(this.passwordInput.value),
            shouldRemember: this.shouldRememberBox.checked
        });
        const res = await fetch(endpoints.login, { method: "post", body, headers: { "Content-Type": "application/json" } });

        toggleSpinner(loginButton);

        if(res.status >= 200 && res.status < 300) saveSession((await res.json()).sessionId);
        else if(res.status == 401) new Toast("danger", getAuthenticationError((await res.json()).errorCode)).render();
        else new Toast("danger", "Errore imprevisto").render();
    }
};


const passwordValidation = {
    popoverErrorTemplate: `
    <div style="display: contents;">
        <div class="popover bs-popover-bottom"><div class="popover-arrow"></div></div>
        <div class="error-input">
            <span><i id="length-check"></i>{length}</span><br>
            <span><i id="special-check"></i>{special}</span><br>
            <span><i id="number-check"></i>{number}</span><br>
            <span><i id="uppercase-check"></i>{uppercase}</span><br>
            <span><i id="lowercase-check"></i>{lowercase}</span><br>
        </div>
    </div>
    `,
    errors()
    {
        return {
            length: "La lunghezza è compresa tra 8 e 32 caratteri",
            special: "Almeno 1 carattere speciale",
            number: "Almeno 1 numero",
            uppercase: "Almeno 1 lettera maiuscola",
            lowercase: "Almeno 1 lettera minuscola"
        };
    },

    showErrors(invalidOptions, passwordElement)
    {
        Array.from(passwordElement.querySelectorAll(".popover, .error-input")).forEach(element => element.remove());

        const errorsText = this.errors();
        const errorsPopover = new TemplateTransformation(this.popoverErrorTemplate).replace(errorsText).create();

        Object.keys(invalidOptions).forEach(key =>
        {
            const check = errorsPopover.querySelector(`#${key}-check`);
            const hasFailed = invalidOptions[key];
            check.setAttribute("class", `bi bi-${hasFailed ? "x-circle" : "check-all"}`);
            check.setAttribute("style", `color: ${hasFailed ? "red" : "green"};`);
        });

        passwordElement.append(errorsPopover);
    },

    getInputValidation(passwordElement)
    {
        const password = passwordElement.value;
        const specialChars = /[~\`!@#$%^&*()\-_=+\[\]{}\\\|;:'",\.<>/?]/;
        const invalidOptions = {};

        invalidOptions.length = password.length < 8 || password.length > 32;
        invalidOptions.special = !specialChars.test(password);
        invalidOptions.number = !/\d/.test(password);
        invalidOptions.uppercase = !/[A-Z]/.test(password);
        invalidOptions.lowercase = !/[a-z]/.test(password);

        return { valid: !Object.values(invalidOptions).some(Boolean), invalidOptions };
    }
};


const signupPanel = {
    usernameInput: document.getElementById("username-signup-input"),
    passwordInput: document.getElementById("password-signup-input"),
    passwordConfirmInput: document.getElementById("password-signup-confirm-input"),
    emailInput: document.getElementById("email-input"),
    nameInput: document.getElementById("name-input"),
    surnameInput: document.getElementById("surname-input"),
    getGenderInput: () => document.querySelector("#gender-choice :checked"),
    errors()
    {
        return {
            username: { element: this.usernameInput.parentElement, text: "L'username può avere solo caratteri alfanumerici, un minimo di 5 e un massimo di 15" },
            password: { element: this.passwordInput.parentElement, text: "La password non è valida" },
            passwordConfirm: { element: this.passwordConfirmInput.parentElement, text: "Le password non corrispondono" },
            email: { element: this.emailInput.parentElement, text: "L'email non è valida" },
            name: { element: this.nameInput.parentElement, text: "Il nome non può contenere numeri" },
            surname: { element: this.surnameInput.parentElement, text: "Il cognome non può contenere numeri" },
            gender: { element: document.querySelector("#gender-choice").parentElement, text: "Il sesso è obbligatorio" }
        };
    },

    showErrors(invalidElements)
    {
        Array.from(document.querySelectorAll(".popover, .error-input")).forEach(element => element.remove());

        const errors = this.errors();

        Object.keys(invalidElements).forEach(key =>
        {
            if(!invalidElements[key]) return;

            const { element, text } = errors[key];
            element.append(new TemplateTransformation(popoverInputErrorTemplate).replace({ text }).create());
        });
    },

    getInputValidation()
    {
        const usernameRegex = /^[a-z][a-z1-9]{4,14}$/;
        const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
        const nameRegex = /^[a-z][a-z]{2,19}$/;
        const invalidElements = {};

        invalidElements.username = !usernameRegex.test(this.usernameInput.value.toLowerCase());
        invalidElements.password = !passwordValidation.getInputValidation(this.passwordInput).valid;
        invalidElements.passwordConfirm = this.passwordConfirmInput.value != this.passwordInput.value;
        invalidElements.email = !emailRegex.test(this.emailInput.value);
        invalidElements.name = !nameRegex.test(this.nameInput.value.toLowerCase());
        invalidElements.surname = !nameRegex.test(this.surnameInput.value.toLowerCase());
        invalidElements.gender = !this.getGenderInput();

        return { valid: !Object.values(invalidElements).some(Boolean), invalidElements };
    },

    capitalize: str => str[0].toUpperCase() + str.slice(1).toLowerCase(),

    async send()
    {
        const inputValidation = this.getInputValidation();
        if(!inputValidation.valid) return this.showErrors(inputValidation.invalidElements);

        toggleSpinner(signupSendButton);

        const body = JSON.stringify({
            username: this.usernameInput.value.toLowerCase(),
            password: btoa(this.passwordInput.value), // algoritmo IN-DE-CI-FRA-BI-LE
            email: this.emailInput.value,
            name: this.capitalize(this.nameInput.value),
            surname: this.capitalize(this.surnameInput.value),
            gender: this.getGenderInput().value
        });
        const res = await fetch(endpoints.signup, { method: "post", body, headers: { "Content-Type": "application/json" } });

        toggleSpinner(signupSendButton);

        if(res.status >= 200 && res.status < 300) saveSession((await res.json()).sessionId);
        else new Toast("danger", "Errore imprevisto").render();
    }
};


const forgotPasswordPanel = {
    emailInput: document.getElementById("email-forgot-input"),
    passwordInput: document.getElementById("password-forgot-input"),
    passwordConfirmInput: document.getElementById("password-forgot-confirm-input"),
    errors()
    {
        return {
            email: { element: this.emailInput.parentElement, text: "L'email non è valida" },
            password: { element: this.passwordInput.parentElement, text: "La password non è valida" },
            passwordConfirm: { element: this.passwordConfirmInput.parentElement, text: "Le password non corrispondono" }
        };
    },

    showErrors(invalidElements)
    {
        Array.from(document.querySelectorAll(".popover, .error-input")).forEach(element => element.remove());

        const errors = this.errors();

        Object.keys(invalidElements).forEach(key =>
        {
            if(!invalidElements[key]) return;

            const { element, text } = errors[key];
            element.append(new TemplateTransformation(popoverInputErrorTemplate).replace({ text }).create());
        });
    },

    getInputValidation()
    {
        const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
        const invalidElements = {};

        invalidElements.email = !emailRegex.test(this.emailInput.value);
        invalidElements.password = !passwordValidation.getInputValidation(this.passwordInput).valid;
        invalidElements.passwordConfirm = this.passwordConfirmInput.value != this.passwordInput.value;

        return { valid: !Object.values(invalidElements).some(Boolean), invalidElements };
    },

    async send()
    {
        const inputValidation = this.getInputValidation();
        if(!inputValidation.valid) return this.showErrors(inputValidation.invalidElements);

        toggleSpinner(forgotPasswordSendButton);

        const body = JSON.stringify({
            email: this.emailInput.value,
            password: btoa(this.passwordInput.value)
        });
        const res = await fetch(endpoints.forgotPassword, { method: "post", body, headers: { "Content-Type": "application/json" } });

        toggleSpinner(forgotPasswordSendButton);

        if(res.status >= 200 && res.status < 300) saveSession(null, "/");
        else if(res.status == 403) new Toast("danger", getAuthenticationError((await res.json()).errorCode)).render();
        else new Toast("danger", "Errore imprevisto").render();
    }
}


const brand = document.querySelector("main > h1");
const loginButton = document.getElementById("login-button");
const signupButton = document.querySelector("#register > button");
const signupSendButton = document.getElementById("signup-button");
const forgotPasswordButton = document.querySelector(".credentials > .contain-items > button");
const forgotPasswordSendButton = document.getElementById("forgot-password-button");
const alreadySignupButton = document.querySelector("#already-register > button");

brand.addEventListener("click", () => location.href = "/");
loginButton.addEventListener("click", () => loginPanel.send());
signupButton.addEventListener("click", () => showPanel("signup"));
signupSendButton.addEventListener("click", () => signupPanel.send());
forgotPasswordButton.addEventListener("click", () => showPanel("forgot-password"));
forgotPasswordSendButton.addEventListener("click", () => forgotPasswordPanel.send());
alreadySignupButton.addEventListener("click", () => showPanel("login"));

["focus", "keyup"].forEach(e => document.querySelectorAll(".show-password-errors").forEach(el => el.addEventListener(e, ({ target }) =>
    passwordValidation.showErrors(passwordValidation.getInputValidation(target).invalidOptions, target.parentElement)
)));

window.addEventListener("load", async () =>
{
    if(!await getIsUserAuthenticated()) return;

    // use other icons in the navbar
});