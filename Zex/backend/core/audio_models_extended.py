"""
Extended Audio Models - Hybrid structure with multiple providers
TTS (4 providers), Music (4 providers), SFX, Tools
"""

# Text to Speech Models (4 providers, 12 models)
TTS_MODELS = {
    # ElevenLabs (Premium - Most natural)
    "eleven_turbo_v2": {
        "provider": "ElevenLabs",
        "name": "Turbo v2",
        "cost_per_char": 0.0001,  # $0.30/1K chars
        "quality": 5,
        "speed": "very_fast",
        "languages": 29,
        "badge": "🎤 En Doğal!",
        "description": "En doğal ve hızlı ses"
    },
    "eleven_multilingual_v2": {
        "provider": "ElevenLabs",
        "name": "Multilingual v2",
        "cost_per_char": 0.00015,
        "quality": 5,
        "speed": "fast",
        "languages": 29,
        "badge": "🌍 29 Dil!",
        "description": "Çok dilli premium ses"
    },
    
    # OpenAI TTS (Quality + Affordable)
    "openai_tts_1": {
        "provider": "OpenAI",
        "name": "TTS-1",
        "cost_per_char": 0.000015,  # $0.015/1K chars
        "quality": 4,
        "speed": "very_fast",
        "languages": 57,
        "badge": "💰 Süper Ucuz!",
        "description": "Uygun fiyatlı, kaliteli"
    },
    "openai_tts_1_hd": {
        "provider": "OpenAI",
        "name": "TTS-1-HD",
        "cost_per_char": 0.00003,  # $0.03/1K chars
        "quality": 5,
        "speed": "fast",
        "languages": 57,
        "badge": "⭐ HD Kalite!",
        "description": "Yüksek kalite, uygun fiyat"
    },
    
    # Google Cloud TTS (Economical + Multi-language)
    "google_neural2": {
        "provider": "Google Cloud",
        "name": "Neural2",
        "cost_per_char": 0.000016,  # $0.016/1K chars
        "quality": 4,
        "speed": "fast",
        "languages": 100,
        "badge": "🌐 100+ Dil!",
        "description": "En fazla dil desteği"
    },
    "google_wavenet": {
        "provider": "Google Cloud",
        "name": "WaveNet",
        "cost_per_char": 0.000016,
        "quality": 4,
        "speed": "fast",
        "languages": 100,
        "badge": None,
        "description": "Doğal ses, çok dilli"
    },
    
    # Play.ht (Alternative)
    "playht_2_0": {
        "provider": "Play.ht",
        "name": "Play 2.0",
        "cost_per_char": 0.00012,
        "quality": 4,
        "speed": "fast",
        "languages": 142,
        "badge": "🎭 142 Dil!",
        "description": "En fazla dil seçeneği"
    }
}

# Voice Cloning Models
VOICE_CLONE_MODELS = {
    "eleven_voice_clone": {
        "provider": "ElevenLabs",
        "name": "Voice Cloning",
        "cost_usd": 1.0,  # Per voice
        "quality": 5,
        "speed": "medium",
        "badge": "🎤 Profesyonel!",
        "description": "En kaliteli ses klonlama"
    },
    "playht_voice_clone": {
        "provider": "Play.ht",
        "name": "Voice Cloning",
        "cost_usd": 0.5,
        "quality": 4,
        "speed": "fast",
        "badge": "💰 Ekonomik!",
        "description": "Uygun fiyatlı klonlama"
    }
}

# Music Generation Models (4 providers, 6 models)
MUSIC_MODELS = {
    # Suno AI (Most popular)
    "suno_v3_5": {
        "provider": "Suno AI",
        "name": "Suno v3.5",
        "cost_per_generation": 0.10,  # Per song
        "quality": 5,
        "speed": "medium",
        "max_duration": 240,  # 4 minutes
        "badge": "🎵 En Popüler!",
        "description": "Viral müzik üretimi"
    },
    "suno_chirp": {
        "provider": "Suno AI",
        "name": "Chirp",
        "cost_per_generation": 0.05,
        "quality": 4,
        "speed": "fast",
        "max_duration": 120,
        "badge": "⚡ Hızlı!",
        "description": "Hızlı müzik üretimi"
    },
    
    # Udio (Alternative to Suno)
    "udio_v1": {
        "provider": "Udio",
        "name": "Udio v1",
        "cost_per_generation": 0.08,
        "quality": 5,
        "speed": "medium",
        "max_duration": 180,
        "badge": "🎸 Profesyonel!",
        "description": "Yüksek kalite müzik"
    },
    
    # Replicate MusicGen (Economical)
    "musicgen_large": {
        "provider": "Replicate",
        "name": "MusicGen Large",
        "cost_per_generation": 0.03,
        "quality": 4,
        "speed": "fast",
        "max_duration": 60,
        "badge": "💰 En Ekonomik!",
        "description": "Uygun fiyatlı müzik"
    },
    
    # Stable Audio (Quality)
    "stable_audio_open": {
        "provider": "Stable Audio",
        "name": "Stable Audio Open",
        "cost_per_generation": 0.06,
        "quality": 4,
        "speed": "medium",
        "max_duration": 90,
        "badge": None,
        "description": "Açık kaynak, kaliteli"
    }
}

