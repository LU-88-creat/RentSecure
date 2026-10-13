
import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [results, setResults] = useState({
    backend: "Checking...",
    database: "Checking...",
  });

  useEffect(() => {
    async function checkConnections() {
      try {
        const response = await fetch("/api/health");

        if (!response.ok) {
          throw new Error("Backend request failed");
        }

        const data = await response.json();

        setResults((previous) => ({
          ...previous,
          backend: data.message || "Backend connected",
        }));
      } catch {
        setResults((previous) => ({
          ...previous,
          backend: "Connection failed",
        }));
      }

      try {
        const response = await fetch("/api/db-test");

        if (!response.ok) {
          throw new Error("Database test failed");
        }

        const data = await response.json();

        setResults((previous) => ({
          ...previous,
          database: data.success
            ? `${data.database} — MySQL ${data.mysqlVersion}`
            : "Database connection failed",
        }));
      } catch {
        setResults((previous) => ({
          ...previous,
          database: "Connection failed",
        }));
      }
    }

    checkConnections();
  }, []);

  return (
    <main className="connection-page">
      <h1>RentSecure</h1>
      <p>Secure Rental Management System</p>

      <section className="connection-card">
        <h2>System Connection Test</h2>

        <p>
          <strong>React frontend:</strong> Running
        </p>

        <p>
          <strong>Express backend:</strong> {results.backend}
        </p>

        <p>
          <strong>MySQL database:</strong> {results.database}
        </p>
      </section>
    </main>
  );
}

export default App;
