"""
User roles supported by the platform, matching the sidebar/nav
structure defined for VisionInspect AI:
  - quality_engineer   -> Upload images, view inspections, generate reports
  - factory_supervisor -> Production overview, analytics, user management
"""
from enum import Enum


class UserRole(str, Enum):
    QUALITY_ENGINEER = "quality_engineer"
    FACTORY_SUPERVISOR = "factory_supervisor"
