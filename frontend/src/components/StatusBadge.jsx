/* ============================================================
   STATUS BADGES
   VisionInspect AI

   All displayed values come from real component props.
   No dummy or fabricated project data.
============================================================ */


/* ============================================================
   NORMALIZE VALUE
============================================================ */

function normalize(value) {

  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

}


/* ============================================================
   DISPLAY VALUE
============================================================ */

function displayValue(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return "Not available";

  }

  return String(value);

}


/* ============================================================
   GENERIC STATUS BADGE
============================================================ */

export function StatusBadge({
  value,
}) {

  const normalized =
    normalize(value);


  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return (

      <span className="status-badge status-unavailable">
        Not available
      </span>

    );

  }


  let className =
    "status-neutral";


  if (

    normalized === "pass" ||
    normalized === "passed" ||
    normalized === "normal" ||
    normalized === "active" ||
    normalized === "operational" ||
    normalized === "approved" ||
    normalized === "healthy" ||
    normalized === "success" ||
    normalized === "completed"

  ) {

    className =
      "status-success";

  }

  else if (

    normalized === "fail" ||
    normalized === "failed" ||
    normalized === "defective" ||
    normalized === "inactive" ||
    normalized === "rejected" ||
    normalized === "critical" ||
    normalized === "error"

  ) {

    className =
      "status-danger";

  }

  else if (

    normalized === "warning" ||
    normalized === "pending" ||
    normalized === "review" ||
    normalized === "underreview" ||
    normalized === "attention" ||
    normalized === "attentionrequired"

  ) {

    className =
      "status-warning";

  }


  return (

    <span
      className={
        `status-badge ${className}`
      }
    >

      {displayValue(value)}

    </span>

  );

}


/* ============================================================
   QUALITY DECISION
============================================================ */

export function DecisionBadge({
  value,
}) {

  const normalized =
    normalize(value);


  let className =
    "status-neutral";


  if (
    normalized === "pass" ||
    normalized === "passed"
  ) {

    className =
      "status-success";

  }

  else if (
    normalized === "fail" ||
    normalized === "failed"
  ) {

    className =
      "status-danger";

  }

  else if (
    normalized === "warning" ||
    normalized === "review" ||
    normalized === "pending"
  ) {

    className =
      "status-warning";

  }


  return (

    <span
      className={
        `status-badge ${className}`
      }
    >

      {displayValue(value)}

    </span>

  );

}


/* ============================================================
   SEVERITY
============================================================ */

export function SeverityBadge({
  value,
}) {

  const normalized =
    normalize(value);


  let className;


  switch (normalized) {

    case "low":

      className =
        "status-low";

      break;


    case "medium":

      className =
        "status-medium";

      break;


    case "high":

      className =
        "status-high";

      break;


    case "critical":

      className =
        "status-critical";

      break;


    default:

      className =
        "status-neutral";

  }


  return (

    <span
      className={
        `status-badge ${className}`
      }
    >

      {displayValue(value)}

    </span>

  );

}


/* ============================================================
   RISK
============================================================ */

export function RiskBadge({
  value,
}) {

  const normalized =
    normalize(value);


  let className;


  switch (normalized) {

    case "low":

      className =
        "status-low";

      break;


    case "medium":

      className =
        "status-medium";

      break;


    case "high":

      className =
        "status-high";

      break;


    case "critical":

      className =
        "status-critical";

      break;


    default:

      className =
        "status-neutral";

  }


  return (

    <span
      className={
        `status-badge ${className}`
      }
    >

      {displayValue(value)}

    </span>

  );

}


/* ============================================================
   PREDICTION
============================================================ */

export function PredictionBadge({
  value,
}) {

  const normalized =
    normalize(value);


  let className =
    "status-neutral";


  if (
    normalized === "normal" ||
    normalized === "pass" ||
    normalized === "passed"
  ) {

    className =
      "status-success";

  }

  else if (
    normalized === "defective" ||
    normalized === "defect" ||
    normalized === "failed" ||
    normalized === "fail"
  ) {

    className =
      "status-danger";

  }


  return (

    <span
      className={
        `status-badge ${className}`
      }
    >

      {displayValue(value)}

    </span>

  );

}


/* ============================================================
   CONFIDENCE
============================================================ */

export function ConfidenceBadge({
  value,
}) {

  if (

    value === null ||
    value === undefined ||
    value === "" ||
    Number.isNaN(Number(value))

  ) {

    return (

      <span
        className={
          "confidence-value confidence-unavailable"
        }
      >

        Not available

      </span>

    );

  }


  const confidence =
    Number(value);


  if (
    !Number.isFinite(
      confidence
    )
  ) {

    return (

      <span
        className={
          "confidence-value confidence-unavailable"
        }
      >

        Not available

      </span>

    );

  }


  const safeConfidence =
    Math.min(
      100,
      Math.max(
        0,
        confidence
      )
    );


  let className =
    "confidence-low";


  if (
    safeConfidence >= 80
  ) {

    className =
      "confidence-high";

  }

  else if (
    safeConfidence >= 60
  ) {

    className =
      "confidence-medium";

  }


  return (

    <span
      className={
        `confidence-value ${className}`
      }
    >

      {safeConfidence.toFixed(2)}%

    </span>

  );

}


/* ============================================================
   SEVERITY SCORE
============================================================ */

export function SeverityScore({
  value,
}) {

  if (

    value === null ||
    value === undefined ||
    value === "" ||
    Number.isNaN(Number(value))

  ) {

    return (

      <span
        className={
          "severity-score unavailable"
        }
      >

        Not available

      </span>

    );

  }


  const numericScore =
    Number(value);


  if (
    !Number.isFinite(
      numericScore
    )
  ) {

    return (

      <span
        className={
          "severity-score unavailable"
        }
      >

        Not available

      </span>

    );

  }


  const safeScore =
    Math.min(
      100,
      Math.max(
        0,
        numericScore
      )
    );


  return (

    <div className="severity-score-wrapper">

      <div className="severity-score-header">

        <span>
          Severity Score
        </span>

        <strong>
          {numericScore.toFixed(2)}
        </strong>

      </div>


      <div className="severity-score-track">

        <div
          className="severity-score-fill"

          style={{
            width:
              `${safeScore}%`,
          }}

        />

      </div>

    </div>

  );

}