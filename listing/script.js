const cardTemplate = `
<div class="card placeholder-glow">
    <div class="card-img-container placeholder">
        <img class="card-img-top" src="{imageUrl}" onerror="this.style.visibility = 'hidden'"></div>
    <div class="card-body">
        <div class="card-title-container"><h5 class="card-title placeholder">{name}</h5></div>
        <h4 class="card-description placeholder">{price}</h4>
        <a class="stretched-link" href="/product/?id={productId}"></a>
    </div>
</div>
`;
const pagesNavigationTemplate = `
<ul class="pagination">
    <li class="page-item" data-pagination="1"><button class="page-link"><<</button></li>
    <li class="page-item" data-pagination="-"><button class="page-link"><</button></li>
    <div id="single-pages" class="d-flex"></div>
    <li class="page-item" data-pagination="+"><button class="page-link">></button></li>
    <li class="page-item" data-pagination="{lastPage}"><button class="page-link">>></button></li>
</ul>
`;
const pageItemTemplate = `
<li class="page-item" data-pagination="{value}"><button class="page-link">{value}</button></li>
`;


const MAX_LISTING_PAGE_ITEMS = 20;
const MAX_LISTING_API_ITEMS = 48;
const MAX_VISIBLE_NAVIGATION_PAGES = 6;
const DEFAULT_PREFERENCES = { sizes: "" };

const listing = document.getElementById("listing-product");
const cardsContainer = listing.firstElementChild;

const getPreferences = () => JSON.parse(localStorage.getItem("preferences") || "{}");
const setPreferences = (key, value) => localStorage.setItem("preferences", JSON.stringify(Object.assign(getPreferences(), { [key]: value || undefined })));



const convertParams = {
    toURLParams(params)
    {
        if(params instanceof URLSearchParams) return params;

        if(typeof params != "string")
            for(const key in params)
                if(!params[key]) params[key] = "";

        return new URLSearchParams(params);
    },

    toObject(params)
    {
        if(!params) return {};
        if(!(params instanceof URLSearchParams)) return params;

        const paramsObj = {};

        for(const [key, value] of params.entries())
            paramsObj[key] = value;

        return paramsObj;
    }
};

function getURLParams()
{
    return convertParams.toURLParams(location.search);
}


function getParamsDiff(newParams, oldParams, preserveParams)
{
    newParams = convertParams.toObject(newParams);
    oldParams = convertParams.toObject(oldParams);
    preserveParams = convertParams.toObject(preserveParams);
    const paramsDiff = {};

    for(const key in preserveParams)
        if(!newParams[key])
            paramsDiff[key] = preserveParams[key];

    for(const key in newParams)
        if(newParams[key] != oldParams[key])
            paramsDiff[key] = newParams[key];

    return paramsDiff;
}

function getParamsMerged(paramsOptions)
{
    const paramsDiff = getParamsDiff(paramsOptions, historyState.currentParams, getURLParams());
    return Object.assign({}, historyState.currentParams, paramsDiff);
}

function getParamsMergedFiltered(paramsOptions)
{
    const params = getParamsMerged(paramsOptions);

    for(const key in params)
        if(!params[key])
            delete params[key];

    return params;
}

function updateLocalStateParams(paramsOptions)
{
    const params = getParamsMerged(paramsOptions);
    return historyState.currentParams = params;
}


function updateListingPages()
{
    const params = convertParams.toURLParams(getParamsMerged(getURLParams()));

    params.delete("pagination");
    delete historyState.currentParams.pagination;

    updateHistoryParams(params, true);
    historyState.displayingItems = [];

    loadListingPages();
}

function applyFiltersParams(paramsOptions)
{
    const params = updateLocalStateParams(paramsOptions);
    updateHistoryParams(params);
    updateListingPages();
}


function updateHistoryParams(params, shouldReplaceState = false)
{
    params = convertParams.toObject(params);

    for(const key in params)
        if(!params[key] && params[key] !== null)
            delete params[key];

    params = convertParams.toURLParams(params);

    const preferences = getPreferences();
    const state = Object.assign({}, { preferences }, historyState);
    const historyParams = params.size ? `?${params.toString()}` : location.pathname;

    if(shouldReplaceState) history.replaceState(state, null, historyParams);
    else history.pushState(state, null, historyParams);
}


