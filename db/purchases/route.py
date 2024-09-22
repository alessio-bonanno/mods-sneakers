from fastapi import Request, APIRouter, Query
from pydantic import BaseModel
from models import SuccessfulResponse, ErrorResponse, ERROR_STATUS_CODES, get_error
from ..authentication.session_validation import SessionRequest, get_session_invalid_models, get_session_validation_response



router = APIRouter()


class ModItem(BaseModel):
    color: str
    type: int
    price: int

class ModdedShoe(BaseModel):
    shoe_id: int
    cart_order: int | None = None
    quantity: int | None = None
    mods: list[ModItem] | None = None

class ModdedShoeStored(ModdedShoe):
    id: int

class ItemsIdsList(BaseModel):
    ids: list[int]


def get_user_id(req, session_id):
    cursor = req.state.cursor

    cursor.execute(f"SELECT user_id FROM session WHERE id = '{session_id}'")
    user_id = cursor.fetchone()["user_id"]

    return user_id

def get_cart_id(req, session_id):
    cursor = req.state.cursor

    cursor.execute(f"SELECT cart.id FROM session INNER JOIN cart ON cart.user_id = session.user_id WHERE session.id = '{session_id}'")
    cart_id = cursor.fetchone()["id"]

    return cart_id


def normalize_mods_items(mods):
    items_normalized = {}
    for mod in mods:
        id = mod["ms_id"]
        item_has_mods = mod["modded_shoe_id"] is not None
        if(id not in items_normalized):
            items_normalized[id] = {
                "id": id,
                "shoe_id": mod["shoe_id"],
                "cart_order": mod["cart_order"] if "cart_order" in mod else None,
                "quantity": mod["quantity"] if "quantity" in mod else None,
                "mods": [] if item_has_mods else None
            }
        if(not item_has_mods):
            continue

        items_normalized[id]["mods"].append({
            "color": mod["color"],
            "type": mod["type"],
            "price": mod["price"]
        })

    return items_normalized

MODS_SHOES_INFO_QUERY = """
SELECT modded_shoe.id as ms_id, modded_shoe.*, mod_shoe.* FROM modded_shoe
LEFT JOIN mod_shoe ON mod_shoe.modded_shoe_id = modded_shoe.id
{clause}
"""

class ItemsInfoResponse(SuccessfulResponse):
    items: list[ModdedShoeStored | None]

@router.get("/info", response_model=ItemsInfoResponse, responses={404: {"model": ErrorResponse}})
def get_items_info(req: Request, ms_id: list[int] = Query(None)):
    cursor = req.state.cursor

    if(ms_id is None or not len(ms_id)):
        return get_error(ERROR_STATUS_CODES.REQUEST_MISSING_FIELD)

    ids_str = ", ".join([str(id) for id in ms_id])
    cursor.execute(MODS_SHOES_INFO_QUERY.format(clause = f"WHERE modded_shoe.id IN ({ids_str})"))

    items = cursor.fetchall()
    items = normalize_mods_items(items)

    return {"items": [items[id] if id in items else None for id in ms_id]}


SESSION_MODS_SHOES_QUERY = """
SELECT modded_shoe.id as ms_id, cart_shoe.id as cart_order, cart_shoe.quantity, modded_shoe.*, mod_shoe.*  FROM session
INNER JOIN cart ON cart.user_id = session.user_id
INNER JOIN cart_shoe ON cart_shoe.cart_id = cart.id
INNER JOIN modded_shoe ON modded_shoe.id = cart_shoe.modded_shoe_id
LEFT JOIN mod_shoe ON mod_shoe.modded_shoe_id = modded_shoe.id
WHERE session.id = '{session_id}'
"""

