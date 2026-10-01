import uuid
import pytest
from datetime import datetime
from app.models.user import User, UserRole
from app.models.recommendation import Recommendation
from app.models.recommendation_review import RecommendationReview, ReviewStatus
from app.recommendations.engine import RecommendationEngine
from app.services.explanation_service import DecisionExplanationService
from app.services.source_service import SourceService
from app.services.review_service import ReviewService
from app.schemas.recommendation_xai import ReviewCreate
from fastapi import HTTPException

def test_engine_evaluation_metadata_success():
    """Verify RecommendationEngine returns structured evaluation metadata and alternative on success."""
    result = RecommendationEngine.generate(
        action="apply_fertilizer",
        budget=1500.0,
        equipment=["tractor", "spreader"],
        irrigation="drip",
        farm_size=2.5,
        crop_stage="vegetative",
        soil_report={"nitrogen": 15.0, "phosphorus": 30.0, "potassium": 45.0, "organic_matter": 2.2}
    )

    # Core Phase 1 keys
    assert "recommendation" in result
    assert "explanation" in result
    assert "constraints_considered" in result
    assert "estimated_cost" in result
    assert "confidence_score" in result

    assert result["confidence_score"] == 0.95
    assert result["estimated_cost"] == 500.0

    # Phase 2 structured evaluation
    assert "evaluation" in result
    eval_meta = result["evaluation"]
    assert eval_meta["budget"]["passed"] is True
    assert eval_meta["budget"]["available"] == 1500.0
    assert eval_meta["budget"]["required"] == 500.0

    assert eval_meta["equipment"]["passed"] is True
    assert len(eval_meta["equipment"]["missing"]) == 0

    assert eval_meta["crop_stage"]["passed"] is True
    assert eval_meta["crop_stage"]["stage"] == "Vegetative"

    assert eval_meta["soil"]["nitrogen"] == "Low"
    assert eval_meta["soil"]["status"] == "Nitrogen Deficient"

    # Alternative recommendation
    assert "alternative" in result
    alt = result["alternative"]
    assert alt is not None
    assert "recommendation" in alt
    assert alt["estimated_cost"] == 250.0

def test_engine_evaluation_metadata_bottleneck():
    """Verify RecommendationEngine properly flags missing equipment and low budget."""
    result = RecommendationEngine.generate(
        action="apply_fertilizer",
        budget=200.0,  # Required is 500.0
        equipment=["manual_sprayer"],  # Missing tractor and spreader
        irrigation="rainfed",
        farm_size=0.5,  # Below min 1.0
        crop_stage="maturity",  # Valid are vegetative, flowering
        soil_report=None
    )

    assert result["confidence_score"] == 0.70
    assert result["estimated_cost"] == 250.0

    eval_meta = result["evaluation"]
    assert eval_meta["budget"]["passed"] is False
    assert eval_meta["equipment"]["passed"] is False
    assert "tractor" in [m.lower() for m in eval_meta["equipment"]["missing"]]
    assert eval_meta["crop_stage"]["passed"] is False

    alt = result["alternative"]
    assert alt is not None
    assert alt["estimated_cost"] == 500.0

