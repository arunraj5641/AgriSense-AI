import uuid
from datetime import datetime
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.user import User, UserRole
from app.models.farmer import Farmer
from app.models.farm import Farm
from app.models.recommendation import Recommendation, RecommendationStatus
from app.models.recommendation_review import RecommendationReview, ReviewStatus, OverrideReason
from app.models.recommendation_audit import RecommendationAudit
from app.recommendations.engine import RecommendationEngine, KNOWLEDGE_BASE

client = TestClient(app)

class MockDbState:
    def __init__(self, rec, farmer_user, farm, farmer, officer_user=None, other_user=None):
        self.rec = rec
        self.farmer_user = farmer_user
        self.farm = farm
        self.farmer = farmer
        self.officer_user = officer_user
        self.other_user = other_user
        self.audits = []
        self.reviews = []

    def make_mock_session(self):
        parent = self

        class MockSession:
            async def execute(self, query):
                query_str = str(query)
                class Result:
                    def __init__(self, val):
                        self.val = val
                    def scalar_one_or_none(self):
                        return self.val
                    def scalars(self):
                        class ScalerList:
                            def __init__(self, items):
                                self.items = items
                            def all(self):
                                return self.items
                        return ScalerList(self.val if isinstance(self.val, list) else ([self.val] if self.val else []))

                if "FROM recommendations" in query_str:
                    return Result(parent.rec)
                if "FROM farmers" in query_str:
                    return Result(parent.farmer)
                if "FROM farms" in query_str:
                    return Result(parent.farm)
                if "FROM recommendation_reviews" in query_str:
                    return Result(parent.reviews[0] if parent.reviews else None)
                if "FROM recommendation_audits" in query_str:
                    return Result(parent.audits)
                return Result(None)

            def add(self, obj):
                if isinstance(obj, RecommendationAudit):
                    parent.audits.append(obj)
                elif isinstance(obj, RecommendationReview):
                    parent.reviews.append(obj)

            async def flush(self):
                pass

            async def commit(self):
                pass

            async def refresh(self, obj):
                pass

        return MockSession()


@pytest.fixture
def test_setup():
    farmer_id = uuid.uuid4()
    farmer_user_id = uuid.uuid4()
    farm_id = uuid.uuid4()
    officer_user_id = uuid.uuid4()
    other_user_id = uuid.uuid4()

    farmer_user = User(
        id=farmer_user_id,
        name="Anbu Selvan",
        email="anbu@farm.com",
        password_hash="hash",
        role=UserRole.FARMER
    )

    officer_user = User(
        id=officer_user_id,
        name="Officer Priya",
        email="priya@gov.in",
        password_hash="hash",
        role=UserRole.EXTENSION_OFFICER
    )

    other_user = User(
        id=other_user_id,
        name="Unauthorized User",
        email="other@corp.com",
        password_hash="hash",
        role=UserRole.FOOD_PROCESSING_UNIT
    )

    farmer = Farmer(
        id=farmer_id,
        user_id=farmer_user_id
    )

    farm = Farm(
        id=farm_id,
        farmer_id=farmer_id,
        name="Thanjavur Delta Farm",
        location="Thanjavur, Tamil Nadu",
        farm_size=3.0,
        irrigation_type="drip"
    )

    return {
        "farmer_user": farmer_user,
        "officer_user": officer_user,
        "other_user": other_user,
        "farmer": farmer,
        "farm": farm,
    }


