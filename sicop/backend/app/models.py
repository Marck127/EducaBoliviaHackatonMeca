from datetime import datetime, date
from sqlalchemy import String, Integer, Numeric, Date, DateTime, ForeignKey, Text, UniqueConstraint, Index, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base


class Usuario(Base):
    __tablename__ = "usuarios"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True)
    nombre: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(255))
    rol: Mapped[str] = mapped_column(String(20))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    creado: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Financiador(Base):
    __tablename__ = "financiadores"
    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120), unique=True)


class Region(Base):
    __tablename__ = "regiones"
    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(60), unique=True)


class Area(Base):
    __tablename__ = "areas"
    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120), unique=True)


class Rubro(Base):
    __tablename__ = "rubros"
    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120), unique=True)


class Cuenta(Base):
    __tablename__ = "cuentas"
    __table_args__ = (UniqueConstraint("rubro_id", "nombre"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    rubro_id: Mapped[int] = mapped_column(ForeignKey("rubros.id"))
    nombre: Mapped[str] = mapped_column(String(160))
    rubro: Mapped[Rubro] = relationship()


class Importacion(Base):
    __tablename__ = "importaciones"
    id: Mapped[int] = mapped_column(primary_key=True)
    gestion: Mapped[int] = mapped_column(Integer, index=True)
    archivo: Mapped[str] = mapped_column(String(255))
    sha256_archivo: Mapped[str] = mapped_column(String(64))
    merkle_root: Mapped[str] = mapped_column(String(64))
    filas_presupuesto: Mapped[int] = mapped_column(Integer)
    filas_movimientos: Mapped[int] = mapped_column(Integer)
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    fecha: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    vigente: Mapped[bool] = mapped_column(Boolean, default=True)


class Presupuesto(Base):
    __tablename__ = "presupuestos"
    id: Mapped[int] = mapped_column(primary_key=True)
    gestion: Mapped[int] = mapped_column(Integer, index=True)
    financiador_id: Mapped[int] = mapped_column(ForeignKey("financiadores.id"))
    region_id: Mapped[int] = mapped_column(ForeignKey("regiones.id"))
    area_id: Mapped[int] = mapped_column(ForeignKey("areas.id"))
    cuenta_id: Mapped[int] = mapped_column(ForeignKey("cuentas.id"))
    monto_bs: Mapped[float] = mapped_column(Numeric(16, 2))
    importacion_id: Mapped[int] = mapped_column(ForeignKey("importaciones.id"), index=True)
    fila_origen: Mapped[int] = mapped_column(Integer)


class Modificacion(Base):
    __tablename__ = "modificaciones"
    id: Mapped[int] = mapped_column(primary_key=True)
    gestion: Mapped[int] = mapped_column(Integer, index=True)
    mes: Mapped[int] = mapped_column(Integer)
    origen: Mapped[str] = mapped_column(String(30))
    financiador_id: Mapped[int] = mapped_column(ForeignKey("financiadores.id"))
    region_id: Mapped[int] = mapped_column(ForeignKey("regiones.id"))
    area_id: Mapped[int] = mapped_column(ForeignKey("areas.id"))
    cuenta_id: Mapped[int] = mapped_column(ForeignKey("cuentas.id"))
    monto_bs: Mapped[float] = mapped_column(Numeric(16, 2))
    movimiento_id: Mapped[int | None] = mapped_column(ForeignKey("movimientos.id"))
    importacion_id: Mapped[int] = mapped_column(ForeignKey("importaciones.id"), index=True)
    fila_origen: Mapped[int] = mapped_column(Integer)


class Movimiento(Base):
    __tablename__ = "movimientos"
    __table_args__ = (Index("ix_mov_gestion_mes", "gestion", "mes"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    gestion: Mapped[int] = mapped_column(Integer, index=True)
    mes: Mapped[int] = mapped_column(Integer)
    fecha: Mapped[date | None] = mapped_column(Date)
    codigo_contable: Mapped[str | None] = mapped_column(String(30))
    nombre_contable: Mapped[str | None] = mapped_column(String(200))
    tipo_comprobante: Mapped[int | None] = mapped_column(Integer)
    numero: Mapped[int | None] = mapped_column(Integer)
    no_cheque: Mapped[str | None] = mapped_column(String(30))
    referencia: Mapped[str | None] = mapped_column(Text)
    debe_bs: Mapped[float] = mapped_column(Numeric(16, 2), default=0)
    haber_bs: Mapped[float] = mapped_column(Numeric(16, 2), default=0)
    debe_usd: Mapped[float] = mapped_column(Numeric(16, 2), default=0)
    haber_usd: Mapped[float] = mapped_column(Numeric(16, 2), default=0)
    tasa: Mapped[float | None] = mapped_column(Numeric(10, 4))
    financiador_id: Mapped[int] = mapped_column(ForeignKey("financiadores.id"))
    region_id: Mapped[int] = mapped_column(ForeignKey("regiones.id"))
    area_id: Mapped[int] = mapped_column(ForeignKey("areas.id"))
    cuenta_id: Mapped[int] = mapped_column(ForeignKey("cuentas.id"))
    hash_fila: Mapped[str] = mapped_column(String(64))
    importacion_id: Mapped[int] = mapped_column(ForeignKey("importaciones.id"), index=True)
    fila_origen: Mapped[int] = mapped_column(Integer)


class TipoCambio(Base):
    __tablename__ = "tipos_cambio"
    __table_args__ = (UniqueConstraint("gestion", "fecha", "tasa"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    gestion: Mapped[int] = mapped_column(Integer)
    fecha: Mapped[date | None] = mapped_column(Date)
    tasa: Mapped[float] = mapped_column(Numeric(10, 4))
    movimientos: Mapped[int] = mapped_column(Integer, default=0)


class Auditoria(Base):
    __tablename__ = "auditoria"
    id: Mapped[int] = mapped_column(primary_key=True)
    fecha: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    usuario: Mapped[str | None] = mapped_column(String(50))
    accion: Mapped[str] = mapped_column(String(50))
    detalle: Mapped[dict] = mapped_column(JSON, default=dict)
    hash_anterior: Mapped[str] = mapped_column(String(64))
    hash: Mapped[str] = mapped_column(String(64), unique=True)


class Anclaje(Base):
    __tablename__ = "anclajes"
    id: Mapped[int] = mapped_column(primary_key=True)
    fecha: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    auditoria_id: Mapped[int] = mapped_column(ForeignKey("auditoria.id"))
    hash_raiz: Mapped[str] = mapped_column(String(64))
    red: Mapped[str] = mapped_column(String(40))
    estado: Mapped[str] = mapped_column(String(20))
    comprobante: Mapped[str | None] = mapped_column(Text)
