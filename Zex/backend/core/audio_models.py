"""
Audio/Speech Models - ElevenLabs (TTS, Voice Clone) + Replicate (Music, SFX)
"""

# ElevenLabs Models (Text to Speech, Voice Cloning)
ELEVENLABS_MODELS = {
    "eleven_turbo_v2": {
        "provider": "ElevenLabs",
        "name": "Turbo v2",
        "type": "text_to_speech",
        "cost_per_char": 0.0001,  # $0.30 per 1K chars
        "quality": 5,
        "speed": "very_fast",
        "badge": "⚡ En Hızlı!",
        "description": "En hızlı ve doğal ses"
    },
    "eleven_multilingual_v2": {
        "provider": "ElevenLabs",
        "name": "Multilingual v2",
        "type": "text_to_speech",
        "cost_per_char": 0.00015,
        "quality": 5,
        "speed": "fast",
        "badge": "🌍 Çok Dilli!",
        "description": "29 dil desteği"
    },
    "eleven_voice_clone": {
        "provider": "ElevenLabs",
        "name": "Voice Cloning",
        "type": "voice_clone",
        "cost_usd": 1.0,  # Per voice clone
        "quality": 5,
        "speed": "medium",
        "badge": "🎤 Ses Klonlama!",
        "description": "Kendi sesinizi klonlayın"
    }
}

# Replicate Models (Music, Sound Effects)
REPLICATE_AUDIO_MODELS = {
    "musicgen": {
        "provider": "Replicate",
        "name": "MusicGen",
        "type": "music_generation",
        "cost_usd": 0.05,
        "quality": 4,
        "speed": "medium",
        "badge": "🎵 Müzik!",
        "description": "AI müzik üretimi"
    },
    "stable_audio": {
        "provider": "Replicate",
        "name": "Stable Audio",
        "type": "music_generation",
        "cost_usd": 0.08,
        "quality": 5,
        "speed": "medium",
        "badge": "⭐ Kaliteli!",
        "description": "Yüksek kalite müzik"
    },
    "audioldm2": {
        "provider": "Replicate",
        "name": "AudioLDM 2",
        "type": "sound_effects",
        "cost_usd": 0.03,
        "quality": 4,
        "speed": "fast",
        "badge": "🔊 Ses Efekti!",
        "description": "Gerçekçi ses efektleri"
    },
    "riffusion": {
        "provider": "Replicate",
        "name": "Riffusion",
        "type": "music_generation",
        "cost_usd": 0.04,
        "quality": 3,
        "speed": "fast",
        "badge": "💰 Ekonomik!",
        "description": "Hızlı müzik üretimi"
    }
}

# Audio Tools
AUDIO_TOOLS = {
    "speech_to_text": {
        "name": "Speech to Text",
        "provider": "OpenAI Whisper",
        "cost_per_minute": 0.006,
        "description": "Ses dosyasını metne çevir",
        "icon": "📝"
    },
    "audio_enhancer": {
        "name": "Audio Enhancer",
        "provider": "Replicate",
        "cost_usd": 0.02,
        "description": "Ses kalitesini iyileştir",
        "icon": "✨"
    },
    "noise_remover": {
        "name": "Noise Remover",
        "provider": "Replicate",
        "cost_usd": 0.015,
        "description": "Arka plan gürültüsünü temizle",
        "icon": "🔇"
    },
    "voice_changer": {
        "name": "Voice Changer",
        "provider": "Replicate",
        "cost_usd": 0.025,
        "description": "Ses tonunu değiştir",
        "icon": "🎭"
    }
}

ALL_AUDIO_MODELS = {
    **ELEVENLABS_MODELS,
    **REPLICATE_AUDIO_MODELS
}

