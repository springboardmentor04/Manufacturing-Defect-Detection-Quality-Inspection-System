"""
Inspection status values used in Milestone 1.
Actual AI defect detection / severity scoring is implemented in
Milestone 2 & 3 - for now inspections are created in PENDING state
once an image is uploaded, ready to be picked up by the detection
pipeline later.
"""
from enum import Enum


class InspectionStatus(str, Enum):
    PENDING = "pending"        # uploaded, awaiting AI processing
    PROCESSING = "processing"  # reserved for milestone 2
    PASS = "pass"               # reserved for milestone 2/3
    FAIL = "fail"                # reserved for milestone 2/3