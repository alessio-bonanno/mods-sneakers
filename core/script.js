class TemplateTransformation
{
    constructor(template)
    {
        this.template = template;
    }

    replace(options)
    {
        Object.keys(options).forEach(key => this.template = this.template.replace(`{${key}}`, options[key]));
        return this;
    }

    create()
    {
        let temp = document.createElement("div");
        temp.innerHTML = this.template;

        return temp.childElementCount == 1 ? temp.firstElementChild : Array.from(temp.children);
    }
}


class Toast
{
    constructor(type, text, durationSeconds = 3)
    {
        this.toast = new TemplateTransformation(`
        <div class="toast align-items-center text-bg-${type} border-0" data-bs-delay="${durationSeconds * 1e3}">
            <div class="d-flex">
                <div class="toast-body">${text}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
        `).create();

        this.toast.addEventListener("hidden.bs.toast", () => this.toast.remove());
    }

    render()
    {
        container.append(this.toast);
        bootstrap.Toast.getOrCreateInstance(this.toast).show();
    }
}

const mainBody = document.querySelector("main");
const container = document.createElement("section");
container.id = "toast-container";
mainBody.append(container);