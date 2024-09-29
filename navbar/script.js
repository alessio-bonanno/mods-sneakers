const topNavbarTemplate = `
<section>
    <nav id="top-navbar" class="navbar navbar-expand-md flex-nowrap fixed-top">
        <button class="navbar-toggler fs-6" type="button" data-bs-toggle="offcanvas" data-bs-target="#offcanvas" style="border: none;">
            <img class="svg-image" style="mask-image: url(/media/navbar-menu.svg); width: 48px; height: 48px;"></img>
        </button>
        <div id="offcanvas" class="offcanvas offcanvas-start vw-100" tabindex="-1">
            <div class="offcanvas-header">
                <button type="button" class="btn-close position-absolute" data-bs-dismiss="offcanvas"></button>
                <h5 class="offcanvas-title mx-auto brand"><a href="/">ModsS</a></h5>
            </div>
            <div class="offcanvas-body">
                <div class="navbar-nav nav-pills align-items-center">
                    <a data-callback-name="navOption1" class="nav-link" role="button">Uomo</a>
                    <a data-callback-name="navOption2" class="nav-link" role="button">Donna</a>
                    <a data-callback-name="navOption3" class="nav-link" role="button"></a>
                </div>
            </div>
        </div>
        <div id="navbar-middle" class="container-fluid justify-content-center position-relative">
            <a class="navbar-brand brand" href="/">ModsS</a>
            <div id="search-bar">
                <input class="form-control" type="search-bar" placeholder="Cerca">
                <div id="search-bar-items-container"></div>
            </div>
            <i data-callback-name="searchManual" class="bi bi-search" role="button"></i>
        </div>
        <div class="icons-container" class="pe-3">
        </div>
    </nav>
</section>
`;

const bottomNavbarTemplate = `
<section>
    <nav id="bottom-navbar">
        <span>🄯 alessio-bonanno</span>
        <ul>
            <li class="d-block d-md-none"><a href="https://github.com/alessio-bonanno/mods-sneakers" target="_blank">Source Code</a></li>
            <li><a href="http://localhost:8000/api/v1/user/docs" target="_blank">Documentation /api/v1/user</a></li>
            <li class="d-none d-md-block"><a href="https://github.com/alessio-bonanno/mods-sneakers" target="_blank">Source Code</a></li>
            <li><a href="http://localhost:8000/api/v1/shoe/docs" target="_blank">Documentation /api/v1/shoe</a></li>
        </ul>
        <span>🄯 alessio-bonanno</span>
    </nav>
</section>
`;

const cartIconTemplate = `
<a href="/cart">
    <img class="svg-image" style="mask-image: url(/media/cart.svg); width: 45px; height: 45px;">
</a>
`;

const alreadyLoggedInTemplate = `
<ul class="dropdown-menu">
    <li>
        <div data-callback-name="logoutButton" class="dropdown-item" role="button">
            <img class="svg-image" style="mask-image: url(/media/logout.svg);">
            Esci
        </div>
        <a class="dropdown-item" href="/orders">
            <i class="bi bi-bag-fill"></i>
            Acquisti
        </a>
    </li>
</ul>
<span class="dropdown-toggle" type="button" data-bs-toggle="dropdown">Ciao,
    <br>
    <span style="color: var(--palette-green);">{name}</span>
</span>
`;

const searchItemTemplate = `
<div class="search-bar-item placeholder-glow">
    <div class="p-2">
        <img class="placeholder" src="{imageUrl}">
    </div>
    <h4 data-callback-name="nameHeader" class="mb-0 placeholder">{name}</h4>
</div>
`;



function pushNavbarIconElements(iconContainers, ...icons)
{
    icons.forEach(icon =>
    {
        const isAnchor = icon.localName == "a";
        const isAnchorHrefCurrentPage = location.pathname.startsWith(icon.pathname);
        if(isAnchor && isAnchorHrefCurrentPage) return;

        iconContainers.forEach(container =>
        {
            const lastChild = Array.from(container.querySelectorAll(".nav-link")).at(-1);
            const iconClone = icon.cloneNode(true);
            lastChild ? lastChild.after(iconClone) : container.prepend(iconClone);
        });
    });
}

async function logoutListener()
{
    const sessionId = getLocalSessionId();
    if(!sessionId) return new Toast("danger", "Errore imprevisto").render();

    await authEndpoints.fetch(authEndpoints.logout, { method: "delete", payload: { session_id: sessionId } });
    saveSession(null);
};

async function renderTopNavbarIcons(iconContainers)
{
    const isUserAuthenticated = await getIsUserAuthenticated();
    const cartIcon = new FromTemplate(cartIconTemplate).create().result;
    const authIcon = !isUserAuthenticated ?
        new FromTemplate(`<a href="/auth/?to={to}"><i class="bi bi-person-circle fs-1"></i></a>`)
            .replace({ to: location.pathname + location.search }).create().result :
        new FromTemplate(alreadyLoggedInTemplate)
            .replace({ name: (await getUserInfo()).name })
            .create()
            .addCallbacks({
                logoutButton: item => item.setAttribute("onclick", "logoutListener()")
            }).result;

    pushNavbarIconElements(iconContainers, ...isUserAuthenticated ? authIcon : [authIcon], cartIcon);
}

function listingNavigate(audiencesValue)
{
    if(!audiencesValue) return pathRedirect("/listing");
    if(!location.pathname.startsWith("/listing")) return pathRedirect(`/listing/?audiences=${audiencesValue}`);

    const closeOffcanvas = document.querySelector(".offcanvas-header .btn-close");
    closeOffcanvas.click();

    applyFiltersParams({ audiences: getURLParams().has("audiences", audiencesValue) ? null : audiencesValue });
    updateListingPages();
}

