from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db import app as user_app
from shoe_api import app as shoe_app



app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True
)

app.mount("/api/v1/user", user_app)
app.mount("/api/v1/shoe", shoe_app)