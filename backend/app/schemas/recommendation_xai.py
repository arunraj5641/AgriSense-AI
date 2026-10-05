import uuid
from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict
from app.models.recommendation_review import ReviewStatus, OverrideReason
from app.recommendations.schemas import RecommendationResponse

class ConstraintEvaluation(BaseModel):
    name: str
    passed: bool
    details: Any = None
    explanation: str

class DecisionSummary(BaseModel):
    recommendation: str
    reason: str
    key_bottleneck: str | None = None

class ConfidenceItem(BaseModel):
    factor: str
    passed: bool
    impact: str

class ConfidenceBreakdown(BaseModel):
    overall_score: float
    overall_percentage: int
    items: list[ConfidenceItem]
    summary: str

class AlternativeRecommendation(BaseModel):
    primary_recommendation: str
    alternative_recommendation: str
    reason: str
    estimated_cost_difference: float | None = None

class SoilNutrientsSnapshot(BaseModel):
    nitrogen: str
    phosphorus: str
    potassium: str
    status: str

class ResourceSnapshot(BaseModel):
    farm_size: float | str
    budget: float | str
    current_cash: float | str
    machinery: list[str]
    irrigation_method: str
    soil_nutrients: SoilNutrientsSnapshot
    crop: str
    crop_stage: str
    influence_explanation: str
    weather: dict[str, Any] | None = None

class ExplanationResponse(BaseModel):
    recommendation_id: uuid.UUID
    decision_summary: DecisionSummary
    constraints: list[ConstraintEvaluation]
    decision_factors: list[str]
    alternative: AlternativeRecommendation | None = None
    confidence_breakdown: ConfidenceBreakdown
    resource_snapshot: ResourceSnapshot | None = None

class SourceBase(BaseModel):
    title: str
    organization: str
    url: str | None = None
    crop: str | None = None
    action: str | None = None
    description: str

class SourceCreate(SourceBase):
    pass

class SourceResponse(SourceBase):
    id: uuid.UUID
    recommendation_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ReviewCreate(BaseModel):
    status: ReviewStatus
    comment: str
    override_reason: OverrideReason | None = None

class ReviewResponse(BaseModel):
    id: uuid.UUID
    recommendation_id: uuid.UUID
    reviewer_id: uuid.UUID | None = None
    reviewer_name: str | None = None
    reviewer_role: str | None = None
    status: ReviewStatus
    comment: str
    override_reason: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AuditResponse(BaseModel):
    id: uuid.UUID
    recommendation_id: uuid.UUID
    user_id: uuid.UUID | None = None
    user_name: str | None = None
    user_role: str | None = None
    action: str
    details: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class RecommendationDetailResponse(BaseModel):
    recommendation: RecommendationResponse
    explanation: ExplanationResponse
    sources: list[SourceResponse]
    latest_review: ReviewResponse | None = None
    audit_trail: list[AuditResponse] = []

class OfficerQueueItem(BaseModel):
    id: uuid.UUID
    farm_id: uuid.UUID
    farm_name: str
    farmer_name: str
    farmer_email: str
    crops: list[str]
    recommendation: str
    explanation: str
    confidence_score: float
    estimated_cost: float | None
    is_high_impact: bool = False
    created_at: datetime
    status: str
    review_status: str
    latest_review: ReviewResponse | None = None

    model_config = ConfigDict(from_attributes=True)

class OfficerStatsResponse(BaseModel):
    total_recommendations: int
    pending_reviews: int
    approved: int
    needs_revision: int
    average_confidence: float
    average_estimated_cost: float
    recommendations_this_week: int

