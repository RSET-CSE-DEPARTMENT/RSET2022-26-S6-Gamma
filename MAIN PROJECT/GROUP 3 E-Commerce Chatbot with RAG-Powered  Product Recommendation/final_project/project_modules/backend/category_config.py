"""
category_config.py
==================

Industrial-grade category registry.

Design goals
------------
• Single source of truth for all categories
• Automatic graph schema generation
• Automatic keyword routing
• Scales to hundreds of categories
• Safe for recommender + graph + validation

Any new category requires editing ONLY CATEGORY_REGISTRY.
"""

from __future__ import annotations

from typing import Dict, List, Tuple, FrozenSet

RelationTuple = Tuple[str, str, str, str]

# ============================================================================
# OS / BRAND CONFIG
# ============================================================================

ANDROID_BRANDS = {
    "samsung",
    "oneplus",
    "xiaomi",
    "redmi",
    "realme",
    "iqoo",
    "vivo",
    "oppo",
    "motorola",
    "nothing",
    "google",
    "nokia",
}

OS_DETECTION_MAP = {
    "android": "android",
    "iphone": "ios",
    "ios": "ios",
}

# ============================================================================
# BRAND / SPEC CONSTRAINT CONFIG
# ============================================================================

KNOWN_BRANDS = {
    "samsung","apple","iphone","oneplus","xiaomi","redmi","realme",
    "iqoo","vivo","oppo","motorola","nothing","google","nokia",

    "lenovo","hp","dell","asus","acer","msi","apple","macbook",

    "sony","jbl","boat","bose","sennheiser","anker",

    "lg","panasonic","daikin","voltas","whirlpool","godrej","haier",

    "canon","nikon","fujifilm","gopro",

    "philips","havells","bajaj","prestige",
}

# Categories where "power" constraints appear
POWER_CATEGORIES = {
    "mixer_grinders",
    "air_fryers",
    "electric_kettles",
    "electric_irons",
    "induction_cooktops",
    "ceiling_fans",
    "speakers",
}

# Categories where "capacity" constraints appear
CAPACITY_CATEGORIES = {
    "air_fryers",
    "electric_kettles",
    "refrigerators",
    "washing_machines",
}

# ============================================================================
# MASTER CATEGORY REGISTRY
# ============================================================================

