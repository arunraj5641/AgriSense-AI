import pytest
import uuid
from app.recommendations.engine import RecommendationEngine, KNOWLEDGE_BASE
from app.services.weather_service import WeatherService
from app.rules.weather import validate_weather
from app.rules.engine import RuleEngine
from app.services.explanation_service import DecisionExplanationService
from app.models.recommendation import Recommendation, RecommendationStatus

EXPECTED_10_ACTIONS = [
    "apply_fertilizer",
    "irrigation",
    "pest_control",
    "harvest",
    "machinery_hire",
    "seed_selection",
    "soil_amendment",
    "crop_protection",
    "post_harvest_storage",
    "crop_transportation"
]

def test_expanded_knowledge_base_contains_at_least_10_actions():
    """Verify RecommendationEngine contains at least 10 fully defined agricultural actions."""
    assert len(KNOWLEDGE_BASE) >= 10
    for action in EXPECTED_10_ACTIONS:
        assert action in KNOWLEDGE_BASE
        entry = KNOWLEDGE_BASE[action]
        assert "estimated_cost" in entry
        assert "required_equipment" in entry
        assert "water_needs" in entry
        assert "valid_stages" in entry
        assert "success_msg" in entry
        assert "alt_msg" in entry
        assert "scientific_basis" in entry

def test_weather_service_deterministic_fallback():
    """Verify WeatherService returns valid agro-climatic fallback weather data."""
    weather = WeatherService.get_current_weather("Thanjavur, Tamil Nadu")
    assert isinstance(weather, dict)
    assert "temperature" in weather
    assert "humidity" in weather
    assert "rainfall_mm" in weather
    assert "precipitation_probability" in weather
    assert "wind_speed_kmh" in weather
    assert "condition" in weather
    assert "source" in weather
    assert weather["temperature"] > 0
    assert 0 <= weather["humidity"] <= 100

def test_weather_service_scenario_fallbacks():
    """Verify WeatherService deterministically activates scenario profiles based on location keywords."""
    rainy = WeatherService.get_current_weather("Cauvery Delta heavy_rain area")
    assert rainy["condition"] == "Rainy"
    assert rainy["rainfall_mm"] >= 20.0
    assert rainy["precipitation_probability"] >= 80

    dry = WeatherService.get_current_weather("Dharmapuri drought zone")
    assert dry["condition"] == "Dry"
    assert dry["temperature"] >= 35.0
    assert dry["rainfall_mm"] == 0.0

    windy = WeatherService.get_current_weather("Coastal high_wind region")
    assert windy["condition"] == "Windy"
    assert windy["wind_speed_kmh"] >= 30.0

def test_weather_constraints_evaluation():
    """Verify validate_weather evaluates agricultural constraints deterministically."""
    # Fertilizer under heavy rain
    passed, reason = validate_weather("apply_fertilizer", {"rainfall_mm": 15.0, "precipitation_probability": 75, "wind_speed_kmh": 10.0})
    assert passed is False
    assert "leaching" in reason.lower()

    # Irrigation under heavy rain
    passed, reason = validate_weather("irrigation", {"rainfall_mm": 12.0, "precipitation_probability": 70, "wind_speed_kmh": 10.0})
    assert passed is False
    assert "waterlogging" in reason.lower()

    # Pest control under high wind
    passed, reason = validate_weather("pest_control", {"rainfall_mm": 0.0, "precipitation_probability": 10, "wind_speed_kmh": 28.0})
    assert passed is False
    assert "drift" in reason.lower()

    # Harvest under rainy weather
    passed, reason = validate_weather("harvest", {"rainfall_mm": 5.0, "precipitation_probability": 70, "humidity": 90})
    assert passed is False
    assert "fungal" in reason.lower() or "moisture" in reason.lower()

    # Normal weather passes
    passed, reason = validate_weather("apply_fertilizer", {"rainfall_mm": 0.0, "precipitation_probability": 10, "wind_speed_kmh": 12.0, "temperature": 28.0})
    assert passed is True

