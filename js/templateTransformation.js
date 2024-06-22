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