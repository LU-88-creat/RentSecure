
import { useEffect, useState } from "react";
import { ArrowLeft, Save, RefreshCw } from "lucide-react";

const API_URL = "http://localhost:5000/api/leases";

export default function EditLease({
  token,
  leaseId,
  onBack,
  onUpdated,
}) {
  const [lease, setLease] = useState(null);
  const [form, setForm] = useState({
    start_date: "",
    end_date: "",
    monthly_rent: "",
    deposit_amount: "0",
    status: "pending",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadLease() {
      try {
        const response = await fetch(`${API_URL}/${leaseId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || "Unable to load lease for editing."
          );
        }

        const record =
          result.lease ||
          result.data?.lease ||
          result.data ||
          result;

        if (!record || record.id == null) {
          throw new Error("The server returned an invalid lease record.");
        }

        if (!cancelled) {
          setLease(record);
          setForm({
            start_date: record.start_date
              ? String(record.start_date).slice(0, 10)
              : "",
            end_date: record.end_date
              ? String(record.end_date).slice(0, 10)
              : "",
            monthly_rent: String(record.monthly_rent ?? ""),
            deposit_amount: String(record.deposit_amount ?? 0),
            status: record.status || "pending",
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message === "Failed to fetch"
              ? "Cannot connect to the backend. Check that your server is running."
              : err.message
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (token && leaseId) loadLease();

    return () => {
      cancelled = true;
    };
  }, [token, leaseId]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!lease) {
      setError("Lease information is not available.");
      return;
    }

    if (!form.start_date || !form.monthly_rent) {
      setError("Start date and monthly rent are required.");
      return;
    }

    if (
      form.end_date &&
      form.end_date < form.start_date
    ) {
      setError("End date cannot be earlier than the start date.");
      return;
    }

    if (
      !Number.isFinite(Number(form.monthly_rent)) ||
      Number(form.monthly_rent) <= 0
    ) {
      setError("Monthly rent must be greater than zero.");
      return;
    }

    if (
      form.deposit_amount !== "" &&
      (!Number.isFinite(Number(form.deposit_amount)) ||
        Number(form.deposit_amount) < 0)
    ) {
      setError("Security deposit cannot be negative.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_URL}/${leaseId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          start_date: form.start_date,
          end_date: form.end_date || null,
          monthly_rent: Number(form.monthly_rent),
          deposit_amount:
            form.deposit_amount === ""
              ? 0
              : Number(form.deposit_amount),
          status: form.status,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to update lease."
        );
      }

      setSuccess(result.message || "Lease updated successfully.");

      if (onUpdated) {
        onUpdated(result.lease || lease);
      }
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the backend. Check that your server is running."
          : err.message
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500";

  if (!token || !leaseId) {
    return (
      <div
        role="alert"
        className="mx-auto max-w-3xl rounded-lg bg-red-50 p-4 text-red-700"
      >
        A valid lease and login session are required.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        <RefreshCw
          size={24}
          className="mx-auto mb-3 animate-spin text-orange-600"
        />
        Loading lease for editing...
      </div>
    );
  }

  if (error && !lease) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </p>
        <button
          type="button"
          onClick={onBack}
          className="font-medium text-orange-700 hover:underline"
        >
          Back to Lease Details
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-orange-600"
      >
        <ArrowLeft size={18} />
        Back to Lease Details
      </button>

      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          Edit Lease #{lease?.id}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Update the rental dates, rent, deposit, or status.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-7">
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Property</p>
            <p className="mt-1 font-medium text-gray-800">
              {lease?.property_name || "Property unavailable"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Unit</p>
            <p className="mt-1 font-medium text-gray-800">
              {lease?.unit_name || "Unit unavailable"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Tenant</p>
            <p className="mt-1 font-medium text-gray-800">
              {lease?.tenant_name ||
                (lease?.tenant_id
                  ? `Tenant #${lease.tenant_id}`
                  : "Tenant unavailable")}
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-lg bg-orange-50 p-3 text-sm text-orange-800">
          Property, unit, and tenant are read-only to prevent accidentally
          changing the parties to this agreement.
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
          >
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="start_date"
                className="text-sm font-medium text-gray-700"
              >
                Start Date *
              </label>
              <input
                id="start_date"
                name="start_date"
                type="date"
                value={form.start_date}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="end_date"
                className="text-sm font-medium text-gray-700"
              >
                End Date
              </label>
              <input
                id="end_date"
                name="end_date"
                type="date"
                value={form.end_date}
                onChange={handleChange}
                min={form.start_date || undefined}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave blank if the lease has no specified end date.
              </p>
            </div>

            <div>
              <label
                htmlFor="monthly_rent"
                className="text-sm font-medium text-gray-700"
              >
                Monthly Rent (KES) *
              </label>
              <input
                id="monthly_rent"
                name="monthly_rent"
                type="number"
                min="0.01"
                step="0.01"
                value={form.monthly_rent}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="deposit_amount"
                className="text-sm font-medium text-gray-700"
              >
                Security Deposit (KES)
              </label>
              <input
                id="deposit_amount"
                name="deposit_amount"
                type="number"
                min="0"
                step="0.01"
                value={form.deposit_amount}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="status"
                className="text-sm font-medium text-gray-700"
              >
                Lease Status
              </label>
              <select
                id="status"
                name="status"
                value={form.status}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="ended">Ended</option>
                <option value="terminated">Terminated</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                The backend will validate status changes and unit availability.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-5">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </button>

            <button
              type="button"
              onClick={onBack}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
