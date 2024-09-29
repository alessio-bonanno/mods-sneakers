const shoeItemTemplate = `
<div class="shoe-item">
    <div>
        <div class="d-flex flex-column flex-lg-row">
            <div class="img-container">
                <a href="/product/?id={id}"><img src="{imageUrl}"></a>
            </div>
            <div class="mx-3 pb-3">
                <h1>{name}</h1>
                <h3>{price}</h3>
                <div class="d-flex flex-row align-items-center">
                    <div class="change-quantity btn-group me-3">
                        <button data-callback-name="minusQuantity" class="btn">
                            <img class="svg-image" role="button"
                                 style="mask-image: url(/media/minus.svg);"></img>
                        </button>
                        <input data-callback-name="quantityInput" value="{quantity}" type="text" disabled>
                        <button data-callback-name="plusQuantity" class="btn">
                            <img class="svg-image" role="button"
                                 style="mask-image: url(/media/plus.svg);"></img>
                        </button>
                    </div>
                    <i data-callback-name="removeShoeItem" class="bi bi-trash text-danger" role="button"></i>
                </div>
            </div>
        </div>
    </div>
</div>
`;



let localCart = null;

function getLocalCart()
{
    if(localCart) return localCart;
    return localCart = JSON.parse(localStorage.getItem("cart") || "[]");
}

function saveLocalCart(items)
{
    if(!items || !items?.length) localStorage.removeItem("cart");
    else localStorage.setItem("cart", JSON.stringify(items));

    localCart = items || [];
}

function saveLocalCartItem(item)
{
    const localCart = getLocalCart();

    localCart.push(item);
    saveLocalCart(localCart);
}

function removeLocalCartItem(item)
{
    const localCart = getLocalCart();
    const itemIndex = localCart.indexOf(item);

    localCart.splice(itemIndex, 1);
    saveLocalCart(localCart);
}

async function uploadLocalCartItems()
{
    const localCart = getLocalCart();
    const isUserAuthenticated = await getIsUserAuthenticated();
    if(!localCart.length || !isUserAuthenticated) return;

    await uploadCartItems(localCart);
    saveLocalCart();
}