import logging
from pathlib import Path
from config.config import config

def setup_logger():
    # Ensure logs directory exists
    config.LOGS_PATH.mkdir(parents=True, exist_ok=True)
    
    logger = logging.getLogger("VisionInspectAI")
    logger.setLevel(logging.DEBUG)
    
    # Formatter
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    # File Handler
    fh = logging.FileHandler(config.LOGS_PATH / "ai_model.log")
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(formatter)
    
    # Console Handler
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    ch.setFormatter(formatter)
    
    logger.addHandler(fh)
    logger.addHandler(ch)
    
    return logger

logger = setup_logger()

# Convenience methods for specific events
def log_startup():
    logger.info("AI Environment Startup: Initializing VisionInspect AI Model module.")
    logger.info(f"Running in {config.ENVIRONMENT} environment.")

def log_dataset_validation(is_valid: bool, errors: list):
    if is_valid:
        logger.info("Dataset validation passed successfully.")
    else:
        logger.warning("Dataset validation failed.")
        for err in errors:
            logger.error(f"Validation Error: {err}")

def log_inference_event(image_id: str, status: str):
    logger.info(f"Inference event for {image_id}: {status}")