const searchItemText = new FromTemplate(searchItemTemplate).replace({ imageUrl: "", name: "" }).create();
searchItemText.result.classList.add("text-only");

function errorListingNotFoundSearchBar(searchItemsContainer, searchValue)
{
    const searchItem = searchItemText
        .addCallbacks({
            nameHeader: item => item.innerHTML = `Nessun risulato trovato per <strong>${searchValue}</strong>`
        }).result;
    removePlaceholderClasses(searchItem);
    searchItemsContainer.append(searchItem);
}

const MAX_SEARCH_RESULT_ITEMS = 4;
async function renderSearchListingItems(searchItemsContainer, searchInput)
{
    const listing = await getListing({ search: searchInput.value, filter: "all" });
    if(!listing || !listing.count) return errorListingNotFoundSearchBar(searchItemsContainer, searchInput.value);

    const searchItemsRemaining = listing.count - MAX_SEARCH_RESULT_ITEMS;

    if(searchItemsRemaining)
    {
        const remainingString = searchItemsRemaining.toString();
        const remainingRounded = remainingString[0] + remainingString.slice(1).replaceAll(/\d/g, 0);
        const searchItem = searchItemText.addCallbacks({
            nameHeader: item => item.innerHTML = `Cerca altri <strong>${remainingRounded}+</strong> risultati`
        }).result;

        searchItem.onmousedown = () => pathRedirect(`/listing/?search=${searchInput.value}&filter=all`); // stackoverflow.com/questions/13980448
        searchItemsContainer.append(searchItem);
    }

    listing.items.slice(0, MAX_SEARCH_RESULT_ITEMS).forEach(item =>
    {
        const { image_url: imageUrl, name, id } = item;
        const searchItem = new FromTemplate(searchItemTemplate).replace({ imageUrl, name }).create().result;

        searchItem.addEventListener("mousedown", () => pathRedirect(`/product/?id=${id}`));
        searchItemsContainer.append(searchItem);
    });

    removePlaceholderClasses();
}

function applySearchInputListeners(searchItemsContainer, searchInput)
{
    let searchBarTypingTimeout = null;

    searchInput.addEventListener("input", () =>
    {
        clearTimeout(searchBarTypingTimeout);

        searchItemsContainer.replaceChildren();
        if(!searchInput.value.trim().length) return;

        searchBarTypingTimeout = setTimeout(() => renderSearchListingItems(searchItemsContainer, searchInput), 5e2);
    });

    searchInput.addEventListener("keyup", ({ key }) =>
    {
        if(key.toLowerCase() != "enter") return;

        clearTimeout(searchBarTypingTimeout);
        if(!searchInput.value.trim().length) return searchInput.value = "";

        pathRedirect(`/listing/?search=${searchInput.value}`);
    });

    searchInput.addEventListener("focusout", () =>
    {
        clearTimeout(searchBarTypingTimeout);

        searchItemsContainer.replaceChildren();
        searchInput.value = "";
    });
}

function renderNavbars()
{
    const header = document.querySelector("header") || document.createElement("header");
    const topNavbar = new FromTemplate(topNavbarTemplate)
        .create()
        .addCallbacks({
            navOption1: item =>
            {
                const value = "men";
                item.dataset.audiences = value;
                item.addEventListener("click", () => listingNavigate(value));
                item.addEventListener("auxclick", () => window.open(`/listing/${value ? `?audiences=${value}` : ""}`));
            },
            navOption2: item =>
            {
                const value = "women";
                item.dataset.audiences = value;
                item.addEventListener("click", () => listingNavigate(value));
                item.addEventListener("auxclick", () => window.open(`/listing/${value ? `?audiences=${value}` : ""}`));
            },
            navOption3: item =>
            {
                const isListingPage = location.pathname.startsWith("/listing");
                const value = isListingPage ? "boys,girls,kids" : null;

                item.textContent = isListingPage ? "Bambino" : "Esplora";
                item.dataset.audiences = value;
                item.addEventListener("click", () => listingNavigate(value));
                item.addEventListener("auxclick", () => window.open(`/listing/${value ? `?audiences=${value}` : ""}`));
            },
            searchManual: (item, { result }) =>
            {
                const searchInput = result.querySelector("#search-bar input");
                item.addEventListener("mousedown", () => pathRedirect(`/listing/?search=${searchInput.value}`));
            }
        })
        .result;
    header.prepend(topNavbar);
    document.body.prepend(header);


    const endpointsExcludeBottomNavbar = ["/cart", "/auth"];
    if(endpointsExcludeBottomNavbar.some(e => location.pathname.startsWith(e))) return { topNavbar };

    const footer = document.querySelector("footer") || document.createElement("footer");
    const bottomNavbar = new FromTemplate(bottomNavbarTemplate).create().result;

    footer.prepend(bottomNavbar);
    mainBody.after(footer);


    return { topNavbar, bottomNavbar };
}


const { topNavbar, bottomNavbar } = renderNavbars();

window.addEventListener("load", () =>
{
    const iconContainers = topNavbar.querySelectorAll(".icons-container, .navbar-nav");
    renderTopNavbarIcons(iconContainers);

    const searchItemsContainer = topNavbar.querySelector("#search-bar-items-container");
    const searchInput = topNavbar.querySelector("#search-bar input");
    applySearchInputListeners(searchItemsContainer, searchInput);
});