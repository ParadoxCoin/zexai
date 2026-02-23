"""
Gamification Service
Handles XP, levels, streaks, and achievements
"""
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, List
from supabase import Client

class GamificationService:
    """Service for gamification features"""
    
    # XP rewards
    XP_REWARDS = {
        'image': 10,
        'video': 25,
        'audio': 15,
        'chat': 5,
        'referral': 100,
        'daily_login': 10,
    }
    
    # Streak bonuses
    STREAK_BONUSES = {
        7: 50,    # 7 days = 50 credits
        30: 200,  # 30 days = 200 credits
        100: 500, # 100 days = 500 credits
    }
    
    # Daily streak credit reward
    DAILY_STREAK_CREDITS = 5
    
    def __init__(self, supabase: Client):
        self.supabase = supabase
    
    async def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get user's gamification stats"""
        # First check if user has gamification record
        result = self.supabase.table('user_gamification').select('*').eq('user_id', user_id).execute()
        
        if not result.data or len(result.data) == 0:
            # Initialize if not exists
            await self._init_user_gamification(user_id)
            result = self.supabase.table('user_gamification').select('*').eq('user_id', user_id).execute()
        
        stats = result.data[0] if result.data else None
        
        if not stats:
            # Return default stats if still no data
            return {
                'level': 1,
                'level_name': 'Starter',
                'level_emoji': '🌱',
                'current_xp': 0,
                'total_xp': 0,
                'xp_to_next_level': 500,
                'next_level_xp': 500,
                'streak_days': 0,
                'longest_streak': 0,
                'credit_bonus_percent': 0,
                'can_claim_daily': True,
                'stats': {'images': 0, 'videos': 0, 'audio': 0, 'chat': 0, 'referrals': 0}
            }
        
        # Get level info separately
        level_result = self.supabase.table('gamification_levels').select('*').eq('level', stats['level']).execute()
        level_info = level_result.data[0] if level_result.data else {'name': 'Starter', 'emoji': '🌱'}
        
        # Calculate XP needed for next level
        next_level = self._get_next_level_info(stats['level'])
        
        return {
            'level': stats['level'],
            'level_name': level_info.get('name', 'Starter'),
            'level_emoji': level_info.get('emoji', '🌱'),
            'current_xp': stats['current_xp'],
            'total_xp': stats['total_xp'],
            'xp_to_next_level': next_level['required_xp'] - stats['current_xp'] if next_level else 0,
            'next_level_xp': next_level['required_xp'] if next_level else None,
            'streak_days': stats['streak_days'],
            'longest_streak': stats['longest_streak'],
            'credit_bonus_percent': stats['credit_bonus_percent'] or 0,
            'can_claim_daily': self._can_claim_daily(stats.get('last_daily_claim')),
            'stats': {
                'images': stats['total_images_generated'] or 0,
                'videos': stats['total_videos_generated'] or 0,
                'audio': stats['total_audio_generated'] or 0,
                'chat': stats['total_chat_messages'] or 0,
                'referrals': stats['total_referrals'] or 0,
            }
        }
    
    def _can_claim_daily(self, last_claim: Optional[str]) -> bool:
        """Check if user can claim daily reward"""
        if not last_claim:
            return True
        
        last_claim_date = datetime.fromisoformat(last_claim.replace('Z', '+00:00')).date()
        today = date.today()
        return last_claim_date < today
    
    async def claim_daily_reward(self, user_id: str) -> Dict[str, Any]:
        """Claim daily streak reward"""
        stats = await self.get_user_stats(user_id)
        
        if not stats['can_claim_daily']:
            return {'success': False, 'error': 'Bugün zaten claim edildi'}
        
        # Get current data
        result = self.supabase.table('user_gamification').select('*').eq('user_id', user_id).execute()
        
        if not result.data or len(result.data) == 0:
            return {'success': False, 'error': 'Kullanıcı bulunamadı'}
        
        current = result.data[0]
        
        # Calculate streak
        last_login = current.get('last_login_date')
        today = date.today()
        yesterday = today - timedelta(days=1)
        
        if last_login:
            try:
                last_login_date = datetime.strptime(str(last_login), '%Y-%m-%d').date() if isinstance(last_login, str) else last_login
                if last_login_date == yesterday:
                    new_streak = (current.get('streak_days') or 0) + 1
                elif last_login_date == today:
                    new_streak = current.get('streak_days') or 0
                else:
                    new_streak = 1  # Streak broken
            except:
                new_streak = 1
        else:
            new_streak = 1
        
        # Calculate rewards
        credits_earned = self.DAILY_STREAK_CREDITS
        bonus_credits = 0
        
        # Check for streak milestones
        for streak_days, bonus in self.STREAK_BONUSES.items():
            if new_streak == streak_days:
                bonus_credits = bonus
                break
        
        total_credits = credits_earned + bonus_credits
        
        # Update gamification stats
        self.supabase.table('user_gamification').update({
            'streak_days': new_streak,
            'longest_streak': max(new_streak, current.get('longest_streak') or 0),
            'last_daily_claim': datetime.now().isoformat(),
            'last_login_date': today.isoformat(),
            'updated_at': datetime.now().isoformat()
        }).eq('user_id', user_id).execute()
        
        # Add XP for daily login
        await self.add_xp(user_id, 'daily_login')
        
        # Add credits to user via user_credits table
        if total_credits > 0:
            try:
                credit_resp = self.supabase.table('user_credits').select('credits_balance').eq('user_id', user_id).execute()
                if credit_resp.data:
                    current_credits = float(credit_resp.data[0].get('credits_balance') or 0)
                    self.supabase.table('user_credits').update({
                        'credits_balance': current_credits + total_credits,
                        'updated_at': datetime.now().isoformat()
                    }).eq('user_id', user_id).execute()
                else:
                    # Create credit record if not exists
                    self.supabase.table('user_credits').insert({
                        'user_id': user_id,
                        'credits_balance': total_credits,
                        'created_at': datetime.now().isoformat(),
                        'updated_at': datetime.now().isoformat()
                    }).execute()
            except Exception as e:
                import traceback
                print(f"Credit addition error: {e}")
                traceback.print_exc()
        
        # Check streak achievements
        await self._check_streak_achievements(user_id, new_streak)
        
        return {
            'success': True,
            'streak_days': new_streak,
            'credits_earned': credits_earned,
            'bonus_credits': bonus_credits,
            'total_credits': total_credits,
            'xp_earned': self.XP_REWARDS['daily_login']
        }
    
    async def add_xp(self, user_id: str, action: str, amount: Optional[int] = None) -> Dict[str, Any]:
        """Add XP to user"""
        xp_amount = amount if amount else self.XP_REWARDS.get(action, 0)
        
        if xp_amount == 0:
            return {'success': False, 'error': 'Invalid action'}
        
        result = self.supabase.table('user_gamification').select('*').eq('user_id', user_id).single().execute()
        
        if not result.data:
            await self._init_user_gamification(user_id)
            result = self.supabase.table('user_gamification').select('*').eq('user_id', user_id).single().execute()
        
        current = result.data
        new_current_xp = current['current_xp'] + xp_amount
        new_total_xp = current['total_xp'] + xp_amount
        
        # Check for level up
        level_up = False
        new_level = current['level']
        new_bonus = current['credit_bonus_percent']
        
        levels = self.supabase.table('gamification_levels').select('*').order('level').execute()
        
        for level_data in levels.data:
            if level_data['level'] > new_level and new_total_xp >= level_data['required_xp']:
                new_level = level_data['level']
                new_bonus = level_data['credit_bonus_percent']
                level_up = True
        
        # Update stats
        update_data = {
            'current_xp': new_current_xp,
            'total_xp': new_total_xp,
            'updated_at': datetime.now().isoformat()
        }
        
        # Update action counter
        counter_map = {
            'image': 'total_images_generated',
            'video': 'total_videos_generated', 
            'audio': 'total_audio_generated',
            'chat': 'total_chat_messages',
            'referral': 'total_referrals'
        }
        
        if action in counter_map:
            update_data[counter_map[action]] = current[counter_map[action]] + 1
        
        if level_up:
            update_data['level'] = new_level
            update_data['credit_bonus_percent'] = new_bonus
            # Reset current XP for new level
            next_level = self._get_next_level_info(new_level)
            if next_level:
                update_data['current_xp'] = new_total_xp - self._get_level_xp(new_level)
        
        self.supabase.table('user_gamification').update(update_data).eq('user_id', user_id).execute()
        
        # Check achievements
        await self._check_action_achievements(user_id, action, current[counter_map.get(action, 'total_images_generated')] + 1 if action in counter_map else 0)
        
        if level_up:
            await self._check_level_achievements(user_id, new_level)
        
        return {
            'success': True,
            'xp_earned': xp_amount,
            'level_up': level_up,
            'new_level': new_level if level_up else None
        }
    
    def _get_level_xp(self, level: int) -> int:
        """Get XP required for a level"""
        result = self.supabase.table('gamification_levels').select('required_xp').eq('level', level).single().execute()
        return result.data['required_xp'] if result.data else 0
    
    def _get_next_level_info(self, current_level: int) -> Optional[Dict]:
        """Get next level info"""
        result = self.supabase.table('gamification_levels').select('*').eq('level', current_level + 1).single().execute()
        return result.data
    
    async def _init_user_gamification(self, user_id: str):
        """Initialize gamification for new user"""
        self.supabase.table('user_gamification').insert({
            'user_id': user_id,
            'level': 1,
            'current_xp': 0,
            'total_xp': 0,
            'streak_days': 0,
            'longest_streak': 0
        }).execute()
    
    async def get_achievements(self, user_id: str) -> Dict[str, Any]:
        """Get user's achievements"""
        # Get all achievements
        all_achievements = self.supabase.table('achievements').select('*').eq('is_active', True).execute()
        
        # Get user's unlocked achievements
        user_achievements = self.supabase.table('user_achievements').select('achievement_id, unlocked_at').eq('user_id', user_id).execute()
        
        unlocked_ids = {ua['achievement_id']: ua['unlocked_at'] for ua in user_achievements.data}
        
        achievements = []
        for ach in all_achievements.data:
            achievements.append({
                **ach,
                'unlocked': ach['id'] in unlocked_ids,
                'unlocked_at': unlocked_ids.get(ach['id'])
            })
        
        return {
            'total': len(all_achievements.data),
            'unlocked': len(unlocked_ids),
            'achievements': achievements
        }
    
    async def _check_action_achievements(self, user_id: str, action: str, count: int):
        """Check and unlock action-based achievements"""
        action_map = {
            'image': 'images',
            'video': 'videos',
            'audio': 'audio',
            'referral': 'referrals'
        }
        
        req_type = action_map.get(action)
        if not req_type:
            return
        
        achievements = self.supabase.table('achievements').select('*').eq('requirement_type', req_type).execute()
        
        for ach in achievements.data:
            if count >= ach['requirement_value']:
                await self._unlock_achievement(user_id, ach['id'], ach['xp_reward'], ach['credit_reward'])
    
    async def _check_streak_achievements(self, user_id: str, streak: int):
        """Check and unlock streak achievements"""
        achievements = self.supabase.table('achievements').select('*').eq('requirement_type', 'streak').execute()
        
        for ach in achievements.data:
            if streak >= ach['requirement_value']:
                await self._unlock_achievement(user_id, ach['id'], ach['xp_reward'], ach['credit_reward'])
    
    async def _check_level_achievements(self, user_id: str, level: int):
        """Check and unlock level achievements"""
        achievements = self.supabase.table('achievements').select('*').eq('requirement_type', 'level').execute()
        
        for ach in achievements.data:
            if level >= ach['requirement_value']:
                await self._unlock_achievement(user_id, ach['id'], ach['xp_reward'], ach['credit_reward'])
    
    async def _unlock_achievement(self, user_id: str, achievement_id: str, xp_reward: int, credit_reward: int):
        """Unlock an achievement for user"""
        # Check if already unlocked
        existing = self.supabase.table('user_achievements').select('id').eq('user_id', user_id).eq('achievement_id', achievement_id).execute()
        
        if existing.data:
            return  # Already unlocked
        
        # Unlock achievement
        self.supabase.table('user_achievements').insert({
            'user_id': user_id,
            'achievement_id': achievement_id,
            'notified': False
        }).execute()
        
        # Give rewards
        if xp_reward > 0:
            await self.add_xp(user_id, 'achievement', xp_reward)
        
        if credit_reward > 0:
            try:
                credit_resp = self.supabase.table('user_credits').select('credits_balance').eq('user_id', user_id).execute()
                if credit_resp.data:
                    current_credits = float(credit_resp.data[0].get('credits_balance') or 0)
                    self.supabase.table('user_credits').update({
                        'credits_balance': current_credits + credit_reward,
                        'updated_at': datetime.now().isoformat()
                    }).eq('user_id', user_id).execute()
                else:
                    self.supabase.table('user_credits').insert({
                        'user_id': user_id,
                        'credits_balance': credit_reward,
                        'created_at': datetime.now().isoformat(),
                        'updated_at': datetime.now().isoformat()
                    }).execute()
            except Exception as e:
                print(f"Achievement credit reward error: {e}")
    
    async def get_leaderboard(self, period: str = 'weekly', limit: int = 10) -> List[Dict]:
        """Get leaderboard"""
        # For now, get from user_gamification sorted by total_xp
        result = self.supabase.table('user_gamification').select(
            'user_id, level, total_xp, streak_days'
        ).order('total_xp', desc=True).limit(limit).execute()
        
        # Get user emails
        leaderboard = []
        for i, entry in enumerate(result.data):
            user = self.supabase.table('profiles').select('email, full_name').eq('id', entry['user_id']).single().execute()
            leaderboard.append({
                'rank': i + 1,
                'user_id': entry['user_id'],
                'username': user.data.get('full_name') or user.data.get('email', 'Anonim').split('@')[0] if user.data else 'Anonim',
                'level': entry['level'],
                'total_xp': entry['total_xp'],
                'streak_days': entry['streak_days']
            })
        
        return leaderboard
    
    async def get_new_achievements(self, user_id: str) -> List[Dict]:
        """Get unnotified achievements"""
        result = self.supabase.table('user_achievements').select(
            '*, achievements(*)'
        ).eq('user_id', user_id).eq('notified', False).execute()
        
        # Mark as notified
        if result.data:
            for ua in result.data:
                self.supabase.table('user_achievements').update({
                    'notified': True
                }).eq('id', ua['id']).execute()
        
        return [
            {
                'id': ua['achievements']['id'],
                'name': ua['achievements']['name'],
                'description': ua['achievements']['description'],
                'emoji': ua['achievements']['emoji'],
                'xp_reward': ua['achievements']['xp_reward'],
                'credit_reward': ua['achievements']['credit_reward'],
                'unlocked_at': ua['unlocked_at']
            }
            for ua in result.data
        ]
