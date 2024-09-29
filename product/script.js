const modTemplate = `
<div class="mod">
    <div class="d-flex flex-row justify-content-between" style="width: var(--mods-name-size);">
        <i data-callback-name="nameInfoButton" class="bi bi-question-circle" role="button"></i>
        {modNameCapital}
        <i data-callback-name="customizeButton" class="bi bi-plus-square" role="button" style="transition: all .5s; color: var(--palette-green);"></i>
    </div>
    <input data-callback-name="colorInput" class="form-control form-control-color" type="color" title="{modName}" value="#000000" disabled>
</div>
`;


const modsContainer = document.getElementById("mods-container");
const detailsContainer = document.querySelector(".details");
const cartBox = document.getElementById("cart-box");
const cartBoxPrice = cartBox.querySelector("h3");
let fetchedProductData = null;



const modsObj = {
    names: [
        "tongue", "overlay", "collar", "swoosh", "laces", "quarter", "eyestay",
        "mudguard", "vamp", "toe", "foxing", "sole", "cupsole", "outsole"
    ],

    toNumberType(modName)
    {
        return (this.names.indexOf(modName) + 1) || null;
    },

    toName(modNumber)
    {
        return this.names[modNumber + 1] || null;
    }
};


const imageContainer = document.querySelector(".img-container");
const detailsTable = document.querySelector("table");
function updateUIPosition()
{
    const upvotesContainer = document.getElementById("upvotes");

    if(isMobileWidth(992))
    {
        imageContainer.prepend(upvotesContainer);
        cartBox.after(detailsContainer);
        cartBox.before(modsContainer);
    }
    else
    {
        detailsContainer.firstElementChild.after(upvotesContainer);
        cartBox.before(detailsContainer);
        detailsTable.before(modsContainer);
    }
}


function getCartBoxModsSum()
{
    let el = document.querySelector(".mods-price");
    if(el) return el;

    el = document.createElement("div");
    el.classList.add("mods-price");
    return el;
}
const cartBoxModsSum = new FromTemplate(`<div class="mods-price"></div>`).create().result;

function updateCartBoxPrice(price)
{
    const isProductPriced = !!price;

    cartBoxPrice.textContent = price || fetchedProductData.price;
    if(isProductPriced) cartBoxPrice.after(cartBoxModsSum);
    else cartBoxModsSum.remove();
}

let addedModsCount = 0;
function updateModsPrice(hasModBeenAdded)
{
    if(!fetchedProductData || !fetchedProductData.price) return;

    addedModsCount += hasModBeenAdded ? 1 : -1;
    if(!addedModsCount) return updateCartBoxPrice();

    const sumModsPrice = addedModsCount * 7; // SCONTI! tutto a €7 (per adesso)
    cartBoxModsSum.innerHTML = `+€${sumModsPrice} <span>x${addedModsCount} Mod</span>`;

    updateCartBoxPrice(fetchedProductData.price + sumModsPrice);
}


const navbarHeight = document.getElementById("top-navbar").clientHeight;
const getBeforeModsContainer = () => document.querySelector("*:has(+ #mods-container)");
function renderModImageInfoPopup(modName)
{
    const img = document.createElement("img");
    img.src = `/media/mods/${modName}.png`;

    const popup = document.createElement("div");
    popup.classList.add("info-popup");
    popup.style.visibility = "hidden";

    popup.append(img);
    this.after(popup);

    return new Promise(resolve => img.addEventListener("load", () =>
    {
        const minPopupTopOffset = this.offsetTop - popup.clientHeight;
        const shouldRenderAboveButton = window.scrollY + navbarHeight < minPopupTopOffset && getBeforeModsContainer().offsetTop < minPopupTopOffset;
        const modInfoButtonBottomOffset = this.offsetTop + this.clientHeight;

        popup.style.visibility = "";
        popup.style.left = `${this.offsetLeft}px`;
        popup.style.top = shouldRenderAboveButton ? `calc(${minPopupTopOffset}px - .5rem)` : `calc(${modInfoButtonBottomOffset}px + .5rem)`;

        resolve(popup);
    }));
}

function renderCustomizableMods()
{
    const isImagePopup = el => el.localName == "img" && el.parentElement.classList.contains("info-popup");

    const mods = modsObj.names.map(modName => new FromTemplate(modTemplate)
        .replace({ modName, modNameCapital: capitalize(modName) })
        .create()
        .addCallbacks({
            nameInfoButton: (item, { colorInput }) =>
            {
                let popup = null;
                const removePopup = async () => popup && (popup = (await popup).remove());
                const renderModInfoPopupBind = renderModImageInfoPopup.bind(item, colorInput.title);

                if(!isTouchSupported())
                {
                    item.addEventListener("mouseenter", () => !popup && (popup = renderModInfoPopupBind()));
                    window.addEventListener("mousemove", ({ target }) =>
                    {
                        if(target == item || !popup) return;
                        removePopup();
                    });
                }
                else
                {
                    // TODO: fix - non so perché ma su firefox qua mi arriva un evento in più qualche volta
                    item.addEventListener("click", () => !popup ?
                        popup = renderModInfoPopupBind() :
                        removePopup()
                    );
                    window.addEventListener("click", ({ target }) =>
                    {
                        if(target == item || !popup || isImagePopup(target)) return;
                        removePopup();
                    });
                }

            },

            customizeButton: (item, { colorInput }) =>
            {
                const plusIcon = "bi-plus-square";
                const minusIcon = "bi-dash-square";
                let hasIconAddMod = item.classList.contains(plusIcon);

                item.addEventListener("click", () =>
                {
                    const oldIcon = hasIconAddMod ? plusIcon : minusIcon;
                    const newIcon = hasIconAddMod ? minusIcon : plusIcon;
                    hasIconAddMod = !hasIconAddMod;

                    item.classList.replace(oldIcon, newIcon);
                    item.style.color = hasIconAddMod ? "var(--palette-green)" : "red";
                    colorInput.disabled = hasIconAddMod;

                    updateModsPrice(!hasIconAddMod);
                });
            }
        }).result
    );
    mods.forEach(mod => modsContainer.lastElementChild.before(mod));
}


