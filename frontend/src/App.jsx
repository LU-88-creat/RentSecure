
import { useEffect, useState } from "react";
import Lease from "./Lease";

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
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-3 md:px-6">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-xl font-bold text-orange-600">
            RentSecure
          </h1>
          <p className="text-sm text-gray-500">
            Secure Rental Management System
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <details className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
          <summary className="cursor-pointer font-semibold text-gray-700">
            System Connection Status
          </summary>

          <div className="mt-3 space-y-2 text-sm">
            <p>
              <strong>React frontend:</strong> Running
            </p>
            <p>
              <strong>Express backend:</strong> {results.backend}
            </p>
            <p>
              <strong>MySQL database:</strong> {results.database}
            </p>
          </div>
        </details>

        <Lease />
      </section>
    </main>
  );
}

export default App;
