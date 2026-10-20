"""
scripts/init_db.py

Inicializa la base de datos de producción:
  1. Crea todas las tablas (si no existen), incluidas las columnas de imagen.
  2. Crea el primer administrador si no existe.

Es idempotente: se puede ejecutar en cada arranque sin duplicar nada.

Variables de entorno para el administrador (NO se escriben en el código):
  ADMIN_EMAIL     correo del administrador
  ADMIN_PASSWORD  contraseña (mínimo 8 caracteres)
  ADMIN_NOMBRE    nombre visible (opcional, por defecto "Administrador")

Ejecutar desde la carpeta backend:
  python -m scripts.init_db
"""

import os

from sqlalchemy import func

from app.core.security import hash_password
from app.db.base import Base, SessionLocal, engine

# Importar los modelos para que se registren en Base.metadata
from app.models import alerta, lectura_sensor, maquinaria, usuario  # noqa: F401
from app.models.usuario import Rol, Usuario


def crear_tablas() -> None:
    Base.metadata.create_all(bind=engine)
    print("[init_db] Tablas verificadas/creadas.")


def crear_admin() -> None:
    email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    password = os.environ.get("ADMIN_PASSWORD", "")
    nombre = os.environ.get("ADMIN_NOMBRE", "").strip() or "Administrador"

    if not email or not password:
        print("[init_db] ADMIN_EMAIL/ADMIN_PASSWORD no definidos: no se crea administrador.")
        return

    if len(password) < 8:
        print("[init_db] ADMIN_PASSWORD debe tener al menos 8 caracteres: no se crea administrador.")
        return

    db = SessionLocal()
    try:
        existente = (
            db.query(Usuario)
            .filter(func.lower(Usuario.email) == email)
            .first()
        )
        if existente:
            print(f"[init_db] El usuario {email} ya existe: no se modifica.")
            return

        admin = Usuario(
            nombre=nombre,
            email=email,
            password_hash=hash_password(password),
            rol=Rol.administrador,
        )
        db.add(admin)
        db.commit()
        print(f"[init_db] Administrador {email} creado correctamente.")
    finally:
        db.close()


def main() -> None:
    crear_tablas()
    crear_admin()


if __name__ == "__main__":
    main()