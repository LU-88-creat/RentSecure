
import { useEffect, useState } from "react";
import Login from "./Login";
import Lease from "./Lease";
import CreateLease from "./CreateLease";
import LeaseDetails from "./LeaseDetails";
import EditLease from "./EditLease";

export default function App() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState("leases");
  const [selectedLeaseId, setSelectedLeaseId] = useState(null);
  const [editingLeaseId, setEditingLeaseId] = useState(null);

  const [connection, setConnection] = useState({
    backend: "Checking...",
    database: "Checking...",
  });

  useEffect(() => {
    async function checkConnections() {
      try {
        const healthResponse = await fetch(
          "http://localhost:5000/api/health"
        );

        setConnection((previous) => ({
          ...previous,
          backend: healthResponse.ok ? "Connected" : "Backend error",
        }));

        const dbResponse = await fetch(
          "http://localhost:5000/api/db-test"
        );
        const dbData = await dbResponse.json();

        setConnection((previous) => ({
          ...previous,
          database: dbResponse.ok
            ? `Connected — ${
                dbData.database ||
                dbData.databaseName ||
                "MySQL"
              }`
            : "Database error",
        }));
      } catch {
        setConnection({
          backend: "Not connected",
          database: "Not connected",
        });
      }
    }

    checkConnections();
  }, []);

  function handleLoginSuccess(receivedToken, receivedUser) {
    setToken(receivedToken);
    setUser(receivedUser);
    setCurrentPage("leases");
    setSelectedLeaseId(null);
  }

  function handleLogout() {
    setToken("");
    setUser(null);
    setCurrentPage("leases");
    setSelectedLeaseId(null);
  }

  function handleViewLease(leaseId) {
    setSelectedLeaseId(leaseId);
    setCurrentPage("lease-details");
  }

  function handleBackToLeases() {
    setSelectedLeaseId(null);
    setCurrentPage("leases");
  }

  const handleEditLease = (leaseId) => {
    setEditingLeaseId(leaseId);
    setCurrentPage("edit-lease");
  };

  const handleBackToLeaseDetails = () => {
    setEditingLeaseId(null);
    setCurrentPage("lease-details");
  };

  if (!token || !user) {
    return (
      <>
        <Login onLoginSuccess={handleLoginSuccess} />

        <div className="border-t bg-white px-4 py-3 text-center text-xs text-slate-500">
          Backend: {connection.backend} | MySQL: {connection.database}
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-white px-6 py-4 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            RentSecure
          </h1>
          <p className="text-sm text-slate-500">
            Welcome, {user.full_name || user.email}
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Sign Out
        </button>
      </header>

      <main className="p-2 md:p-4">
        {currentPage === "create-lease" ? (
          <CreateLease
            token={token}
            onBack={handleBackToLeases}
            onCreated={handleBackToLeases}
          />
        ) : currentPage === "edit-lease" && editingLeaseId ? (
          <EditLease
            token={token}
            leaseId={editingLeaseId}
            onBack={handleBackToLeaseDetails}
            onUpdated={handleBackToLeaseDetails}
          />
        ) : currentPage === "lease-details" && selectedLeaseId ? (
          <LeaseDetails
            token={token}
            leaseId={selectedLeaseId}
            onBack={handleBackToLeases}
            onEditLease={handleEditLease}
          />
          
        ) : currentPage === "edit-lease" && editingLeaseId ? (
          <EditLease
            token={token}
            leaseId={editingLeaseId}
            onBack={handleBackToLeaseDetails}
            onUpdated={() => setCurrentPage("lease-details")}
          />

        ) : (
          <Lease
            token={token}
            onCreateLease={() => setCurrentPage("create-lease")}
            onViewLease={handleViewLease}
          />
        )}
      </main>
    </div>
  );
}