function filterInputChildrenListener()
{
    const isSortFilter = !!this.closest("#filter-sortby");
    applyFiltersParams({ [isSortFilter ? "sort_field" : "filter"]: this.value });
}

function applyFiltersBoxListeners()
{
    const filterSize = document.getElementById("filter-sizes");
    const filterAvailability = document.getElementById("filter-availability");
    const filterSort = document.getElementById("filter-sortby");
    const applyFilterInputsListener = (filter, listener) => filter.querySelectorAll("input").forEach(input => input.addEventListener("change", listener));

    filterSize.addEventListener("change", function ()
    {
        const sizes = this.value || undefined;
        this.blur();

        setPreferences("sizes", sizes);
        applyFiltersParams();
    });

    applyFilterInputsListener(filterAvailability, filterInputChildrenListener);
    applyFilterInputsListener(filterSort, filterInputChildrenListener);
}


function resetOverflowingCards()
{
    const containers = cardsContainer.querySelectorAll(".cards-container-overflowing");
    if(!containers.length) return;

    listing.querySelectorAll(".card").forEach(card =>
    {
        card.style.flexGrow = 0;
        cardsContainer.append(card);
    });
    containers.forEach(container => container.remove());
}

function updateFiltersBoxPosition()
{
    const filtersBox = document.getElementById("filters");
    const filtersMobileHiddenModal = document.querySelector("#filters-modal-sm .modal-content");

    if(window.innerWidth >= 768 && window.innerHeight >= 645) mainBody.prepend(filtersBox);
    else filtersMobileHiddenModal.append(filtersBox);
}


function updateFiltersBoxUI(params)
{
    params = Object.assign({}, DEFAULT_PREFERENCES, params);

    for(const key in params)
    {
        const value = params[key] || "";

        switch(key)
        {
            case "audiences": {
                const activeAudience = topNavbar.querySelector(".navbar-nav .active");
                if(activeAudience) activeAudience.classList.remove("active");
                if(!value) break;

                topNavbar.querySelector(`.nav-link[data-audiences="${value}"]`).classList.add("active");
                break;
            }
            case "sizes": {
                const filterSizes = document.getElementById("filter-sizes");
                const preferredSizeOption = filterSizes.querySelector(`[value="${value}"]`);
                preferredSizeOption.selected = true;

                break;
            }
            case "filter": {
                const filterAvailability = document.getElementById("filter-availability");
                const availabilityInput = filterAvailability.querySelector(`input[value="${value}"]`);
                availabilityInput.checked = true;

                break;
            }
            case "sort_field": {
                const filterSort = document.getElementById("filter-sortby");
                const sortInput = filterSort.querySelector(`input[value="${value}"]`);
                sortInput.checked = true;

                break;
            }
            case "pagination": break;
        }
    }
}


async function loadFiltersSizes()
{
    const filterSizes = document.getElementById("filter-sizes");
    const sizes = (await getFilters()).sizes.sort((a, b) => b - a);

    sizes.forEach(size => filterSizes.innerHTML += `<option value="${size}">${Number(size) / 10}</option>`);
}


function getMaxCardsPerRow()
{
    const firstRenderedCard = listing.querySelectorAll(".card")[0];
    return Math.floor(listing.clientWidth / firstRenderedCard.clientWidth);
}

function getCardsRows()
{
    const cards = listing.querySelectorAll(".card");
    const cardsInRow = {};

    cards.forEach(card =>
    {
        if(!(card.offsetTop in cardsInRow)) cardsInRow[card.offsetTop] = [];
        cardsInRow[card.offsetTop].push(card);
    });

    return cardsInRow;
}

class ContainerListeners
{
    constructor(cardRow, cardOverflowingContainer)
    {
        this.lastCard = cardRow.at(-1);
        this.cardRow = cardRow;
        this.cardOverflowingContainer = cardOverflowingContainer;

        this.applyContainerListeners();
        cardRow.forEach(card => this.applyCardOverflowingListeners(card));
    }

