from fastapi import FastAPI
from starlette.middleware.base import BaseHTTPMiddleware
from .middleware import handle_db_conn
from .authentication.route import router as authentication_router
from .purchases.route import router as purchases_router



app = FastAPI()
app.add_middleware(BaseHTTPMiddleware, dispatch=handle_db_conn)
app.include_router(authentication_router, prefix="/auth")
app.include_router(purchases_router, prefix="/purchases")