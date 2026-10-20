"""
app/schemas/password.py

Schemas para cambio y restablecimiento de contraseña.
"""

from pydantic import BaseModel, Field


class CambiarPasswordIn(BaseModel):
    """El propio usuario cambia su contraseña."""
    password_actual: str = Field(..., min_length=1, max_length=72)
    password_nueva: str = Field(..., min_length=8, max_length=72)


class ResetPasswordIn(BaseModel):
    """El administrador restablece la contraseña de otro usuario."""
    password_nueva: str = Field(..., min_length=8, max_length=72)