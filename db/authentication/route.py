from fastapi import Request, APIRouter, Depends
from pydantic import BaseModel
from models import SuccessfulResponse, ErrorResponse, ERROR_STATUS_CODES, get_error
from uuid import uuid4
from datetime import datetime, timedelta
from .session_validation import SessionRequest, SessionResponse, get_session_invalid_models, get_session_validation_response



router = APIRouter()


class SignupRequest(BaseModel):
    username: str
    password: str
    email: str
    name: str
    last_name: str
    gender: str

@router.post("/signup", response_model=SessionResponse, responses={409: {"model": ErrorResponse}})
def signup(req: Request, body: SignupRequest):
    cursor = req.state.cursor
    conn = req.state.conn
    conn.autocommit = False

    cursor.execute(f"SELECT * FROM user WHERE username = '{body.username.lower()}'")
    if(cursor.fetchone() is not None):
        return get_error(ERROR_STATUS_CODES.USERNAME_TAKEN)

    cursor.execute(f"SELECT * FROM user WHERE email = '{body.email}'")
    if(cursor.fetchone() is not None):
        return get_error(ERROR_STATUS_CODES.EMAIL_TAKEN)

    cursor.execute(f"""INSERT INTO user
                   VALUES (NULL, '{body.username.lower()}', '{body.password}', '{body.email.lower()}', '{body.name}', '{body.last_name}', '{body.gender}')""")

    user_id = cursor.lastrowid
    session_id = uuid4()
    timestamp = datetime.now() + timedelta(minutes=30)
    cursor.execute(f"INSERT INTO session VALUES ('{session_id}', '{timestamp}', TRUE, {user_id})")
    cursor.execute(f"INSERT INTO cart VALUES (NULL, {user_id})")

    conn.commit()
    return SessionResponse(session_id=session_id)


class LoginRequest(BaseModel):
    username: str
    password: str
    should_expire: bool

@router.post("/login", response_model=SessionResponse, responses={401: {"model": ErrorResponse}})
def login(req: Request, body: LoginRequest):
    cursor = req.state.cursor

    cursor.execute(f"SELECT id, password FROM user WHERE username = '{body.username.lower()}'")
    user = cursor.fetchone()
    if(user is None):
        return get_error(ERROR_STATUS_CODES.USERNAME_NOT_FOUND)
    if(user["password"] != body.password):
        return get_error(ERROR_STATUS_CODES.PASSWORD_WRONG)

    session_id = uuid4()
    timestamp = f"'{datetime.now() + timedelta(minutes=30)}'" if(body.should_expire) else "NULL"
    cursor.execute(f"""INSERT INTO session VALUES ('{session_id}', {timestamp}, {body.should_expire}, {user["id"]})""")

    return SessionResponse(session_id=session_id)


@router.get("/session/{session_id}", response_model=SuccessfulResponse, responses=get_session_invalid_models())
def session_valid(req: Request, body: SessionRequest = Depends()):
    return get_session_validation_response(req, body.session_id)


class UserInfo(SuccessfulResponse):
    id: int
    username: str
    email: str
    name: str
    last_name: str
    gender: str

@router.get("/session/{session_id}/info", response_model=UserInfo, responses=get_session_invalid_models())
def user_info_from_session(req: Request, body: SessionRequest = Depends()):
    cursor = req.state.cursor

    session_res = get_session_validation_response(req, body.session_id)
    if(session_res.status == "error"):
        return session_res

    cursor.execute(f"SELECT user.* FROM session INNER JOIN user ON user.id = session.user_id WHERE session.id = '{body.session_id}'")
    user_info = cursor.fetchone()

    return user_info


class ForgotPasswordRequest(BaseModel):
    email: str
    password: str

@router.patch("/forgot-password", response_model=SuccessfulResponse, responses={404: {"model": ErrorResponse}})
def forgot_password(req: Request, body: ForgotPasswordRequest):
    cursor = req.state.cursor
    conn = req.state.conn
    conn.autocommit = False

    cursor.execute(f"SELECT id FROM user WHERE email = '{body.email.lower()}'")
    user = cursor.fetchone()
    if(user is None):
        return get_error(ERROR_STATUS_CODES.EMAIL_NOT_FOUND)

    cursor.execute(f"UPDATE user SET password = '{body.password}' WHERE id = {user['id']}")
    cursor.execute(f"DELETE FROM session WHERE user_id = {user['id']}")

    conn.commit()
    return SuccessfulResponse()


@router.delete("/logout", response_model=SuccessfulResponse, responses=get_session_invalid_models())
def logout(req: Request, body: SessionRequest):
    cursor = req.state.cursor

    session_res = get_session_validation_response(req, body.session_id)
    if(session_res == "error"):
        return session_res

    cursor.execute(f"DELETE FROM session WHERE id = '{body.session_id}'")
    return SuccessfulResponse()