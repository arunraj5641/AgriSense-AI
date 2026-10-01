import uuid
import pytest
from datetime import datetime, date
from app.models.user import User, UserRole
from app.models.company import Company, ProcurementRequirement, ProcurementStatus
from app.models.farm import Farm
from app.models.crop import Crop
from app.models.soil_report import SoilReport
from app.models.contract import Contract, ContractStatus
from app.services.matching_service import FarmerCompanyMatchingEngine
from app.services.contract_service import ContractService
from app.services.report_service import ReportService
from app.schemas.contract import ContractApplyRequest

def test_deterministic_farmer_company_matching_high_compatibility():
    """Verify deterministic matching produces high compatibility score and matched constraints."""
    company_id = uuid.uuid4()
    company = Company(
        id=company_id,
        company_name="AgriPure Food Processors",
        email="info@agripure.com",
        processing_category="Grains",
        supported_crops=["rice", "wheat"],
        active=True
    )

    procurement = ProcurementRequirement(
        id=uuid.uuid4(),
        company_id=company_id,
        crop="rice",
        required_quantity=100.0,
        minimum_quality_grade="Grade A",
        moisture_percentage=14.0,
        nitrogen_requirement=15.0,
        phosphorus_requirement=20.0,
        potassium_requirement=25.0,
        organic_matter_requirement=1.2,
        minimum_farm_size=2.0,
        preferred_irrigation="drip",
        offered_price=310.0,
        status=ProcurementStatus.OPEN
    )

    farm = Farm(
        id=uuid.uuid4(),
        farmer_id=uuid.uuid4(),
        name="Green Valley Farm",
        farm_size=4.0, # Meets minimum
        irrigation_type="drip" # Matches preferred
    )

    crop = Crop(farm_id=farm.id, crop_type="rice", crop_stage="vegetative")
    soil = SoilReport(farm_id=farm.id, nitrogen=20.0, phosphorus=28.0, potassium=35.0, organic_matter=1.8)

    match = FarmerCompanyMatchingEngine.evaluate_match(
        procurement=procurement,
        company=company,
        farm=farm,
        crop=crop,
        soil=soil
    )

    assert match is not None
    assert match.compatibility_score >= 0.85
    assert match.crop == "rice"
    assert match.offered_price == 310.0
    assert match.estimated_revenue > 0
    assert match.estimated_profit > 0
    assert "Exceptional match" in match.match_explanation
    assert len(match.matched_constraints) >= 4
    assert len(match.failed_constraints) == 0

def test_deterministic_matching_bottleneck_detection():
    """Verify deterministic matching properly flags failed constraints when farm lacks criteria."""
    company_id = uuid.uuid4()
    company = Company(
        id=company_id,
        company_name="Tomato Foods Ltd",
        email="procurement@tomato.com",
        processing_category="Horticulture",
        supported_crops=["tomato"],
        active=True
    )

    procurement = ProcurementRequirement(
        id=uuid.uuid4(),
        company_id=company_id,
        crop="tomato",
        required_quantity=50.0,
        minimum_quality_grade="Export Quality",
        minimum_farm_size=5.0, # High requirement
        preferred_irrigation="drip",
        nitrogen_requirement=25.0, # High requirement
        offered_price=420.0,
        status=ProcurementStatus.OPEN
    )

    farm = Farm(
        id=uuid.uuid4(),
        farmer_id=uuid.uuid4(),
        name="Smallholder Plot",
        farm_size=1.5, # Below 5.0
        irrigation_type="flood" # Mismatch from drip
    )

    crop = Crop(farm_id=farm.id, crop_type="tomato", crop_stage="vegetative")
    soil = SoilReport(farm_id=farm.id, nitrogen=12.0, phosphorus=15.0, potassium=20.0, organic_matter=0.9) # Deficient

    match = FarmerCompanyMatchingEngine.evaluate_match(
        procurement=procurement,
        company=company,
        farm=farm,
        crop=crop,
        soil=soil
    )

    assert match is not None
    assert match.compatibility_score < 0.70
    assert len(match.failed_constraints) >= 2
    failed_names = [f.name for f in match.failed_constraints]
    assert "Minimum Farm Size" in failed_names
    assert "Irrigation Method" in failed_names

def test_incompatible_crop_returns_none():
    """Verify matching engine returns None when crops do not match."""
    company = Company(id=uuid.uuid4(), company_name="Wheat Corp", email="w@w.com", processing_category="Grains", supported_crops=["wheat"], active=True)
    procurement = ProcurementRequirement(id=uuid.uuid4(), company_id=company.id, crop="wheat", required_quantity=100.0, minimum_quality_grade="A", offered_price=200.0)
    farm = Farm(id=uuid.uuid4(), farmer_id=uuid.uuid4(), name="Cotton Field", farm_size=3.0)
    crop = Crop(farm_id=farm.id, crop_type="cotton", crop_stage="vegetative")

    match = FarmerCompanyMatchingEngine.evaluate_match(procurement=procurement, company=company, farm=farm, crop=crop)
    assert match is None

def test_report_service_pdf_and_csv_generation():
    """Verify ReportService generates valid PDF bytes and well-formed CSV strings."""
    headers = ["Farmer", "Farm", "Crop", "Status", "Revenue"]
    data = [
        ["Ramesh Patel", "Sunrise Farm", "Rice", "Approved", "$5,400.00"],
        ["Suresh Kumar", "Delta Farm", "Wheat", "Pending", "$3,200.00"]
    ]
    summary = {"Total Farmers": 2, "Combined Revenue": "$8,600.00"}

    # 1. Test CSV
    csv_out = ReportService.generate_csv(headers, data)
    assert "Farmer,Farm,Crop,Status,Revenue" in csv_out
    assert "Ramesh Patel" in csv_out

    # 2. Test PDF
    pdf_bytes = ReportService.generate_pdf(
        title="Agronomic Test Report",
        subtitle="Verification",
        headers=headers,
        data_rows=data,
        summary_stats=summary
    )
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 500
    assert pdf_bytes.startswith(b"%PDF")