    applyContainerListeners()
    {
        this.cardOverflowingContainer.addEventListener("mouseleave", () => this.cardRow.forEach(card => card.style.transform = ""));
    }

    applyCardOverflowingListeners(card)
    {
        card.addEventListener("transitionstart", () =>
        {
            this.lastCard.classList.remove("transition-end");
            requestAnimationFrame(() => this.renderContainerOverflowedRightBorder());
        });
        card.addEventListener("transitionend", () => this.lastCard.classList.add("transition-end"));
    }

    renderContainerOverflowedRightBorder()
    {
        const isContainerEndJustified = this.cardOverflowingContainer.style.justifyContent == "flex-end";
        if(isContainerEndJustified) return;

        const lastCardRightOffset = this.lastCard.offsetLeft + this.lastCard.clientWidth;
        const containerRightOffset = this.cardOverflowingContainer.offsetLeft + this.cardOverflowingContainer.clientWidth;
        const areCardsOverflowing = lastCardRightOffset >= containerRightOffset;
        const hasCardTransitionFinished = this.lastCard.classList.contains("transition-end");

        this.cardOverflowingContainer.style.borderRight = areCardsOverflowing ? "1px solid var(--bs-border-color-translucent)" : "";
        if(hasCardTransitionFinished) return;

        requestAnimationFrame(() => this.renderContainerOverflowedRightBorder());
    }
}

function getCardOverflowingContainer(cardRow, hasCardRowEnoughChildren)
{
    const div = document.createElement("div");
    cardRow[0].before(div);

    div.classList.add("cards-container-overflowing");
    if(hasCardRowEnoughChildren) cardRow.forEach(card => card.style.flexGrow = 1);

    new ContainerListeners(cardRow, div);
    cardRow.forEach(card => div.append(card));

    return div;
}

async function fetchListingItems(options = { apiPage: null, pagination: null })
{
    const { displayingItems } = historyState;
    const preferences = getPreferences();
    const params = getParamsMergedFiltered(preferences);

    const pagination = options.pagination || params.pagination || 1;
    const paginationRenderedItemsCount = pagination * MAX_LISTING_PAGE_ITEMS;
    const apiPage = options.apiPage || Math.ceil(paginationRenderedItemsCount / MAX_LISTING_API_ITEMS);

    const remainingItemsCount = (paginationRenderedItemsCount % MAX_LISTING_API_ITEMS) || MAX_LISTING_API_ITEMS;
    const pageItemsStartIndex = (pagination - 1) * MAX_LISTING_PAGE_ITEMS;
    const totalItemsCount = apiPage * MAX_LISTING_API_ITEMS;

    if(!options.apiPage && !displayingItems[pageItemsStartIndex] && remainingItemsCount < MAX_LISTING_PAGE_ITEMS) await fetchListingItems({ apiPage: apiPage - 1 });
    params.pagination = apiPage;

    const listing = await getListing(params);
    if(!listing || !listing.count) return null;

    if(totalItemsCount >= displayingItems.length) displayingItems.length = totalItemsCount;
    displayingItems.splice((apiPage - 1) * MAX_LISTING_API_ITEMS, MAX_LISTING_API_ITEMS, ...listing.items);
    history.replaceState(Object.assign({}, { preferences }, historyState), null);

    return listing;
}

