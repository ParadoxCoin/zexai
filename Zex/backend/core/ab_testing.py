"""
A/B Testing Service for AI Models
Compare different AI models with the same prompt
"""
import asyncio
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from enum import Enum
import logging
import time

from core.supabase_client import get_supabase_client
from core.config import settings

logger = logging.getLogger(__name__)


class TestType(Enum):
    IMAGE = "image"
    VIDEO = "video"
    CHAT = "chat"
    AUDIO = "audio"


class TestStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class TestConfig:
    """Configuration for A/B test"""
    timeout_seconds: int = 120
    parallel_execution: bool = True
    retry_count: int = 0
    save_outputs: bool = True


@dataclass
class TestResult:
    """Result of a single model test"""
    model_id: str
    success: bool
    response_time_ms: int = 0
    first_token_ms: Optional[int] = None
    cost_credits: float = 0
    output_url: Optional[str] = None
    error_message: Optional[str] = None
    raw_response: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "model_id": self.model_id,
            "success": self.success,
            "response_time_ms": self.response_time_ms,
            "first_token_ms": self.first_token_ms,
            "cost_credits": self.cost_credits,
            "output_url": self.output_url,
            "error_message": self.error_message,
            "raw_response": self.raw_response
        }


@dataclass
class ABTest:
    """A/B Test definition"""
    id: str
    name: str
    test_type: TestType
    prompt: str
    model_ids: List[str]
    config: TestConfig = field(default_factory=TestConfig)
    description: Optional[str] = None
    status: TestStatus = TestStatus.PENDING
    created_by: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    results: List[TestResult] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "test_type": self.test_type.value,
            "prompt": self.prompt,
            "model_ids": self.model_ids,
            "description": self.description,
            "status": self.status.value,
            "config": {
                "timeout_seconds": self.config.timeout_seconds,
                "parallel_execution": self.config.parallel_execution,
                "retry_count": self.config.retry_count,
                "save_outputs": self.config.save_outputs
            },
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "results": [r.to_dict() for r in self.results]
        }


