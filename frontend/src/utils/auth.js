/* ============================================================
   VISIONINSPECT AI
   CENTRAL AUTHENTICATION UTILITIES
============================================================ */


export function getToken() {

  return localStorage.getItem(
    "visioninspect_access_token"
  );
}


/* ============================================================
   GET USER
============================================================ */

export function getUser() {

  try {

    const user =
      localStorage.getItem(
        "visioninspect_user"
      );

    return user
      ? JSON.parse(user)
      : null;

  } catch {

    return null;
  }
}


/* ============================================================
   NORMALIZE ROLE
============================================================ */

export function normalizeRole(role) {

  const value = String(
    role || ""
  )
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (
    value === "quality_engineer" ||
    value === "qualityengineer"
  ) {
    return "quality_engineer";
  }

  if (
    value === "factory_supervisor" ||
    value === "factorysupervisor"
  ) {
    return "factory_supervisor";
  }

  return null;
}


/* ============================================================
   GET ROLE
============================================================ */

export function getRole() {

  const user = getUser();

  return normalizeRole(
    user?.role ||
    localStorage.getItem(
      "visioninspect_role"
    )
  );
}


/* ============================================================
   AUTHENTICATED
============================================================ */

export function isAuthenticated() {

  return Boolean(
    getToken()
  );
}


/* ============================================================
   CLEAR AUTH
============================================================ */

export function clearAuth() {

  localStorage.removeItem(
    "visioninspect_access_token"
  );

  localStorage.removeItem(
    "visioninspect_user"
  );

  localStorage.removeItem(
    "visioninspect_role"
  );

  localStorage.removeItem(
    "inspectionResult"
  );

  sessionStorage.removeItem(
    "inspectionResult"
  );
}


/* ============================================================
   ROLE CHECKS
============================================================ */

export function isQualityEngineer() {

  return (
    getRole() ===
    "quality_engineer"
  );
}


export function isFactorySupervisor() {

  return (
    getRole() ===
    "factory_supervisor"
  );
}