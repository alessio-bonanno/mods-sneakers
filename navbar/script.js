const navbarTemplate = `
<section>
<nav class="navbar navbar-expand-md bg-body-tertiary flex-nowrap fixed-top">
    <button class="navbar-toggler fs-6" type="button" data-bs-toggle="offcanvas"
            data-bs-target="#offcanvas">
        <span class="navbar-toggler-icon"></span>
    </button>
    <div class="offcanvas offcanvas-start vw-100" tabindex="-1" id="offcanvas">
        <div class="offcanvas-header">
            <h5 class="offcanvas-title mx-auto" id="offcanvas">ModsS</h5>
            <button type="button" class="btn-close ms-0" data-bs-dismiss="offcanvas"></button>
        </div>
        <div class="offcanvas-body">
            <div class="navbar-nav">
                <a class="nav-link active" aria-current="page" href="#">Men</a>
                <a class="nav-link active" aria-current="page" href="#">Women</a>
                <a class="nav-link active" aria-current="page" href="#">Kids</a>
            </div>
        </div>
    </div>
    <div class="container-fluid justify-content-center">
        <a class="navbar-brand" href="#">ModsS</a>
        <div class="d-flex" id="searchBar">
            <input class="form-control" type="search-bar" placeholder="Cerca">
        </div>
    </div>
    <div class="pe-3" id="icons-container">
        <a href="/auth"><i class="fs-1 bi bi-person-circle" style="color: black"></i></a>
    </div>
</nav>
</section>
`;

window.addEventListener("load", () =>
{
    const header = document.querySelector("header") || document.createElement("header");
    header.prepend(new FromTemplate(navbarTemplate).create());
    document.body.prepend(header);
});