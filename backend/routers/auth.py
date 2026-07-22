"""
Auth router
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


@router.post("/register", response_model=Token)
async def register(body: RegisterRequest):
    """
    Create new account.
    TODO:
      1. Check username/email uniqueness
      2. Hash password with passlib bcrypt
      3. Insert User row
      4. Return JWT
    """
    raise HTTPException(501, "Not implemented")


@router.post("/login", response_model=Token)
async def login(form: OAuth2PasswordRequestForm = Depends()):
    """
    Standard OAuth2 password flow.
    TODO: Verify credentials, return signed JWT.
    """
    raise HTTPException(501, "Not implemented")


@router.get("/me")
async def me(token: str = Depends(oauth2_scheme)):
    """
    Returns current user profile from JWT payload.
    TODO: Decode JWT, fetch user from DB.
    """
    raise HTTPException(501, "Not implemented")