def test_1_high_impact_starts_generated_attempt_implementation_blocked(test_setup):
    """
    TEST 1:
    High-impact recommendation starts GENERATED.
    Attempt implementation.
    Expected:
    - HTTP 4xx (400)
    - status remains GENERATED
    - recommendation is NOT implemented.
    """
    rec_id = uuid.uuid4()
    rec = Recommendation(
        id=rec_id,
        farm_id=test_setup["farm"].id,
        recommendation="Apply targeted chlorantraniliprole for stem borer control.",
        explanation="High-impact chemical pest control requires precision application.",
        status=RecommendationStatus.GENERATED,
        is_high_impact=True,
        constraints_considered={"budget": True, "equipment": True},
        confidence_score=0.95,
        created_at=datetime.now()
    )

    state = MockDbState(
        rec=rec,
        farmer_user=test_setup["farmer_user"],
        farm=test_setup["farm"],
        farmer=test_setup["farmer"]
    )

    async def override_user():
        return test_setup["farmer_user"]

    async def override_db():
        yield state.make_mock_session()

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_db] = override_db

    try:
        response = client.post(f"/api/v1/recommendations/{rec_id}/implement")
        assert response.status_code == 400
        assert "Extension Officer approval" in response.json()["detail"]
        assert rec.status == RecommendationStatus.GENERATED
        assert rec.implemented_at is None
        # Verify blocked audit entry was created
        assert any(a.action == "Implementation Blocked" for a in state.audits)
    finally:
        app.dependency_overrides.clear()


def test_2_high_impact_approved_attempt_implementation_success(test_setup):
    """
    TEST 2:
    High-impact recommendation is approved by authorized Extension Officer.
    Attempt implementation by authorized actor.
    Expected:
    - success (HTTP 200)
    - status becomes IMPLEMENTED
    - audit entry exists.
    """
    rec_id = uuid.uuid4()
    rec = Recommendation(
        id=rec_id,
        farm_id=test_setup["farm"].id,
        recommendation="Deploy combine harvester for mechanized grain harvest.",
        explanation="Mechanized harvest requires combine equipment.",
        status=RecommendationStatus.APPROVED,
        is_high_impact=True,
        constraints_considered={"budget": True},
        confidence_score=0.95,
        created_at=datetime.now()
    )

    state = MockDbState(
        rec=rec,
        farmer_user=test_setup["farmer_user"],
        farm=test_setup["farm"],
        farmer=test_setup["farmer"]
    )

    async def override_user():
        return test_setup["farmer_user"]

    async def override_db():
        yield state.make_mock_session()

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_db] = override_db

    try:
        response = client.post(f"/api/v1/recommendations/{rec_id}/implement")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "IMPLEMENTED"
        assert rec.status == RecommendationStatus.IMPLEMENTED
        assert rec.implemented_at is not None
        assert rec.implemented_by_id == test_setup["farmer_user"].id
        assert any(a.action == "Recommendation Implemented" for a in state.audits)
    finally:
        app.dependency_overrides.clear()


def test_3_high_impact_needs_revision_attempt_implementation_blocked(test_setup):
    """
    TEST 3:
    High-impact recommendation is NEEDS_REVISION.
    Attempt implementation.
    Expected:
    - blocked (HTTP 400)
    - status does not become IMPLEMENTED.
    """
    rec_id = uuid.uuid4()
    rec = Recommendation(
        id=rec_id,
        farm_id=test_setup["farm"].id,
        recommendation="Soil amendment using heavy gypsum application.",
        explanation="Needs adjustment based on recent soil test.",
        status=RecommendationStatus.NEEDS_REVISION,
        is_high_impact=True,
        constraints_considered={},
        confidence_score=0.70,
        created_at=datetime.now()
    )

    state = MockDbState(
        rec=rec,
        farmer_user=test_setup["farmer_user"],
        farm=test_setup["farm"],
        farmer=test_setup["farmer"]
    )

    async def override_user():
        return test_setup["farmer_user"]

    async def override_db():
        yield state.make_mock_session()

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_db] = override_db

    try:
        response = client.post(f"/api/v1/recommendations/{rec_id}/implement")
        assert response.status_code == 400
        assert "revision" in response.json()["detail"].lower()
        assert rec.status == RecommendationStatus.NEEDS_REVISION
        assert rec.implemented_at is None
        assert any(a.action == "Implementation Blocked" for a in state.audits)
    finally:
        app.dependency_overrides.clear()


