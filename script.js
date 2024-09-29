const carouselIndicatorTemplate = `
<button type="button" data-bs-target="#{elementId}" data-bs-slide-to="{itemIndex}"></button>
`;
const carouselItemTemplate = `
<div id="{id}" class="carousel-item">
    <img src="{imageUrl}" class="d-block w-100" alt="{imageAlt}">
</div>
`;


const trendingCarousel = document.getElementById("trending-carousel");
const latestCarousel = document.getElementById("latest-carousel");
const carouselElements = [trendingCarousel, latestCarousel];
const carousels = carouselElements.map(element => new bootstrap.Carousel(element, { pause: false, interval: 3e3 }));



carousels.forEach((carousel, i) =>
{
    const element = carouselElements[i];
    const changeInterval = interval =>
    {
        carousel.pause();
        carousel._config.defaultInterval = interval;
    };

    element.addEventListener("mouseenter", () => carousel.cycle());
    element.addEventListener("mouseleave", () => changeInterval(3e3));
    element.addEventListener("click", () => { changeInterval(10e3); carousel.cycle(); });
});


const navbarHeight = document.getElementById("top-navbar").clientHeight;
const banner = document.getElementById("banner");
const bannerTitle = banner.querySelector("h1");
const bannerSize = getComputedStyle(bannerTitle).fontSize.replace("px", "");

function changeBannerTitleSize()
{
    const bannerHeight = banner.clientHeight - navbarHeight;
    if(window.scrollY < banner.offsetTop || window.scrollY > banner.offsetTop + bannerHeight) return;

    const bannerScrollYReversed = bannerHeight - (window.scrollY - banner.offsetTop);
    const bannerScrollUnit = Math.min(Math.max(bannerScrollYReversed / bannerHeight, 0), 1);

    bannerTitle.style.fontSize = `${bannerSize * (bannerScrollUnit > 0.5 ? 1 : bannerScrollUnit + 0.5)}px`;
}

function playVisibleCarousels()
{
    carouselElements.forEach((el, i) =>
    {
        const carousel = carousels[i];
        const elementBottom = el.offsetTop + el.clientHeight;
        const isCarouselPlaying = !!carousel._interval;

        if(window.scrollY > elementBottom || elementBottom > window.scrollY + window.innerHeight) carousel.pause();
        else if(!isCarouselPlaying) carousel.cycle();
    });
}


function addCarouselItems(carousel, listingItems)
{
    removePlaceholderClasses();

    const indicators = carousel.querySelector(".carousel-indicators");
    const inner = carousel.querySelector(".carousel-inner");

    for(let i = 0; i < 5; i++)
    {
        const { id, image_url: imageUrl, name: imageAlt } = listingItems[i];
        const indicator = new FromTemplate(carouselIndicatorTemplate).replace({ elementId: carousel.id, itemIndex: i }).create().result;
        const item = new FromTemplate(carouselItemTemplate).replace({ id, imageUrl, imageAlt }).create().result;

        indicators.append(indicator);
        inner.append(item);
        if(i != 0) continue;

        indicator.classList.add("active");
        item.classList.add("active");
    }
}


window.addEventListener("scroll", () =>
{
    changeBannerTitleSize();
    if(!isTouchSupported()) return;

    playVisibleCarousels();
});

window.addEventListener("load", async () =>
{
    const carouselOverlayButtonsWrapper = document.querySelectorAll(".carousel .carousel-inner");
    const backgroundAnimationVideo = document.querySelector("video");

    backgroundAnimationVideo.playbackRate = .75;
    carouselOverlayButtonsWrapper.forEach(wrapper =>
    {
        const button = wrapper.querySelector(".open-product-btn");

        button.addEventListener("click", () =>
        {
            const item = wrapper.querySelector(".active");
            pathRedirect(`/product/?id=${item.id}`);
        });

        button.addEventListener("auxclick", () =>
        {
            const item = wrapper.querySelector(".active");
            pathRedirect(`/product/?id=${item.id}`, "_blank");
        });
    });

    const trendingListing = (await getListing()).items;
    const latestListing = (await getListing({ sort_field: "created_at" })).items;

    addCarouselItems(trendingCarousel, trendingListing);
    addCarouselItems(latestCarousel, latestListing);
});