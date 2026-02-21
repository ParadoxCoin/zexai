-- Migration: Seed AI models for chat and video
-- Run this in Supabase SQL Editor
-- Updated for actual ai_models table schema

-- ============================================
-- ANTHROPIC MODELS (Claude)
-- ============================================
INSERT INTO ai_models (id, name, provider_id, category, type, cost_multiplier, cost_usd, quality, speed, description, is_active, created_at)
VALUES 
  ('claude-3-5-sonnet-20241022', 'Claude 3.5 Sonnet', 'anthropic', 'chat', 'chat', 2.0, 0.003, 5, 'fast', 'Most intelligent Claude model - balanced speed and quality', true, NOW()),
  ('claude-3-5-haiku-20241022', 'Claude 3.5 Haiku', 'anthropic', 'chat', 'chat', 2.0, 0.001, 4, 'fast', 'Fastest Claude model - great for quick tasks', true, NOW()),
  ('claude-3-opus-20240229', 'Claude 3 Opus', 'anthropic', 'chat', 'chat', 2.0, 0.015, 5, 'medium', 'Most powerful Claude model for complex tasks', true, NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, cost_usd = EXCLUDED.cost_usd, description = EXCLUDED.description, quality = EXCLUDED.quality;

-- ============================================
-- OPENAI MODELS (GPT)
-- ============================================
INSERT INTO ai_models (id, name, provider_id, category, type, cost_multiplier, cost_usd, quality, speed, description, is_active, created_at)
VALUES 
  ('gpt-4o', 'GPT-4o', 'openai', 'chat', 'chat', 2.0, 0.005, 5, 'fast', 'Most capable multimodal model', true, NOW()),
  ('gpt-4o-mini', 'GPT-4o Mini', 'openai', 'chat', 'chat', 2.0, 0.00015, 4, 'fast', 'Fast and affordable for simple tasks', true, NOW()),
  ('gpt-4-turbo', 'GPT-4 Turbo', 'openai', 'chat', 'chat', 2.0, 0.01, 5, 'medium', 'High intelligence with vision support', true, NOW()),
  ('o1-preview', 'o1 Preview', 'openai', 'chat', 'chat', 2.0, 0.015, 5, 'slow', 'Advanced reasoning model', true, NOW()),
  ('o1-mini', 'o1 Mini', 'openai', 'chat', 'chat', 2.0, 0.003, 4, 'fast', 'Fast reasoning model', true, NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, cost_usd = EXCLUDED.cost_usd, description = EXCLUDED.description, quality = EXCLUDED.quality;

-- ============================================
-- FIREWORKS.AI MODELS
-- ============================================
INSERT INTO ai_models (id, name, provider_id, category, type, cost_multiplier, cost_usd, quality, speed, description, is_active, created_at)
VALUES 
  ('llama-v3p1-405b', 'Llama 3.1 405B', 'fireworks', 'chat', 'chat', 2.0, 0.003, 5, 'medium', 'Most powerful open source model', true, NOW()),
  ('llama-v3p1-70b', 'Llama 3.1 70B', 'fireworks', 'chat', 'chat', 2.0, 0.0009, 4, 'fast', 'Fast and capable open source model', true, NOW()),
  ('llama-v3p1-8b', 'Llama 3.1 8B', 'fireworks', 'chat', 'chat', 2.0, 0.0002, 3, 'fast', 'Ultra fast for simple tasks', true, NOW()),
  ('mixtral-8x22b', 'Mixtral 8x22B', 'fireworks', 'chat', 'chat', 2.0, 0.0012, 4, 'fast', 'MoE model with great quality/speed balance', true, NOW()),
  ('qwen2p5-72b', 'Qwen 2.5 72B', 'fireworks', 'chat', 'chat', 2.0, 0.0009, 4, 'fast', 'Excellent multilingual model', true, NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, cost_usd = EXCLUDED.cost_usd, description = EXCLUDED.description, quality = EXCLUDED.quality;

-- ============================================
-- GOOGLE GEMINI MODELS
-- ============================================
INSERT INTO ai_models (id, name, provider_id, category, type, cost_multiplier, cost_usd, quality, speed, description, is_active, created_at)
VALUES 
  ('gemini-1.5-pro', 'Gemini 1.5 Pro', 'gemini', 'chat', 'chat', 2.0, 0.00125, 5, 'medium', '2M context window - best for long documents', true, NOW()),
  ('gemini-1.5-flash', 'Gemini 1.5 Flash', 'gemini', 'chat', 'chat', 2.0, 0.000075, 4, 'fast', 'Fast and affordable with 1M context', true, NOW()),
  ('gemini-2.0-flash', 'Gemini 2.0 Flash', 'gemini', 'chat', 'chat', 2.0, 0.0, 4, 'fast', 'Next-gen Gemini - FREE preview', true, NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, cost_usd = EXCLUDED.cost_usd, description = EXCLUDED.description, quality = EXCLUDED.quality;

-- ============================================
-- IMAGE MODELS
-- ============================================
INSERT INTO ai_models (id, name, provider_id, category, type, cost_multiplier, cost_usd, quality, speed, badge, description, is_active, created_at)
VALUES 
  ('flux-pro', 'FLUX Pro', 'fal', 'image', 'text_to_image', 2.0, 0.07, 5, 'medium', 'Kaliteli', 'Highest quality FLUX model', true, NOW()),
  ('flux-schnell', 'FLUX Schnell', 'fal', 'image', 'text_to_image', 2.0, 0.02, 4, 'fast', 'Hızlı', 'Fast generation with good quality', true, NOW()),
  ('sdxl', 'Stable Diffusion XL', 'fal', 'image', 'text_to_image', 2.0, 0.03, 4, 'fast', 'Ekonomik', 'Popular open source model', true, NOW()),
  ('dall-e-3', 'DALL-E 3', 'openai', 'image', 'text_to_image', 2.0, 0.10, 5, 'medium', 'Premium', 'OpenAI flagship image model', true, NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, cost_usd = EXCLUDED.cost_usd, description = EXCLUDED.description, quality = EXCLUDED.quality;

-- ============================================
-- VIDEO MODELS
-- ============================================
INSERT INTO ai_models (id, name, provider_id, category, type, cost_multiplier, cost_usd, quality, speed, badge, description, is_active, created_at)
VALUES 
  ('kling-v2', 'Kling 2.0', 'kie', 'video', 'text_to_video', 2.0, 0.10, 5, 'slow', 'Yeni', 'High quality video generation', true, NOW()),
  ('veo3', 'Veo 3', 'kie', 'video', 'text_to_video', 2.0, 0.15, 5, 'slow', 'Premium', 'Google Veo video model', true, NOW()),
  ('runway-gen3', 'Runway Gen-3', 'kie', 'video', 'text_to_video', 2.0, 0.12, 5, 'medium', 'Popüler', 'Runway latest model', true, NOW()),
  ('minimax', 'MiniMax Video', 'pollo', 'video', 'text_to_video', 2.0, 0.08, 4, 'medium', NULL, 'Fast video generation', true, NOW()),
  ('luma-ray2', 'Luma Ray2', 'kie', 'video', 'text_to_video', 2.0, 0.10, 4, 'medium', NULL, 'Dream Machine Ray2', true, NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, cost_usd = EXCLUDED.cost_usd, description = EXCLUDED.description, quality = EXCLUDED.quality;

-- ============================================
-- AUDIO MODELS
-- ============================================
INSERT INTO ai_models (id, name, provider_id, category, type, cost_multiplier, cost_usd, quality, speed, description, is_active, created_at)
VALUES 
  ('elevenlabs-v2', 'ElevenLabs Multilingual v2', 'elevenlabs', 'audio', 'text_to_speech', 2.0, 0.001, 5, 'fast', 'Best quality text-to-speech', true, NOW()),
  ('openai-tts', 'OpenAI TTS', 'openai', 'audio', 'text_to_speech', 2.0, 0.015, 4, 'fast', 'OpenAI text-to-speech', true, NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, cost_usd = EXCLUDED.cost_usd, description = EXCLUDED.description, quality = EXCLUDED.quality;