CATEGORY_REGISTRY: Dict[str, Dict] = {

# ============================================================
# COMPUTING
# ============================================================

"laptops": {
    "keywords": ["laptop","notebook","ultrabook","gaming laptop","macbook"],
    "relations": [
        ("ram","RAM","HAS_RAM","size_gb"),
        ("storage","Storage","HAS_STORAGE","size_gb"),
        ("gpu","GPU","HAS_GPU","type"),
        ("cpu","CPU","HAS_CPU","model"),
        ("battery_life","BatteryLife","HAS_BATTERY","hours"),
        ("display_size","DisplaySize","HAS_DISPLAY","inches"),
        ("weight","Weight","HAS_WEIGHT","kg"),
        ("os","OperatingSystem","HAS_OS","name"),
        ("refresh_rate","RefreshRate","HAS_REFRESH_RATE","hz"),
        ("touchscreen","TouchFeature","HAS_TOUCH","supported"),
    ],
},

"smartphones": {
    "keywords": ["phone","smartphone","mobile","iphone","android phone","5g phone"],
    "relations": [
        ("ram","RAM","HAS_RAM","size_gb"),
        ("storage","Storage","HAS_STORAGE","size_gb"),
        ("battery_capacity","Battery","HAS_BATTERY","mah"),
        ("display_size","DisplaySize","HAS_DISPLAY","inches"),
        ("refresh_rate","RefreshRate","HAS_REFRESH_RATE","hz"),
        ("processor","Processor","HAS_PROCESSOR","model"),
        ("os","OperatingSystem","HAS_OS","name"),
        ("connectivity","Connectivity","HAS_CONNECTIVITY","type"),
        ("camera_mp","Camera","HAS_CAMERA","megapixels"),
        ("fast_charging","ChargingFeature","HAS_FAST_CHARGE","supported"),
    ],
},

# ============================================================
# AUDIO / ENTERTAINMENT
# ============================================================

"speakers": {
    "keywords": ["speaker","bluetooth speaker","soundbar"],
    "relations": [
        ("power","Power","HAS_POWER","watt"),
        ("battery_life","BatteryLife","HAS_BATTERY","hours"),
        ("connectivity","Connectivity","HAS_CONNECTIVITY","type"),
        ("waterproof","Feature","HAS_WATERPROOF","ipx_rating"),
    ],
},

"televisions": {
    "keywords": ["tv","television","smart tv","4k tv","oled tv","qled tv"],
    "relations": [
        ("resolution","Resolution","HAS_RESOLUTION","type"),
        ("display_size","DisplaySize","HAS_DISPLAY","inches"),
        ("panel_type","Panel","HAS_PANEL","type"),
        ("refresh_rate","RefreshRate","HAS_REFRESH_RATE","hz"),
        ("smart_tv","SmartFeature","HAS_SMART_FEATURE","supported"),
        ("os","OperatingSystem","HAS_OS","name"),
    ],
},

# ============================================================
# IMAGING
# ============================================================

"cameras": {
    "keywords": ["camera","dslr","mirrorless","digital camera"],
    "relations": [
        ("megapixels","Sensor","HAS_SENSOR","mp"),
        ("lens_mount","Lens","HAS_LENS_MOUNT","type"),
        ("video_res","Video","HAS_VIDEO_RES","type"),
        ("sensor_size","Sensor","HAS_SENSOR_SIZE","type"),
        ("fps","FPS","HAS_FPS","value"),
        ("wifi","Connectivity","HAS_WIFI","supported"),
    ],
},

"security_cameras": {
    "keywords": ["cctv","security camera","surveillance camera"],
    "relations": [
        ("resolution","Resolution","HAS_RESOLUTION","type"),
        ("night_vision","Feature","HAS_NIGHT_VISION","supported"),
        ("wifi","Connectivity","HAS_WIFI","supported"),
        ("storage","Storage","HAS_STORAGE","type"),
    ],
},

# ============================================================
# HOME APPLIANCES
# ============================================================

"air_conditioners": {
    "keywords": ["ac","air conditioner","split ac","window ac"],
    "relations": [
        ("tonnage","Tonnage","HAS_TONNAGE","value"),
        ("star_rating","EnergyRating","HAS_ENERGY_RATING","stars"),
        ("inverter","Technology","HAS_INVERTER","supported"),
    ],
},

"air_coolers": {
    "keywords": ["air cooler","desert cooler"],
    "relations": [
        ("tank_capacity","TankCapacity","HAS_TANK","liters"),
        ("power","Power","HAS_POWER","watt"),
    ],
},

"refrigerators": {
    "keywords": ["fridge","refrigerator"],
    "relations": [
        ("capacity","Capacity","HAS_CAPACITY","liters"),
        ("star_rating","EnergyRating","HAS_ENERGY_RATING","stars"),
        ("compressor","Compressor","HAS_COMPRESSOR","type"),
    ],
},

"washing_machines": {
    "keywords": ["washing machine","washer"],
    "relations": [
        ("capacity","Capacity","HAS_CAPACITY","kg"),
        ("spin_speed","Speed","HAS_SPIN_SPEED","rpm"),
        ("motor","Motor","HAS_MOTOR","type"),
    ],
},

"mixer_grinders": {
    "keywords": ["mixer grinder","mixie","grinder"],
    "relations": [
        ("power","Power","HAS_POWER","watt"),
        ("jar_count","Jar","HAS_JARS","count"),
    ],
},

"electric_kettles": {
    "keywords": ["electric kettle","kettle"],
    "relations": [
        ("capacity","Capacity","HAS_CAPACITY","liters"),
        ("power","Power","HAS_POWER","watt"),
    ],
},

"electric_irons": {
    "keywords": ["iron","steam iron"],
    "relations": [
        ("power","Power","HAS_POWER","watt"),
        ("steam","Feature","HAS_STEAM","supported"),
    ],
},

"ceiling_fans": {
    "keywords": ["ceiling fan","fan"],
    "relations": [
        ("power","Power","HAS_POWER","watt"),
        ("sweep","Sweep","HAS_SWEEP","mm"),
    ],
},

"induction_cooktops": {
    "keywords": ["induction cooktop","induction"],
    "relations": [
        ("power","Power","HAS_POWER","watt"),
        ("preset_modes","PresetModes","HAS_PRESET_MODES","count"),
    ],
},

"air_fryers": {
    "keywords": ["air fryer","airfryer"],
    "relations": [
        ("power","Power","HAS_POWER","watt"),
        ("capacity","Capacity","HAS_CAPACITY","liters"),
    ],
},

# ============================================================
# BEAUTY
# ============================================================

"makeup": {"keywords":["makeup","lipstick","foundation"],"relations":[]},
"skincare":{"keywords":["moisturizer","face cream","skincare"],"relations":[]},
"hair":{"keywords":["shampoo","hair oil","conditioner"],"relations":[]},
"fragrance":{"keywords":["perfume","deodorant","fragrance"],"relations":[]},
"luxury_beauty":{"keywords":["luxury makeup","premium cosmetics"],"relations":[]},
"bath_body":{"keywords":["body wash","bath soap"],"relations":[]},

# ============================================================
# BOOKS
# ============================================================

"fantasy_books":{"keywords":["fantasy novel","fantasy book"],"relations":[]},
"romance_books":{"keywords":["romance novel","love story"],"relations":[]},
"mystery_books":{"keywords":["mystery novel","detective book"],"relations":[]},
"scifi_books":{"keywords":["science fiction","sci fi"],"relations":[]},
"thriller_books":{"keywords":["thriller novel","suspense"],"relations":[]},

# ============================================================
# BAGS
# ============================================================

"backpacks":{"keywords":["backpack","travel backpack"],"relations":[]},
"school_bags":{"keywords":["school bag"],"relations":[]},
"wallets":{"keywords":["wallet","card holder"],"relations":[]},
"rucksacks":{"keywords":["rucksack","hiking backpack"],"relations":[]},

}


# ============================================================================
# AUTO-GENERATED STRUCTURES
# ============================================================================

CATEGORY_GRAPH_SCHEMA = {
    cat: {"relations": data["relations"]}
    for cat, data in CATEGORY_REGISTRY.items()
}

CATEGORY_KEYWORDS = {
    cat: data["keywords"]
    for cat, data in CATEGORY_REGISTRY.items()
}

ALL_CATEGORIES: FrozenSet[str] = frozenset(CATEGORY_REGISTRY.keys())