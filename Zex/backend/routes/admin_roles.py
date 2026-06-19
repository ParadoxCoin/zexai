"""
Role Management Admin Routes
CRUD operations for roles and user role assignments
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import List, Optional
from types import SimpleNamespace
from pydantic import BaseModel, Field
import logging

from core.security import get_current_admin_user, get_current_super_admin
from core.database import get_db
from core.rate_limiter import limiter, RateLimits
from core.rbac import Permission, is_staff_role, get_user_permissions
from core.audit import AuditLogService, AuditAction, ResourceType

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/roles", tags=["Admin - Role Management"])


# ============================================
# Schemas
# ============================================

class RoleCreate(BaseModel):
    """Schema for creating a new role"""
    id: str = Field(..., min_length=2, max_length=50, pattern="^[a-z_]+$")
    name: str = Field(..., min_length=2, max_length=50)
    display_name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    role_type: str = Field(default="customer", pattern="^(staff|customer)$")
    permissions: List[str] = Field(default=[])


class RoleUpdate(BaseModel):
    """Schema for updating a role"""
    display_name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[List[str]] = None


class RoleResponse(BaseModel):
    """Role response model"""
    id: str
    name: str
    display_name: str
    description: Optional[str]
    role_type: str
    is_system: bool
    permissions: List[str]


class UserRoleAssign(BaseModel):
    """Schema for assigning role to user"""
    role_id: str


class PermissionInfo(BaseModel):
    """Permission information"""
    id: str
    name: str
    category: str
    description: Optional[str]


# ============================================
# Role Endpoints
# ============================================

@router.get("")
@limiter.limit(RateLimits.ADMIN_READ)
async def list_roles(
    request: Request,
    role_type: Optional[str] = Query(None, pattern="^(staff|customer)$"),
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """List all roles with optional filtering by type"""
    try:
        query = db.table("roles").select("*").order("role_type").order("id")
        
        if role_type:
            query = query.eq("role_type", role_type)
        
        response = query.execute()
        
        # Get permission counts for each role
        roles_data = []
        for role in response.data or []:
            permissions = role.get("permissions", [])
            roles_data.append({
                **role,
                "permissions": permissions,
                "permission_count": len(permissions) if permissions != ["*"] else "Tümü"
            })
        
        return {
            "success": True,
            "roles": roles_data,
            "total": len(roles_data)
        }
        
    except Exception as e:
        logger.error(f"Error listing roles: {e}")
        raise HTTPException(500, f"Failed to list roles: {str(e)}")


@router.get("/permissions")
@limiter.limit(RateLimits.ADMIN_READ)
async def list_permissions(
    request: Request,
    category: Optional[str] = None,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """List all available permissions"""
    try:
        query = db.table("permissions").select("*").order("category").order("id")
        
        if category:
            query = query.eq("category", category)
        
        response = query.execute()
        
        # Group by category
        categories = {}
        for perm in response.data or []:
            cat = perm.get("category", "other")
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(perm)
        
        return {
            "success": True,
            "permissions": response.data or [],
            "by_category": categories,
            "categories": list(categories.keys())
        }
        
    except Exception as e:
        logger.error(f"Error listing permissions: {e}")
        raise HTTPException(500, f"Failed to list permissions: {str(e)}")


@router.post("")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def create_role(
    request: Request,
    role_data: RoleCreate,
    current_user: SimpleNamespace = Depends(get_current_super_admin),
    db = Depends(get_db)
):
    """Create a new role (Super Admin only)"""
    try:
        # Check if role already exists
        existing = db.table("roles").select("id").eq("id", role_data.id).execute()
        if existing.data:
            raise HTTPException(400, f"Role '{role_data.id}' already exists")
        
        # Create role
        response = db.table("roles").insert({
            "id": role_data.id,
            "name": role_data.name,
            "display_name": role_data.display_name,
            "description": role_data.description,
            "role_type": role_data.role_type,
            "is_system": False,  # Custom roles are not system roles
            "permissions": role_data.permissions
        }).execute()
        
        # Audit log
        await AuditLogService.log(
            db=db,
            user_id=str(current_user.id),
            action=AuditAction.CREATE,
            resource_type=ResourceType.ROLE,
            resource_id=role_data.id,
            details=f"Created role: {role_data.display_name}",
            success=True
        )
        
        logger.info(f"Role created: {role_data.id} by {current_user.email}")
        
        return {
            "success": True,
            "role": response.data[0] if response.data else None,
            "message": f"Rol '{role_data.display_name}' oluşturuldu"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating role: {e}")
        raise HTTPException(500, f"Failed to create role: {str(e)}")


@router.put("/{role_id}")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def update_role(
    request: Request,
    role_id: str,
    role_data: RoleUpdate,
    current_user: SimpleNamespace = Depends(get_current_super_admin),
    db = Depends(get_db)
):
    """Update a role (Super Admin only)"""
    try:
        # Check role exists
        existing = db.table("roles").select("*").eq("id", role_id).execute()
        if not existing.data:
            raise HTTPException(404, f"Role '{role_id}' not found")
        
        old_role = existing.data[0]
        
        # Build update data
        update_data = {}
        if role_data.display_name is not None:
            update_data["display_name"] = role_data.display_name
        if role_data.description is not None:
            update_data["description"] = role_data.description
        if role_data.permissions is not None:
            update_data["permissions"] = role_data.permissions
        
        if not update_data:
            return {"success": True, "message": "No changes to apply"}
        
        update_data["updated_at"] = "now()"
        
        # Update
        response = db.table("roles").update(update_data).eq("id", role_id).execute()
        
        # Audit log
        await AuditLogService.log(
            db=db,
            user_id=str(current_user.id),
            action=AuditAction.UPDATE,
            resource_type=ResourceType.ROLE,
            resource_id=role_id,
            details=f"Updated role: {role_id}",
            old_value=str(old_role.get("permissions", [])),
            new_value=str(role_data.permissions) if role_data.permissions else None,
            success=True
        )
        
        return {
            "success": True,
            "role": response.data[0] if response.data else None,
            "message": f"Rol güncellendi"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating role: {e}")
        raise HTTPException(500, f"Failed to update role: {str(e)}")


@router.delete("/{role_id}")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def delete_role(
    request: Request,
    role_id: str,
    current_user: SimpleNamespace = Depends(get_current_super_admin),
    db = Depends(get_db)
):
    """Delete a role (Super Admin only, non-system roles)"""
    try:
        # Check role exists and is not system
        existing = db.table("roles").select("*").eq("id", role_id).execute()
        if not existing.data:
            raise HTTPException(404, f"Role '{role_id}' not found")
        
        role = existing.data[0]
        if role.get("is_system", False):
            raise HTTPException(400, "Sistem rolleri silinemez")
        
        # Check if any users have this role
        users_with_role = db.table("users").select("id").eq("role", role_id).execute()
        if users_with_role.data:
            raise HTTPException(
                400, 
                f"Bu role sahip {len(users_with_role.data)} kullanıcı var. "
                "Önce kullanıcıların rollerini değiştirin."
            )
        
        # Delete user_roles assignments
        db.table("user_roles").delete().eq("role_id", role_id).execute()
        
        # Delete role
        db.table("roles").delete().eq("id", role_id).execute()
        
        # Audit log
        await AuditLogService.log(
            db=db,
            user_id=str(current_user.id),
            action=AuditAction.DELETE,
            resource_type=ResourceType.ROLE,
            resource_id=role_id,
            details=f"Deleted role: {role.get('display_name', role_id)}",
            success=True
        )
        
        return {
            "success": True,
            "message": f"Rol silindi: {role.get('display_name', role_id)}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting role: {e}")
        raise HTTPException(500, f"Failed to delete role: {str(e)}")


# ============================================
# User Role Assignment Endpoints
# ============================================

@router.get("/user/{user_id}")
@limiter.limit(RateLimits.ADMIN_READ)
async def get_user_role(
    request: Request,
    user_id: str,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """Get a user's current role and permissions"""
    try:
        # Get user
        user_resp = db.table("users").select("id, email, role, full_name").eq("id", user_id).execute()
        if not user_resp.data:
            raise HTTPException(404, "Kullanıcı bulunamadı")
        
        user = user_resp.data[0]
        user_role = user.get("role", "customer")
        
        # Get role details
        role_resp = db.table("roles").select("*").eq("id", user_role).execute()
        role_info = role_resp.data[0] if role_resp.data else None
        
        return {
            "success": True,
            "user": {
                "id": user["id"],
                "email": user["email"],
                "full_name": user.get("full_name", "")
            },
            "role": user_role,
            "role_info": role_info,
            "permissions": role_info.get("permissions", []) if role_info else []
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user role: {e}")
        raise HTTPException(500, f"Failed to get user role: {str(e)}")


@router.put("/user/{user_id}")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def assign_user_role(
    request: Request,
    user_id: str,
    assignment: UserRoleAssign,
    current_user: SimpleNamespace = Depends(get_current_super_admin),
    db = Depends(get_db)
):
    """Assign a role to a user (Super Admin only)"""
    try:
        # Check user exists
        user_resp = db.table("users").select("id, email, role").eq("id", user_id).execute()
        if not user_resp.data:
            raise HTTPException(404, "Kullanıcı bulunamadı")
        
        user = user_resp.data[0]
        old_role = user.get("role", "customer")
        
        # Check role exists
        role_resp = db.table("roles").select("id, display_name").eq("id", assignment.role_id).execute()
        if not role_resp.data:
            raise HTTPException(404, f"Rol bulunamadı: {assignment.role_id}")
        
        new_role = role_resp.data[0]
        
        # Update user's role
        db.table("users").update({"role": assignment.role_id}).eq("id", user_id).execute()
        
        # Also add to user_roles table
        db.table("user_roles").upsert({
            "user_id": user_id,
            "role_id": assignment.role_id,
            "assigned_by": str(current_user.id)
        }).execute()
        
        # Audit log
        await AuditLogService.log(
            db=db,
            user_id=str(current_user.id),
            action=AuditAction.UPDATE,
            resource_type=ResourceType.USER,
            resource_id=user_id,
            details=f"Role changed for {user['email']}: {old_role} → {assignment.role_id}",
            old_value=old_role,
            new_value=assignment.role_id,
            success=True
        )
        
        logger.info(f"Role assigned: {user['email']} → {assignment.role_id} by {current_user.email}")
        
        return {
            "success": True,
            "user_id": user_id,
            "old_role": old_role,
            "new_role": assignment.role_id,
            "message": f"Rol değiştirildi: {new_role['display_name']}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning role: {e}")
        raise HTTPException(500, f"Failed to assign role: {str(e)}")


@router.get("/me/permissions")
@limiter.limit(RateLimits.PUBLIC_READ)
async def get_my_permissions(
    request: Request,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """Get current user's permissions (for frontend access control)"""
    try:
        permissions = get_user_permissions(current_user, db)
        
        return {
            "success": True,
            "user_id": str(current_user.id),
            "role": getattr(current_user, "role", "customer"),
            "permissions": permissions,
            "is_staff": is_staff_role(getattr(current_user, "role", "customer"))
        }
        
    except Exception as e:
        logger.error(f"Error getting permissions: {e}")
        raise HTTPException(500, f"Failed to get permissions: {str(e)}")