# Sound Effects Models
SFX_MODELS = {
    "audioldm2": {
        "provider": "Replicate",
        "name": "AudioLDM 2",
        "cost_usd": 0.02,
        "quality": 4,
        "speed": "fast",
        "badge": "🔊 Gerçekçi!",
        "description": "Gerçekçi ses efektleri"
    },
    "stable_audio_sfx": {
        "provider": "Stable Audio",
        "name": "Stable Audio SFX",
        "cost_usd": 0.03,
        "quality": 4,
        "speed": "medium",
        "badge": None,
        "description": "Yüksek kalite SFX"
    }
}

# Audio Tools
AUDIO_TOOLS = {
    # Speech to Text
    "whisper_large_v3": {
        "name": "Whisper Large v3",
        "provider": "OpenAI",
        "type": "speech_to_text",
        "cost_per_minute": 0.006,
        "quality": 5,
        "languages": 99,
        "badge": "🎯 En İyi!",
        "description": "En doğru transkripsiyon"
    },
    "google_stt": {
        "name": "Google Speech-to-Text",
        "provider": "Google Cloud",
        "type": "speech_to_text",
        "cost_per_minute": 0.004,
        "quality": 4,
        "languages": 125,
        "badge": "💰 Ekonomik!",
        "description": "Uygun fiyatlı STT"
    },
    
    # Audio Enhancement
    "adobe_podcast_enhance": {
        "name": "Adobe Podcast Enhance",
        "provider": "Adobe",
        "type": "enhancement",
        "cost_usd": 0.05,
        "quality": 5,
        "badge": "✨ Profesyonel!",
        "description": "Stüdyo kalitesi"
    },
    "audio_enhancer": {
        "name": "Audio Enhancer",
        "provider": "Replicate",
        "type": "enhancement",
        "cost_usd": 0.02,
        "quality": 4,
        "badge": None,
        "description": "Ses kalitesi iyileştirme"
    },
    
    # Noise Removal
    "noise_remover": {
        "name": "Noise Remover",
        "provider": "Replicate",
        "type": "noise_removal",
        "cost_usd": 0.015,
        "quality": 4,
        "badge": "🔇 Temiz Ses!",
        "description": "Gürültü temizleme"
    },
    
    # Voice Effects
    "voice_changer": {
        "name": "Voice Changer",
        "provider": "Replicate",
        "type": "voice_effects",
        "cost_usd": 0.025,
        "quality": 4,
        "badge": "🎭 Eğlenceli!",
        "description": "Ses efektleri"
    },
    
    # Audio Separation
    "stem_splitter": {
        "name": "Stem Splitter",
        "provider": "Replicate",
        "type": "separation",
        "cost_usd": 0.04,
        "quality": 4,
        "badge": "🎼 Müzik Ayrıştırma!",
        "description": "Vokal/enstrüman ayırma"
    }
}

# Music Style Presets
MUSIC_STYLES = {
    "pop": "Upbeat pop music with catchy melody",
    "rock": "Energetic rock music with electric guitars",
    "electronic": "Electronic dance music with synthesizers",
    "classical": "Classical orchestral music",
    "jazz": "Smooth jazz with piano and saxophone",
    "hip_hop": "Hip hop beat with bass and drums",
    "ambient": "Ambient atmospheric soundscape",
    "lo_fi": "Lo-fi chill beats for relaxation"
}

# Voice Presets (ElevenLabs)
VOICE_PRESETS = {
    "alloy": {"name": "Alloy", "gender": "neutral", "style": "professional"},
    "echo": {"name": "Echo", "gender": "male", "style": "energetic"},
    "fable": {"name": "Fable", "gender": "male", "style": "calm"},
    "onyx": {"name": "Onyx", "gender": "male", "style": "deep"},
    "nova": {"name": "Nova", "gender": "female", "style": "friendly"},
    "shimmer": {"name": "Shimmer", "gender": "female", "style": "warm"}
}

# All models combined
ALL_AUDIO_MODELS = {
    **TTS_MODELS,
    **VOICE_CLONE_MODELS,
    **MUSIC_MODELS,
    **SFX_MODELS
}

