import uuid
from typing import Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.recommendation_source import RecommendationSource
from app.schemas.recommendation_xai import SourceCreate

# Curated reference library mapped by crop and action for evidence attachment (ICAR, FAO, TNAU, SAUs)
REFERENCE_CATALOG = [
    {
        "action": "apply_fertilizer",
        "crop": "tomato",
        "title": "Nutrient Management Practices for Solanaceous Crops",
        "organization": "ICAR - Indian Institute of Horticultural Research",
        "url": "https://www.icar.org.in",
        "description": "Comprehensive guidelines on macro and micro nutrient dosages, fertigation scheduling, and split application protocols."
    },
    {
        "action": "apply_fertilizer",
        "crop": "tomato",
        "title": "Horticultural Fertigation and Foliar Nutrition Protocols",
        "organization": "Tamil Nadu Agricultural University (TNAU)",
        "url": "https://agritech.tnau.ac.in",
        "description": "Recommended fertilizer schedule for hybrid tomatoes under drip irrigation and fertigation systems."
    },
    {
        "action": "apply_fertilizer",
        "crop": "rice",
        "title": "Integrated Nutrient Management Guidelines for Paddy",
        "organization": "FAO - Food and Agriculture Organization",
        "url": "https://www.fao.org/land-water/databases-and-software/crop-information",
        "description": "Standard NPK balanced application protocols emphasizing deep placement and green manuring."
    },
    {
        "action": "apply_fertilizer",
        "crop": "rice",
        "title": "Crop Production Guide: Wetland Rice Nutrient Management",
        "organization": "Tamil Nadu Agricultural University (TNAU)",
        "url": "https://agritech.tnau.ac.in",
        "description": "Site-specific nutrient management (SSNM) and leaf color chart (LCC) based nitrogen top-dressing advisory."
    },
    {
        "action": "apply_fertilizer",
        "crop": "wheat",
        "title": "Wheat Nutrient Stewardship and Fertilizer Best Management",
        "organization": "State Agricultural University Extension Service",
        "url": "https://agricoop.nic.in",
        "description": "Optimum urea split-application timing in relation to crown root initiation and tillering stages."
    },
    {
        "action": "apply_fertilizer",
        "crop": None,  # Generic fertilizer fallback
        "title": "Code of Practice for Sustainable Fertilizer Application",
        "organization": "FAO - Land and Water Division",
        "url": "https://www.fao.org/soils-portal/soil-management/soil-fertility",
        "description": "Standardized best management practices covering the 4R Nutrient Stewardship (Right source, Right rate, Right time, Right place)."
    },
    {
        "action": "harvest",
        "crop": "wheat",
        "title": "Mechanized Harvesting and Grain Loss Minimization Protocol",
        "organization": "ICAR - Central Institute of Agricultural Engineering",
        "url": "https://ciae.icar.gov.in",
        "description": "Optimal grain moisture thresholds (14-18%) for mechanical combine harvesting to reduce shattering losses."
    },
    {
        "action": "harvest",
        "crop": "rice",
        "title": "Post-Harvest Operations & Moisture Control Bulletin",
        "organization": "International Rice Research Institute (IRRI)",
        "url": "https://www.irri.org",
        "description": "Field maturity indicators, cutter bar settings, and immediate threshing practices for optimal milling recovery."
    },
    {
        "action": "harvest",
        "crop": "rice",
        "title": "Farm Machinery & Post-Harvest Engineering Manual",
        "organization": "Tamil Nadu Agricultural University (TNAU)",
        "url": "https://agritech.tnau.ac.in",
        "description": "Guidelines for custom hiring center combine harvesters and post-harvest drying standards."
    },
    {
        "action": "harvest",
        "crop": None,  # Generic harvest fallback
        "title": "Agricultural Machinery Management and Harvesting Guide",
        "organization": "Government Extension Agricultural Advisory Bulletin",
        "url": "https://agricoop.nic.in",
        "description": "Standard procedures for post-maturity harvesting schedules, contractual machinery hiring, and labor deployment."
    },
    {
        "action": "pest_control",
        "crop": None,
        "title": "Integrated Pest Management (IPM) National Guidelines",
        "organization": "ICAR - National Research Centre for Integrated Pest Management",
        "url": "https://ncipm.icar.gov.in",
        "description": "Economic threshold level (ETL) monitoring, biological controls, and safe chemical pesticide usage."
    },
    {
        "action": "irrigation",
        "crop": None,
        "title": "Precision Irrigation and Water Productivity Framework",
        "organization": "FAO - Land and Water Division",
        "url": "https://www.fao.org/land-water",
        "description": "Crop water requirements, evapotranspiration calculation, and micro-irrigation scheduling."
    },
    {
        "action": "machinery_hire",
        "crop": None,
        "title": "Sub-Mission on Agricultural Mechanization (SMAM) Operating Manual",
        "organization": "ICAR - Central Institute of Agricultural Engineering",
        "url": "https://farmech.dac.gov.in",
        "description": "Establishment of Custom Hiring Centres (CHC) and standard machinery operational benchmarks."
    },
    {
        "action": "seed_selection",
        "crop": None,
        "title": "Seed Certification Standards & Quality Assurance Guidelines",
        "organization": "ICAR - Indian Institute of Seed Science & TNAU",
        "url": "https://seednet.gov.in",
        "description": "Genetic purity, minimum germination percentage standards, and bio-priming protocols."
    },
    {
        "action": "soil_amendment",
        "crop": None,
        "title": "Soil Health Management & Reclamation of Degraded Lands",
        "organization": "Tamil Nadu Agricultural University (TNAU) Directorate of Natural Resource Management",
        "url": "https://agritech.tnau.ac.in/agriculture/agri_soil_reclamation.html",
        "description": "Diagnostic thresholds for soil salinity/sodicity, gypsum requirement calculation, and organic matter replenishment."
    },
    {
        "action": "crop_protection",
        "crop": None,
        "title": "Eco-Friendly Plant Health Management & Biological Control Protocols",
        "organization": "National Institute of Plant Health Management (NIPHM)",
        "url": "https://niphm.gov.in",
        "description": "Prophylactic bio-fungicides, trap cropping, and habitat diversification for pest suppression."
    },
    {
        "action": "post_harvest_storage",
        "crop": None,
        "title": "Technical Bulletin on Hermetic Storage & Grain Quality Preservation",
        "organization": "FAO & Central Food Technological Research Institute (CSIR-CFTRI)",
        "url": "https://www.fao.org/post-harvest-compendium",
        "description": "Oxygen-depletion dynamics in hermetic storage for insect mortality and aflatoxin prevention."
    },
    {
        "action": "crop_transportation",
        "crop": None,
        "title": "Agricultural Logistics and Cold Chain Infrastructure Guidelines",
        "organization": "Ministry of Agriculture & Farmers Welfare (MoAFW)",
        "url": "https://agricoop.nic.in",
        "description": "Transit vibration reduction, bulk carriage tarping standards, and freight consolidation frameworks."
    }
]

