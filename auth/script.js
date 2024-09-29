const popoverInputErrorTemplate = `
<div id="signup-error-popover" style="display: contents;">
    <div class="popover bs-popover-bottom"><div class="popover-arrow"></div></div>
    <div class="error-input">
        <span><i class="bi bi-exclamation-circle-fill"></i>{text}</span>
    </div>
</div>
`;



const panelContainer = document.getElementById("panel-container");
function showPanel(panelName, panelSendCallback)
{
    const panels = Array.from(panelContainer.children);
    const panel = panels.find(p => p.id == `${panelName}-panel`);

    panels.forEach(p => p.style.display = p.id == panel.id ? "" : "none");
    panel.onkeyup = ({ key }) =>
    {
        if(!key || key.toLowerCase() != "enter") return;
        panelSendCallback();
    };
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

        const res = await authEndpoints.fetch(authEndpoints.login, {
            method: "post", payload: {
                username,
                password: btoa(this.passwordInput.value),
                should_expire: !this.shouldRememberBox.checked
            }
        });

        toggleSpinner(loginButton);

        if(res.status >= 200 && res.status < 300) saveSession((await res.json()).session_id);
        else if(res.status == 401) new Toast("danger", getAuthenticationError((await res.json()).error_code)).render();
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
        Array.from(passwordElement.querySelectorAll(".popover, .error-input")).forEach(el => el.remove());

        const errorsText = this.errors();
        const errorsPopover = new FromTemplate(this.popoverErrorTemplate).replace(errorsText).create().result;

        Object.keys(invalidOptions).forEach(key =>
        {
            const check = errorsPopover.querySelector(`#${key}-check`);
            const hasFailed = invalidOptions[key];
            check.classList.add("bi", `bi-${hasFailed ? "x-circle" : "check-all"}`);
            check.style.color = hasFailed ? "red" : "green";
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
    lastNameInput: document.getElementById("last-name-input"),
    getGenderInput: () => document.querySelector("#gender-choice :checked"),
    errors()
    {
        return {
            username: { element: this.usernameInput.parentElement, text: "L'username può avere solo caratteri alfanumerici, un minimo di 5 e un massimo di 15" },
            password: { element: this.passwordInput.parentElement, text: "La password non è valida" },
            passwordConfirm: { element: this.passwordConfirmInput.parentElement, text: "Le password non corrispondono" },
            email: { element: this.emailInput.parentElement, text: "L'email non è valida" },
            name: { element: this.nameInput.parentElement, text: "Il nome non può contenere numeri" },
            lastName: { element: this.lastNameInput.parentElement, text: "Il cognome non può contenere numeri" },
            gender: { element: document.getElementById("gender-choice").parentElement, text: "Il sesso è obbligatorio" }
        };
    },

    showErrors(invalidElements)
    {
        Array.from(document.querySelectorAll(".popover, .error-input")).forEach(el => el.remove());

        const errors = this.errors();

        Object.keys(invalidElements).forEach(key =>
        {
            if(!invalidElements[key]) return;

            const { element, text } = errors[key];
            element.append(new FromTemplate(popoverInputErrorTemplate).replace({ text }).create().result);
        });
    },

    getInputValidation()
    {
        const usernameRegex = /^[a-z][a-z1-9]{4,14}$/;
        const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
        const nameRegex = /^[a-z][a-z]{2,29}$/;
        const invalidElements = {};

        invalidElements.username = !usernameRegex.test(this.usernameInput.value.toLowerCase());
        invalidElements.password = !passwordValidation.getInputValidation(this.passwordInput).valid;
        invalidElements.passwordConfirm = this.passwordConfirmInput.value != this.passwordInput.value;
        invalidElements.email = !(emailRegex.test(this.emailInput.value) && this.emailInput.value.length <= 40);
        invalidElements.name = !nameRegex.test(this.nameInput.value.toLowerCase());
        invalidElements.lastName = !nameRegex.test(this.lastNameInput.value.toLowerCase());
        invalidElements.gender = !this.getGenderInput();

        return { valid: !Object.values(invalidElements).some(Boolean), invalidElements };
    },

    async send()
    {
        const inputValidation = this.getInputValidation();
        if(!inputValidation.valid) return this.showErrors(inputValidation.invalidElements);

        toggleSpinner(signupButton);

        const res = await authEndpoints.fetch(authEndpoints.signup, {
            method: "post", payload: {
                username: this.usernameInput.value.toLowerCase(),
                password: btoa(this.passwordInput.value), // algoritmo IN-DE-CI-FRA-BI-LE
                email: this.emailInput.value,
                name: capitalize(this.nameInput.value),
                last_name: capitalize(this.lastNameInput.value),
                gender: this.getGenderInput().value
            }
        });

        toggleSpinner(signupButton);

        if(res.status >= 200 && res.status < 300) saveSession((await res.json()).session_id);
        else if(res.status == 409) new Toast("danger", getAuthenticationError((await res.json()).error_code)).render();
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
        Array.from(document.querySelectorAll(".popover, .error-input")).forEach(el => el.remove());

        const errors = this.errors();

        Object.keys(invalidElements).forEach(key =>
        {
            if(!invalidElements[key]) return;

            const { element, text } = errors[key];
            element.append(new FromTemplate(popoverInputErrorTemplate).replace({ text }).create().result);
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

        toggleSpinner(forgotPasswordButton);

        const res = await authEndpoints.fetch(authEndpoints.forgotPassword, {
            method: "patch", payload: {
                email: this.emailInput.value,
                password: btoa(this.passwordInput.value)
            }
        });

        toggleSpinner(forgotPasswordButton);

        if(res.status >= 200 && res.status < 300) saveSession(null, "/auth");
        else if(res.status == 401) new Toast("danger", getAuthenticationError((await res.json()).error_code)).render();
        else new Toast("danger", "Errore imprevisto").render();
    }
};


const loginButton = document.getElementById("login-button");
const signupButton = document.getElementById("signup-button");
const forgotPasswordButton = document.getElementById("forgot-password-button");
const signupPanelButton = document.querySelector("#register > button");
const forgotPasswordPanelButton = document.querySelector(".credentials > .contain-items > button");
const alreadySignupPanelButton = document.querySelector("#already-register > button");
const loginPanelBind = loginPanel.send.bind(loginPanel);
const signupPanelBind = signupPanel.send.bind(signupPanel);
const forgotPasswordPanelBind = forgotPasswordPanel.send.bind(forgotPasswordPanel);

loginButton.addEventListener("click", loginPanelBind);
signupButton.addEventListener("click", signupPanelBind);
forgotPasswordButton.addEventListener("click", forgotPasswordPanelBind);
signupPanelButton.addEventListener("click", () => showPanel("signup", signupPanelBind));
forgotPasswordPanelButton.addEventListener("click", () => showPanel("forgot-password", forgotPasswordPanelBind));
alreadySignupPanelButton.addEventListener("click", () => showPanel("login", loginPanelBind));


const passwordInputs = document.querySelectorAll(".show-password-errors");
["focus", "keyup"].forEach(event => passwordInputs.forEach(input => input.addEventListener(event, () =>
    passwordValidation.showErrors(passwordValidation.getInputValidation(input).invalidOptions, input.parentElement)
)));

window.addEventListener("load", () =>
{
    if(getLocalSessionId()) return pathRedirect();
    showPanel("login", loginPanelBind);
});