def test_decision_explanation_service_dynamic_generation():
    """Verify DecisionExplanationService transforms evaluation metadata into structured XAI without DB storage."""
    rec_id = uuid.uuid4()
    farm_id = uuid.uuid4()

    engine_output = RecommendationEngine.generate(
        action="apply_fertilizer",
        budget=200.0,
        equipment=["backpack_sprayer"],
        irrigation="rainfed",
        farm_size=2.0,
        crop_stage="vegetative",
        soil_report={"nitrogen": 12.0, "phosphorus": 15.0, "potassium": 25.0, "organic_matter": 1.1}
    )

    rec = Recommendation(
        id=rec_id,
        farm_id=farm_id,
        recommendation=engine_output["recommendation"],
        explanation=engine_output["explanation"],
        constraints_considered=engine_output["constraints_considered"],
        evaluation_metadata={
            "evaluation": engine_output["evaluation"],
            "alternative": engine_output["alternative"]
        },
        estimated_cost=engine_output["estimated_cost"],
        confidence_score=engine_output["confidence_score"]
    )

    explanation = DecisionExplanationService.generate_explanation(rec)

    assert explanation.recommendation_id == rec_id
    assert explanation.decision_summary.recommendation == rec.recommendation
    assert explanation.decision_summary.key_bottleneck is not None

    # Verify constraints table items
    constraint_names = [c.name for c in explanation.constraints]
    assert "Budget" in constraint_names
    assert "Equipment" in constraint_names
    assert "Crop Stage" in constraint_names
    assert "Water & Irrigation" in constraint_names
    assert "Soil Nutrients" in constraint_names

    budget_c = next(c for c in explanation.constraints if c.name == "Budget")
    assert budget_c.passed is False

    # Verify decision factor chips
    assert "Low Budget" in explanation.decision_factors
    assert "Vegetative Stage" in explanation.decision_factors
    assert any("Deficient" in chip for chip in explanation.decision_factors)

    # Verify confidence breakdown
    assert explanation.confidence_breakdown.overall_percentage == 70
    assert len(explanation.confidence_breakdown.items) >= 5

    # Verify alternative
    assert explanation.alternative is not None
    assert explanation.alternative.alternative_recommendation != ""

def test_explanation_fallback_for_legacy_recommendation():
    """Verify backward compatibility when evaluation_metadata is None (Phase 1 legacy record)."""
    rec_id = uuid.uuid4()
    rec = Recommendation(
        id=rec_id,
        farm_id=uuid.uuid4(),
        recommendation="Apply chemical fertilizer",
        explanation="Primary recommendation",
        constraints_considered={
            "budget": (True, "Budget is sufficient"),
            "equipment": (False, "Tractor unavailable"),
            "crop_stage": (True, "Stage is vegetative"),
            "water": (True, "Water is adequate"),
            "farm_size": (True, "Size meets requirement")
        },
        evaluation_metadata=None,
        estimated_cost=500.0,
        confidence_score=0.85
    )

    explanation = DecisionExplanationService.generate_explanation(rec)
    assert explanation.recommendation_id == rec_id
    assert len(explanation.constraints) >= 5
    assert explanation.confidence_breakdown.overall_percentage == 85

def test_review_service_permissions():
    """Verify Extension Officers can review, but Farmers receive 403 Forbidden."""
    extension_officer = User(
        id=uuid.uuid4(),
        name="Officer Priya Sharma",
        email="officer@extension.gov.in",
        password_hash="hash",
        role=UserRole.EXTENSION_OFFICER
    )

    farmer = User(
        id=uuid.uuid4(),
        name="Ramesh Kumar",
        email="ramesh@farmer.com",
        password_hash="hash",
        role=UserRole.FARMER
    )

    review_in = ReviewCreate(
        status=ReviewStatus.APPROVED,
        comment="Validated against regional nitrogen index; recommended dosage is safe."
    )

    # Mock DB session class for synchronous testing
    class MockDbSession:
        def __init__(self):
            self.added = []
        def add(self, obj):
            self.added.append(obj)
            obj.created_at = datetime.utcnow()
        async def commit(self):
            pass
        async def refresh(self, obj):
            pass

    mock_db = MockDbSession()

    # Extension Officer succeeds
    import asyncio
    review_res = asyncio.run(ReviewService.create_review(
        db=mock_db,
        recommendation_id=uuid.uuid4(),
        reviewer=extension_officer,
        review_in=review_in
    ))
    assert review_res.status == ReviewStatus.APPROVED
    assert review_res.reviewer_name == "Officer Priya Sharma"

    # Farmer fails with 403 Forbidden
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(ReviewService.create_review(
            db=mock_db,
            recommendation_id=uuid.uuid4(),
            reviewer=farmer,
            review_in=review_in
        ))
    assert exc_info.value.status_code == 403

