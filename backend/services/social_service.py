"""
Social Features Service
Handles likes, shares, showcase and comments for all content types
"""
from typing import Optional, Dict, Any, List
from core.supabase_client import get_supabase_client
from core.logger import logger
import uuid


class SocialService:
    """Service for social interactions on user-generated content"""
    
    VALID_CONTENT_TYPES = ['image', 'video', 'audio', 'avatar']
    VALID_ACTIONS = ['like', 'share', 'showcase']
    SHARE_PLATFORMS = ['twitter', 'whatsapp', 'telegram', 'linkedin', 'pinterest', 'tiktok', 'instagram', 'youtube', 'copy']
    
    def __init__(self):
        self.supabase = get_supabase_client()
    
    # ==================== LIKES ====================
    
    async def toggle_like(self, user_id: str, content_type: str, content_id: str) -> Dict[str, Any]:
        """Toggle like on content - if exists remove, if not add"""
        try:
            # Check if already liked
            existing = self.supabase.table('content_interactions').select('id').eq(
                'user_id', user_id
            ).eq('content_type', content_type).eq('content_id', content_id).eq('action', 'like').execute()
            
            if existing.data:
                # Unlike
                self.supabase.table('content_interactions').delete().eq('id', existing.data[0]['id']).execute()
                return {"success": True, "liked": False, "message": "Beğeni kaldırıldı"}
            else:
                # Like
                self.supabase.table('content_interactions').insert({
                    'user_id': user_id,
                    'content_type': content_type,
                    'content_id': content_id,
                    'action': 'like'
                }).execute()
                return {"success": True, "liked": True, "message": "Beğenildi"}
                
        except Exception as e:
            logger.error(f"Toggle like error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_like_count(self, content_type: str, content_id: str) -> int:
        """Get total likes for content"""
        try:
            result = self.supabase.table('content_interactions').select(
                'id', count='exact'
            ).eq('content_type', content_type).eq('content_id', content_id).eq('action', 'like').execute()
            return result.count or 0
        except Exception as e:
            logger.error(f"Get like count error: {e}")
            return 0
    
    async def is_liked_by_user(self, user_id: str, content_type: str, content_id: str) -> bool:
        """Check if user has liked this content"""
        try:
            result = self.supabase.table('content_interactions').select('id').eq(
                'user_id', user_id
            ).eq('content_type', content_type).eq('content_id', content_id).eq('action', 'like').execute()
            return len(result.data) > 0
        except:
            return False
    
    # ==================== SHARES ====================
    
    async def record_share(self, user_id: str, content_type: str, content_id: str, platform: str) -> Dict[str, Any]:
        """Record a share action"""
        try:
            if platform not in self.SHARE_PLATFORMS:
                return {"success": False, "error": "Geçersiz platform"}
            
            self.supabase.table('content_interactions').insert({
                'user_id': user_id,
                'content_type': content_type,
                'content_id': content_id,
                'action': 'share',
                'platform': platform
            }).execute()
            
            return {"success": True, "message": f"{platform} paylaşımı kaydedildi"}
        except Exception as e:
            logger.error(f"Record share error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_share_count(self, content_type: str, content_id: str) -> int:
        """Get total shares for content"""
        try:
            result = self.supabase.table('content_interactions').select(
                'id', count='exact'
            ).eq('content_type', content_type).eq('content_id', content_id).eq('action', 'share').execute()
            return result.count or 0
        except:
            return 0
    
    # ==================== SHOWCASE ====================
    
    async def toggle_showcase(self, user_id: str, content_type: str, content_id: str, is_public: bool = True, file_url: Optional[str] = None) -> Dict[str, Any]:
        """Add or remove content from showcase"""
        try:
            logger.info(f"toggle_showcase START: user={user_id}, type={content_type}, id={content_id}, file_url={file_url}")
            existing = self.supabase.table('content_interactions').select('id').eq(
                'user_id', user_id
            ).eq('content_type', content_type).eq('content_id', content_id).eq('action', 'showcase').execute()
            logger.info(f"existing check done: {existing.data}")
            
            if existing.data:
                # Remove from showcase
                self.supabase.table('content_interactions').delete().eq('id', existing.data[0]['id']).execute()
                logger.info("Removed from interactions")
                # Update media_outputs flag
                self.supabase.table('media_outputs').update({'is_showcase': False}).eq('id', content_id).execute()
                logger.info("Updated media_outputs to False")
                return {"success": True, "in_showcase": False, "message": "Showcase'den kaldırıldı"}
            else:
                # Add to showcase
                logger.info("Adding to interactions")
                self.supabase.table('content_interactions').insert({
                    'user_id': user_id,
                    'content_type': content_type,
                    'content_id': content_id,
                    'action': 'showcase',
                    'is_public': is_public
                }).execute()
                
                # Check media_outputs
                logger.info("Checking media_outputs")
                media_check = self.supabase.table('media_outputs').select('id').eq('id', content_id).execute()
                if not media_check.data:
                    # Look in generations table using base id (stripping any _index suffix)
                    base_id = content_id.split('_')[0]
                    logger.info(f"Looking up base_id={base_id}")
                    gen_data = self.supabase.table('generations').select('*').eq('id', base_id).execute()
                    logger.info(f"gen_data fetch done")
                    if gen_data.data:
                        task = gen_data.data[0]
                        logger.info("Inserting into media_outputs")
                        self.supabase.table('media_outputs').insert({
                            'id': content_id,
                            'user_id': task['user_id'],
                            'service_type': task['type'],
                            'file_url': file_url or task.get('output_url', ''),
                            'thumbnail_url': file_url or task.get('output_url', ''),
                            'prompt': task.get('prompt', ''),
                            'model_name': task.get('model', ''),
                            'credits_charged': task.get('credits_cost', 0),
                            'is_showcase': True,
                            'status': task.get('status', 'completed')
                        }).execute()
                        logger.info("Inserted.")
                else:
                    logger.info("Updating existing media_outputs")
                    update_data = {'is_showcase': True}
                    if file_url:
                        update_data['file_url'] = file_url
                        update_data['thumbnail_url'] = file_url
                    self.supabase.table('media_outputs').update(update_data).eq('id', content_id).execute()
                    logger.info("Updated.")
                    
                return {"success": True, "in_showcase": True, "message": "Showcase'e eklendi"}
                
        except Exception as e:
            logger.error(f"Toggle showcase error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_public_showcase(self, content_type: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Get public showcase items from media_outputs"""
        try:
            # Query media_outputs table where is_showcase = true
            query = self.supabase.table('media_outputs').select('*').eq('is_showcase', True).eq('status', 'completed').order('created_at', desc=True).limit(limit)
            
            if content_type:
                query = query.eq('service_type', content_type)
            
            result = query.execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Get showcase error: {e}")
            return []
    
    # ==================== COMMENTS ====================
    
    async def add_comment(self, user_id: str, content_type: str, content_id: str, comment: str) -> Dict[str, Any]:
        """Add a comment to content"""
        try:
            if not comment or len(comment.strip()) < 2:
                return {"success": False, "error": "Yorum çok kısa"}
            
            if len(comment) > 500:
                return {"success": False, "error": "Yorum 500 karakterden uzun olamaz"}
            
            result = self.supabase.table('content_comments').insert({
                'user_id': user_id,
                'content_type': content_type,
                'content_id': content_id,
                'comment': comment.strip()
            }).execute()
            
            return {"success": True, "comment_id": result.data[0]['id'], "message": "Yorum eklendi"}
        except Exception as e:
            logger.error(f"Add comment error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_comments(self, content_type: str, content_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get comments for content"""
        try:
            result = self.supabase.table('content_comments').select(
                '*, users!inner(id, email)'
            ).eq('content_type', content_type).eq('content_id', content_id).eq(
                'is_visible', True
            ).order('created_at', desc=True).limit(limit).execute()
            
            return result.data or []
        except Exception as e:
            logger.error(f"Get comments error: {e}")
            return []
    
    async def delete_comment(self, user_id: str, comment_id: str) -> Dict[str, Any]:
        """Delete own comment"""
        try:
            self.supabase.table('content_comments').delete().eq(
                'id', comment_id
            ).eq('user_id', user_id).execute()
            return {"success": True, "message": "Yorum silindi"}
        except Exception as e:
            logger.error(f"Delete comment error: {e}")
            return {"success": False, "error": str(e)}
    
    # ==================== STATS ====================
    
    async def get_content_stats(self, content_type: str, content_id: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Get all stats for content"""
        like_count = await self.get_like_count(content_type, content_id)
        share_count = await self.get_share_count(content_type, content_id)
        
        is_liked = False
        in_showcase = False
        
        if user_id:
            is_liked = await self.is_liked_by_user(user_id, content_type, content_id)
            
            showcase_check = self.supabase.table('content_interactions').select('id').eq(
                'user_id', user_id
            ).eq('content_type', content_type).eq('content_id', content_id).eq('action', 'showcase').execute()
            in_showcase = len(showcase_check.data) > 0
        
        return {
            "likes": like_count,
            "shares": share_count,
            "is_liked": is_liked,
            "in_showcase": in_showcase
        }


# Singleton
social_service = SocialService()