def test_4_unauthorized_user_attempts_to_approve(test_setup):
    """
    TEST 4:
    Unauthorized user (Farmer or Company user) attempts to approve.
    Expected:
    - blocked (HTTP 403 Forbidden).
    """
    rec_id = uuid.uuid4()
    rec = Recommendation(
        id=rec_id,
        farm_id=test_setup["farm"].id,
        recommendation="Pest control advisory.",
        explanation="Pest control advisory explanation.",
        status=RecommendationStatus.GENERATED,
        is_high_impact=True,
        constraints_considered={},
        confidence_score=0.90,
        created_at=datetime.now()
    )

    state = MockDbState(
        rec=rec,
        farmer_user=test_setup["farmer_user"],
        farm=test_setup["farm"],
        farmer=test_setup["farmer"]
    )

    async def override_farmer():
        return test_setup["farmer_user"]

    async def override_db():
        yield state.make_mock_session()

    app.dependency_overrides[get_current_user] = override_farmer
    app.dependency_overrides[get_db] = override_db

    try:
        # Farmer tries to submit review
        resp = client.post(
            f"/api/v1/recommendations/{rec_id}/review",
            json={"status": "APPROVED", "comment": "I approve my own recommendation."}
        )
        assert resp.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_5_unauthorized_user_attempts_to_implement(test_setup):
    """
    TEST 5:
    Unauthorized user (e.g. Officer or Company) attempts to implement recommendation.
    Expected:
    - blocked (HTTP 403 Forbidden).
    """
    rec_id = uuid.uuid4()
    rec = Recommendation(
        id=rec_id,
        farm_id=test_setup["farm"].id,
        recommendation="Approved action.",
        explanation="Approved action explanation.",
        status=RecommendationStatus.APPROVED,
        is_high_impact=True,
        constraints_considered={},
        confidence_score=0.90,
        created_at=datetime.now()
    )

    state = MockDbState(
        rec=rec,
        farmer_user=test_setup["farmer_user"],
        farm=test_setup["farm"],
        farmer=test_setup["farmer"]
    )

    async def override_officer():
        return test_setup["officer_user"]

    async def override_db():
        yield state.make_mock_session()

    app.dependency_overrides[get_current_user] = override_officer
    app.dependency_overrides[get_db] = override_db

    try:
        resp = client.post(f"/api/v1/recommendations/{rec_id}/implement")
        assert resp.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_6_already_implemented_cannot_be_implemented_again(test_setup):
    """
    TEST 6:
    Already IMPLEMENTED recommendation cannot be incorrectly implemented again.
    Expected:
    - HTTP 400 Bad Request.
    """
    rec_id = uuid.uuid4()
    rec = Recommendation(
        id=rec_id,
        farm_id=test_setup["farm"].id,
        recommendation="Finished harvest.",
        explanation="Completed operation.",
        status=RecommendationStatus.IMPLEMENTED,
        is_high_impact=True,
        constraints_considered={},
        confidence_score=0.95,
        implemented_at=datetime.now(),
        implemented_by_id=test_setup["farmer_user"].id,
        created_at=datetime.now()
    )

    state = MockDbState(
        rec=rec,
        farmer_user=test_setup["farmer_user"],
        farm=test_setup["farm"],
        farmer=test_setup["farmer"]
    )

    async def override_user():
        return test_setup["farmer_user"]

    async def override_db():
        yield state.make_mock_session()

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_db] = override_db

    try:
        resp = client.post(f"/api/v1/recommendations/{rec_id}/implement")
        assert resp.status_code == 400
        assert "already been implemented" in resp.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()


