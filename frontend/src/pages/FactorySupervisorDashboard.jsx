import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function FactorySupervisorDashboard() {

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // LOAD REAL FACTORY ANALYTICS
  // ============================================================

  const loadAnalytics = async () => {

    try {

      const response = await fetch(
        "http://127.0.0.1:8000/factory-analytics"
      );

      const data = await response.json();

      if (data.success) {

        setAnalytics(data);

      }

    } catch (error) {

      console.error(
        "Failed to load factory analytics:",
        error
      );

    } finally {

      setLoading(false);

    }

  };


  useEffect(() => {

    loadAnalytics();

  }, []);


  // ============================================================
  // LOADING SCREEN
  // ============================================================

  if (loading) {

    return (
      <div className="dashboard">

        <div className="section">

          <h2>Loading Factory Analytics...</h2>

          <p>
            Fetching real inspection data from PostgreSQL.
          </p>

        </div>

      </div>
    );

  }


  // ============================================================
  // NO DATA
  // ============================================================

  if (!analytics) {

    return (
      <div className="dashboard">

        <div className="section">

          <h2>Factory Analytics Unavailable</h2>

          <p>
            Unable to load factory inspection data.
          </p>

        </div>

      </div>
    );

  }


  const summary = analytics.summary;


  // ============================================================
  // WEEKLY MAX VALUE
  // Used only for visual bar height
  // ============================================================

  const maxWeeklyValue = Math.max(
    ...analytics.weekly.map(
      (item) => item.total
    ),
    1
  );


  // ============================================================
  // MONTHLY MAX VALUE
  // ============================================================

  const maxMonthlyValue = Math.max(
    ...analytics.monthly.map(
      (item) => item.total
    ),
    1
  );


  return (

    <div className="dashboard">

      {/* ======================================================
          HERO
      ====================================================== */}

      <div className="hero">

        <h1>
          Factory Supervisor Dashboard
        </h1>

        <p>
          Production Monitoring & Quality Analytics
        </p>

        <div className="hero-btns">

          <button>
            Production Overview
          </button>

          <button className="outline">
            Factory Reports
          </button>

        </div>

      </div>


      {/* ======================================================
          SUMMARY CARDS
      ====================================================== */}

      <div className="cards">

        {/* Total Inspections */}

        <div className="card">

          <h2>
            {summary.total_inspections}
          </h2>

          <p>
            Total Inspections
          </p>

        </div>


        {/* Passed Products */}

        <div className="card">

          <h2>
            {summary.passed_products}
          </h2>

          <p>
            Passed Products
          </p>

        </div>


        {/* Defective Products */}

        <div className="card">

          <h2>
            {summary.defective_products}
          </h2>

          <p>
            Defective Products
          </p>

        </div>


        {/* Quality Rate */}

        <div className="card">

          <h2>
            {summary.quality_rate}%
          </h2>

          <p>
            Quality Pass Rate
          </p>

        </div>

      </div>


      {/* ======================================================
          WEEKLY ANALYTICS
      ====================================================== */}

      <div className="graph-section">

        <div className="graph-card">

          <h2>
            Weekly Inspection Analytics
          </h2>

          <p>
            Real inspection activity by week
          </p>


          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "25px",
              height: "280px",
              padding: "20px",
              overflowX: "auto",
              borderBottom: "1px solid #ddd"
            }}
          >

            {analytics.weekly.map(
              (week) => {

                const barHeight =
                  (week.total / maxWeeklyValue) *
                  200;

                return (

                  <div
                    key={week.week_start}
                    style={{
                      minWidth: "90px",
                      textAlign: "center"
                    }}
                  >

                    {/* Total */}

                    <div
                      style={{
                        height: `${barHeight}px`,
                        background: "#2563eb",
                        borderRadius:
                          "8px 8px 0 0",
                        display: "flex",
                        alignItems:
                          "flex-start",
                        justifyContent:
                          "center",
                        color: "white",
                        fontWeight: "bold",
                        paddingTop: "8px",
                        boxSizing:
                          "border-box"
                      }}
                    >

                      {week.total}

                    </div>


                    {/* Week Label */}

                    <p
                      style={{
                        fontSize: "13px",
                        marginTop: "8px"
                      }}
                    >

                      {new Date(
                        week.week_start
                      ).toLocaleDateString(
                        "en-IN",
                        {
                          day: "2-digit",
                          month: "short"
                        }
                      )}

                    </p>

                  </div>

                );

              }
            )}

          </div>


          {/* Weekly Details */}

          <div
            style={{
              marginTop: "20px"
            }}
          >

            {analytics.weekly.map(
              (week) => (

                <div
                  key={
                    `details-${week.week_start}`
                  }
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    padding: "8px 0",
                    borderBottom:
                      "1px solid #eee"
                  }}
                >

                  <span>
                    Week of{" "}
                    {new Date(
                      week.week_start
                    ).toLocaleDateString(
                      "en-IN",
                      {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      }
                    )}
                  </span>

                  <span>
                    Total: {week.total}
                    {" | "}
                    Passed: {week.passed}
                    {" | "}
                    Defective: {week.defective}
                  </span>

                </div>

              )
            )}

          </div>

        </div>


        {/* ====================================================
            MONTHLY ANALYTICS
        ==================================================== */}

        <div className="graph-card">

          <h2>
            Monthly Inspection Analytics
          </h2>

          <p>
            Real inspection activity by month
          </p>


          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "25px",
              height: "280px",
              padding: "20px",
              overflowX: "auto",
              borderBottom: "1px solid #ddd"
            }}
          >

            {analytics.monthly.map(
              (month) => {

                const barHeight =
                  (month.total /
                    maxMonthlyValue) *
                  200;

                const monthDate =
                  new Date(
                    `${month.month}-01`
                  );

                return (

                  <div
                    key={month.month}
                    style={{
                      minWidth: "100px",
                      textAlign: "center"
                    }}
                  >

                    <div
                      style={{
                        height: `${barHeight}px`,
                        background: "#16a34a",
                        borderRadius:
                          "8px 8px 0 0",
                        display: "flex",
                        alignItems:
                          "flex-start",
                        justifyContent:
                          "center",
                        color: "white",
                        fontWeight: "bold",
                        paddingTop: "8px",
                        boxSizing:
                          "border-box"
                      }}
                    >

                      {month.total}

                    </div>


                    <p
                      style={{
                        fontSize: "13px",
                        marginTop: "8px"
                      }}
                    >

                      {monthDate.toLocaleDateString(
                        "en-IN",
                        {
                          month: "short",
                          year: "numeric"
                        }
                      )}

                    </p>

                  </div>

                );

              }
            )}

          </div>


          {/* Monthly Details */}

          <div
            style={{
              marginTop: "20px"
            }}
          >

            {analytics.monthly.map(
              (month) => (

                <div
                  key={
                    `details-${month.month}`
                  }
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    padding: "8px 0",
                    borderBottom:
                      "1px solid #eee"
                  }}
                >

                  <span>
                    {new Date(
                      `${month.month}-01`
                    ).toLocaleDateString(
                      "en-IN",
                      {
                        month: "long",
                        year: "numeric"
                      }
                    )}
                  </span>

                  <span>
                    Total: {month.total}
                    {" | "}
                    Passed: {month.passed}
                    {" | "}
                    Defective: {month.defective}
                  </span>

                </div>

              )
            )}

          </div>

        </div>

      </div>


      {/* ======================================================
          QUALITY OVERVIEW
      ====================================================== */}

      <div className="graph-section">

        <div className="graph-card">

          <h2>
            Quality Pass Rate
          </h2>

          <div
            className="progress"
          >

            <div
              className="progress-fill"
              style={{
                width:
                  `${summary.quality_rate}%`
              }}
            ></div>

          </div>

          <h3>
            {summary.quality_rate}%
          </h3>

          <p>
            Based on actual passed inspections.
          </p>

        </div>


        <div className="graph-card">

          <h2>
            Inspection Quality Distribution
          </h2>

          <div
            style={{
              marginTop: "25px",
              lineHeight: "2"
            }}
          >

            <p>
              🟢 Passed:{" "}
              <strong>
                {summary.passed_products}
              </strong>
            </p>

            <p>
              🔴 Defective:{" "}
              <strong>
                {summary.defective_products}
              </strong>
            </p>

            <p>
              📊 Total:{" "}
              <strong>
                {summary.total_inspections}
              </strong>
            </p>

          </div>

        </div>

      </div>


      {/* ======================================================
          FEATURES
      ====================================================== */}

      <div className="section">

        <h2>
          Features
        </h2>

        <div className="feature-grid">

          <Link to="/production-overview">
            <div>
              🏭 Production Overview
            </div>
          </Link>

          <Link to="/inspection-reports">
            <div>
              📄 Inspection Reports
            </div>
          </Link>

          <div>
            📈 Defect Trends
          </div>

          <Link to="/quality-analytics">
            <div>
              📊 Quality Analytics
            </div>
          </Link>

          <Link to="/production-monitoring">
            <div>
              ⚙️ Production Monitoring
            </div>
          </Link>

          <Link to="/factory-performance">
            <div>
              🏆 Factory Performance
            </div>
          </Link>

        </div>

      </div>


    </div>

  );

}

export default FactorySupervisorDashboard;