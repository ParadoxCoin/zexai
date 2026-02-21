-- Migration: Seed all providers into api_providers table
-- Run this in Supabase SQL Editor

-- Insert all providers (Video, Chat, Audio)
INSERT INTO api_providers (id, name, display_name, description, base_url, auth_type, auth_header, auth_prefix, is_active, is_builtin, priority, health_status, created_at, updated_at)
VALUES 
  -- Video providers
  ('piapi', 'piapi', 'PiAPI', 'Kling, Luma, Hailuo video models', 'https://api.piapi.ai/api/v1', 'bearer', 'Authorization', 'Bearer', true, true, 1, 'unknown', NOW(), NOW()),
  ('goapi', 'goapi', 'GoAPI', 'Kling, Luma, Hailuo video models', 'https://api.goapi.ai/api/v1', 'bearer', 'Authorization', 'Bearer', true, true, 2, 'unknown', NOW(), NOW()),
  ('fal', 'fal', 'Fal.ai', 'Fast video and image generation', 'https://fal.run', 'bearer', 'Authorization', 'Key', true, true, 3, 'unknown', NOW(), NOW()),
  ('replicate', 'replicate', 'Replicate', 'Open source AI models', 'https://api.replicate.com/v1', 'bearer', 'Authorization', 'Bearer', true, true, 4, 'unknown', NOW(), NOW()),
  ('pollo', 'pollo', 'Pollo.ai', 'Premium video generation', 'https://api.pollo.ai/v1', 'bearer', 'Authorization', 'Bearer', true, true, 5, 'unknown', NOW(), NOW()),
  ('kie', 'kie', 'KIE AI', 'Veo 3.1, Runway, Kling 2.1, Wan 2.5 - ~30% cheaper', 'https://api.kie.ai/api/v1', 'bearer', 'Authorization', 'Bearer', true, true, 6, 'unknown', NOW(), NOW()),
  -- Chat/LLM providers
  ('openai', 'openai', 'OpenAI', 'GPT-4o, GPT-4 Turbo, DALL-E', 'https://api.openai.com/v1', 'bearer', 'Authorization', 'Bearer', true, true, 10, 'unknown', NOW(), NOW()),
  ('anthropic', 'anthropic', 'Anthropic', 'Claude 3.5 Sonnet, Claude 3 Opus', 'https://api.anthropic.com/v1', 'api_key', 'x-api-key', '', true, true, 11, 'unknown', NOW(), NOW()),
  ('fireworks', 'fireworks', 'Fireworks.ai', 'Fast LLM inference', 'https://api.fireworks.ai/inference/v1', 'bearer', 'Authorization', 'Bearer', true, true, 12, 'unknown', NOW(), NOW()),
  ('openrouter', 'openrouter', 'OpenRouter', 'Multi-model gateway - 100+ models', 'https://openrouter.ai/api/v1', 'bearer', 'Authorization', 'Bearer', true, true, 13, 'unknown', NOW(), NOW()),
  ('gemini', 'gemini', 'Google Gemini', 'Gemini Pro, Gemini Ultra', 'https://generativelanguage.googleapis.com/v1beta', 'api_key', 'x-goog-api-key', '', true, true, 14, 'unknown', NOW(), NOW()),
  -- Audio providers
  ('elevenlabs', 'elevenlabs', 'ElevenLabs', 'Text-to-speech, voice cloning', 'https://api.elevenlabs.io/v1', 'api_key', 'xi-api-key', '', true, true, 20, 'unknown', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  base_url = EXCLUDED.base_url,
  auth_type = EXCLUDED.auth_type,
  auth_header = EXCLUDED.auth_header,
  auth_prefix = EXCLUDED.auth_prefix,
  is_active = EXCLUDED.is_active,
  priority = EXCLUDED.priority,
  updated_at = NOW();
