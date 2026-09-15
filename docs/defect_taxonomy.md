# VisionInspect AI - Defect Taxonomy

This document outlines the high-level defect categorization applied to YOLO predictions. It serves as the reference taxonomy for Milestone 3 analytics and severity scoring.

| YOLO Class | Defect Category | Description |
| :--- | :--- | :--- |
| `bent` | Structural Defect | A structural deformation where the main body is bent out of shape. |
| `bent_lead` | Component Defect | A bent component lead, typically on electronic parts like transistors. |
| `bent_wire` | Component Defect | A wire that is bent out of its intended alignment. |
| `broken` | Structural Defect | A general breakage or fracturing of the object. |
| `broken_large` | Structural Defect | A large-scale breakage or missing piece. |
| `broken_small` | Structural Defect | A minor breakage or small missing piece. |
| `broken_teeth` | Structural Defect | Broken or missing teeth on a gear or zipper-like structure. |
| `cable_swap` | Assembly Defect | Cables that have been swapped or connected incorrectly during assembly. |
| `color` | Color / Appearance Defect | A discoloration or incorrect color applied to the object. |
| `combined` | Other / Unclassified | Multiple different defects appearing together or an unclear combination. |
| `contamination` | Contamination | Unwanted foreign material present on the object. |
| `crack` | Structural Defect | A fracture or fissure on the surface or through the body. |
| `cut` | Structural Defect | A sharp incision or severing of the material. |
| `cut_inner_insulation`| Component Defect | A cut penetrating the inner insulation of a cable. |
| `cut_lead` | Component Defect | A cut or severed component lead. |
| `cut_outer_insulation`| Component Defect | A cut on the outer insulation sheath of a cable. |
| `damaged_case` | Structural Defect | Damage to the outer casing or housing. |
| `defective` | Other / Unclassified | A general defect that does not fit a specific category. |
| `fabric_border` | Surface Defect | An irregularity or fraying along the border of fabric material. |
| `fabric_interior` | Surface Defect | An irregularity or defect within the interior surface of a fabric. |
| `faulty_imprint` | Color / Appearance Defect | An incorrect, blurred, or missing imprint/logo. |
| `flip` | Assembly Defect | A component that has been assembled upside down or flipped. |
| `fold` | Surface Defect | An unintended fold or crease in a material. |
| `glue` | Contamination | Excess glue or unwanted adhesive on the object. |
| `glue_strip` | Contamination | A strip or line of unwanted adhesive. |
| `gray_stroke` | Surface Defect | A gray mark or stroke on the surface. |
| `hole` | Structural Defect | An unintended puncture or hole in the object. |
| `liquid` | Contamination | Unwanted liquid residue or droplets on the object. |
| `manipulated_front` | Surface Defect | Unintended manipulation or tampering on the front surface. |
| `metal_contamination` | Contamination | Unwanted metallic particles or fragments on the object. |
| `misplaced` | Assembly Defect | A component that is assembled in the wrong position. |
| `missing_cable` | Component Defect | A required cable is missing from the assembly. |
| `missing_wire` | Component Defect | A required wire is missing from the assembly. |
| `oil` | Contamination | Oil stains or residue on the object. |
| `pill_type` | Color / Appearance Defect | An incorrect type of pill present (e.g., wrong color). |
| `poke` | Surface Defect | A small indentation or poke mark on the surface. |
| `poke_insulation` | Surface Defect | A poke or indentation specifically on an insulating layer. |
| `print` | Color / Appearance Defect | A defect related to the printing on the object (e.g., misaligned, faded). |
| `rough` | Surface Defect | An unintended rough texture or area on a smooth surface. |
| `scratch` | Surface Defect | A shallow linear mark or abrasion on the surface. |
| `scratch_head` | Surface Defect | A scratch specifically on the head of the object (e.g., a screw). |
| `scratch_neck` | Surface Defect | A scratch specifically on the neck of the object. |
| `split_teeth` | Structural Defect | Teeth that are split or fractured. |
| `squeeze` | Structural Defect | Deformation caused by crushing or squeezing. |
| `squeezed_teeth` | Structural Defect | Teeth deformed by crushing or squeezing. |
| `thread` | Surface Defect | An unwanted loose thread on a fabric or similar material. |
| `thread_side` | Surface Defect | An unwanted loose thread on the side of the object. |
| `thread_top` | Surface Defect | An unwanted loose thread on the top of the object. |
