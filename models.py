from typing import Literal, Mapping as Map
from pydantic import BaseModel
from fastapi.responses import JSONResponse



class SuccessfulResponse(BaseModel):
    status: Literal["success"] = "success"

class ErrorResponse(BaseModel):
    status: Literal["error"] = "error"
    error_code: int
    error_text: str | None = None

class ERROR_STATUS_CODES():
    USERNAME_TAKEN = {"error_code": 10, "status_code": 409}
    EMAIL_TAKEN = {"error_code": 11, "status_code": 409}
    USERNAME_NOT_FOUND = {"error_code": 12, "status_code": 401}
    PASSWORD_WRONG = {"error_code": 13, "status_code": 401}
    EMAIL_NOT_FOUND = {"error_code": 14, "status_code": 404}
    SESSION_NOT_FOUND = {"error_code": 15, "status_code": 404}
    SESSION_EXPIRED = {"error_code": 16, "status_code": 401}

    REQUEST_MISSING_FIELD = {"error_code": 20, "status_code": 400}
    SNEAKER_NOT_FOUND = {"error_code": 21, "status_code": 404}
    SHOE_API_ERROR = {"error_code": 22, "status_code": 503}

    CART_IS_EMPTY = {"error_code": 30, "status_code": 403}

def get_error(error_status: ERROR_STATUS_CODES, status_text: str | None = None, headers: Map[str, str] | None = None):
    json = JSONResponse({"status": "error", "error_code": error_status["error_code"], "error_text": status_text}, error_status["status_code"], headers)
    json.status = "error"
    return json