@router.post("/cart/info", response_model=ItemsInfoResponse, responses=get_session_invalid_models())
def cart_items_info(req: Request, body: SessionRequest):
    cursor = req.state.cursor

    session_res = get_session_validation_response(req, body.session_id)
    if(session_res.status == "error"):
        return session_res

    cursor.execute(SESSION_MODS_SHOES_QUERY.format(session_id = body.session_id))
    mods_shoes = cursor.fetchall()

    """
    invece che prendere le mod per ogni modded_shoe in un loop, prendiamo tutte le mod per sessione
    e poi "normalizziamo"; ovvero un ModItem[] lo facciamo diventare ModdedShoeStored[] andando a usare
    degli attributi comuni. così passiamo da circa 2s/req a 0,5sec/req
    """
    return {"items": normalize_mods_items(mods_shoes).values()}


def insert_shoe_ids(req, ids: list[int]):
    cursor = req.state.cursor

    ids_values_str = ", ".join([f'({id})' for id in ids])
    cursor.execute(f"INSERT IGNORE INTO shoe VALUES {ids_values_str}")

def insert_modded_shoes(req, shoe_ids: list[int]):
    cursor = req.state.cursor
    insert_shoe_ids(req, shoe_ids)

    shoe_ids_values_str = ", ".join([f"(NULL, {id})" for id in shoe_ids])
    cursor.execute(f"INSERT INTO modded_shoe VALUES {shoe_ids_values_str}")

    first_ms_id = cursor.lastrowid
    last_ms_id = first_ms_id + len(shoe_ids) - 1

    cursor.execute(f"SELECT id FROM modded_shoe WHERE id BETWEEN {first_ms_id} AND {last_ms_id}")
    items = cursor.fetchall()

    return [item["id"] for item in items]

def insert_mods_shoes(req, items: list[ModdedShoeStored]):
    cursor = req.state.cursor

    mods_queries = []
    for item in items:
        if(item.mods is None or not len(item.mods)):
            continue

        for mod in item.mods:
            query = f"(NULL, '{mod.color}', {mod.type}, {mod.price}, {item.id})"
            mods_queries.append(query)
    if(not len(mods_queries)):
        return

    cursor.execute(f"INSERT INTO mod_shoe VALUES {', '.join(mods_queries)}")

class AddCartItemsRequest(SessionRequest):
    items: list[ModdedShoe]

@router.post("/cart/add", response_model=ItemsIdsList, responses=get_session_invalid_models())
def add_cart_items(req: Request, body: AddCartItemsRequest):
    cursor = req.state.cursor

    session_res = get_session_validation_response(req, body.session_id)
    if(session_res.status == "error"):
        return session_res

    modded_shoe_ids = insert_modded_shoes(req, [item.shoe_id for item in body.items])
    items_mods = [ModdedShoeStored(id = modded_shoe_ids[i], **body.items[i].dict()) for i in range(len(body.items))]
    insert_mods_shoes(req, items_mods)

    cart_id = get_cart_id(req, body.session_id)
    cart_shoes_values_str = ", ".join([f"(NULL, {items_mods[i].quantity or 1}, {cart_id}, {modded_shoe_id})" for i, modded_shoe_id in enumerate(modded_shoe_ids)])
    cursor.execute(f"INSERT INTO cart_shoe VALUES {cart_shoes_values_str}")

    first_cart_id = cursor.lastrowid
    last_cart_id = first_cart_id + len(modded_shoe_ids)
    cursor.execute(f"SELECT id FROM cart_shoe WHERE id BETWEEN {first_cart_id} AND {last_cart_id}")
    cart_items_ids = [item["id"] for item in cursor.fetchall()]

    return {"ids": cart_items_ids}


class ItemIdsRequest(SessionRequest, ItemsIdsList):
    pass

@router.delete("/cart/remove", response_model=SuccessfulResponse, responses=get_session_invalid_models())
def remove_cart_items(req: Request, body: ItemIdsRequest):
    cursor = req.state.cursor

    session_res = get_session_validation_response(req, body.session_id)
    if(session_res.status == "error"):
        return session_res

    ids_str = ", ".join([str(id) for id in body.ids])
    cart_id = get_cart_id(req, body.session_id)

    cursor.execute(f"DELETE FROM cart_shoe WHERE cart_id = {cart_id} AND id IN ({ids_str})")
    return SuccessfulResponse()