def test_source_service_evidence_matching():
    """Verify SourceService attaches relevant references for crop + action pairs."""
    import asyncio
    rec_id = uuid.uuid4()

    class MockSourceDb:
        def __init__(self):
            self.added = []
        def add(self, obj):
            self.added.append(obj)
        async def flush(self):
            pass

    mock_db = MockSourceDb()

    # Tomato + Fertilizer
    sources = asyncio.run(SourceService.attach_default_sources(
        db=mock_db,
        recommendation_id=rec_id,
        target_action="apply_fertilizer",
        crop_type="tomato"
    ))

    assert len(sources) >= 1
    orgs = [s.organization for s in sources]
    assert any("ICAR" in o or "FAO" in o for o in orgs)
    assert any(s.crop == "tomato" for s in sources)

    # Rice + Harvest
    mock_db_2 = MockSourceDb()
    sources_rice = asyncio.run(SourceService.attach_default_sources(
        db=mock_db_2,
        recommendation_id=rec_id,
        target_action="harvest",
        crop_type="rice"
    ))
    assert len(sources_rice) >= 1
    assert any("Rice" in s.title or "IRRI" in s.organization for s in sources_rice)

def test_api_auth_me_and_recommendation_endpoints():
    """Verify FastAPI routes for /auth/me and recommendations."""
    from fastapi.testclient import TestClient
    from app.main import app
    from app.api.deps import get_current_user
    from app.db.database import get_db

    client = TestClient(app)

    # Create mock extension officer
    officer_user = User(
        id=uuid.uuid4(),
        name="Officer Vikram Patel",
        email="vikram@gov.in",
        password_hash="hash",
        role=UserRole.EXTENSION_OFFICER
    )

    # Create a test recommendation
    rec_id = uuid.uuid4()
    farm_id = uuid.uuid4()
    engine_output = RecommendationEngine.generate(
        action="apply_fertilizer",
        budget=1000.0,
        equipment=["tractor", "spreader"],
        irrigation="drip",
        farm_size=3.0,
        crop_stage="vegetative"
    )

    test_rec = Recommendation(
        id=rec_id,
        farm_id=farm_id,
        recommendation=engine_output["recommendation"],
        explanation=engine_output["explanation"],
        constraints_considered=engine_output["constraints_considered"],
        evaluation_metadata={
            "evaluation": engine_output["evaluation"],
            "alternative": engine_output["alternative"]
        },
        estimated_cost=engine_output["estimated_cost"],
        confidence_score=engine_output["confidence_score"],
        created_at=datetime.now()
    )


    class MockAsyncSession:
        async def execute(self, statement):
            stmt_str = str(statement)
            class MockResult:
                def scalar_one_or_none(self):
                    if "recommendation_reviews" in stmt_str:
                        return None
                    return test_rec
                def scalars(self):
                    class ScalerList:
                        def all(self):
                            return []
                    return ScalerList()
            return MockResult()

        def add(self, obj):
            pass
        async def commit(self):
            pass
        async def refresh(self, obj):
            pass
        async def flush(self):
            pass


    async def override_get_current_user():
        return officer_user

    async def override_get_db():
        yield MockAsyncSession()

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_db] = override_get_db

    try:
        # Test GET /api/v1/auth/me
        me_resp = client.get("/api/v1/auth/me")
        assert me_resp.status_code == 200
        me_data = me_resp.json()
        assert me_data["email"] == "vikram@gov.in"
        assert me_data["role"] == "extension_officer"

        # Test GET /api/v1/recommendations/{id}
        det_resp = client.get(f"/api/v1/recommendations/{rec_id}")
        assert det_resp.status_code == 200
        det_data = det_resp.json()
        assert "recommendation" in det_data
        assert "explanation" in det_data
        assert "sources" in det_data
        assert "decision_summary" in det_data["explanation"]
        assert "confidence_breakdown" in det_data["explanation"]

        # Test GET /api/v1/recommendations/{id}/explanation
        exp_resp = client.get(f"/api/v1/recommendations/{rec_id}/explanation")
        assert exp_resp.status_code == 200
        exp_data = exp_resp.json()
        assert exp_data["recommendation_id"] == str(rec_id)
        assert len(exp_data["constraints"]) > 0

        # Test POST /api/v1/recommendations/{id}/review with Extension Officer
        review_resp = client.post(
            f"/api/v1/recommendations/{rec_id}/review",
            json={"status": "APPROVED", "comment": "Approved after reviewing farm constraints."}
        )
        assert review_resp.status_code == 201
        review_data = review_resp.json()
        assert review_data["status"] == "APPROVED"
        assert review_data["reviewer_name"] == "Officer Vikram Patel"

        # Test POST /api/v1/recommendations/{id}/review with Farmer (expect 403 Forbidden)
        farmer_user = User(
            id=uuid.uuid4(),
            name="Farmer Anbu",
            email="anbu@farm.com",
            password_hash="hash",
            role=UserRole.FARMER
        )
        async def override_farmer_user():
            return farmer_user

        app.dependency_overrides[get_current_user] = override_farmer_user
        forbidden_resp = client.post(
            f"/api/v1/recommendations/{rec_id}/review",
            json={"status": "APPROVED", "comment": "Farmer trying to approve"}
        )
        assert forbidden_resp.status_code == 403

        # Test GET /api/v1/recommendations/{id}/audit
        app.dependency_overrides[get_current_user] = override_get_current_user
        audit_resp = client.get(f"/api/v1/recommendations/{rec_id}/audit")
        assert audit_resp.status_code == 200
        assert isinstance(audit_resp.json(), list)

    finally:
        app.dependency_overrides.clear()

