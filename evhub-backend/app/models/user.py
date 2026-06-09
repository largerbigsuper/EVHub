import uuid
from datetime import datetime

from sqlalchemy import String, Integer, SmallInteger, DateTime, func, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class User(Base):
    """用户"""
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, comment="用户名（登录用）")
    nickname: Mapped[str | None] = mapped_column(String(100), comment="昵称（显示用）")
    email: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, comment="邮箱")
    phone: Mapped[str | None] = mapped_column(String(20), unique=True, comment="手机号")
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False, comment="密码哈希（bcrypt）")
    avatar: Mapped[str | None] = mapped_column(String(500), comment="头像URL")
    status: Mapped[int] = mapped_column(SmallInteger, default=1, comment="状态：0=禁用, 1=正常")
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), comment="最后登录时间")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), comment="注册时间")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), comment="更新时间")
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), comment="软删除时间")

    roles: Mapped[list["UserRole"]] = relationship(back_populates="user", lazy="selectin")


class Role(Base):
    """角色"""
    __tablename__ = "roles"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(50), nullable=False, comment="角色名称（如：管理员）")
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, comment="角色编码（如：admin）")
    description: Mapped[str | None] = mapped_column(String(200), comment="角色描述")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")

    users: Mapped[list["UserRole"]] = relationship(back_populates="role")
    permissions: Mapped[list["RolePermission"]] = relationship(back_populates="role")


class Permission(Base):
    """权限"""
    __tablename__ = "permissions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="权限名称（如：创建文章）")
    code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, comment="权限编码（如：article:create）")
    resource: Mapped[str | None] = mapped_column(String(50), comment="资源类型（如：article）")
    action: Mapped[str | None] = mapped_column(String(50), comment="操作类型（如：create）")

    roles: Mapped[list["RolePermission"]] = relationship(back_populates="permission")


class UserRole(Base):
    """用户-角色关联表（多对多）"""
    __tablename__ = "user_roles"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, comment="用户ID")
    role_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True, comment="角色ID")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), comment="关联时间")

    user: Mapped["User"] = relationship(back_populates="roles")
    role: Mapped["Role"] = relationship(back_populates="users")


class RolePermission(Base):
    """角色-权限关联表（多对多）"""
    __tablename__ = "role_permissions"

    role_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True, comment="角色ID")
    permission_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True, comment="权限ID")

    role: Mapped["Role"] = relationship(back_populates="permissions")
    permission: Mapped["Permission"] = relationship(back_populates="roles")