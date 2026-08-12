function Home() {
  return (
    <div
      style={{
        minHeight: "90vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background:
          "linear-gradient(to right, #0f172a, #1e3a8a, #0f172a)",
      }}
    >
      <div
        style={{
          width: "90%",
          maxWidth: "1100px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "40px",
        }}
      >
        <div style={{ flex: 1 }}>
          <h1
            style={{
              fontSize: "55px",
              lineHeight: "1.2",
              marginBottom: "20px",
            }}
          >
            AI Manufacturing
            <br />
            Defect Detection &
            <br />
            Quality Inspection
          </h1>

          <p
            style={{
              fontSize: "22px",
              color: "#cbd5e1",
              marginBottom: "30px",
            }}
          >
            Detect manufacturing defects instantly using Artificial Intelligence.
          </p>

          <button
            style={{
              padding: "15px 35px",
              background: "#2563eb",
              border: "none",
              borderRadius: "10px",
              color: "white",
              fontSize: "18px",
              cursor: "pointer",
            }}
          >
            Get Started
          </button>
        </div>

        <div style={{ flex: 1, textAlign: "center" }}>
          <img
            src="https://cdn-icons-png.flaticon.com/512/8637/8637091.png"
            alt="AI"
            style={{
              width: "400px",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default Home;