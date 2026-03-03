"""
Prompt Enhancement Service
Uses AI to enhance user prompts for better generation results
"""
import httpx
import os
from typing import Optional, List, Dict, Any
from core.logger import logger


class PromptEnhancerService:
    """AI-powered prompt enhancement service"""
    
    # Style presets for different content types
    STYLES = {
        "image": [
            {"id": "realistic", "name": "Gerçekçi", "suffix": ", photorealistic, 8K, highly detailed, professional photography"},
            {"id": "anime", "name": "Anime", "suffix": ", anime style, vibrant colors, Studio Ghibli aesthetic, cel shading"},
            {"id": "3d", "name": "3D Render", "suffix": ", 3D render, Octane render, Cinema 4D, glossy, volumetric lighting"},
            {"id": "oil_painting", "name": "Yağlı Boya", "suffix": ", oil painting, classical art style, brush strokes, canvas texture"},
            {"id": "watercolor", "name": "Suluboya", "suffix": ", watercolor painting, soft edges, pastel colors, artistic"},
            {"id": "cyberpunk", "name": "Cyberpunk", "suffix": ", cyberpunk style, neon lights, futuristic, dark atmosphere, rain"},
            {"id": "fantasy", "name": "Fantastik", "suffix": ", fantasy art, magical, ethereal lighting, epic scene"},
            {"id": "minimalist", "name": "Minimalist", "suffix": ", minimalist design, clean lines, simple composition, modern"},
        ],
        "video": [
            {"id": "cinematic", "name": "Sinematik", "suffix": ", cinematic, film grain, anamorphic lens, dramatic lighting"},
            {"id": "documentary", "name": "Belgesel", "suffix": ", documentary style, natural lighting, authentic feel"},
            {"id": "animation", "name": "Animasyon", "suffix": ", animated, smooth motion, cartoon style"},
            {"id": "slowmo", "name": "Slow Motion", "suffix": ", slow motion, 120fps, dramatic, detailed"},
        ],
        "audio": [
            {"id": "natural", "name": "Doğal", "suffix": " - speak naturally with a warm, friendly tone"},
            {"id": "professional", "name": "Profesyonel", "suffix": " - speak clearly and professionally like a news anchor"},
            {"id": "dramatic", "name": "Dramatik", "suffix": " - speak with dramatic emotion and emphasis"},
            {"id": "calm", "name": "Sakin", "suffix": " - speak softly and calmly, like meditation guide"},
        ],
        "construction": [
            {"id": "concept", "name": "1. Konsept Tasarım", "suffix": ", architectural concept design, massing study, volumetric sketch, abstract form, artistic rendering, loose strokes"},
            {"id": "architectural", "name": "2. Mimari Proje", "suffix": ", detailed architectural plan, floor plan, elevation view, section cut, technical drawing, blueprint style, precise lines"},
            {"id": "structural", "name": "3. Yapısal Sistem", "suffix": ", structural engineering detail, reinforced concrete frame, steel connections, load-bearing elements, cross-section, technical grid"},
            {"id": "mep", "name": "4. MEP Sistemleri", "suffix": ", MEP systems diagram, mechanical electrical plumbing, HVAC ductwork, piping layout, electrical conduit, technical schematic"},
            {"id": "interior", "name": "5. İç Mekan & Detaylar", "suffix": ", interior design visualization, material finishes, textures, lighting fixtures, furniture layout, photorealistic interior render"},
            {"id": "landscape", "name": "6. Peyzaj & Çevre", "suffix": ", landscape architecture, site plan, garden design, urban context, environmental integration, outdoor rendering, greenery"}
        ]
    }
    
    # Enhancement templates
    ENHANCEMENT_PROMPT = """You are an expert prompt engineer. Transform the user's simple idea into detailed, professional prompts for AI {content_type} generation.

User's idea: {user_input}

Generate 3 different enhanced prompts in different styles. Each should be:
- Detailed and specific
- Include relevant technical terms
- Optimized for AI generation
- Written entirely in {language} language

Return ONLY a JSON array with 3 objects, each having:
- "prompt": the enhanced prompt generated in {language} language
- "style": style name translated to {language} language (e.g., "Realista", "Artístico" if Spanish)
- "description": brief description of the style translated to {language} language

Example response:
[
  {{"prompt": "...", "style": "Realistic", "description": "Gerçekçi ve detaylı"}},
  {{"prompt": "...", "style": "Artistic", "description": "Sanatsal yaklaşım"}},
  {{"prompt": "...", "style": "Creative", "description": "Yaratıcı ve özgün"}}
]"""

    def __init__(self):
        self.openai_key = os.getenv("OPENAI_API_KEY", "")
        self.anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")
        self.groq_key = os.getenv("GROQ_API_KEY", "")
        logger.info(f"PromptEnhancer init - Groq: {bool(self.groq_key)}, OpenAI: {bool(self.openai_key)}")
    
    def _refresh_keys(self):
        """Refresh API keys from environment - in case server restarted without module reload"""
        self.groq_key = os.getenv("GROQ_API_KEY", "")
        self.openai_key = os.getenv("OPENAI_API_KEY", "")
        self.anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")
    
    async def enhance_prompt(
        self, 
        user_input: str, 
        content_type: str = "image",
        style: Optional[str] = None,
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Enhance a simple prompt into detailed AI-ready prompts
        
        Args:
            user_input: User's simple idea/concept
            content_type: Type of content (image, video, audio, avatar)
            style: Optional specific style to use
        
        Returns:
            Dictionary with enhanced prompts
        """
        try:
            # Refresh keys in case .env was updated after server start
            self._refresh_keys()
            
            logger.info(f"enhance_prompt called - Groq: {bool(self.groq_key)}, input: {user_input[:20]}...")
            
            # If specific style requested, use quick enhancement
            if style:
                return self._quick_enhance(user_input, content_type, style)
            
            # Use AI for creative enhancement - Groq first (free!)
            if self.groq_key:
                logger.info("Using Groq for enhancement")
                return await self._enhance_with_groq(user_input, content_type, language)
            elif self.openai_key:
                logger.info("Using OpenAI for enhancement")
                return await self._enhance_with_openai(user_input, content_type, language)
            elif self.anthropic_key:
                logger.info("Using Anthropic for enhancement")
                return await self._enhance_with_anthropic(user_input, content_type, language)
            else:
                logger.warning("No API keys found, using template")
                # Fallback to template-based enhancement
                return self._template_enhance(user_input, content_type)
                
        except Exception as e:
            logger.error(f"Prompt enhancement error: {e}")
            return self._template_enhance(user_input, content_type)
    
    def _quick_enhance(self, user_input: str, content_type: str, style: str) -> Dict[str, Any]:
        """Quick enhancement with predefined style"""
        styles = self.STYLES.get(content_type, self.STYLES["image"])
        style_config = next((s for s in styles if s["id"] == style), styles[0])
        
        enhanced = f"{user_input}{style_config['suffix']}"
        
        return {
            "success": True,
            "original": user_input,
            "enhanced_prompts": [
                {
                    "prompt": enhanced,
                    "style": style_config["name"],
                    "description": f"{style_config['name']} stili uygulandı"
                }
            ],
            "available_styles": styles
        }
    
    def _template_enhance(self, user_input: str, content_type: str) -> Dict[str, Any]:
        """Fallback template-based enhancement"""
        styles = self.STYLES.get(content_type, self.STYLES["image"])
        
        enhanced_prompts = []
        # Construction için hepsini döndür, diğerleri için ilk 4
        limit = 6 if content_type == "construction" else 4
        for style in styles[:limit]:  # Top N styles
            enhanced_prompts.append({
                "prompt": f"{user_input}{style['suffix']}",
                "style": style["name"],
                "description": f"{style['name']} stili"
            })
        
        return {
            "success": True,
            "original": user_input,
            "enhanced_prompts": enhanced_prompts,
            "available_styles": styles
        }
    
    async def _enhance_with_groq(self, user_input: str, content_type: str, language: str) -> Dict[str, Any]:
        """Enhance using Groq with Llama 3.3 70B (FREE!)"""
        import json
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.groq_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a professional prompt engineer. Always respond with valid JSON only, no markdown formatting."
                        },
                        {
                            "role": "user", 
                            "content": self.ENHANCEMENT_PROMPT.format(
                                content_type=content_type,
                                user_input=user_input,
                                language=language
                            )
                        }
                    ],
                    "temperature": 0.8,
                    "max_tokens": 1000
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                logger.error(f"Groq API error: {response.text}")
                return self._template_enhance(user_input, content_type)
            
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            
            # Parse JSON from response
            try:
                content = content.strip()
                if content.startswith("```"):
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                
                prompts = json.loads(content)
                
                logger.info(f"Groq prompt enhancement successful for: {user_input[:30]}...")
                
                return {
                    "success": True,
                    "original": user_input,
                    "enhanced_prompts": prompts,
                    "available_styles": self.STYLES.get(content_type, []),
                    "ai_generated": True,
                    "provider": "groq"
                }
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse Groq response: {e}")
                return self._template_enhance(user_input, content_type)
    
    async def _enhance_with_openai(self, user_input: str, content_type: str, language: str) -> Dict[str, Any]:
        """Enhance using OpenAI GPT"""
        import json
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.openai_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a professional prompt engineer. Always respond with valid JSON only."
                        },
                        {
                            "role": "user", 
                            "content": self.ENHANCEMENT_PROMPT.format(
                                content_type=content_type,
                                user_input=user_input,
                                language=language
                            )
                        }
                    ],
                    "temperature": 0.8,
                    "max_tokens": 1000
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                logger.error(f"OpenAI API error: {response.text}")
                return self._template_enhance(user_input, content_type)
            
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            
            # Parse JSON from response
            try:
                # Clean up response if needed
                content = content.strip()
                if content.startswith("```"):
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                
                prompts = json.loads(content)
                
                return {
                    "success": True,
                    "original": user_input,
                    "enhanced_prompts": prompts,
                    "available_styles": self.STYLES.get(content_type, []),
                    "ai_generated": True
                }
            except json.JSONDecodeError:
                logger.warning("Failed to parse AI response, using template")
                return self._template_enhance(user_input, content_type)
    
    async def _enhance_with_anthropic(self, user_input: str, content_type: str, language: str) -> Dict[str, Any]:
        """Enhance using Anthropic Claude"""
        import json
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": self.anthropic_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "claude-3-haiku-20240307",
                    "max_tokens": 1000,
                    "messages": [
                        {
                            "role": "user",
                            "content": self.ENHANCEMENT_PROMPT.format(
                                content_type=content_type,
                                user_input=user_input,
                                language=language
                            )
                        }
                    ]
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                return self._template_enhance(user_input, content_type)
            
            result = response.json()
            content = result["content"][0]["text"]
            
            try:
                prompts = json.loads(content)
                return {
                    "success": True,
                    "original": user_input,
                    "enhanced_prompts": prompts,
                    "available_styles": self.STYLES.get(content_type, []),
                    "ai_generated": True
                }
            except json.JSONDecodeError:
                return self._template_enhance(user_input, content_type)
    
    def get_styles(self, content_type: str) -> List[Dict[str, str]]:
        """Get available styles for content type"""
        return self.STYLES.get(content_type, self.STYLES["image"])


# Singleton instance
prompt_enhancer = PromptEnhancerService()
