"""
Admin A/B Testing Routes
API endpoints for managing model A/B tests
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from types import SimpleNamespace
import logging

from core.security import get_current_admin_user
from core.ab_testing import get_ab_testing_service, ABTest, TestResult

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/ab-tests", tags=["Admin - A/B Testing"])


# ============================================
# Schemas
# ============================================

class TestCreateRequest(BaseModel):
    """Create new A/B test request"""
    name: str = Field(..., min_length=2, max_length=100)
    test_type: str = Field(..., pattern="^(image|video|chat|audio)$")
    prompt: str = Field(..., min_length=5, max_length=2000)
    model_ids: List[str] = Field(..., min_items=2, max_items=10)
    description: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Flux vs SDXL Test",
                "test_type": "image",
                "prompt": "A beautiful sunset over mountains",
                "model_ids": ["fal-flux-pro", "fal-sdxl"],
                "description": "Compare image quality between Flux and SDXL"
            }
        }


class TestResponse(BaseModel):
    """A/B test response"""
    id: str
    name: str
    test_type: str
    prompt: str
    model_ids: List[str]
    description: Optional[str] = None
    status: str
    config: Optional[Dict[str, Any]] = None
    created_by: Optional[str] = None
    created_at: Optional[str] = None
    results: Optional[List[Dict[str, Any]]] = None


class TestListResponse(BaseModel):
    """Test list response"""
    tests: List[TestResponse]
    total: int


class ResultResponse(BaseModel):
    """Single test result"""
    model_id: str
    success: bool
    response_time_ms: int = 0
    first_token_ms: Optional[int] = None
    cost_credits: float = 0
    output_url: Optional[str] = None
    error_message: Optional[str] = None


class ComparisonResponse(BaseModel):
    """Model comparison response"""
    models: Dict[str, Dict[str, Any]]
    total_tests: int


# ============================================
# Helper Functions
# ============================================

def test_to_response(test: ABTest) -> TestResponse:
    """Convert ABTest to response model"""
    return TestResponse(
        id=test.id,
        name=test.name,
        test_type=test.test_type.value,
        prompt=test.prompt,
        model_ids=test.model_ids,
        description=test.description,
        status=test.status.value,
        config=test.to_dict().get("config"),
        created_by=test.created_by,
        created_at=test.created_at.isoformat() if test.created_at else None,
        results=[r.to_dict() for r in test.results] if test.results else None
    )


# ============================================
# Endpoints
# ============================================

@router.get("", response_model=TestListResponse)
async def list_tests(
    request: Request,
    test_type: Optional[str] = Query(None, description="Filter by type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=100),
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """List all A/B tests"""
    service = get_ab_testing_service()
    
    tests = await service.list_tests(test_type=test_type, status=status, limit=limit)
    
    return TestListResponse(
        tests=[test_to_response(t) for t in tests],
        total=len(tests)
    )


@router.get("/{test_id}", response_model=TestResponse)
async def get_test(
    request: Request,
    test_id: str,
    include_results: bool = Query(True, description="Include test results"),
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """Get A/B test details"""
    service = get_ab_testing_service()
    
    test = await service.get_test(test_id)
    
    if not test:
        raise HTTPException(status_code=404, detail=f"Test {test_id} not found")
    
    if include_results:
        test.results = await service.get_test_results(test_id)
    
    return test_to_response(test)


@router.post("", response_model=TestResponse)
async def create_test(
    request: Request,
    test_data: TestCreateRequest,
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """
    Create a new A/B test
    
    Test will be created in 'pending' status.
    Use POST /admin/ab-tests/{id}/run to execute the test.
    """
    service = get_ab_testing_service()
    
    try:
        test = await service.create_test(
            name=test_data.name,
            test_type=test_data.test_type,
            prompt=test_data.prompt,
            model_ids=test_data.model_ids,
            description=test_data.description,
            config=test_data.config,
            created_by=current_user.id
        )
        
        logger.info(f"A/B test created: {test.id} by user {current_user.id}")
        
        return test_to_response(test)
        
    except Exception as e:
        logger.error(f"Failed to create test: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{test_id}/run", response_model=TestResponse)
async def run_test(
    request: Request,
    test_id: str,
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """
    Run an A/B test
    
    Executes the test against all configured models.
    Results will be saved and returned.
    """
    service = get_ab_testing_service()
    
    try:
        test = await service.run_test(test_id)
        
        logger.info(f"A/B test {test_id} executed by user {current_user.id}")
        
        return test_to_response(test)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to run test: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{test_id}/results", response_model=List[ResultResponse])
async def get_test_results(
    request: Request,
    test_id: str,
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """Get results for a specific test"""
    service = get_ab_testing_service()
    
    results = await service.get_test_results(test_id)
    
    return [
        ResultResponse(
            model_id=r.model_id,
            success=r.success,
            response_time_ms=r.response_time_ms,
            first_token_ms=r.first_token_ms,
            cost_credits=r.cost_credits,
            output_url=r.output_url,
            error_message=r.error_message
        )
        for r in results
    ]


@router.delete("/{test_id}")
async def delete_test(
    request: Request,
    test_id: str,
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """Delete an A/B test and its results"""
    service = get_ab_testing_service()
    
    success = await service.delete_test(test_id)
    
    if success:
        logger.info(f"A/B test {test_id} deleted by user {current_user.id}")
        return {"success": True, "message": "Test deleted"}
    
    raise HTTPException(status_code=500, detail="Failed to delete test")


@router.get("/compare/models", response_model=ComparisonResponse)
async def compare_models(
    request: Request,
    test_type: Optional[str] = Query(None, description="Filter by test type"),
    limit: int = Query(100, ge=1, le=500),
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """
    Get model comparison statistics
    
    Aggregates test results to show performance metrics for each model.
    """
    service = get_ab_testing_service()
    
    comparison = await service.compare_models(test_type=test_type, limit=limit)
    
    return ComparisonResponse(
        models=comparison.get("models", {}),
        total_tests=comparison.get("total_tests", 0)
    )


@router.get("/models/available")
async def get_available_models(
    request: Request,
    test_type: Optional[str] = Query(None, description="Filter by type"),
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """Get available models for A/B testing"""
    
    models = {
        "image": [
            {"id": "fal-flux-pro", "name": "Flux Pro", "provider": "fal"},
            {"id": "fal-flux-schnell", "name": "Flux Schnell", "provider": "fal"},
            {"id": "fal-sdxl", "name": "SDXL", "provider": "fal"},
            {"id": "openai-dall-e-3", "name": "DALL-E 3", "provider": "openai"},
        ],
        "video": [
            {"id": "pollo-minimax", "name": "MiniMax", "provider": "pollo"},
            {"id": "fal-kling", "name": "Kling", "provider": "fal"},
            {"id": "fal-runway-gen3", "name": "Runway Gen-3", "provider": "fal"},
        ],
        "chat": [
            {"id": "gpt-4o", "name": "GPT-4o", "provider": "openai"},
            {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "provider": "openai"},
            {"id": "accounts/fireworks/models/llama-v3p1-70b-instruct", "name": "Llama 3.1 70B", "provider": "fireworks"},
        ],
        "audio": [
            {"id": "elevenlabs-multilingual-v2", "name": "ElevenLabs v2", "provider": "elevenlabs"},
        ]
    }
    
    if test_type and test_type in models:
        return {"models": models[test_type], "type": test_type}
    
    return {"models": models, "types": list(models.keys())}
