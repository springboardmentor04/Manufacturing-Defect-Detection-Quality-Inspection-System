import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
} from "chart.js";

import { Pie } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  Tooltip,
);

function PassFailChart({
  passed = 0,
  failed = 0,
}) {
  const safePassed =
    Number.isFinite(Number(passed))
      ? Math.max(0, Number(passed))
      : 0;

  const safeFailed =
    Number.isFinite(Number(failed))
      ? Math.max(0, Number(failed))
      : 0;

  const total =
    safePassed + safeFailed;

  const passedPercentage =
    total > 0
      ? ((safePassed / total) * 100).toFixed(1)
      : "0.0";

  const failedPercentage =
    total > 0
      ? ((safeFailed / total) * 100).toFixed(1)
      : "0.0";

  const data = {
    labels: ["Passed", "Failed"],
    datasets: [
      {
        data: [safePassed, safeFailed],
        backgroundColor: [
          "#22c55e",
          "#ef4444",
        ],
        hoverBackgroundColor: [
          "#34d399",
          "#f87171",
        ],
        borderColor: "#080b0d",
        borderWidth: 4,
        hoverBorderWidth: 4,
        hoverOffset: 8,
        spacing: 2,
        borderRadius: 5,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "72%",
    animation: {
      duration: 700,
      easing: "easeOutQuart",
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: "#080b0d",
        borderColor: "#26343c",
        borderWidth: 1,
        titleColor: "#edf3f6",
        bodyColor: "#aab6bd",
        padding: 12,
        displayColors: true,
        callbacks: {
          label: (context) => {
            const value =
              Number(context.raw) || 0;

            const percentage =
              total > 0
                ? ((value / total) * 100).toFixed(1)
                : "0.0";

            return ` ${value} inspections (${percentage}%)`;
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: "nearest",
    },
    elements: {
      arc: {
        borderWidth: 4,
      },
    },
  };

  if (total === 0) {
    return (
      <div className="pass-fail-card empty">
        <div className="pass-fail-empty">
          <div className="pass-fail-empty-icon">
            <span />
          </div>

          <div className="pass-fail-empty-content">
            <strong>
              No inspection data available
            </strong>

            <span>
              Complete an AI inspection to generate
              pass and fail analytics.
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pass-fail-card">
      <div className="pass-fail-main">
        <div className="pass-fail-chart">
          <Pie
            data={data}
            options={options}
          />

          <div className="pass-fail-chart-center">
            <span>PASS RATE</span>

            <strong>
              {passedPercentage}%
            </strong>

            <small>
              {safePassed} of {total} passed
            </small>
          </div>
        </div>

        <div className="pass-fail-summary">
          <div className="summary-item passed">
            <span className="summary-dot" />

            <div className="summary-content">
              <span className="summary-label">
                Passed inspections
              </span>

              <strong>
                {safePassed}
              </strong>

              <small>
                {passedPercentage}% of total
              </small>
            </div>
          </div>

          <div className="summary-item failed">
            <span className="summary-dot" />

            <div className="summary-content">
              <span className="summary-label">
                Failed inspections
              </span>

              <strong>
                {safeFailed}
              </strong>

              <small>
                {failedPercentage}% of total
              </small>
            </div>
          </div>
        </div>
      </div>

      <div className="pass-fail-quality">
        <div className="quality-indicator-icon">
          <span />
        </div>

        <div className="quality-indicator-content">
          <span>INSPECTION DATA</span>

          <strong>
            {total} recorded inspections
          </strong>
        </div>

        <div className="quality-indicator-rate">
          {passedPercentage}%
        </div>
      </div>
    </div>
  );
}

export default PassFailChart;
