from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class AudioType(str, Enum):
    tts = "tts"
    music = "music"
    voice_clone = "voice_clone"

class MusicStyle(str, Enum):
    pop = "pop"
    rock = "rock"
    jazz = "jazz"
    classical = "classical"
    electronic = "electronic"
    hiphop = "hiphop"
    ambient = "ambient"

class AudioGenerateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    voice_id: str
    model: Optional[str] = "eleven_turbo_v2"
    stability: Optional[float] = Field(0.5, ge=0, le=1)
    similarity_boost: Optional[float] = Field(0.75, ge=0, le=1)

class AudioGenerateResponse(BaseModel):
    success: bool
    task_id: str
    audio_url: Optional[str] = None
    credits_used: int
    message: str

class VoiceInfo(BaseModel):
    voice_id: str
    name: str
    provider: str
    language: str
    gender: str
    age: str
    accent: str
    description: str
    preview_url: Optional[str] = None

class AudioTaskStatus(BaseModel):
    task_id: str
    status: str
    audio_url: Optional[str] = None
    progress: Optional[int] = 0
    error: Optional[str] = None

class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    voice_id: str
    model: Optional[str] = "eleven_turbo_v2"

class VoiceCloneRequest(BaseModel):
    text: str
    audio_file_url: str

class MusicRequest(BaseModel):
    prompt: str
    style: MusicStyle
    duration: Optional[int] = 30

class SFXRequest(BaseModel):
    description: str
    duration: Optional[int] = 5

class AudioToolRequest(BaseModel):
    tool_id: str
    audio_url: str

class AudioModelInfo(BaseModel):
    id: str
    name: str
    provider: str
    type: AudioType
    credits: int
    description: str

class AudioTaskResponse(BaseModel):
    success: bool
    task_id: str
    status: str
    credits_used: int
    estimated_time: int