def test_audit_service_and_lifecycle():
    """Verify AuditService records append-only audit events and tracks lifecycle transitions."""
    import asyncio
    from app.services.audit_service import AuditService
    from app.models.recommendation_audit import RecommendationAudit

    rec_id = uuid.uuid4()
    user_id = uuid.uuid4()

    class MockAuditDb:
        def __init__(self):
            self.audits = []
        def add(self, obj):
            self.audits.append(obj)
            obj.id = uuid.uuid4()
            obj.created_at = datetime.utcnow()
        async def flush(self):
            pass
        async def execute(self, stmt):
            class MockExecResult:
                def __init__(self, items):
                    self._items = items
                def scalars(self):
                    class ScalerList:
                        def __init__(self, it):
                            self._it = it
                        def all(self):
                            return self._it
                    return ScalerList(self._items)
            return MockExecResult(self.audits)

    mock_db = MockAuditDb()

    # 1. Recommendation Generated
    asyncio.run(AuditService.record_audit(
        db=mock_db,
        recommendation_id=rec_id,
        action="RECOMMENDATION_GENERATED",
        user=User(id=user_id, name="Test Farmer", role=UserRole.FARMER, email="test@farm.com", password_hash="h"),
        details="Generated via deterministic engine"
    ))

    # 2. Recommendation Viewed
    asyncio.run(AuditService.record_audit(
        db=mock_db,
        recommendation_id=rec_id,
        action="RECOMMENDATION_VIEWED",
        user=User(id=user_id, name="Test Farmer", role=UserRole.FARMER, email="test@farm.com", password_hash="h")
    ))

    # 3. Officer Review Submitted
    officer_id = uuid.uuid4()
    asyncio.run(AuditService.record_audit(
        db=mock_db,
        recommendation_id=rec_id,
        action="OFFICER_REVIEW_SUBMITTED",
        user=User(id=officer_id, name="Officer Priya", role=UserRole.EXTENSION_OFFICER, email="priya@gov.in", password_hash="h"),
        details="Approved recommendation after soil analysis review"
    ))

    assert len(mock_db.audits) == 3
    actions = [a.action for a in mock_db.audits]
    assert actions == [
        "RECOMMENDATION_GENERATED",
        "RECOMMENDATION_VIEWED",
        "OFFICER_REVIEW_SUBMITTED"
    ]

    # Verify chronological retrieval
    trail = asyncio.run(AuditService.get_audits_for_recommendation(mock_db, rec_id))
    assert len(trail) == 3
    assert trail[0].action == "RECOMMENDATION_GENERATED"
    assert trail[2].user_role == "extension_officer"