function renderCartBoxQuantity()
{
    for(let i = 1; i <= 10; i++)
        cartBoxQuantityHidden.innerHTML += `<option value="${i}">${i}</option>`;

    updateQuantityText();
}


function getModdedShoe()
{
    const { id } = fetchedProductData;
    const quantity = cartBoxQuantityHidden.value;
    const mods = Array.from(document.querySelectorAll("#mods-container .mod input:not(:disabled)")).map(modInput => ({
        color: modInput.value,
        type: modsObj.toNumberType(modInput.title),
        price: 7 // altri sconti?
    }));

    return {
        shoe_id: id,
        quantity,
        mods: mods.length ? mods : null
    };
}

async function uploadCurrentModdedShoeItem(button)
{
    toggleSpinner(button);

    const moddedShoe = getModdedShoe();
    const isUserAuthenticated = await getIsUserAuthenticated();
    let uploadId = null;

    if(!isUserAuthenticated) saveLocalCartItem(moddedShoe);
    else uploadId = (await uploadCartItems([moddedShoe])).ids[0];

    toggleSpinner(button);
    return uploadId;
}

async function addCartButtonListener(event)
{
    if(isButtonClicked) return;
    isButtonClicked = true;

    await uploadCurrentModdedShoeItem(this);
    pathRedirect("/cart", event.type != "click" ? "_blank" : null);
    isButtonClicked = false;
}

async function buyNowButtonListener(event)
{
    const windowTarget = event.type != "click" ? "_blank" : null;
    if(!await getIsUserAuthenticated()) return pathRedirect(`/auth/?to=${location.pathname + location.search}`, windowTarget);
    if(isButtonClicked) return;
    isButtonClicked = true;

    const uploadId = await uploadCurrentModdedShoeItem(this);
    pathRedirect(`/cart/?id=${uploadId}`, windowTarget);
    isButtonClicked = false;
}

function upvotesToString(upvotes)
{
    if(!upvotes) return "0";

    const suffixes = ["", "K", "M", "B"];
    const divisor = Math.max(0, Math.floor(Math.log10(upvotes) / 3));
    return Math.floor(upvotes / (10 ** (divisor * 3))) + suffixes[divisor];
}

let isButtonClicked = false;
function assignProductUIInfo(product)
{
    const { image_url: imageUrl, upvotes, name, price } = product;
    const image = document.querySelector(".img-container img");
    const titles = document.querySelectorAll("h1");
    const upvotesContainer = document.getElementById("upvotes");
    const detailsTableBody = detailsContainer.querySelector("table tbody");
    const detailsPrice = detailsContainer.querySelector("h3");
    const addCartButton = document.querySelector(".btn.add-cart");
    const buyNowButton = document.querySelector(".btn.buy-now");
    const availableClass = price ? "available" : "not-available";
    const upvotesString = upvotesToString(upvotes);
    const productInfoTranslationStrings = {
        stylecode: "Stylecode",
        model: "Modello",
        colorway: "Colorway",
        color_slug: "Colore",
        release_date: "Data di uscita"
    };

    image.src = imageUrl;
    upvotesContainer.append(upvotesString);
    detailsPrice.classList.add(availableClass);
    cartBoxPrice.classList.add(availableClass);
    titles.forEach(title => title.textContent = name);
    Object.entries(productInfoTranslationStrings).forEach(([keyInfo, str]) =>
        detailsTableBody.innerHTML += product[keyInfo] ? `<tr><th>${str}</th><td>${product[keyInfo]}</td></tr>` : ""
    );
    if(!price) return addCartButton.disabled = buyNowButton.disabled = true;

    ["click", "auxclick"].forEach(event =>
    {
        addCartButton.addEventListener(event, addCartButtonListener);
        buyNowButton.addEventListener(event, buyNowButtonListener);
    });

    detailsPrice.textContent = cartBoxPrice.textContent = price;
}


const cartBoxQuantityHidden = cartBox.querySelector(".cart-box-buttons .form-select.hidden");
const cartBoxQuantityMock = cartBox.querySelector(".cart-box-buttons .form-select.mock");
const errorPage = new ErrorPage("404 :(", "Non ho trovato niente");

async function renderProductInfo(shoeId)
{
    const product = await getProduct(shoeId);
    if(!product) return errorPage.render();

    assignProductUIInfo(product);
    removePlaceholderClasses();
    fetchedProductData = product;
}

const showQuantityPicker = () => cartBoxQuantityHidden.showPicker();
const updateQuantityText = () => cartBoxQuantityMock.textContent = cartBoxQuantityHidden.querySelector(":checked").textContent;
cartBoxQuantityHidden.addEventListener("change", updateQuantityText);
cartBoxQuantityMock.addEventListener("click", showQuantityPicker);
window.addEventListener("resize", updateUIPosition);

window.addEventListener("load", async () =>
{
    const id = new URLSearchParams(location.search).get("id");
    if(!id) return errorPage.render();

    await renderProductInfo(id);
    renderCartBoxQuantity();
    renderCustomizableMods();
    updateUIPosition();
});