class SourceService:
    @staticmethod
    async def get_sources_for_recommendation(
        db: AsyncSession, recommendation_id: uuid.UUID
    ) -> Sequence[RecommendationSource]:
        result = await db.execute(
            select(RecommendationSource)
            .where(RecommendationSource.recommendation_id == recommendation_id)
            .order_by(RecommendationSource.created_at.asc())
        )
        return result.scalars().all()

    @staticmethod
    async def create_source(
        db: AsyncSession, recommendation_id: uuid.UUID, source_in: SourceCreate
    ) -> RecommendationSource:
        source = RecommendationSource(
            recommendation_id=recommendation_id,
            title=source_in.title,
            organization=source_in.organization,
            url=source_in.url,
            crop=source_in.crop,
            action=source_in.action,
            description=source_in.description
        )
        db.add(source)
        await db.flush()
        await db.refresh(source)
        return source

    @staticmethod
    async def attach_default_sources(
        db: AsyncSession,
        recommendation_id: uuid.UUID,
        target_action: str,
        crop_type: str | None = None
    ) -> list[RecommendationSource]:
        """
        Attaches relevant scientific references from ICAR, FAO, and Extension services
        based on target action and crop type.
        """
        action_norm = target_action.lower() if target_action else ""
        crop_norm = crop_type.lower() if crop_type else ""

        matched: list[dict] = []
        for ref in REFERENCE_CATALOG:
            ref_act = ref["action"].lower() if ref["action"] else ""
            ref_crop = ref["crop"].lower() if ref["crop"] else None

            if ref_act == action_norm:
                if ref_crop is not None and ref_crop == crop_norm:
                    matched.append(ref)
                elif ref_crop is None and len(matched) < 2:
                    matched.append(ref)

        # Ensure at least one evidence item is present
        if not matched:
            matched.append({
                "action": target_action,
                "crop": crop_type,
                "title": "National Extension Guidelines for Good Agricultural Practices (GAP)",
                "organization": "Ministry of Agriculture & Farmers Welfare",
                "url": "https://agricoop.nic.in",
                "description": "Standard scientific operating guidelines for sustainable crop management."
            })

        created_sources = []
        for item in matched:
            source = RecommendationSource(
                recommendation_id=recommendation_id,
                title=item["title"],
                organization=item["organization"],
                url=item.get("url"),
                crop=item.get("crop") or crop_type,
                action=item.get("action") or target_action,
                description=item["description"]
            )
            db.add(source)
            created_sources.append(source)

        await db.flush()
        return created_sources