function updateBottomPagesNavigationCount(pagesItem)
{
    pagesItem.forEach(item => item.style.display = "");

    const navJumpButtons = Array.from(document.querySelectorAll(".pagination > .page-item"));
    const buttonsWidth = navJumpButtons.reduce((acc, v) => acc += v.clientWidth, 0);
    const listingWidth = listing.offsetLeft + listing.clientWidth;
    const magic = pagesItem[0].clientWidth * 2; // non capisco perché manca esattamente questo spazio
    let pageButtonsCount = 0;

    for(let i = 0; i < pagesItem.length; i++)
    {
        const pageButtonWidth = magic + pagesItem[i].offsetLeft + pagesItem[i].clientWidth + buttonsWidth;
        if(pageButtonWidth >= listingWidth) break;

        pageButtonsCount++;
    }

    const lastClickedIndex = pagesItem.findIndex(v => v.firstElementChild.classList.contains("last-clicked"));
    const remainingPagesCount = pageButtonsCount >= MAX_VISIBLE_NAVIGATION_PAGES ? MAX_VISIBLE_NAVIGATION_PAGES - 1 : pageButtonsCount;
    const remainingPagesCountHalfPoint = remainingPagesCount / 2;
    const navLeftSidePagesCount = Math.floor(remainingPagesCountHalfPoint);
    const navRightSidePagesCount = Math.ceil(remainingPagesCountHalfPoint);

    const paginationStartIndex = lastClickedIndex < navLeftSidePagesCount ?
        0 :
        lastClickedIndex >= pagesItem.length - navRightSidePagesCount ?
        pagesItem.length - 1 - remainingPagesCount :
        lastClickedIndex - navLeftSidePagesCount;
    const paginationEndIndex = lastClickedIndex < navLeftSidePagesCount ?
        remainingPagesCount :
        lastClickedIndex < pagesItem.length - navRightSidePagesCount ?
        lastClickedIndex + navRightSidePagesCount :
        pagesItem.length - 1;

    for(let i = 0, hiddenPagesCount = 0; i < pagesItem.length && pagesItem.length - hiddenPagesCount > remainingPagesCount; i++)
    {
        if(i >= paginationStartIndex && i <= paginationEndIndex) continue;

        pagesItem[i].style.display = "none";
        hiddenPagesCount++;
    }
}

function cardHoverListener()
{
    if(isMobile()) return;

    const maxCardsPerRow = getMaxCardsPerRow();
    const cardsRows = getCardsRows();
    const cardRow = cardsRows[this.offsetTop];
    const hasCardRowEnoughChildren = cardRow.length == maxCardsPerRow;
    const cardOverflowingContainer = this.closest(".cards-container-overflowing") || getCardOverflowingContainer(cardRow, hasCardRowEnoughChildren);
    const isCardFirstInRow = this == cardRow[0];
    if(isCardFirstInRow) return cardOverflowingContainer.style.justifyContent = "flex-start";

    const isCardLastInRow = this == cardRow.at(-1);
    if(!isCardLastInRow || !hasCardRowEnoughChildren) return;

    cardOverflowingContainer.style.justifyContent = "flex-end";
}

async function renderListingItems(items)
{
    const itemsPrices = await Promise.all(items.map(async v => !v.price && (await getProduct(v.id)).price));
    const cardItems = items.map(({ image_url, name, price, id }, i) =>
    {
        const card = new FromTemplate(cardTemplate).replace({ imageUrl: image_url, name, price: price || "", productId: id }).create().result;
        const cardPrice = card.querySelector(".card-description");

        if(itemsPrices[i])
        {
            price = itemsPrices[i] || "";
            cardPrice.textContent = price;
        }

        cardPrice.classList.add(price ? "available" : "not-available");
        card.addEventListener("mouseenter", cardHoverListener);

        return card;
    });

    cardsContainer.replaceChildren(...cardItems);
    removePlaceholderClasses();
}

