
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  FileText,
  CalendarDays,
  UserRound,
  Building2,
  Wallet,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Pencil,
} from "lucide-react";

const API_URL = "http://localhost:5000/api/leases";

export default function LeaseDetails({
  token,
  leaseId,
  onBack,
  onEditLease,
}) {
  const [lease, setLease] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const loadLease = useCallback(async () => {
    if (!token || !leaseId) return;

    try {
      const response = await fetch(`${API_URL}/${leaseId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to load lease details."
        );
      }

      const record =
        result.lease ||
        result.data?.lease ||
        result.data ||
        result;

      if (
        !record ||
        typeof record !== "object" ||
        Array.isArray(record) ||
        record.id == null
      ) {
        throw new Error(
          "The server response did not contain a valid lease record."
        );
      }

      setError("");
      setLease(record);
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the backend. Check that your server is running."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }, [token, leaseId]);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled && token && leaseId) loadLease();
    });

    return () => {
      cancelled = true;
    };
  }, [leaseId, loadLease, token]);

  function handleRetry() {
    setLoading(true);
    setError("");
    loadLease();
  }

  function formatDate(value) {
    if (!value) return "Not specified";

    const dateText = String(value).slice(0, 10);
    const date = new Date(`${dateText}T00:00:00`);

    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toLocaleDateString();
  }

  function formatMoney(value) {
    const amount = Number(value);

    if (!Number.isFinite(amount)) return "KES —";

    return `KES ${amount.toLocaleString("en-KE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function detailCard(label, value, Icon) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2 text-orange-600">
          <Icon size={19} />
          <p className="text-sm font-medium text-gray-500">{label}</p>
        </div>
        <p className="break-words font-semibold text-gray-800">
          {value || "Not available"}
        </p>
      </div>
    );
  }

  function statusStyle(status) {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800",
      active: "bg-green-100 text-green-800",
      ended: "bg-gray-100 text-gray-700",
      terminated: "bg-red-100 text-red-800",
    };

    return styles[status] || "bg-gray-100 text-gray-700";
  }

  const statusActions = {
    pending: [
      {
        status: "active",
        label: "Activate Lease",
        className: "bg-green-600 hover:bg-green-700",
      },
      {
        status: "terminated",
        label: "Terminate Lease",
        className: "bg-red-600 hover:bg-red-700",
      },
    ],
    active: [
      {
        status: "ended",
        label: "End Lease",
        className: "bg-gray-700 hover:bg-gray-800",
      },
      {
        status: "terminated",
        label: "Terminate Lease",
        className: "bg-red-600 hover:bg-red-700",
      },
    ],
    ended: [],
    terminated: [],
  };

  async function handleStatusChange(newStatus) {
    if (!lease || updating) return;

    const confirmationMessages = {
      active: "Are you sure you want to activate this lease?",
      ended: "Are you sure you want to mark this lease as ended?",
      terminated: "Are you sure you want to terminate this lease?",
    };

    if (!window.confirm(confirmationMessages[newStatus])) return;

    setUpdating(true);
    setError("");
    setActionMessage("");

    try {
      // Preserve the existing lease information while updating status.
      const response = await fetch(`${API_URL}/${lease.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          unit_id: lease.unit_id,
          tenant_id: lease.tenant_id,
          start_date: lease.start_date
            ? String(lease.start_date).slice(0, 10)
            : null,
          end_date: lease.end_date
            ? String(lease.end_date).slice(0, 10)
            : null,
          monthly_rent: lease.monthly_rent,
          deposit_amount: lease.deposit_amount ?? 0,
          status: newStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to update the lease status."
        );
      }

      await loadLease();
      setActionMessage(
        `Lease status updated to ${newStatus}.`
      );
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the backend. Check that your server is running."
          : err.message
      );
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-orange-600"
      >
        <ArrowLeft size={18} />
        Back to Lease Management
      </button>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-orange-100 p-3 text-orange-600">
            <FileText size={26} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Lease Details
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Review and manage the rental agreement.
            </p>
          </div>
        </div>

        {lease && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onEditLease?.(lease.id)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              <Pencil size={16} />
              Edit Lease
            </button>
            <span
              className={`rounded-full px-3 py-1.5 text-sm font-semibold capitalize ${statusStyle(
                lease.status
              )}`}
            >
              {lease.status || "Unknown"}
            </span>
          </div>
        )}
      </div>

      {loading && (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-500">
          <RefreshCw
            size={25}
            className="mx-auto mb-3 animate-spin text-orange-600"
          />
          Loading lease details...
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <div className="flex items-start gap-2">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>

          <button
            type="button"
            onClick={handleRetry}
            className="mt-2 font-semibold underline"
          >
            Try again
          </button>
        </div>
      )}

      {actionMessage && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          <CheckCircle size={18} />
          {actionMessage}
        </div>
      )}

      {!loading && !error && lease && (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-7">
            <p className="text-sm text-gray-500">Lease reference</p>
            <h2 className="mt-1 text-2xl font-bold text-gray-900">
              Lease #{lease.id}
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Created: {formatDate(lease.created_at)}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {detailCard("Property", lease.property_name, Building2)}
            {detailCard("Unit", lease.unit_name, Building2)}
            {detailCard(
              "Tenant",
              lease.tenant_name ||
                (lease.tenant_id
                  ? `Tenant #${lease.tenant_id}`
                  : null),
              UserRound
            )}
            {detailCard(
              "Monthly Rent",
              formatMoney(lease.monthly_rent),
              Wallet
            )}
            {detailCard(
              "Security Deposit",
              formatMoney(lease.deposit_amount ?? 0),
              Wallet
            )}
            {detailCard(
              "Start Date",
              formatDate(lease.start_date),
              CalendarDays
            )}
            {detailCard(
              "End Date",
              formatDate(lease.end_date),
              CalendarDays
            )}
          </div>

          {/* Lease status management */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-7">
            <h2 className="font-semibold text-gray-800">
              Manage Lease Status
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Current status:{" "}
              <span className="font-semibold capitalize text-gray-800">
                {lease.status || "Unknown"}
              </span>
            </p>

            {statusActions[lease.status]?.length > 0 ? (
              <>
                <p className="mt-3 text-sm text-gray-500">
                  Choose an action for this agreement. The backend
                  will validate the requested change.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  {statusActions[lease.status].map((action) => (
                    <button
                      key={action.status}
                      type="button"
                      disabled={updating}
                      onClick={() =>
                        handleStatusChange(action.status)
                      }
                      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 ${action.className}`}
                    >
                      {updating && (
                        <RefreshCw
                          size={16}
                          className="animate-spin"
                        />
                      )}
                      {action.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-gray-500">
                This lease is {lease.status || "in an unknown state"}.
                No status-change actions are available.
              </p>
            )}
          </div>

          {/* Agreement summary */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-7">
            <h2 className="mb-4 font-semibold text-gray-800">
              Agreement Summary
            </h2>

            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-gray-500">Lease ID</p>
                <p className="mt-1 font-medium text-gray-800">
                  #{lease.id}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Tenant ID</p>
                <p className="mt-1 font-medium text-gray-800">
                  {lease.tenant_id ?? "Not available"}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Unit ID</p>
                <p className="mt-1 font-medium text-gray-800">
                  {lease.unit_id ?? "Not available"}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Current Status</p>
                <p className="mt-1 font-medium capitalize text-gray-800">
                  {lease.status || "Unknown"}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