def test_engine_evaluates_weather_constraint():
    """Verify RecommendationEngine integrates weather into evaluation metadata and influence explanation."""
    rainy_weather = {
        "condition": "Rainy",
        "temperature": 24.0,
        "humidity": 90.0,
        "rainfall_mm": 25.0,
        "precipitation_probability": 85,
        "wind_speed_kmh": 15.0,
        "source": "AgroClimatic-Fallback"
    }
    
    # Attempt irrigation during heavy rain
    result = RecommendationEngine.generate(
        action="irrigation",
        budget=1000.0,
        equipment=["pump"],
        irrigation="drip",
        farm_size=2.0,
        crop_stage="vegetative",
        weather_data=rainy_weather
    )
    
    assert "Advisory Deferred" in result["recommendation"]
    assert "weather" in result["evaluation"]
    assert result["evaluation"]["weather"]["passed"] is False
    assert result["resource_snapshot"]["weather"]["condition"] == "Rainy"
    assert "Rainfall forecast" in result["resource_snapshot"]["influence_explanation"]

def test_weather_integration_three_cases():
    """
    Evaluator Requirement 1:
    CASE A: Normal weather -> normal recommendation.
    CASE B: Heavy rain / unsuitable weather -> recommendation changes or is downgraded.
    CASE C: Weather unavailable -> deterministic fallback works without crashing.
    """
    # CASE A: Normal weather -> normal recommendation
    normal_weather = {
        "condition": "Clear",
        "temperature": 27.0,
        "humidity": 55.0,
        "rainfall_mm": 0.0,
        "precipitation_probability": 5,
        "wind_speed_kmh": 8.0,
        "source": "OpenWeatherMap API"
    }
    res_a = RecommendationEngine.generate(
        action="apply_fertilizer",
        budget=1000.0,
        equipment=["tractor", "spreader"],
        irrigation="drip",
        farm_size=2.0,
        crop_stage="vegetative",
        weather_data=normal_weather
    )
    assert res_a["evaluation"]["weather"]["passed"] is True
    assert res_a["confidence_score"] == 0.95
    assert "fertilizer" in res_a["recommendation"].lower()

    # CASE B: Heavy rain -> recommendation changes / downgraded / deferred
    heavy_rain_weather = {
        "condition": "Heavy Rain",
        "temperature": 22.0,
        "humidity": 95.0,
        "rainfall_mm": 35.0,
        "precipitation_probability": 90,
        "wind_speed_kmh": 18.0,
        "source": "OpenWeatherMap API"
    }
    res_b = RecommendationEngine.generate(
        action="apply_fertilizer",
        budget=1000.0,
        equipment=["tractor", "spreader"],
        irrigation="drip",
        farm_size=2.0,
        crop_stage="vegetative",
        weather_data=heavy_rain_weather
    )
    assert res_b["evaluation"]["weather"]["passed"] is False
    assert "Advisory Deferred" in res_b["recommendation"]
    assert res_b["confidence_score"] == 0.70

    # CASE C: Weather unavailable / None -> deterministic fallback works without crashing
    fallback_w = WeatherService.get_current_weather(None)
    assert fallback_w is not None
    assert fallback_w["temperature"] is not None
    assert fallback_w["is_fallback"] is True

    res_c = RecommendationEngine.generate(
        action="apply_fertilizer",
        budget=1000.0,
        equipment=["tractor", "spreader"],
        irrigation="drip",
        farm_size=2.0,
        crop_stage="vegetative",
        weather_data=None  # Explicitly None to test offline/missing telemetry
    )
    assert res_c is not None
    assert "recommendation" in res_c
    assert res_c["confidence_score"] > 0

