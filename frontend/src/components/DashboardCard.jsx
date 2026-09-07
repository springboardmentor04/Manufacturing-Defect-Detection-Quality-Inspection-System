import "../styles/Card.css";

function DashboardCard({ title, value }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <p>{value}</p>
    </div>
  );
}

export default DashboardCard;