class ABTestingService:
    """
    A/B Testing service for comparing AI models
    """
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._running_tests: Dict[str, asyncio.Task] = {}
        logger.info("ABTestingService initialized")
    
    async def create_test(
        self,
        name: str,
        test_type: str,
        prompt: str,
        model_ids: List[str],
        description: Optional[str] = None,
        config: Optional[Dict[str, Any]] = None,
        created_by: Optional[str] = None
    ) -> ABTest:
        """Create a new A/B test"""
        test_id = str(uuid.uuid4())
        
        test_config = TestConfig()
        if config:
            test_config.timeout_seconds = config.get("timeout_seconds", 120)
            test_config.parallel_execution = config.get("parallel_execution", True)
            test_config.retry_count = config.get("retry_count", 0)
            test_config.save_outputs = config.get("save_outputs", True)
        
        test = ABTest(
            id=test_id,
            name=name,
            test_type=TestType(test_type),
            prompt=prompt,
            model_ids=model_ids,
            description=description,
            config=test_config,
            created_by=created_by
        )
        
        # Save to database
        await self._save_test(test)
        
        logger.info(f"A/B Test created: {test_id} with {len(model_ids)} models")
        return test
    
    async def _save_test(self, test: ABTest):
        """Save test to Supabase"""
        supabase = get_supabase_client()
        if not supabase:
            logger.warning("Supabase not available, test not persisted")
            return
        
        try:
            test_data = {
                "id": test.id,
                "name": test.name,
                "test_type": test.test_type.value,
                "prompt": test.prompt,
                "model_ids": test.model_ids,
                "description": test.description,
                "status": test.status.value,
                "config": {
                    "timeout_seconds": test.config.timeout_seconds,
                    "parallel_execution": test.config.parallel_execution,
                    "retry_count": test.config.retry_count,
                    "save_outputs": test.config.save_outputs
                },
                "created_by": test.created_by,
                "created_at": test.created_at.isoformat()
            }
            
            supabase.table("ab_tests").insert(test_data).execute()
            
        except Exception as e:
            logger.error(f"Failed to save test: {e}")
    
    async def get_test(self, test_id: str) -> Optional[ABTest]:
        """Get test by ID"""
        supabase = get_supabase_client()
        if not supabase:
            return None
        
        try:
            result = supabase.table("ab_tests").select("*").eq("id", test_id).single().execute()
            
            if result.data:
                return self._parse_test(result.data)
            return None
            
        except Exception as e:
            logger.error(f"Failed to get test: {e}")
            return None
    
    async def list_tests(
        self, 
        test_type: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50
    ) -> List[ABTest]:
        """List all tests"""
        supabase = get_supabase_client()
        if not supabase:
            return []
        
        try:
            query = supabase.table("ab_tests").select("*")
            
            if test_type:
                query = query.eq("test_type", test_type)
            if status:
                query = query.eq("status", status)
            
            result = query.order("created_at", desc=True).limit(limit).execute()
            
            return [self._parse_test(t) for t in result.data] if result.data else []
            
        except Exception as e:
            logger.error(f"Failed to list tests: {e}")
            return []
    
    def _parse_test(self, data: Dict[str, Any]) -> ABTest:
        """Parse test from database row"""
        config_data = data.get("config", {})
        config = TestConfig(
            timeout_seconds=config_data.get("timeout_seconds", 120),
            parallel_execution=config_data.get("parallel_execution", True),
            retry_count=config_data.get("retry_count", 0),
            save_outputs=config_data.get("save_outputs", True)
        )
        
        return ABTest(
            id=data["id"],
            name=data["name"],
            test_type=TestType(data["test_type"]),
            prompt=data["prompt"],
            model_ids=data["model_ids"],
            description=data.get("description"),
            status=TestStatus(data.get("status", "pending")),
            config=config,
            created_by=data.get("created_by"),
            created_at=datetime.fromisoformat(data["created_at"]) if data.get("created_at") else datetime.utcnow()
        )
    
    async def run_test(self, test_id: str) -> ABTest:
        """Run an A/B test"""
        test = await self.get_test(test_id)
        if not test:
            raise ValueError(f"Test {test_id} not found")
        
        if test.status == TestStatus.RUNNING:
            raise ValueError(f"Test {test_id} is already running")
        
        # Update status
        test.status = TestStatus.RUNNING
        await self._update_test_status(test_id, TestStatus.RUNNING)
        
        try:
            # Run tests for each model
            if test.config.parallel_execution:
                results = await self._run_parallel(test)
            else:
                results = await self._run_sequential(test)
            
            test.results = results
            
            # Save results
            await self._save_results(test_id, results)
            
            # Update status
            test.status = TestStatus.COMPLETED
            await self._update_test_status(test_id, TestStatus.COMPLETED)
            
            logger.info(f"A/B Test {test_id} completed with {len(results)} results")
            
        except Exception as e:
            test.status = TestStatus.FAILED
            await self._update_test_status(test_id, TestStatus.FAILED)
            logger.error(f"A/B Test {test_id} failed: {e}")
            raise
        
        return test
    
    async def _run_parallel(self, test: ABTest) -> List[TestResult]:
        """Run tests in parallel"""
        tasks = [
            self._test_model(test.test_type, test.prompt, model_id, test.config)
            for model_id in test.model_ids
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        parsed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                parsed_results.append(TestResult(
                    model_id=test.model_ids[i],
                    success=False,
                    error_message=str(result)
                ))
            else:
                parsed_results.append(result)
        
        return parsed_results
    
    async def _run_sequential(self, test: ABTest) -> List[TestResult]:
        """Run tests sequentially"""
        results = []
        for model_id in test.model_ids:
            try:
                result = await self._test_model(test.test_type, test.prompt, model_id, test.config)
                results.append(result)
            except Exception as e:
                results.append(TestResult(
                    model_id=model_id,
                    success=False,
                    error_message=str(e)
                ))
        return results
    
    async def _test_model(
        self, 
        test_type: TestType, 
        prompt: str, 
        model_id: str,
        config: TestConfig
    ) -> TestResult:
        """Test a single model"""
        start_time = time.time()
        
        try:
            # Call appropriate service based on test type
            if test_type == TestType.IMAGE:
                result = await self._test_image_model(prompt, model_id, config.timeout_seconds)
            elif test_type == TestType.VIDEO:
                result = await self._test_video_model(prompt, model_id, config.timeout_seconds)
            elif test_type == TestType.CHAT:
                result = await self._test_chat_model(prompt, model_id, config.timeout_seconds)
            elif test_type == TestType.AUDIO:
                result = await self._test_audio_model(prompt, model_id, config.timeout_seconds)
            else:
                raise ValueError(f"Unknown test type: {test_type}")
            
            response_time_ms = int((time.time() - start_time) * 1000)
            
            return TestResult(
                model_id=model_id,
                success=True,
                response_time_ms=response_time_ms,
                output_url=result.get("url"),
                cost_credits=result.get("cost", 0),
                raw_response=result
            )
            
        except asyncio.TimeoutError:
            return TestResult(
                model_id=model_id,
                success=False,
                response_time_ms=int((time.time() - start_time) * 1000),
                error_message=f"Timeout after {config.timeout_seconds}s"
            )
        except Exception as e:
            return TestResult(
                model_id=model_id,
                success=False,
                response_time_ms=int((time.time() - start_time) * 1000),
                error_message=str(e)
            )
    
    async def _test_image_model(self, prompt: str, model_id: str, timeout: int) -> Dict[str, Any]:
        """Test image generation model"""
        import httpx
        from core.key_vault import get_provider_key
        
        # Determine provider from model_id
        provider = "fal" if "fal" in model_id or "flux" in model_id or "sdxl" in model_id else "openai"
        
        api_key = await get_provider_key(provider)
        if not api_key:
            api_key = getattr(settings, f"{provider.upper()}_API_KEY", "")
        
        if not api_key:
            raise ValueError(f"No API key for provider: {provider}")
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            if provider == "fal":
                response = await client.post(
                    "https://fal.run/fal-ai/flux/schnell",
                    headers={"Authorization": f"Key {api_key}"},
                    json={"prompt": prompt, "image_size": "square_hd"}
                )
                data = response.json()
                return {
                    "url": data.get("images", [{}])[0].get("url"),
                    "cost": 2  # Estimated credits
                }
            else:
                response = await client.post(
                    "https://api.openai.com/v1/images/generations",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={"model": "dall-e-3", "prompt": prompt, "n": 1, "size": "1024x1024"}
                )
                data = response.json()
                return {
                    "url": data.get("data", [{}])[0].get("url"),
                    "cost": 10  # Estimated credits
                }
    
    async def _test_video_model(self, prompt: str, model_id: str, timeout: int) -> Dict[str, Any]:
        """Test video generation model - placeholder"""
        # Video generation is async and takes longer
        # This is a simplified version
        return {
            "url": None,
            "cost": 30,
            "message": "Video test requires async polling - use dedicated video service"
        }
    
    async def _test_chat_model(self, prompt: str, model_id: str, timeout: int) -> Dict[str, Any]:
        """Test chat model"""
        import httpx
        from core.key_vault import get_provider_key
        
        provider = "openai" if "gpt" in model_id.lower() else "fireworks"
        
        api_key = await get_provider_key(provider)
        if not api_key:
            api_key = getattr(settings, f"{provider.upper()}_API_KEY", "")
        
        if not api_key:
            raise ValueError(f"No API key for provider: {provider}")
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            if provider == "openai":
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={
                        "model": model_id,
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 500
                    }
                )
            else:
                response = await client.post(
                    "https://api.fireworks.ai/inference/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={
                        "model": model_id,
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 500
                    }
                )
            
            data = response.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            
            return {
                "content": content,
                "tokens": data.get("usage", {}).get("total_tokens", 0),
                "cost": 1  # Estimated
            }
    
    async def _test_audio_model(self, prompt: str, model_id: str, timeout: int) -> Dict[str, Any]:
        """Test audio model - placeholder"""
        return {
            "url": None,
            "cost": 5,
            "message": "Audio test placeholder"
        }
    
    async def _update_test_status(self, test_id: str, status: TestStatus):
        """Update test status in database"""
        supabase = get_supabase_client()
        if not supabase:
            return
        
        try:
            supabase.table("ab_tests").update({
                "status": status.value
            }).eq("id", test_id).execute()
        except Exception as e:
            logger.error(f"Failed to update test status: {e}")
    
    async def _save_results(self, test_id: str, results: List[TestResult]):
        """Save test results to database"""
        supabase = get_supabase_client()
        if not supabase:
            return
        
        try:
            for result in results:
                result_data = {
                    "id": str(uuid.uuid4()),
                    "test_id": test_id,
                    "model_id": result.model_id,
                    "success": result.success,
                    "response_time_ms": result.response_time_ms,
                    "first_token_ms": result.first_token_ms,
                    "cost_credits": result.cost_credits,
                    "output_url": result.output_url,
                    "error_message": result.error_message,
                    "raw_response": result.raw_response,
                    "created_at": datetime.utcnow().isoformat()
                }
                
                supabase.table("ab_test_results").insert(result_data).execute()
                
        except Exception as e:
            logger.error(f"Failed to save results: {e}")
    
    async def get_test_results(self, test_id: str) -> List[TestResult]:
        """Get results for a test"""
        supabase = get_supabase_client()
        if not supabase:
            return []
        
        try:
            result = supabase.table("ab_test_results").select("*").eq("test_id", test_id).execute()
            
            return [
                TestResult(
                    model_id=r["model_id"],
                    success=r["success"],
                    response_time_ms=r.get("response_time_ms", 0),
                    first_token_ms=r.get("first_token_ms"),
                    cost_credits=r.get("cost_credits", 0),
                    output_url=r.get("output_url"),
                    error_message=r.get("error_message"),
                    raw_response=r.get("raw_response")
                )
                for r in result.data
            ] if result.data else []
            
        except Exception as e:
            logger.error(f"Failed to get results: {e}")
            return []
    
    async def compare_models(self, test_type: Optional[str] = None, limit: int = 100) -> Dict[str, Any]:
        """Get model comparison statistics"""
        supabase = get_supabase_client()
        if not supabase:
            return {}
        
        try:
            query = supabase.table("ab_test_results").select("*")
            
            result = query.limit(limit).execute()
            
            if not result.data:
                return {"models": {}, "total_tests": 0}
            
            # Aggregate by model
            model_stats = {}
            for r in result.data:
                model_id = r["model_id"]
                if model_id not in model_stats:
                    model_stats[model_id] = {
                        "total_tests": 0,
                        "successful": 0,
                        "failed": 0,
                        "avg_response_time_ms": 0,
                        "total_cost": 0,
                        "response_times": []
                    }
                
                stats = model_stats[model_id]
                stats["total_tests"] += 1
                if r["success"]:
                    stats["successful"] += 1
                    stats["response_times"].append(r.get("response_time_ms", 0))
                else:
                    stats["failed"] += 1
                stats["total_cost"] += r.get("cost_credits", 0) or 0
            
            # Calculate averages
            for model_id, stats in model_stats.items():
                if stats["response_times"]:
                    stats["avg_response_time_ms"] = sum(stats["response_times"]) / len(stats["response_times"])
                stats["success_rate"] = stats["successful"] / stats["total_tests"] * 100 if stats["total_tests"] > 0 else 0
                del stats["response_times"]
            
            return {
                "models": model_stats,
                "total_tests": len(result.data)
            }
            
        except Exception as e:
            logger.error(f"Failed to compare models: {e}")
            return {}
    
    async def delete_test(self, test_id: str) -> bool:
        """Delete a test and its results"""
        supabase = get_supabase_client()
        if not supabase:
            return False
        
        try:
            # Delete results first
            supabase.table("ab_test_results").delete().eq("test_id", test_id).execute()
            # Delete test
            supabase.table("ab_tests").delete().eq("id", test_id).execute()
            
            logger.info(f"Deleted test {test_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete test: {e}")
            return False


# Singleton instance
_ab_testing_service = None

def get_ab_testing_service() -> ABTestingService:
    """Get A/B testing service singleton"""
    global _ab_testing_service
    if _ab_testing_service is None:
        _ab_testing_service = ABTestingService()
    return _ab_testing_service
