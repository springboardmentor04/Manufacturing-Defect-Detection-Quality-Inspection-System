import "../styles/AuthLayout.css";

function StatCard({ icon, value, title, subtitle }) {
    return (
        <div className="stat-card">

            <div className="stat-icon">
                {icon}
            </div>

            <div className="stat-content">

                <h2>{value}</h2>

                <h4>{title}</h4>

                <p>{subtitle}</p>

            </div>

        </div>
    );
}

export default StatCard;