def test_failure_modes_and_fallback_logic():
    """
    Evaluator Requirement 3: Verify all 5 agronomic failure modes.
    1. Missing soil data
    2. Extreme weather
    3. Unknown/unsupported crop or action
    4. Zero/insufficient budget
    5. Missing required equipment
    """
    # 1. Missing Soil Data Fallback
    res_no_soil = RecommendationEngine.generate(
        action="apply_fertilizer",
        budget=1000.0,
        equipment=["tractor", "spreader"],
        irrigation="drip",
        farm_size=2.0,
        crop_stage="vegetative",
        soil_report=None
    )
    assert res_no_soil["evaluation"]["soil"]["status"] == "Standard Levels"
    assert res_no_soil["resource_snapshot"]["soil_nutrients"]["status"] == "Standard Levels"

    # 2. Extreme Weather (Torrential rain & Gale wind during spraying)
    extreme_weather = {
        "condition": "Severe Storm",
        "temperature": 40.0,
        "humidity": 98.0,
        "rainfall_mm": 50.0,
        "precipitation_probability": 95,
        "wind_speed_kmh": 38.0,
        "source": "AgroClimatic-Fallback"
    }
    res_extreme_weather = RecommendationEngine.generate(
        action="pest_control",
        budget=1000.0,
        equipment=["sprayer"],
        irrigation="drip",
        farm_size=2.0,
        crop_stage="vegetative",
        weather_data=extreme_weather
    )
    assert res_extreme_weather["evaluation"]["weather"]["passed"] is False
    assert "Advisory Deferred" in res_extreme_weather["recommendation"]
    assert res_extreme_weather["confidence_score"] == 0.70

    # 3. Unknown Crop / Action Failure
    res_unknown_action = RecommendationEngine.generate(
        action="unknown_nonexistent_action",
        budget=1000.0,
        equipment=["tractor"],
        irrigation="drip",
        farm_size=2.0,
        crop_stage="vegetative"
    )
    assert res_unknown_action["recommendation"] == "Unknown action."
    assert res_unknown_action["confidence_score"] == 0.0

    # 4. Zero / Insufficient Budget Failure Mode
    res_zero_budget = RecommendationEngine.generate(
        action="harvest",
        budget=0.0,
        equipment=["harvester"],
        irrigation="borewell",
        farm_size=3.0,
        crop_stage="maturity"
    )
    assert res_zero_budget["evaluation"]["budget"]["passed"] is False
    assert res_zero_budget["alternative"] is not None
    assert "manual" in res_zero_budget["recommendation"].lower() or "labor" in res_zero_budget["recommendation"].lower()

    # 5. Missing Equipment Failure Mode
    res_no_machinery = RecommendationEngine.generate(
        action="apply_fertilizer",
        budget=1000.0,
        equipment=[],
        irrigation="canal",
        farm_size=2.0,
        crop_stage="vegetative"
    )
    assert res_no_machinery["evaluation"]["equipment"]["passed"] is False
    assert len(res_no_machinery["evaluation"]["equipment"]["missing"]) > 0

def test_e2e_recommendation_and_xai_weather_flow():
    """Verify end-to-end flow from engine output to DecisionExplanationService with weather."""
    rec_id = uuid.uuid4()
    farm_id = uuid.uuid4()
    
    weather = WeatherService.get_current_weather("Thanjavur, Tamil Nadu")
    output = RecommendationEngine.generate(
        action="apply_fertilizer",
        budget=1500.0,
        equipment=["tractor", "spreader"],
        irrigation="drip",
        farm_size=3.0,
        crop_stage="vegetative",
        soil_report={"nitrogen": 35.0, "phosphorus": 22.0, "potassium": 45.0, "organic_matter": 2.1},
        crop_type="Paddy",
        weather_data=weather
    )
    
    rec = Recommendation(
        id=rec_id,
        farm_id=farm_id,
        recommendation=output["recommendation"],
        explanation=output["explanation"],
        status=RecommendationStatus.GENERATED,
        constraints_considered=output["constraints_considered"],
        evaluation_metadata={
            "evaluation": output["evaluation"],
            "alternative": output["alternative"],
            "resource_snapshot": output["resource_snapshot"]
        },
        estimated_cost=output["estimated_cost"],
        confidence_score=output["confidence_score"]
    )
    
    xai = DecisionExplanationService.generate_explanation(rec)
    
    assert xai.recommendation_id == rec_id
    assert xai.confidence_breakdown.overall_score >= 0.90
    
    # Weather constraint should appear in explanation
    constraint_names = [c.name for c in xai.constraints]
    assert "Weather" in constraint_names
    weather_c = next(c for c in xai.constraints if c.name == "Weather")
    assert weather_c.passed is True
    
    # Weather should be represented in confidence breakdown
    factor_names = [item.factor for item in xai.confidence_breakdown.items]
    assert "Weather Feasibility" in factor_names
    
    # Resource snapshot includes weather
    assert xai.resource_snapshot is not None
    assert xai.resource_snapshot.weather is not None
