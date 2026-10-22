
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
} from "lucide-react";

const API_URL = "http://localhost:5000/api/leases";

export default function Lease({ token, onCreateLease, onViewLease }) {  const [searchTerm, setSearchTerm] = useState("");
  const [leases, setLeases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLeases = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          "Your session may have expired. Please sign out and sign in again."
        );
      }

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to load lease records."
        );
      }

      // Support common API response formats.
      const records = Array.isArray(result)
        ? result
        : Array.isArray(result.leases)
          ? result.leases
          : Array.isArray(result.data)
            ? result.data
            : Array.isArray(result.data?.leases)
              ? result.data.leases
              : [];

      setError("");
      setLeases(records);
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the backend. Check that your server is running on port 5000."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled && token) fetchLeases();
    });

    return () => {
      cancelled = true;
    };
  }, [fetchLeases, token]);

  function handleRefresh() {
    setLoading(true);
    setError("");
    fetchLeases();
  }

  const filteredLeases = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return leases;

    return leases.filter((lease) => {
      const searchableText = [
        lease.id,
        lease.property_name,
        lease.unit_name,
        lease.tenant_name,
        lease.tenant_email,
        lease.status,
      ]
        .filter((value) => value !== null && value !== undefined)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(term);
    });
  }, [leases, searchTerm]);

  const summary = useMemo(
    () => [
      { label: "Total Leases", value: leases.length },
      {
        label: "Pending",
        value: leases.filter((lease) => lease.status === "pending").length,
      },
      {
        label: "Active",
        value: leases.filter((lease) => lease.status === "active").length,
      },
      {
        label: "Ended",
        value: leases.filter((lease) => lease.status === "ended").length,
      },
    ],
    [leases]
  );

  function formatDate(value) {
    if (!value) return "—";

    // Avoid timezone shifts when formatting date-only values.
    const dateText =
      typeof value === "string" ? value.slice(0, 10) : value;

    const date = new Date(`${dateText}T00:00:00`);

    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleDateString();
  }

  function formatMoney(value) {
    const amount = Number(value);

    if (!Number.isFinite(amount)) return "KES —";

    return `KES ${amount.toLocaleString("en-KE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
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

  
function unitStatusStyle(status) {
  const styles = {
    available: "bg-blue-100 text-blue-800",
    occupied: "bg-green-100 text-green-800",
    maintenance: "bg-orange-100 text-orange-800",
  };

  return styles[status] || "bg-gray-100 text-gray-700";
}


  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Page heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Lease Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage rental agreements, tenants, and lease statuses.
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateLease}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-white hover:bg-orange-700"
          >
          <Plus size={18} />
          Create Lease
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{item.label}</p>
              <FileText size={20} className="text-orange-600" />
            </div>

            <p className="mt-3 text-2xl font-bold text-gray-800">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Search and refresh toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by property, unit, or tenant..."
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 outline-none focus:border-orange-500"
          />
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw
            size={17}
            className={loading ? "animate-spin" : ""}
          />
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <p>{error}</p>

          <button
            type="button"
            onClick={handleRefresh}
            className="mt-2 font-semibold underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Lease table */}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800">
            Rental Agreements
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Lease records retrieved from your RentSecure database.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-5 py-3 font-medium">Lease ID</th>
                <th className="px-5 py-3 font-medium">Property / Unit</th>
                <th className="px-5 py-3 font-medium">Tenant</th>
                <th className="px-5 py-3 font-medium">Monthly Rent</th>
                <th className="px-5 py-3 font-medium">Lease Period</th>
                <th className="px-5 py-3 font-medium">Lease Status</th>
                <th className="px-5 py-3 font-medium">Unit Status</th>
                <th className="px-5 py-3 font-medium">Actions</th>

              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading && leases.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-12 text-center text-gray-500"
                  >
                    Loading lease records...
                  </td>
                </tr>
              ) : !error && filteredLeases.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-12 text-center text-gray-500"
                  >
                    {leases.length === 0
                      ? "No lease records found in your account."
                      : "No leases match your search."}
                  </td>
                </tr>
              ) : (
                filteredLeases.map((lease) => (
                  <tr key={lease.id} className="hover:bg-gray-50">
                    {/* Lease ID */}
                    <td className="px-5 py-4 font-medium text-gray-800">
                      #{lease.id}
                    </td>

                    {/* Property and unit */}
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-800">
                        {lease.property_name || "Property unavailable"}
                      </p>
                      <p className="mt-1 text-gray-500">
                        {lease.unit_name || "Unit unavailable"}
                      </p>
                    </td>

                    {/* Tenant information */}
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-800">
                        {lease.tenant_name || "Tenant name unavailable"}
                      </p>
                      {lease.tenant_email && (
                        <p className="mt-1 text-gray-500">
                          {lease.tenant_email}
                        </p>
                      )}
                    </td>

                    {/* Monthly rent */}
                    <td className="px-5 py-4 font-medium text-gray-800">
                      {formatMoney(lease.monthly_rent)}
                    </td>

                    {/* Lease dates */}
                    <td className="px-5 py-4 text-gray-600">
                      <p>{formatDate(lease.start_date)}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        to {formatDate(lease.end_date)}
                      </p>
                    </td>

                    {/* Status badge */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyle(
                          lease.status
                        )}`}
                      >
                        {lease.status || "Unknown"}
                      </span>
                    </td>

                    
                    {/* Unit status badge */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${unitStatusStyle(
                          lease.unit_status
                       )}`}
                      >
                        {lease.unit_status || "Unknown"}
                      </span>
                    </td>


                    {/* View lease details */}
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => onViewLease?.(lease.id)}
                        className="whitespace-nowrap rounded-lg border border-orange-200 px-3 py-2 font-medium text-orange-700 hover:bg-orange-50"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-gray-200 px-5 py-3 text-sm text-gray-500">
          Showing {filteredLeases.length} of {leases.length} lease records
        </div>
      </div>

    </div>
  );
}
