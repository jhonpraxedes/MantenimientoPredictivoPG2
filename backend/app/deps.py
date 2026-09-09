"""
Dependencias reutilizables de FastAPI:
  - get_db        → sesión de base de datos (generador)
  - get_current_user → usuario autenticado vía JWT
  - require_role  → fábrica de dependencias que restringe por rol
"""
from collections.abc import Generator
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.base import SessionLocal
from app.models.usuario import Rol, Usuario

# El esquema OAuth2 apunta al endpoint de login
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


# ---------------------------------------------------------------------------
# Sesión de base de datos
# ---------------------------------------------------------------------------

def get_db() -> Generator[Session, None, None]:
    """
    Generador que proporciona una sesión SQLAlchemy por request
    y la cierra automáticamente al finalizar.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Alias de tipo para inyección limpia en firmas de función
DbSession = Annotated[Session, Depends(get_db)]


# ---------------------------------------------------------------------------
# Usuario autenticado
# ---------------------------------------------------------------------------

def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: DbSession,
) -> Usuario:
    """
    Decodifica el JWT del header Authorization, busca el usuario en la BD
    y lo devuelve si está activo.

    Raises:
        HTTPException 401: token inválido, expirado, usuario inexistente
                           o inactivo.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
        email: str | None = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    usuario: Usuario | None = (
        db.query(Usuario).filter(Usuario.email == email).first()
    )
    if usuario is None:
        raise credentials_exception
    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario inactivo",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return usuario


# Alias de tipo para inyección limpia
CurrentUser = Annotated[Usuario, Depends(get_current_user)]


# ---------------------------------------------------------------------------
# Control de acceso por rol (RBAC)
# ---------------------------------------------------------------------------

def require_role(*roles: Rol):
    """
    Fábrica de dependencias para restringir un endpoint a ciertos roles.

    Uso:
        @router.get("/admin-only")
        def admin_endpoint(
            _: Annotated[Usuario, Depends(require_role(Rol.administrador))]
        ): ...

        # Múltiples roles permitidos:
        @router.get("/supervisors-and-admins")
        def mixed_endpoint(
            _: Annotated[
                Usuario,
                Depends(require_role(Rol.administrador, Rol.supervisor))
            ]
        ): ...
    """
    def _check(current_user: CurrentUser) -> Usuario:
        if current_user.rol not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Acceso denegado. Se requiere uno de los roles: "
                    f"{[r.value for r in roles]}"
                ),
            )
        return current_user

    return _check
