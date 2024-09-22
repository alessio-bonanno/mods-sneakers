from pydantic import BaseModel
from typing import Literal
from datetime import datetime
from models import ErrorResponse, ERROR_STATUS_CODES, get_error, SuccessfulResponse
from fastapi import FastAPI, Response, Depends
from requests.sessions import Session
from .api import *



app = FastAPI()
session = Session()


class ShoeResponse(BaseModel):
    id: int
    slug: str
    name: str
    image_url: str
    model: str
    release_date: str | None = None
    price: int | None = None
    sizes: list[int] | None = None
class ShoeFullInfoResponse(ShoeResponse, SuccessfulResponse):
    stylecode: str
    upvotes: int | None = None
    colorway: str | None = None
    color_slug: str | None = None


class ListingRequest(BaseModel):
    search: str = ""
    filter: Literal["all", "available"] = "available"
    pagination: int | None = None
    audiences: str | None = None
    prices: str | None = None
    sizes: str | None = None
    sort_field: Literal["", "price_desc", "price_asc", "created_at"] | None = None
class ListingResponse(SuccessfulResponse):
    count: int
    page: int
    lastPage: int
    hasMorePages: bool
    items: list[ShoeResponse]

@app.get("/listing", response_model=ListingResponse, responses={400: {"model": ErrorResponse}, 503: {"model": ErrorResponse}})
def listing(res: Response, body: ListingRequest = Depends()):
    body_dict = body.dict()
    for key in ["audiences", "prices", "sizes"]:
        body_dict[key] = body_dict[key].split(",") if body_dict[key] else None

    search = get_search_query(**body_dict)
    if(search is None):
        return get_error(ERROR_STATUS_CODES.SHOE_API_ERROR)

    res.headers["cache-control"] = "max-age=900, must-revalidate"
    return search


@app.get("/product/{shoe_id}", response_model=ShoeFullInfoResponse, responses={400: {"model": ErrorResponse}, 404: {"model": ErrorResponse}, 503: {"model": ErrorResponse}})
def listing_product(shoe_id: str, res: Response):
    if(shoe_id.isdigit() is False):
        return get_error(ERROR_STATUS_CODES.REQUEST_MISSING_FIELD, f"invalid shoe_id: {shoe_id}")

    product = get_product(shoe_id)
    if(product is None):
        return get_error(ERROR_STATUS_CODES.SHOE_API_ERROR)
    if("item" not in product["pageProps"]):
        return get_error(ERROR_STATUS_CODES.SNEAKER_NOT_FOUND)

    item = product["pageProps"]["item"]
    item["upvotes"] = item["popularity"]["clicks"] if item.get("popularity") else None
    if(not item.get("colorway")):
        item["colorway"] = None
    if(item.get("color_slug")):
        item["color_slug"] = item["color_slug"].capitalize()
    if(item.get("release_date")):
        item["release_date"] = datetime.strptime(item["release_date"], "%Y-%m-%dT%H:%M:%S").strftime("%d/%m/%Y")

    res.headers["cache-control"] = "max-age=900, must-revalidate"
    return item


class FiltersResponse(SuccessfulResponse):
    audiences: list[str]
    prices: list[str]
    sizes: list[str]

@app.get("/filters", response_model=FiltersResponse, responses={503: {"model": ErrorResponse}})
def filters(res: Response):
    json = get_filters()
    if(json is None):
        return get_error(ERROR_STATUS_CODES.SHOE_API_ERROR)

    filters = json["pageProps"]["data"]["filterables"]
    for key in ["audiences", "prices", "sizes"]:
        filters[key] = [filter["key"] for filter in filters[key]]

    res.headers["cache-control"] = "max-age=900, must-revalidate"
    return filters