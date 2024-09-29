async function renderPurchasedItems(items)
{
    const shoeItemsContainer = document.getElementById("shoes-container");

    for(const item of items)
    {
        const { id, image_url: imageUrl, name, price } = await getProduct(item.shoe_id);
        const modsPrice = price && item.mods ? item.mods.reduce((acc, mod) => acc += mod.price, 0) : 0;

        const shoeItem = new FromTemplate(shoeItemTemplate)
            .replace({ id, imageUrl, name, price: price ? `€${price + modsPrice}` : "Esaurito" })
            .create()
            .result;
        const changeQuantityGroup = shoeItem.querySelector(".change-quantity");
        const removeItemButton = shoeItem.querySelector(".bi-trash");

        changeQuantityGroup.remove();
        removeItemButton.remove();
        for(let _ = 0; _ < item.quantity; _++) shoeItemsContainer.append(shoeItem.cloneNode(true));
    }
}

window.addEventListener("load", async () =>
{
    if(!await getIsUserAuthenticated()) return pathRedirect("/cart");

    const items = (await getPurchasedItemsInfo()).items;
    if(!items.length) return new ErrorPage("Ancora niente!", "Corri a fare acquisti", { "/listing": "acquisti" }).render();

    await renderPurchasedItems(items);
});