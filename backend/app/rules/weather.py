from typing import Any

def validate_weather(action: str, weather: dict[str, Any] | None) -> tuple[bool, str]:
    """
    Evaluates weather suitability deterministically for agricultural field actions.
    Returns: (passed: bool, reason: str)
    
    Rules:
    - Irrigation: Heavy rainfall (> 10mm or precipitation prob > 65%) makes irrigation redundant/harmful.
    - Fertilizer: Heavy rain (> 10mm or prob > 65%) causes nutrient leaching; High wind (> 25 km/h) causes drift.
    - Pest Control / Crop Protection: Rain (> 3mm or prob > 45%) causes chemical wash-off; Wind (> 20 km/h) causes drift; Extreme heat (> 38°C) causes phytotoxicity.
    - Harvest: Wet/rainy conditions (rain > 2mm or humidity > 85%) elevate grain moisture, risking spoilage/fungus.
    - Sowing / Seed Selection: Heavy rain (> 25mm) causes waterlogging/seed rot; Freezing temps (< 10°C) retard germination.
    - Machinery Hire / Soil Amendment: Torrential rain (> 20mm) turns field to mud, causing heavy soil compaction and machinery entrapment.
    - Storage / Transportation: Wet weather requires tarpaulin moisture barriers and hermetic sealing.
    """
    if not weather:
        return True, "Weather conditions within standard operating thresholds."

    action_clean = (action or "").lower().strip()
    rain = float(weather.get("rainfall_mm", 0.0))
    prob = int(weather.get("precipitation_probability", 0))
    wind = float(weather.get("wind_speed_kmh", 0.0))
    temp = float(weather.get("temperature", 28.0))
    humidity = float(weather.get("humidity", 60.0))
    condition = str(weather.get("condition", "Clear"))

    # 1. Irrigation
    if action_clean in ["irrigation", "water"]:
        if rain >= 10.0 or prob >= 65:
            return (
                False,
                f"Rainfall forecast ({rain}mm, {prob}% probability) provides sufficient moisture. Suspend artificial irrigation to avoid waterlogging and root rot."
            )
        return (
            True,
            f"Weather ({temp}°C, {humidity}% humidity, {rain}mm rain) supports planned irrigation cycle."
        )

    # 2. Fertilizer
    if action_clean in ["apply_fertilizer", "fertilizer", "soil_amendment"]:
        if rain >= 10.0 or prob >= 65:
            return (
                False,
                f"Anticipated rainfall ({rain}mm, {prob}% prob) will cause nutrient leaching and surface runoff. Defer fertilizer broadcast until soil dries."
            )
        if wind >= 25.0:
            return (
                False,
                f"High wind velocity ({wind} km/h) exceeds safe broadcast/fertigation limit (20 km/h). Defer to prevent uneven distribution."
            )
        return (
            True,
            f"Favorable atmospheric conditions ({temp}°C, wind {wind} km/h, rain {rain}mm) allow uniform fertilizer absorption."
        )

    # 3. Pest Control / Crop Protection
    if action_clean in ["pest_control", "crop_protection", "pesticide"]:
        if rain >= 3.0 or prob >= 50:
            return (
                False,
                f"Incoming precipitation ({rain}mm, {prob}% probability) will wash off active biopesticide ingredients before leaf absorption. Delay spraying."
            )
        if wind >= 20.0:
            return (
                False,
                f"High wind speed ({wind} km/h) will cause severe droplet drift onto non-target crops and nearby water bodies. Delay spray."
            )
        if temp >= 38.0:
            return (
                False,
                f"Elevated ambient temperature ({temp}°C) causes rapid droplet evaporation and risks crop foliage phytotoxicity."
            )
        return (
            True,
            f"Optimal spray window ({temp}°C, wind {wind} km/h, clear skies) minimizes drift and maximizes pesticide efficacy."
        )

    # 4. Harvest
    if action_clean in ["harvest", "harvesting"]:
        if rain >= 2.0 or humidity >= 85 or prob >= 60:
            return (
                False,
                f"Precipitation ({rain}mm) and high ambient humidity ({humidity}%) will elevate grain/crop moisture above 18%, risking fungal decay. Delay harvest."
            )
        return (
            True,
            f"Dry canopy and atmospheric moisture ({humidity}%, rain {rain}mm) provide safe grain moisture threshold for combine/manual harvest."
        )

    # 5. Sowing / Seed Selection
    if action_clean in ["sowing", "seed_selection"]:
        if rain >= 25.0:
            return (
                False,
                f"Excessive rainfall ({rain}mm) risks seed displacement, seed rot, and severe waterlogging in seedbeds."
            )
        if temp < 10.0:
            return (
                False,
                f"Low soil/ambient temperature ({temp}°C) retards seed germination below acceptable agronomic thresholds."
            )
        return (
            True,
            f"Optimal soil temperature ({temp}°C) and moisture ({rain}mm) foster vigorous seed germination."
        )

    # 6. Machinery Hire
    if action_clean in ["machinery_hire", "machinery"]:
        if rain >= 20.0 or prob >= 80:
            return (
                False,
                f"Waterlogged field conditions from rainfall ({rain}mm) risk heavy machinery sinking and severe soil compaction."
            )
        return (
            True,
            f"Field ground is firm and dry enough for heavy tractor/harvester traffic without subsoil compaction."
        )

    # 7. Post Harvest Storage & Transportation
    if action_clean in ["post_harvest_storage", "crop_transportation", "storage", "transportation"]:
        if rain >= 5.0 or humidity >= 80:
            return (
                True,  # Still feasible, but with mandatory precautionary measures
                f"High ambient moisture ({humidity}%, rain {rain}mm) detected: mandatory waterproof tarpaulins and hermetic storage required to prevent mold."
            )
        return (
            True,
            f"Ambient conditions ({temp}°C, {humidity}% humidity) optimal for post-harvest transit and dry storage."
        )

    return True, f"Weather conditions ({condition}, {temp}°C, rain {rain}mm) are favorable for agricultural operations."
