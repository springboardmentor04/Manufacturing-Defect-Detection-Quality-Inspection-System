# ==========================================
# VisionInspect AI
# YOLO Class Mapping
# ==========================================

CLASS_MAPPING = {

    # Bottle
    0: "Bottle - Broken Large",
    1: "Bottle - Broken Small",
    2: "Bottle - Contamination",

    # Cable
    3: "Cable - Bent Wire",
    4: "Cable - Cable Swap",
    5: "Cable - Combined",
    6: "Cable - Cut Inner Insulation",
    7: "Cable - Cut Outer Insulation",
    8: "Cable - Missing Cable",
    9: "Cable - Missing Wire",
    10: "Cable - Poke Insulation",

    # Capsule
    11: "Capsule - Crack",
    12: "Capsule - Faulty Imprint",
    13: "Capsule - Poke",
    14: "Capsule - Scratch",
    15: "Capsule - Squeeze",

    # Carpet
    16: "Carpet - Color",
    17: "Carpet - Cut",
    18: "Carpet - Hole",
    19: "Carpet - Metal Contamination",
    20: "Carpet - Thread",

    # Grid
    21: "Grid - Bent",
    22: "Grid - Broken",
    23: "Grid - Glue",
    24: "Grid - Metal Contamination",
    25: "Grid - Thread",

    # Hazelnut
    26: "Hazelnut - Crack",
    27: "Hazelnut - Cut",
    28: "Hazelnut - Hole",
    29: "Hazelnut - Print",

    # Leather
    30: "Leather - Color",
    31: "Leather - Cut",
    32: "Leather - Fold",
    33: "Leather - Glue",
    34: "Leather - Poke",

    # Metal Nut
    35: "Metal Nut - Bent",
    36: "Metal Nut - Color",
    37: "Metal Nut - Flip",
    38: "Metal Nut - Scratch",

    # Pill
    39: "Pill - Color",
    40: "Pill - Combined",
    41: "Pill - Contamination",
    42: "Pill - Crack",
    43: "Pill - Faulty Imprint",
    44: "Pill - Pill Type",
    45: "Pill - Scratch",

    # Screw
    46: "Screw - Manipulated Front",
    47: "Screw - Scratch Head",
    48: "Screw - Scratch Neck",
    49: "Screw - Thread Side",
    50: "Screw - Thread Top",

    # Tile
    51: "Tile - Crack",
    52: "Tile - Glue Strip",
    53: "Tile - Gray Stroke",
    54: "Tile - Oil",
    55: "Tile - Rough",

    # Toothbrush
    56: "Toothbrush - Defective",

    # Transistor
    57: "Transistor - Bent Lead",
    58: "Transistor - Cut Lead",
    59: "Transistor - Damaged Case",
    60: "Transistor - Misplaced",

    # Wood
    61: "Wood - Color",
    62: "Wood - Combined",
    63: "Wood - Hole",
    64: "Wood - Liquid",
    65: "Wood - Scratch",

    # Zipper
    66: "Zipper - Broken Teeth",
    67: "Zipper - Combined",
    68: "Zipper - Fabric Border",
    69: "Zipper - Fabric Interior",
    70: "Zipper - Rough",
    71: "Zipper - Split Teeth",
    72: "Zipper - Squeezed Teeth",
}


# ==========================================
# Defect Categorization
# ==========================================

def categorize_defect(class_id: int):
    """
    Convert YOLO class ID into structured
    product category and defect type.

    Example:

        36
        ↓
        Metal Nut - Color
        ↓
        Product Category = Metal Nut
        Defect Type = Color
    """

    label = CLASS_MAPPING.get(class_id)

    if label is None:
        return {
            "product_category": "Unknown",
            "defect_type": "Unknown",
        }

    # Split only at the first " - "
    parts = label.split(" - ", 1)

    if len(parts) != 2:
        return {
            "product_category": parts[0],
            "defect_type": "Defective",
        }

    return {
        "product_category": parts[0],
        "defect_type": parts[1],
    }