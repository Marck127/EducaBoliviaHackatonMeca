import os
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .db import get_db
from .models import Usuario

SECRET_KEY = os.getenv("SECRET_KEY", "cambiar-en-produccion")
TOKEN_HORAS = int(os.getenv("TOKEN_HORAS", "8"))
ITERACIONES = 240_000

ROLES = {
    "admin": {"reportes", "exportar", "importar", "usuarios", "auditoria"},
    "tecnico": {"reportes", "exportar", "importar"},
    "consulta": {"reportes"},
}

oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), ITERACIONES)
    return f"pbkdf2_sha256${ITERACIONES}${salt}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, it, salt, h = stored.split("$")
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), int(it))
        return hmac.compare_digest(dk.hex(), h)
    except ValueError:
        return False


def crear_token(usuario: Usuario) -> str:
    payload = {
        "sub": usuario.username,
        "rol": usuario.rol,
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_HORAS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def usuario_actual(token: str = Depends(oauth2), db: Session = Depends(get_db)) -> Usuario:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token inválido o expirado")
    u = db.query(Usuario).filter_by(username=payload.get("sub"), activo=True).first()
    if not u:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuario no válido")
    return u


def requiere(permiso: str):
    def dep(u: Usuario = Depends(usuario_actual)) -> Usuario:
        if permiso not in ROLES.get(u.rol, set()):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Permiso insuficiente")
        return u
    return dep