class UpdateItemQuantityRequest(SessionRequest):
    cart_order: int
    quantity: int

@router.patch("/cart/item-quantity", response_model=SuccessfulResponse, responses=get_session_invalid_models())
def update_item_quantity(req: Request, body: UpdateItemQuantityRequest):
    cursor = req.state.cursor

    session_res = get_session_validation_response(req, body.session_id)
    if(session_res.status == "error"):
        return session_res

    cart_id = get_cart_id(req, body.session_id)
    cursor.execute(f"UPDATE cart_shoe SET quantity = {body.quantity} WHERE cart_id = {cart_id} AND id = {body.cart_order}")

    return SuccessfulResponse()


SESSION_CART_ORDERS_QUERY = """
SELECT cart_shoe.id, cart_shoe.modded_shoe_id as ms_id, cart_shoe.quantity FROM session
INNER JOIN cart ON cart.user_id = session.user_id
INNER JOIN cart_shoe ON cart_shoe.cart_id = cart.id
{clause}
"""

@router.post("/cart/checkout", response_model=SuccessfulResponse, responses={403: {"model": ErrorResponse}} | get_session_invalid_models())
def checkout_cart_items(req: Request, body: SessionRequest, id: list[int] = Query(None)):
    cursor = req.state.cursor
    conn = req.state.conn
    conn.autocommit = False

    session_res = get_session_validation_response(req, body.session_id)
    if(session_res.status == "error"):
        return session_res

    clause = f"WHERE session.id = '{body.session_id}'"
    ids_values_str = (", ".join([str(v) for v in id])) if id is not None else None
    if(ids_values_str is not None):
        clause += f" AND cart_shoe.id IN ({ids_values_str})"

    cursor.execute(SESSION_CART_ORDERS_QUERY.format(clause = clause))
    cart_orders = cursor.fetchall()
    if(not len(cart_orders)):
        return get_error(ERROR_STATUS_CODES.CART_IS_EMPTY)

    user_id = get_user_id(req, body.session_id)
    checkout_items_values = []
    remove_order_ids = []
    for order in cart_orders:
        checkout_items_values.append(f"(NULL, {order['quantity']}, {user_id}, {order['ms_id']})")
        remove_order_ids.append(str(order["id"]))

    cursor.execute(f"INSERT INTO bought_shoe VALUES {', '.join(checkout_items_values)}")
    cursor.execute(f"DELETE FROM cart_shoe WHERE id IN ({', '.join(remove_order_ids)})")

    conn.commit()
    return SuccessfulResponse()


SESSION_CHECKOUT_ITEMS_QUERY = """
SELECT modded_shoe.id as ms_id, bought_shoe.quantity, modded_shoe.*, mod_shoe.* FROM session
INNER JOIN bought_shoe ON bought_shoe.user_id = session.user_id
INNER JOIN modded_shoe ON modded_shoe.id = bought_shoe.modded_shoe_id
LEFT JOIN mod_shoe ON mod_shoe.modded_shoe_id = modded_shoe.id
WHERE session.id = '{session_id}'
ORDER BY bought_shoe.id DESC
"""

@router.post("/checkout/info", response_model=ItemsInfoResponse, responses=get_session_invalid_models())
def get_checkout_items(req: Request, body: SessionRequest):
    cursor = req.state.cursor

    session_res = get_session_validation_response(req, body.session_id)
    if(session_res.status == "error"):
        return session_res

    cursor.execute(SESSION_CHECKOUT_ITEMS_QUERY.format(session_id = body.session_id))
    mods_shoes = cursor.fetchall()

    return {"items": normalize_mods_items(mods_shoes).values()}