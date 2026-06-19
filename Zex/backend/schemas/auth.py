"""
Authentication schemas
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class UserCreate(BaseModel):
    """Schema for user registration"""
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = ""


class UserLogin(BaseModel):
    """Schema for user login"""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Schema for user data in responses"""
    id: str
    email: str
    full_name: str
    role: str
    package: str


class AuthResponse(BaseModel):
    """Schema for authentication responses"""
    message: str
    token: str
    user: UserResponse

