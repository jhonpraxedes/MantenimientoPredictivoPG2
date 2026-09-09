"""
Router de autenticación.

Endpoints:
    POST /auth/login  → valida credenciales y devuelve JWT
    GET  /auth/me     → devuelve datos del usuario autenticado
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password
from app.deps import CurrentUser, get_db
from app.models.usuario import Usuario
from app.schemas.usuario import Token, UsuarioOut

router = APIRouter(prefix="/auth", tags=["Autenticación"])


# ---------------------------------------------------------------------------
# Helpers internos
# ---------------------------------------------------------------------------

def _authenticate_user(db: Session, email: str, password: str) -> Usuario:
    """
    Busca al usuario por email y verifica la contraseña.

    Raises:
        HTTPException 401: si las credenciales son incorrectas o el usuario
                           está inactivo.
    """
    usuario: Usuario | None = (
        db.query(Usuario).filter(Usuario.email == email).first()
    )
    invalid_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Email o contraseña incorrectos",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if usuario is None:
        raise invalid_exc
    if not verify_password(password, usuario.password_hash):
        raise invalid_exc
    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario inactivo",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return usuario


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/login",
    response_model=Token,
    summary="Iniciar sesión",
    description=(
        "Autentica al usuario con email y contraseña. "
        "Devuelve un JWT (Bearer) para usar en endpoints protegidos."
    ),
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> Token:
    """
    Compatible con el flujo OAuth2 estándar: el campo `username`
    del formulario se interpreta como el email del usuario.
    """
    usuario = _authenticate_user(db, form_data.username, form_data.password)
    access_token = create_access_token(data={"sub": usuario.email})
    return Token(access_token=access_token, token_type="bearer")


@router.get(
    "/me",
    response_model=UsuarioOut,
    summary="Usuario autenticado",
    description="Devuelve el perfil del usuario que porta el JWT.",
)
def me(current_user: CurrentUser) -> UsuarioOut:
    return current_user  # type: ignore[return-value]
