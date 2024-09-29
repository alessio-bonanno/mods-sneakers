const purchasesEndpoints = new Endpoints({
    info: "/info",
    checkoutInfo: "/checkout/info",
    cartAdd: "/cart/add",
    cartRemove: "/cart/remove",
    cartInfo: "/cart/info",
    cartUpdateItemQuantity: "/cart/item-quantity",
    cartCheckout: "/cart/checkout"
}, "/user/purchases");



async function uploadCartItems(items)
{
    const sessionId = getLocalSessionId();
    if(!sessionId) return false;

    const payload = { session_id: sessionId, items };
    const res = await purchasesEndpoints.fetch(purchasesEndpoints.cartAdd, { method: "post", payload });

    return res.status >= 200 && res.status < 300 ? await res.json() : { ids: [] };
}

async function removeCartItems(...cartOrderIds)
{
    const sessionId = getLocalSessionId();
    if(!sessionId) return false;

    const payload = { session_id: sessionId, ids: cartOrderIds };
    const res = await purchasesEndpoints.fetch(purchasesEndpoints.cartRemove, { method: "delete", payload });

    return res.status >= 200 && res.status < 300;
}

async function getCartInfo()
{
    const sessionId = getLocalSessionId();
    if(!sessionId) return { status: "error", items: [] };

    const payload = { session_id: sessionId };
    const res = await purchasesEndpoints.fetch(purchasesEndpoints.cartInfo, { method: "post", payload });

    return res.status >= 200 && res.status < 300 ? await res.json() : [];
}

async function updateCartItemQuantity(cartOrder, quantity)
{
    const sessionId = getLocalSessionId();
    if(!sessionId) return false;

    const payload = { session_id: sessionId, cart_order: cartOrder, quantity };
    const res = await purchasesEndpoints.fetch(purchasesEndpoints.cartUpdateItemQuantity, { method: "patch", payload });

    return res.status >= 200 && res.status < 300;
}

async function checkoutCartItems(...productIdsCheckout)
{
    const sessionId = getLocalSessionId();
    if(!sessionId) return false;

    const payload = { session_id: sessionId };
    const query = productIdsCheckout.length ? { id: productIdsCheckout } : null;
    const res = await purchasesEndpoints.fetch(purchasesEndpoints.cartCheckout, { method: "post", query, payload });

    return res.status >= 200 && res.status < 300;
}

async function getPurchasedItemsInfo()
{
    const sessionId = getLocalSessionId();
    if(!sessionId) return [];

    const payload = { session_id: sessionId };
    const res = await purchasesEndpoints.fetch(purchasesEndpoints.checkoutInfo, { method: "post", payload });

    return res.status >= 200 && res.status < 300 ? await res.json() : [];
}