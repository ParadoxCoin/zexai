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
    
    LANGUAGE_MAP = {
        "tr": "Turkish",
        "en": "English",
        "fr": "French",
        "de": "German",
        "es": "Spanish",
        "zh": "Chinese",
        "su": "Sumerian"
    }

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
    
    # ─────────────────────────────────────────────────────────────
    # EXPERT SYSTEM PROMPT — Cinematic / Professional Grade Output
    # ─────────────────────────────────────────────────────────────
    SYSTEM_PROMPT = """You are an elite AI creative director and prompt engineering specialist with deep expertise in cinematic language, visual storytelling, and generative AI model behavior. You have mastered the craft of translating raw ideas into highly optimized, technically precise prompts that unlock the full potential of state-of-the-art AI models (Sora, Kling, Veo, Runway, FLUX, Midjourney).

Your prompts follow these professional principles:
- **Specificity over generality**: Replace vague words with precise cinematic/technical terms
- **Layered description**: Subject → Action/Mood → Environment → Lighting → Camera/Lens → Style
- **Technical vocabulary**: Use industry-standard cinematography, photography, and art direction terminology
- **Emotional resonance**: Every prompt evokes a specific feeling, atmosphere, and narrative tension
- **No filler words**: Every word earns its place and adds measurable value

Always return ONLY a valid JSON array. No markdown, no explanations, no preamble."""

    # Per-content-type expert expansion instructions
    CONTENT_TYPE_INSTRUCTIONS = {
        "video": """You are an Oscar-winning cinematographer and AI video director.

Transform the idea into 4 distinct cinematic prompt variations using professional film language:

MANDATORY elements per prompt:
1. **Opening shot type**: ECU/CU/MS/LS/Aerial/POV/Tracking/Dolly-in/Crane-up etc.
2. **Subject description**: Precise, vivid, with motion verbs (gliding, cascading, surging, etc.)
3. **Environment**: Atmosphere, weather, time of day, spatial depth
4. **Lighting schema**: Rembrandt, hard side-light, golden hour, volumetric, practical neon, etc.
5. **Camera movement**: Slow push-in, whip-pan, handheld, steadicam, parallax, Dutch angle
6. **Lens feel**: Anamorphic bokeh, wide-angle distortion, telephoto compression, rack focus
7. **Color palette**: Desaturated teal-orange, warm amber, cool blue, high-contrast monochrome
8. **Film texture**: grain, halation, lens flare, motion blur, depth-of-field

Style variations must be: Cinematic Noir / Hyper-Realistic Documentary / Dreamlike Surreal / Epic Fantasy""",

        "image": """You are a world-class digital art director, photographer, and visual effects supervisor.

Transform the idea into 4 distinct ultra-high-fidelity prompt variations:

MANDATORY elements per prompt:
1. **Subject**: Ultra-precise description with material, texture, age, emotion
2. **Composition**: Rule of thirds, leading lines, golden ratio, negative space, symmetry
3. **Lighting**: 3-point lighting, Rembrandt, chiaroscuro, backlit silhouette, environmental HDRI
4. **Camera specs**: Focal length (85mm, 24mm, 50mm), aperture (f/1.4, f/8), shutter speed
5. **Rendering quality**: 8K, RAW format, photorealistic, hyperdetailed, subsurface scattering
6. **Color science**: Color grading, LUT style, saturation levels, color harmony
7. **Artist/Style reference**: Weta Digital, ILM, Studio Ghibli, Ansel Adams, Annie Leibovitz

Style variations must be: Ultra-Photorealistic / Cinematic Digital Art / Neo-Classical Painting / Ethereal Fantasy""",

        "audio": """You are a professional voice director and sound designer.

Transform the idea into 4 distinct audio/voice direction variations:

MANDATORY elements per prompt:
1. **Voice character**: Age, gender, accent, warmth level, authority level
2. **Pacing**: Words per minute, strategic pauses, breath patterns
3. **Emotional register**: Gravitas, intimacy, urgency, wonder, warmth
4. **Technical delivery**: Projection, resonance, articulation clarity
5. **Contextual setting**: Studio dry, slight reverb, intimate close-mic, broadcast quality
6. **Intended effect**: Persuasion, comfort, excitement, authority, storytelling

Style variations must be: Documentary Narrator / Intimate Storyteller / News Anchor Authority / Cinematic Character""",

        "construction": """You are a principal architect and Pritzker Prize-winning design director.

Transform the idea into 4 distinct architectural visualization variations:

MANDATORY elements per prompt:
1. **Architectural language**: Brutalist, Parametric, Biomorphic, Deconstructivist, Vernacular Modern
2. **Material palette**: Raw concrete, Corten steel, rammed earth, glass curtain wall, CLT timber
3. **Spatial narrative**: Program, circulation, threshold, light quality, human scale
4. **Environmental integration**: Site topography, orientation, climate response, landscape
5. **Drawing type**: Concept massing, technical section, detail drawing, site plan, perspective view
6. **Rendering style**: Archviz photorealistic, hand-drawn sketch, CAD blueprint, axonometric

Style variations must be: Concept Sketch / Technical Blueprint / Photorealistic Visualization / Axonometric Diagram"""
    }

    ENHANCEMENT_PROMPT = """{expert_instruction}

User's raw idea: "{user_input}"

Generate exactly 4 distinct expert-level prompts. Write the prompts in {language} language.

Return ONLY this JSON format:
[
  {{"prompt": "<full expert prompt in {language}>", "style": "<style name in {language}>", "description": "<one-sentence expert rationale in {language}>"}},
  {{"prompt": "<full expert prompt in {language}>", "style": "<style name in {language}>", "description": "<one-sentence expert rationale in {language}>"}},
  {{"prompt": "<full expert prompt in {language}>", "style": "<style name in {language}>", "description": "<one-sentence expert rationale in {language}>"}},
  {{"prompt": "<full expert prompt in {language}>", "style": "<style name in {language}>", "description": "<one-sentence expert rationale in {language}>"}}
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
            
            # Resolve language code to full language name
            full_language = self.LANGUAGE_MAP.get(language, "English")
            
            # Use AI for creative enhancement - Groq first (free!)
            if self.groq_key:
                logger.info("Using Groq for enhancement")
                return await self._enhance_with_groq(user_input, content_type, full_language)
            elif self.openai_key:
                logger.info("Using OpenAI for enhancement")
                return await self._enhance_with_openai(user_input, content_type, full_language)
            elif self.anthropic_key:
                logger.info("Using Anthropic for enhancement")
                return await self._enhance_with_anthropic(user_input, content_type, full_language)
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
        """Expert-grade fallback enhancement — rich cinematic/technical prompts without AI API"""
        
        subject = user_input.strip().rstrip('.')
        
        if content_type == "video":
            enhanced_prompts = [
                {
                    "prompt": (
                        f"Slow dolly-in tracking shot — {subject}, rendered with anamorphic 1.33x lens compression, "
                        f"shallow depth-of-field at f/1.8, 85mm equivalent. Golden-hour volumetric light shafts "
                        f"piercing through atmospheric haze. Warm amber and teal color grade, desaturated highlights, "
                        f"crushed blacks. Film grain overlay at 16mm, subtle halation on bright edges. "
                        f"Steadicam movement with slight organic drift. Cinematic widescreen 2.39:1 aspect ratio."
                    ),
                    "style": "Sinematik Noir",
                    "description": "Yavaş kamera hareketi, anamorfik lens ve film estetiği ile sinematik noir tarzı"
                },
                {
                    "prompt": (
                        f"Handheld documentary medium shot — {subject}, natural available light, "
                        f"practical window light creating soft Rembrandt shadow pattern. "
                        f"Neutral color science with subtle de-saturation, preserving skin tones. "
                        f"Slight lens breathing on focus pulls, authentic environmental ambient sound. "
                        f"16:9 framing with leading space, occasional organic camera microshake. "
                        f"High dynamic range capture — deep shadow detail, controlled highlight rolloff."
                    ),
                    "style": "Gerçekçi Belgesel",
                    "description": "Doğal ışık ve el kamerası ile otantik belgesel estetiği"
                },
                {
                    "prompt": (
                        f"Aerial crane-up pullback — {subject}, dreamlike surreal atmosphere with "
                        f"otherworldly color palette: deep indigo sky gradients into rose-gold horizon. "
                        f"Ethereal particle effects and lens flares from practical light sources. "
                        f"Ultra-slow motion at 240fps, time-remapping with smooth speed ramps. "
                        f"Soft diffusion filter creating bloom on highlights. "
                        f"Floating camera parallax effect, depth-layered environmental fog."
                    ),
                    "style": "Rüyamsı Sürreal",
                    "description": "Hava çekimi ve olağanüstü renk paleti ile rüyamsı sürreal atmosfer"
                },
                {
                    "prompt": (
                        f"Epic wide establishing shot — {subject}, sweeping orchestral visual language, "
                        f"Imax-scale environment with towering scale and grandeur. "
                        f"Hard dramatic side-lighting creating deep chiaroscuro contrast. "
                        f"Lens flares from harsh directional key light. Oversaturated vivid colors "
                        f"with deep shadow crush. Slow-motion environmental particles — dust, embers, mist. "
                        f"Ultra-wide 21:9 cinemascope framing, convergent horizon lines emphasizing depth."
                    ),
                    "style": "Epik Fantazi",
                    "description": "Geniş açı, dramatik ışık ve epik ölçek ile fantazi tarzı"
                }
            ]
        
        elif content_type == "image":
            enhanced_prompts = [
                {
                    "prompt": (
                        f"Ultra-photorealistic render of {subject} — shot on Phase One XF IQ4 150MP, "
                        f"85mm f/1.4 lens, ISO 100. Three-point studio lighting: soft key light at 45°, "
                        f"fill light ratio 1:4, rim backlight creating separation. "
                        f"8K resolution, RAW format, hyperdetailed texture with subsurface scattering, "
                        f"accurate specular highlights, global illumination. "
                        f"Color science: D65 white point, Rec.2020 gamut, neutral LUT grade."
                    ),
                    "style": "Ultra-Fotogerçekçi",
                    "description": "Faz kamerası ile stüdyo ışıklandırması ve 8K ultra detay"
                },
                {
                    "prompt": (
                        f"Cinematic digital art of {subject} — inspired by Weta Digital VFX pipeline, "
                        f"photorealistic with artistic interpretation. Dramatic Rembrandt lighting, "
                        f"chiaroscuro contrast ratio 8:1. Volumetric atmospheric haze, "
                        f"depth-layered environment. Color grading: teal-orange complementary split, "
                        f"bleach-bypass style. Epic scale composition, rule-of-thirds placement, "
                        f"leading lines toward subject. 16:9 cinematic framing, lens distortion at edges."
                    ),
                    "style": "Sinematik Dijital Sanat",
                    "description": "VFX stüdyo kalitesinde dramatik sinematik dijital sanat"
                },
                {
                    "prompt": (
                        f"Neo-classical oil painting of {subject} — technique inspired by John Singer Sargent "
                        f"and Anders Zorn. Impasto brushwork with visible texture, warm umber underpainting. "
                        f"Caravaggio-esque tenebrism lighting from single directional source. "
                        f"Rich saturated midtones, luminous glazed highlights, deep transparent shadows. "
                        f"Canvas texture visible through paint layers. Classical compositional balance, "
                        f"golden ratio framing. Warm amber varnish patina."
                    ),
                    "style": "Neo-Klasik Yağlıboya",
                    "description": "Sargent ve Zorn tekniğiyle tenebrist ışıklandırmalı neo-klasik yağlıboya"
                },
                {
                    "prompt": (
                        f"Ethereal fantasy illustration of {subject} — Studio Ghibli meets Arthur Rackham. "
                        f"Soft watercolor base with intricate ink linework overlay. "
                        f"Bioluminescent color palette: deep indigo, luminous cyan, warm rose-gold accents. "
                        f"Floating particle systems — glowing spores, light motes, ethereal bokeh orbs. "
                        f"Dreamlike depth-of-field blur on background elements. "
                        f"Delicate environmental storytelling details, whimsical atmospheric perspective."
                    ),
                    "style": "Eteral Fantazi",
                    "description": "Ghibli ve Rackham ilhamıyla biyolüminesanlı eteral fantazi illüstrasyonu"
                }
            ]
        
        elif content_type == "audio":
            enhanced_prompts = [
                {
                    "prompt": (
                        f"{subject} — Deep baritone voice, measured 140 WPM pace with strategic micro-pauses "
                        f"at clause boundaries. Authoritative gravitas with subtle warmth undertone. "
                        f"Close-mic intimate presence, slight studio reverb tail 0.3s RT60. "
                        f"Precise articulation, forward projection, resonant chest voice placement. "
                        f"Documentary narrator register — trustworthy, expert, compelling."
                    ),
                    "style": "Belgesel Anlatıcı",
                    "description": "Otoriter bariton ses, ölçülü tempo ve belgesel anlatıcı estetiği"
                },
                {
                    "prompt": (
                        f"{subject} — Warm alto voice, conversational 160 WPM with organic rhythm variations. "
                        f"Intimate proximity effect, dry studio sound with zero reverb. "
                        f"Subtle vocal fry on phrase endings, natural breath audibility. "
                        f"Storyteller register — curious, engaged, emotionally present. "
                        f"Slight upward inflection on narrative peaks, downward resolution at conclusion."
                    ),
                    "style": "Samimi Hikaye Anlatıcı",
                    "description": "Sıcak, yakın ve organik nefes kalıplarıyla samimi hikaye anlatıcısı"
                },
                {
                    "prompt": (
                        f"{subject} — Crisp broadcast tenor, 125 WPM measured pace, zero hesitation. "
                        f"Broadcast-quality EQ: high-pass at 120Hz, presence boost at 3kHz, "
                        f"dynamic compression 4:1 ratio. Authoritative news anchor delivery, "
                        f"neutral RP accent, impeccable diction. Professional studio ambiance, "
                        f"perfectly dry acoustic treatment."
                    ),
                    "style": "Yayın Spikeri",
                    "description": "Kristal net, tarafsız aksanlı profesyonel yayın spikeri kalitesi"
                },
                {
                    "prompt": (
                        f"{subject} — Dramatic character voice, dynamic range spanning whisper to full projection. "
                        f"Emotional authenticity with controlled theatrical technique. "
                        f"Deliberate pacing: slow at 90 WPM for gravity, accelerating for urgency. "
                        f"Slight room ambiance suggesting cinematic space. "
                        f"Voice acting register — committed, specific, emotionally truthful."
                    ),
                    "style": "Sinematik Karakter",
                    "description": "Dinamik aralıklı, dramatik ve duygusal olarak özgün sinematik karakter sesi"
                }
            ]
        
        else:
            # Generic professional fallback
            enhanced_prompts = [
                {
                    "prompt": (
                        f"Professional ultra-detailed render of {subject}, "
                        f"8K resolution, photorealistic quality, masterful composition, "
                        f"expert lighting with dramatic chiaroscuro effect, "
                        f"rich color grading, hyperdetailed textures, award-winning quality"
                    ),
                    "style": "Ultra Profesyonel",
                    "description": "Ödül kalitesinde ultra profesyonel render"
                },
                {
                    "prompt": (
                        f"Cinematic interpretation of {subject}, "
                        f"anamorphic lens aesthetic, film grain texture, "
                        f"volumetric atmospheric lighting, teal-orange color grade, "
                        f"shallow depth of field, 24fps cinematic motion"
                    ),
                    "style": "Sinematik",
                    "description": "Anamorfik lens ve film dokusuyla sinematik estetik"
                },
                {
                    "prompt": (
                        f"Artistic neo-classical depiction of {subject}, "
                        f"masterful brushwork inspired by Renaissance masters, "
                        f"Rembrandt lighting, rich impasto texture, "
                        f"warm oil paint palette, classical compositional balance"
                    ),
                    "style": "Neo-Klasik Sanat",
                    "description": "Rönesans ustalarından ilham alan neo-klasik sanatsal yorum"
                },
                {
                    "prompt": (
                        f"Ethereal dreamlike visualization of {subject}, "
                        f"bioluminescent color palette, floating particle effects, "
                        f"soft diffusion bloom, otherworldly atmosphere, "
                        f"Studio Ghibli-inspired whimsy, magical environmental storytelling"
                    ),
                    "style": "Eteral Hayal",
                    "description": "Biyolüminesanlı ve büyülü eteral hayal estetiği"
                }
            ]
        
        styles = self.STYLES.get(content_type, self.STYLES["image"])
        return {
            "success": True,
            "original": user_input,
            "enhanced_prompts": enhanced_prompts,
            "available_styles": styles
        }
    
    async def _enhance_with_groq(self, user_input: str, content_type: str, language: str) -> Dict[str, Any]:
        """Enhance using Groq with Llama 3.3 70B (FREE!)"""
        import json
        
        expert_instruction = self.CONTENT_TYPE_INSTRUCTIONS.get(content_type, self.CONTENT_TYPE_INSTRUCTIONS["image"])
        user_message = self.ENHANCEMENT_PROMPT.format(
            expert_instruction=expert_instruction,
            user_input=user_input,
            language=language
        )
        
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
                            "content": self.SYSTEM_PROMPT
                        },
                        {
                            "role": "user",
                            "content": user_message
                        }
                    ],
                    "temperature": 0.85,
                    "max_tokens": 2000
                },
                timeout=45.0
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
        
        expert_instruction = self.CONTENT_TYPE_INSTRUCTIONS.get(content_type, self.CONTENT_TYPE_INSTRUCTIONS["image"])
        user_message = self.ENHANCEMENT_PROMPT.format(
            expert_instruction=expert_instruction,
            user_input=user_input,
            language=language
        )
        
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
                            "content": self.SYSTEM_PROMPT
                        },
                        {
                            "role": "user",
                            "content": user_message
                        }
                    ],
                    "temperature": 0.85,
                    "max_tokens": 2000
                },
                timeout=45.0
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
        
        expert_instruction = self.CONTENT_TYPE_INSTRUCTIONS.get(content_type, self.CONTENT_TYPE_INSTRUCTIONS["image"])
        user_message = self.ENHANCEMENT_PROMPT.format(
            expert_instruction=expert_instruction,
            user_input=user_input,
            language=language
        )
        
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
                    "max_tokens": 2000,
                    "system": self.SYSTEM_PROMPT,
                    "messages": [
                        {
                            "role": "user",
                            "content": user_message
                        }
                    ]
                },
                timeout=45.0
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
