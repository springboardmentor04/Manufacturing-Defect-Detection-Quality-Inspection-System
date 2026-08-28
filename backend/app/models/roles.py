from enum import Enum


class UserRole(str, Enum):
    QUALITY_ENGINEER = "QUALITY_ENGINEER"
    FACTORY_SUPERVISOR = "FACTORY_SUPERVISOR"