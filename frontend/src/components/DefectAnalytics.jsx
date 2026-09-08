import { useEffect, useState } from "react";

function DefectAnalytics() {
    const [defectData, setDefectData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        const loadDefectDistribution = async () => {
            try {
                const response = await fetch(
                    `${import.meta.env.VITE_API_URL}/defect-distribution`
                );

                if (!response.ok) {
                    throw new Error(
                        "Failed to fetch defect distribution"
                    );
                }

                const data = await response.json();

                if (cancelled) {
                    return;
                }

                const distribution =
                    data.defect_distribution || [];

                const totalDefects =
                    distribution.reduce(
                        (total, item) =>
                            total +
                            Number(item.count || 0),
                        0
                    );

                const formattedData =
                    distribution.map((item) => ({
                        defectType:
                            item.defect_type ||
                            "Unknown",

                        count: Number(
                            item.count || 0
                        ),

                        percentage:
                            totalDefects > 0
                                ? (
                                      (Number(
                                          item.count || 0
                                      ) /
                                          totalDefects) *
                                      100
                                  )
                                : 0,
                    }));

                setDefectData(formattedData);
                setError("");
            } catch (err) {
                if (cancelled) {
                    return;
                }

                console.error(
                    "Error fetching defect distribution:",
                    err
                );

                setError(
                    "Unable to load defect analytics."
                );

                setDefectData([]);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadDefectDistribution();

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="panel">
            <h2>Defect Analytics</h2>

            {loading && (
                <p>Loading defect analytics...</p>
            )}

            {!loading && error && (
                <p>{error}</p>
            )}

            {!loading &&
                !error &&
                defectData.length === 0 && (
                    <p>
                        No defect data available.
                    </p>
                )}

            {!loading &&
                !error &&
                defectData.length > 0 && (
                    <div className="defect">
                        {defectData.map((item) => (
                            <div
                                className="defect-item"
                                key={item.defectType}
                            >
                                <p
    style={{
        display: "flex",
        gap: "20px",
        alignItems: "center",
    }}
>
    <span>{item.defectType}</span>

    <span>
        {item.percentage.toFixed(1)}%
    </span>
</p>

                                <div className="bar">
                                    <div
                                        className="bar-fill"
                                        style={{
                                            width: `${Math.min(
                                                item.percentage,
                                                100
                                            )}%`,
                                        }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
        </div>
    );
}

export default DefectAnalytics;