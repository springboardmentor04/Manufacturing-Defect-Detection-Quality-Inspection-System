from enum import Enum


class RoleName(str, Enum):
    admin = "admin"
    quality_engineer = "quality_engineer"
    product_supervisor = "product_supervisor"
    factory_supervisor = "factory_supervisor"


class InspectionImageStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    processed = "processed"


class InspectionImageSource(str, Enum):
    manual_upload = "manual_upload"
    batch_upload = "batch_upload"
    mvtec_dataset = "mvtec_dataset"
    camera_sim = "camera_sim"
