const shoeEndpoints = new Endpoints({
    listing: "/listing",
    product: "/product/{shoeId}",
    filters: "/filters"
}, "/shoe");



function getDataError(errorCode)
{
    switch(errorCode)
    {
        case 20: return "Richiesta non valida: parametro mancante";
        case 21: return "Prodotto non trovato";
        case 22: return "Errore con API";
        default: return "Errore sconosciuto";
    }
}

async function getListing(query)
{
    const res = await shoeEndpoints.fetch(shoeEndpoints.listing, { query });
    const json = await res.json();
    if(res.status < 200 || res.status >= 300) return new Toast("danger", getDataError(json.error_code)).render();

    return json;
}

const alreadyFetchedProducts = {};

async function getProduct(shoeId)
{
    if(alreadyFetchedProducts[shoeId]) return alreadyFetchedProducts[shoeId];

    const res = await shoeEndpoints.fetch(shoeEndpoints.product, { path: { shoeId } });
    const json = await res.json();
    if(res.status < 200 || res.status >= 300) return new Toast("danger", getDataError(json.error_code)).render();

    return alreadyFetchedProducts[shoeId] = json;
}

async function getFilters()
{
    const res = await shoeEndpoints.fetch(shoeEndpoints.filters);
    const json = await res.json();
    if(res.status < 200 || res.status >= 300) return new Toast("danger", getDataError(json.error_code)).render();

    return json;
}