def test_7_review_with_structured_override_reason_persists(test_setup):
    """
    TEST 7:
    Review with structured override/revision reason persists correctly.
    """
    rec_id = uuid.uuid4()
    rec = Recommendation(
        id=rec_id,
        farm_id=test_setup["farm"].id,
        recommendation="Pest control spray.",
        explanation="Advisory generated.",
        status=RecommendationStatus.GENERATED,
        is_high_impact=True,
        constraints_considered={},
        confidence_score=0.90,
        created_at=datetime.now()
    )

    state = MockDbState(
        rec=rec,
        farmer_user=test_setup["farmer_user"],
        farm=test_setup["farm"],
        farmer=test_setup["farmer"]
    )

    async def override_officer():
        return test_setup["officer_user"]

    async def override_db():
        yield state.make_mock_session()

    app.dependency_overrides[get_current_user] = override_officer
    app.dependency_overrides[get_db] = override_db

    try:
        resp = client.post(
            f"/api/v1/recommendations/{rec_id}/review",
            json={
                "status": "NEEDS_REVISION",
                "override_reason": "AGRONOMIC_JUDGMENT",
                "comment": "Reduced chemical dosage recommended based on pest threshold counts."
            }
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "NEEDS_REVISION"
        assert data["override_reason"] == "AGRONOMIC_JUDGMENT"
        assert rec.status == RecommendationStatus.NEEDS_REVISION
        # Verify audit trail records the override reason
        assert any("AGRONOMIC_JUDGMENT" in (a.details or "") for a in state.audits)
    finally:
        app.dependency_overrides.clear()


def test_8_high_impact_classification_authoritative():
    """
    TEST 8:
    Verify authoritative high-impact classification for all agricultural actions in knowledge base.
    """
    high_impact_actions = ["pest_control", "crop_protection", "harvest", "machinery_hire", "soil_amendment"]
    standard_impact_actions = ["apply_fertilizer", "irrigation", "seed_selection", "post_harvest_storage", "crop_transportation"]

    for action in high_impact_actions:
        assert action in KNOWLEDGE_BASE
        assert KNOWLEDGE_BASE[action]["is_high_impact"] is True, f"{action} should be classified as high-impact"

    for action in standard_impact_actions:
        assert action in KNOWLEDGE_BASE
        assert KNOWLEDGE_BASE[action]["is_high_impact"] is False, f"{action} should be standard impact"

    # Verify RecommendationEngine.generate returns is_high_impact deterministically
    res_pest = RecommendationEngine.generate(
        action="pest_control",
        budget=1000.0,
        equipment=["sprayer"],
        irrigation="drip",
        farm_size=2.0,
        crop_stage="vegetative"
    )
    assert res_pest["is_high_impact"] is True

    res_fert = RecommendationEngine.generate(
        action="apply_fertilizer",
        budget=1000.0,
        equipment=["tractor", "spreader"],
        irrigation="drip",
        farm_size=2.0,
        crop_stage="vegetative"
    )
    assert res_fert["is_high_impact"] is False


def test_9_officer_review_approved_empty_comment(test_setup):
    """
    TEST 9:
    Officer submits APPROVED review with empty comment (or omitted comment).
    Expected:
    - Succeeds with HTTP 201 Created.
    - Status transitions to APPROVED.
    - Empty string comment accepted.
    """
    rec_id = uuid.uuid4()
    rec = Recommendation(
        id=rec_id,
        farm_id=test_setup["farm"].id,
        recommendation="Apply targeted neem oil formulation for aphid control.",
        explanation="Biological control recommended.",
        status=RecommendationStatus.UNDER_REVIEW,
        is_high_impact=True,
        confidence_score=0.92,
        created_at=datetime.now()
    )
    state = MockDbState(
        rec=rec,
        farmer_user=test_setup["farmer_user"],
        farm=test_setup["farm"],
        farmer=test_setup["farmer"]
    )

    async def override_officer():
        return test_setup["officer_user"]

    async def override_db():
        yield state.make_mock_session()

    app.dependency_overrides[get_current_user] = override_officer
    app.dependency_overrides[get_db] = override_db

    try:
        # TEST 1: APPROVED + empty comment string
        resp = client.post(
            f"/api/v1/recommendations/{rec_id}/review",
            json={"status": "APPROVED", "comment": ""}
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "APPROVED"
        assert data["comment"] == ""
        assert rec.status == RecommendationStatus.APPROVED

        # TEST 2: APPROVED + omitted comment (defaults to empty string)
        rec.status = RecommendationStatus.UNDER_REVIEW
        resp2 = client.post(
            f"/api/v1/recommendations/{rec_id}/review",
            json={"status": "APPROVED"}
        )
        assert resp2.status_code == 201
        data2 = resp2.json()
        assert data2["status"] == "APPROVED"
        assert data2["comment"] == ""
        assert rec.status == RecommendationStatus.APPROVED

        # TEST 3: APPROVED + non-empty comment
        rec.status = RecommendationStatus.UNDER_REVIEW
        resp3 = client.post(
            f"/api/v1/recommendations/{rec_id}/review",
            json={"status": "APPROVED", "comment": "Approved after field inspection."}
        )
        assert resp3.status_code == 201
        data3 = resp3.json()
        assert data3["status"] == "APPROVED"
        assert data3["comment"] == "Approved after field inspection."
        assert rec.status == RecommendationStatus.APPROVED
    finally:
        app.dependency_overrides.clear()


def test_11_officer_queue_filtering_and_lifecycle_sync(test_setup):
    """
    TEST 11:
    Verify officer review queue status synchronization and pending queue filtering:
    - GENERATED / UNDER_REVIEW items have review_status PENDING.
    - APPROVED items have review_status APPROVED (not PENDING).
    - IMPLEMENTED items have review_status IMPLEMENTED (not PENDING).
    - GET /officer/queue?review_status=PENDING excludes APPROVED and IMPLEMENTED items.
    """
    rec_pending = Recommendation(
        id=uuid.uuid4(),
        farm_id=test_setup["farm"].id,
        recommendation="Apply biological fungicide.",
        explanation="Crop protection advisory.",
        status=RecommendationStatus.UNDER_REVIEW,
        is_high_impact=True,
        confidence_score=0.91,
        created_at=datetime.now()
    )
    rec_approved = Recommendation(
        id=uuid.uuid4(),
        farm_id=test_setup["farm"].id,
        recommendation="Apply neem oil formulation.",
        explanation="Approved advisory.",
        status=RecommendationStatus.APPROVED,
        is_high_impact=True,
        confidence_score=0.94,
        created_at=datetime.now()
    )
    rec_implemented = Recommendation(
        id=uuid.uuid4(),
        farm_id=test_setup["farm"].id,
        recommendation="Drip irrigation cycle.",
        explanation="Standard advisory.",
        status=RecommendationStatus.IMPLEMENTED,
        is_high_impact=False,
        confidence_score=0.96,
        created_at=datetime.now()
    )

    rec_pending.farm = test_setup["farm"]
    rec_pending.reviews = []
    rec_approved.farm = test_setup["farm"]
    rec_approved.reviews = []
    rec_implemented.farm = test_setup["farm"]
    rec_implemented.reviews = []

    state = MockDbState(
        rec=[rec_pending, rec_approved, rec_implemented],
        farmer_user=test_setup["farmer_user"],
        farm=test_setup["farm"],
        farmer=test_setup["farmer"]
    )

    async def override_officer():
        return test_setup["officer_user"]

    async def override_db():
        yield state.make_mock_session()

    app.dependency_overrides[get_current_user] = override_officer
    app.dependency_overrides[get_db] = override_db

    try:
        # 1. Fetch entire queue without filter
        resp_all = client.get("/api/v1/recommendations/officer/queue")
        assert resp_all.status_code == 200
        items_all = resp_all.json()
        status_map = {item["id"]: (item["status"], item["review_status"]) for item in items_all}

        assert status_map[str(rec_pending.id)] == ("UNDER_REVIEW", "PENDING")
        assert status_map[str(rec_approved.id)] == ("APPROVED", "APPROVED")
        assert status_map[str(rec_implemented.id)] == ("IMPLEMENTED", "IMPLEMENTED")

        # 2. Fetch pending queue only: review_status=PENDING
        resp_pending = client.get("/api/v1/recommendations/officer/queue?review_status=PENDING")
        assert resp_pending.status_code == 200
        items_pending = resp_pending.json()
        pending_ids = [item["id"] for item in items_pending]

        assert str(rec_pending.id) in pending_ids
        assert str(rec_approved.id) not in pending_ids
        assert str(rec_implemented.id) not in pending_ids
    finally:
        app.dependency_overrides.clear()



