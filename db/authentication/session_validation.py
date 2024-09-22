from fastapi import Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from models import SuccessfulResponse, ErrorResponse, ERROR_STATUS_CODES, get_error
from datetime import datetime
from uuid import UUID



class SessionValidResponse(SuccessfulResponse):
    headers: dict[str, str]

def get_session_invalid_models():
    return {401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}}

def session_validation(req: Request, session_id: UUID) -> SessionValidResponse | ErrorResponse:
    cursor = req.state.cursor

    cursor.execute(f"SELECT timestamp_expire, should_expire FROM session WHERE id='{session_id}'")
    user_session = cursor.fetchone()
    if(user_session is None):
        return get_error(ERROR_STATUS_CODES.SESSION_NOT_FOUND)
    if(bool(user_session["should_expire"]) is False):
        return SessionValidResponse(headers={"cache-control": "max-age=31536000"})

    delta = user_session["timestamp_expire"] - datetime.now()
    if(delta.days >= 0):
        return SessionValidResponse(headers={"cache-control": f"max-age={delta.seconds}"})

    cursor.execute(f"DELETE FROM session WHERE id='{session_id}'")
    return get_error(ERROR_STATUS_CODES.SESSION_EXPIRED)


class SessionRequest(BaseModel):
    session_id: UUID

class SessionResponse(SessionRequest, SuccessfulResponse):
    pass

def get_session_validation_response(req: Request, session_id: UUID):
    session_validated = session_validation(req, session_id)
    if(session_validated.status == "error"):
        return session_validated

    res = JSONResponse({"status": "success"}, headers=session_validated.headers)
    res.status = "success"
    return res