"""
Utilidades de seguridad: hashing de contraseñas y manejo de JWT.

Dependencias:
    passlib[bcrypt]
    python-jose[cryptography]
"""
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from jose import JWTError, jwt
from jose.exceptions import ExpiredSignatureError
from passlib.context import CryptContext

# Carga variables de entorno (idempotente si ya fueron cargadas)
env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=env_path)

SECRET_KEY: str = os.environ["SECRET_KEY"]
ALGORITHM: str = os.environ.get("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
    os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
)

# ---------------------------------------------------------------------------
# Contexto de hashing (bcrypt)
# ---------------------------------------------------------------------------
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Devuelve el hash bcrypt de la contraseña en texto plano."""
    return _pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    """Compara la contraseña en texto plano con su hash almacenado."""
    return _pwd_context.verify(password, hashed)


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------

def create_access_token(
    data: dict[str, Any],
    expires_delta: timedelta | None = None,
) -> str:
    """
    Crea un JWT firmado con HS256.

    Args:
        data: payload a codificar. Debe incluir al menos {'sub': email}.
        expires_delta: tiempo de vida personalizado. Si es None se usa
                       ACCESS_TOKEN_EXPIRE_MINUTES del .env.

    Returns:
        Token JWT como string.
    """
    payload = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload["exp"] = expire
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decodifica y valida un JWT.

    Returns:
        Payload del token (dict).

    Raises:
        ExpiredSignatureError: si el token ha expirado.
        JWTError: si el token es inválido o la firma no coincide.
    """
    try:
        payload: dict[str, Any] = jwt.decode(
            token, SECRET_KEY, algorithms=[ALGORITHM]
        )
        return payload
    except ExpiredSignatureError:
        raise  # el llamador lo convierte en HTTPException 401
    except JWTError:
        raise
