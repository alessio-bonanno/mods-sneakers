function renderItemQuantityPriceUpdated(price, mods, quantity, shoeItem)
{
    const priceHeader = shoeItem.querySelector("h3");
    const changeQuantityGroup = shoeItem.querySelector(".change-quantity");
    if(!price)
    {
        priceHeader.textContent = "Esaurito";
        changeQuantityGroup.style.display = "none";
        return;
    }

    const modsPrice = mods ? mods.reduce((acc, mod) => acc += mod.price, 0) : 0;
    priceHeader.textContent = "€" + quantity * (price + modsPrice);
}

async function renderCartItems(items, isUserAuthenticated)
{
    const shoeItemsContainer = document.getElementById("shoes-container");
    const shoeItems = [];

    for(const moddedShoe of items)
    {
        const { id, image_url: imageUrl, name, price } = await getProduct(moddedShoe.shoe_id);
        let oldQuantity = moddedShoe.quantity;

        const shoeItem = new FromTemplate(shoeItemTemplate)
            .replace({ id, imageUrl, name, quantity: moddedShoe.quantity })
            .create()
            .addCallbacks({
                minusQuantity: (item, { quantityInput, result }) =>
                {
                    item.addEventListener("mouseout", async () =>
                    {
                        if(!isUserAuthenticated || moddedShoe.quantity == oldQuantity) return;

                        --oldQuantity;
                        await updateCartItemQuantity(moddedShoe.cart_order, moddedShoe.quantity);
                    });

                    item.addEventListener("click", () =>
                    {
                        if(quantityInput.value <= 1) return;

                        --quantityInput.value;
                        --moddedShoe.quantity;

                        if(!isUserAuthenticated) saveLocalCart(items);
                        renderItemQuantityPriceUpdated(price, moddedShoe.mods, moddedShoe.quantity, result);
                    });
                },

                plusQuantity: (item, { quantityInput, result }) =>
                {
                    item.addEventListener("mouseout", async () =>
                    {
                        if(!isUserAuthenticated || moddedShoe.quantity == oldQuantity) return;

                        ++oldQuantity;
                        await updateCartItemQuantity(moddedShoe.cart_order, moddedShoe.quantity);
                    });

                    item.addEventListener("click", () =>
                    {
                        if(quantityInput.value >= 10) return;

                        ++quantityInput.value;
                        ++moddedShoe.quantity;

                        if(!isUserAuthenticated) saveLocalCart(items);
                        renderItemQuantityPriceUpdated(price, moddedShoe.mods, moddedShoe.quantity, result);
                    });
                },

                removeShoeItem: (item, { result }) =>
                {
                    item.addEventListener("mouseenter", () => result.style.height = getComputedStyle(result).height);
                    item.addEventListener("mouseleave", () => result.style.height = null);
                    item.addEventListener("click", async () =>
                    {
                        result.addEventListener("transitionend", () => result.remove());
                        result.classList.add("remove-item-transition");

                        if(isUserAuthenticated) await removeCartItems(moddedShoe.cart_order);
                        else removeLocalCartItem(moddedShoe);

                        items.splice(items.indexOf(moddedShoe), 1);
                        if(!items.length) return new ErrorPage("Ancora niente!", "Corri a fare acquisti", { "/listing": "acquisti" }).render();
                    });
                }
            }).result;

        renderItemQuantityPriceUpdated(price, moddedShoe.mods, moddedShoe.quantity, shoeItem);
        shoeItems.push(shoeItem);
    };

    shoeItemsContainer.append(...shoeItems);
}

function renderCheckoutConfirmation(shoeItemsContainer, checkoutBox, checkoutButtons)
{
    shoeItemsContainer.addEventListener("transitionend", () =>
    {
        const checkoutConfirmed = document.getElementById("checkout-confirm");
        checkoutConfirmed.classList.add("init");
        shoeItemsContainer.remove();
    });

    if(!isMobileWidth(992)) checkoutBox.style.transform = "translateX(calc(100vw - var(--shoe-items-container-size) - 2rem))";
    shoeItemsContainer.classList.add("remove-item-transition");
    checkoutButtons.forEach(button => button.disabled = true);
}

function applyCheckoutButtonsListeners(isUserAuthenticated)
{
    const shoeItemsContainer = document.getElementById("shoes-container");
    const checkoutBox = document.getElementById("go-checkout-box");
    const checkoutButtons = checkoutBox.querySelectorAll("button");

    const renderCheckoutCartItems = async () =>
    {
        if(!isUserAuthenticated) return pathRedirect(`/auth/?to=${location.pathname + location.search}`);
        renderCheckoutConfirmation(shoeItemsContainer, checkoutBox, checkoutButtons);

        const productIdsCheckout = new URLSearchParams(location.search).getAll("id");
        await checkoutCartItems(...productIdsCheckout);
    };

    let isButtonClicked = false;
    checkoutButtons.forEach(button =>
    {
        button.addEventListener("mouseenter", () => shoeItemsContainer.style.height = getComputedStyle(shoeItemsContainer).height);
        button.addEventListener("mouseleave", () => shoeItemsContainer.style.height = null);
        button.addEventListener("click", async () =>
        {
            if(isButtonClicked) return;
            isButtonClicked = true;

            await renderCheckoutCartItems();
            setTimeout(() => pathRedirect("/orders"), 6e3);
        });
        button.addEventListener("auxclick", async () =>
        {
            if(isButtonClicked) return;
            isButtonClicked = true;

            await renderCheckoutCartItems();
            pathRedirect("/orders", "_blank");
        });
    });
}


function applyDOMRenders(items, isUserAuthenticated)
{
    if(!items.length) return new ErrorPage("Ancora niente!", "Corri a fare acquisti", { "/listing": "acquisti" }).render();

    applyCheckoutButtonsListeners(isUserAuthenticated);
    renderCartItems(items, isUserAuthenticated);
}

window.addEventListener("load", async () =>
{
    await uploadLocalCartItems();

    const isUserAuthenticated = await getIsUserAuthenticated();
    const items = isUserAuthenticated ? (await getCartInfo()).items : localCart;
    if(!items.length) return applyDOMRenders(items, isUserAuthenticated);

    const productIdsCheckout = new URLSearchParams(location.search).getAll("id");
    if(!productIdsCheckout.length) return applyDOMRenders(items, isUserAuthenticated);

    applyDOMRenders(items.filter(item => productIdsCheckout.includes(item.cart_order.toString())), isUserAuthenticated);
});