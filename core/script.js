const PORT = 8000;
const hostnameUsed = location.hostname; // prendo l'hostname in modo dinamico, invede di usare l'ip di loopback, in caso si voglia accedere attraverso ip locale


const mainBody = document.querySelector("main");


const isTouchSupported = () => "ontouchstart" in window;
const isMobileWidth = (maxWidthPixel = 768) => window.innerWidth < maxWidthPixel;
const isMobile = maxWidthPixel => isMobileWidth(maxWidthPixel) && isTouchSupported();
const capitalize = str => str.split("_").map(sub => sub[0].toUpperCase() + sub.slice(1).toLowerCase()).join(" ");


const isUAFirefox = navigator.userAgent.toLowerCase().includes("firefox");
function scrollWindowTop()
{
    if(!isUAFirefox) return scrollTo(0, 0);
    /* per firefox, da quanto ho provato, non va all'inizio della pagina
    a meno che non faccia così */
    else return scrollTo({ top: 0, left: 0, behavior: "instant" });
}


const spinner = document.createElement("span");
spinner.className = "spinner-border text-light";
function toggleSpinner(element)
{
    if(spinner.parentElement != element) spinner.remove();
    if(spinner.parentElement) return spinner.remove();
    element.append(spinner);
}


class FromTemplate
{
    result = null;

    constructor(template)
    {
        this.template = template;
    }

    replace(options)
    {
        Object.keys(options).forEach(key => this.template = this.template.replaceAll(`{${key}}`, options[key]));
        return this;
    }

    create()
    {
        let temp = document.createElement("div");
        temp.innerHTML = this.template;

        temp.querySelectorAll("[data-callback-name]").forEach(element =>
            this[element.dataset.callbackName] = element
        );

        this.result = temp.childElementCount == 1 ? temp.firstElementChild : Array.from(temp.children);
        return this;
    }

    addCallbacks(callbackObj)
    {
        for(const key in callbackObj)
            callbackObj[key](this[key], this);
        return this;
    }
}


const toastContainer = document.createElement("section");
toastContainer.id = "toast-container";
mainBody.append(toastContainer);

class Toast
{
    constructor(type, text, durationSeconds = 3)
    {
        this.toast = new FromTemplate(`
        <div class="toast align-items-center text-bg-${type} border-0" data-bs-delay="${durationSeconds * 1e3}">
            <div class="d-flex">
                <div class="toast-body">${text}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
        `).create().result;

        this.toast.addEventListener("hidden.bs.toast", () => this.toast.remove());
    }

    render()
    {
        toastContainer.append(this.toast);
        bootstrap.Toast.getOrCreateInstance(this.toast).show();
    }
}


class Endpoints
{
    origin = `http://${hostnameUsed}:${PORT}`;
    prefix = `/api/v1`;
    validEndpoints = [];

    constructor(endpoints, prefix)
    {
        if(prefix) this.prefix += prefix;

        for(const key in endpoints)
        {
            const value = `${this.prefix}${endpoints[key]}`;

            this[key] = value;
            this.validEndpoints.push(value);
        }
    }

    async fetch(endpoint, options = { method: "get", path: null, query: null, payload: null })
    {
        if(!this.validEndpoints.includes(endpoint)) return null;

        const requestConfig = {};

        if(options.method) requestConfig.method = options.method.toUpperCase();
        if(options.query)
        {
            let queryArrFormatted = [];

            if(!options.query?.length)
                for(const [key, value] of Object.entries(options.query))
                    if(!Array.isArray(value)) queryArrFormatted.push([key, value]);
                    else for(let i = 0; i < value.length; i++)
                        queryArrFormatted.push([key, value[i]]);

            endpoint += `?${new URLSearchParams(queryArrFormatted.length ? queryArrFormatted : options.query)}`;
        }
        if(options.payload)
        {
            requestConfig.body = typeof options.payload == "string" ? options.payload : JSON.stringify(options.payload);
            requestConfig.headers = { "Content-Type": "application/json" };
        }

        for(const key in options.path) endpoint = endpoint.replaceAll(`{${key}}`, options.path[key]);

        return fetch(`${this.origin}${endpoint}`, requestConfig);
    }
}