const cardsPlaceholder = Array.from({ length: 10 }, () => new FromTemplate(cardTemplate).replace({ imageUrl: "" }).create().result);
function createListingPages(pagesCount, listingCount, queryParamsPagination, pagesContainer)
{
    const { displayingItems } = historyState;

    return Array.from({ length: pagesCount }).reduce((pagesNavArr, _, i) =>
    {
        const pageNavItem = new FromTemplate(pageItemTemplate).replace({ value: i + 1 }).create().result;

        pageNavItem.addEventListener("click", async () =>
        {
            const lastClicked = pagesContainer.querySelector(".last-clicked");
            const oldPagination = lastClicked ? lastClicked.parentElement.dataset.pagination : null;
            const pagination = Number(pageNavItem.dataset.pagination);
            if(lastClicked && oldPagination == pagination) return;

            scrollWindowTop({ top: 0, left: 0, behavior: "instant" });
            cardsContainer.replaceChildren(...cardsPlaceholder);

            if(lastClicked) lastClicked.classList.remove("last-clicked");
            pageNavItem.firstElementChild.classList.add("last-clicked");
            updateBottomPagesNavigationCount(pagesNavArr);

            const isLastPage = pagination == pagesCount;
            const pageItemsStartIndex = (pagination - 1) * MAX_LISTING_PAGE_ITEMS;
            const pageItemsEndIndex = pageItemsStartIndex - 1 + (isLastPage ? listingCount % MAX_LISTING_PAGE_ITEMS || MAX_LISTING_PAGE_ITEMS : MAX_LISTING_PAGE_ITEMS);
            if(oldPagination || (!oldPagination && queryParamsPagination > pagesCount)) updateHistoryParams(updateLocalStateParams({ pagination }));
            if(!displayingItems[pageItemsStartIndex] || !displayingItems[pageItemsEndIndex]) await fetchListingItems();

            await renderListingItems(displayingItems.slice(pageItemsStartIndex, pageItemsEndIndex + 1));
        });

        pagesContainer.append(pageNavItem);
        pagesNavArr[i] = pageNavItem;
        return pagesNavArr;
    }, []);
}

let updatePagesNavigationCallback = null;
function renderBottomPagesNavigation(listingCount)
{
    const queryParamsPagination = convertParams.toObject(getURLParams()).pagination || 1;
    const lastPage = Math.ceil(listingCount / MAX_LISTING_PAGE_ITEMS);

    const navigation = new FromTemplate(pagesNavigationTemplate).replace({ lastPage }).create().result;
    const pagesNavJump = navigation.querySelectorAll(".pagination > .page-item");
    const pagesNavContainer = navigation.querySelector("#single-pages");
    const pagesNavItems = createListingPages(lastPage, listingCount, queryParamsPagination, pagesNavContainer);

    pagesNavJump.forEach(jumpButton => jumpButton.addEventListener("click", () =>
    {
        const lastClickedIndex = pagesNavItems.findIndex(v => v.firstElementChild.classList.contains("last-clicked"));

        switch(jumpButton.dataset.pagination)
        {
            case "1": return pagesNavItems[0].click();
            case "-": return pagesNavItems[lastClickedIndex - 1]?.click();
            case "+": return pagesNavItems[lastClickedIndex + 1]?.click();
            case lastPage.toString(): return pagesNavItems[lastPage - 1].click();
        }
    }));

    const bottomPagesNavigationContainer = document.getElementById("navbar-pages");
    bottomPagesNavigationContainer.replaceChildren(navigation);

    (pagesNavItems[queryParamsPagination - 1] || pagesNavItems.at(-1)).click();
    updatePagesNavigationCallback = () => updateBottomPagesNavigationCount(pagesNavItems);
}


async function loadListingPages()
{
    updateFiltersBoxUI(getParamsMerged(getPreferences()));

    const params = updateLocalStateParams(getURLParams());
    const listing = await fetchListingItems();
    if(!listing) return new ErrorPage("404 :(", "Non ho trovato niente").render();

    historyState.listingCount = listing.count;
    updateHistoryParams(params, true);
    renderBottomPagesNavigation(listing.count);
}


const historyState = {
    displayingItems: [],
    currentParams: {},
    listingCount: null
};

window.addEventListener("popstate", ({ state }) =>
{
    historyState.displayingItems = state.displayingItems;
    historyState.currentParams = state.currentParams;
    historyState.listingCount = state.listingCount;

    updateFiltersBoxUI(getParamsMerged(state.preferences));
    renderBottomPagesNavigation(state.listingCount);

    scrollWindowTop(0, 0);
});

window.addEventListener("resize", () =>
{
    resetOverflowingCards();
    updateFiltersBoxPosition();
    if(typeof updatePagesNavigationCallback == "function") updatePagesNavigationCallback();
});

window.addEventListener("load", async () =>
{
    applyFiltersBoxListeners();
    updateFiltersBoxPosition();
    await loadFiltersSizes();
    await loadListingPages();

    history.scrollRestoration = "manual";
});