
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  FileText,
  Save,
  RefreshCw,
} from "lucide-react";

const API_BASE = "http://localhost:5000/api";

async function readApiResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    throw new Error(
      `The server returned an unexpected response (${response.status}). Check the backend API route and server configuration.`
    );
  }

  return response.json();
}

export default function CreateLease({ token, onBack, onCreated }) {
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);

  const [propertyId, setPropertyId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [depositAmount, setDepositAmount] = useState("0");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadFormData() {
      try {
        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [propertyResponse, tenantResponse] =
          await Promise.all([
            fetch(`${API_BASE}/properties`, { headers }),
            fetch(`${API_BASE}/tenants`, { headers }),
          ]);

        const results = await Promise.all(
          [propertyResponse, tenantResponse].map(async (response) => {
            const data = await readApiResponse(response);

            if (!response.ok) {
              throw new Error(
                data.message || "Unable to load lease form data."
              );
            }

            return data;
          })
        );

        function extractList(result, keys) {
          if (Array.isArray(result)) return result;

          for (const key of keys) {
            if (Array.isArray(result[key])) return result[key];
          }

          if (result.data && typeof result.data === "object") {
            for (const key of keys) {
              if (Array.isArray(result.data[key])) {
                return result.data[key];
              }
            }
          }

          return [];
        }

        const propertyList = extractList(results[0], [
          "properties",
          "data",
        ]);
        const tenantList = extractList(results[1], ["tenants", "data"]);

        const unitLists = await Promise.all(
          propertyList.map(async (property) => {
            const response = await fetch(
              `${API_BASE}/units/properties/${property.id}`,
              { headers }
            );
            const data = await readApiResponse(response);

            if (!response.ok) {
              throw new Error(
                data.message || "Unable to load lease form data."
              );
            }

            return extractList(data, ["units", "data"]);
          })
        );
        const unitList = unitLists.flat();

        if (cancelled) return;

        setProperties(propertyList);
        setUnits(unitList);
        setTenants(tenantList);
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

    if (token) loadFormData();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const availableUnits = units.filter(
    (unit) =>
      String(unit.property_id) === String(propertyId) &&
      unit.status === "available"
  );

  function handlePropertyChange(value) {
    setPropertyId(value);
    setUnitId("");

    const firstAvailable = units.find(
      (unit) =>
        String(unit.property_id) === String(value) &&
        unit.status === "available"
    );

    setMonthlyRent(
      firstAvailable?.monthly_rent != null
        ? String(firstAvailable.monthly_rent)
        : ""
    );
  }

  function handleUnitChange(value) {
    setUnitId(value);

    const selectedUnit = units.find(
      (unit) => String(unit.id) === String(value)
    );

    setMonthlyRent(
      selectedUnit?.monthly_rent != null
        ? String(selectedUnit.monthly_rent)
        : ""
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!propertyId || !unitId || !tenantId || !startDate) {
      setError("Please complete all required fields.");
      return;
    }

    if (endDate && endDate < startDate) {
      setError("The end date cannot be earlier than the start date.");
      return;
    }

    if (Number(monthlyRent) <= 0 || Number(depositAmount) < 0) {
      setError("Enter a valid rent and a non-negative deposit.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_BASE}/leases`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          unit_id: Number(unitId),
          tenant_id: Number(tenantId),
          start_date: startDate,
          end_date: endDate || null,
          monthly_rent: Number(monthlyRent),
          deposit_amount: Number(depositAmount),
        }),
      });

      const result = await readApiResponse(response);

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Could not create the lease.");
      }

      setMessage("Lease created successfully.");

      if (onCreated) {
        onCreated();
      }
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the backend. Please try again."
          : err.message
      );
    } finally {
      setSaving(false);
    }
  }

  function getTenantLabel(tenant) {
    const name =
      tenant.tenant_name ||
      tenant.full_name ||
      tenant.name ||
      (tenant.user_id ? `Tenant #${tenant.id}` : "");

    return name
      ? `${name} — Tenant #${tenant.id}`
      : `Tenant #${tenant.id} — Name unavailable`;
  }

  if (!token) {
    return (
      <div
        role="alert"
        className="mx-auto max-w-3xl rounded-lg bg-red-50 p-4 text-red-700"
      >
        Please sign in before creating a lease.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-orange-600"
      >
        <ArrowLeft size={18} />
        Back to Lease Management
      </button>

      <div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-orange-100 p-3 text-orange-600">
            <FileText size={25} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Create Lease
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Enter the details for a new rental agreement.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          <p>{message}</p>
          <button
            type="button"
            onClick={onBack}
            className="mt-2 font-semibold underline"
          >
            Return to Lease Management
          </button>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
          <RefreshCw className="mx-auto mb-3 animate-spin" size={24} />
          Loading properties, units, and tenants...
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-7"
        >
          <div>
            <h2 className="font-semibold text-gray-800">
              Property and Tenant
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Choose a property, an available unit, and a tenant.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Property <span className="text-red-500">*</span>
              </label>

              <select
                value={propertyId}
                onChange={(event) =>
                  handlePropertyChange(event.target.value)
                }
                required
                disabled={properties.length === 0}
                className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-orange-500"
              >
                <option value="">Select a property</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.property_name ||
                      property.name ||
                      `Property #${property.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Available Unit <span className="text-red-500">*</span>
              </label>

              <select
                value={unitId}
                onChange={(event) =>
                  handleUnitChange(event.target.value)
                }
                required
                disabled={!propertyId || availableUnits.length === 0}
                className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-orange-500"
              >
                <option value="">Select an available unit</option>
                {availableUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.unit_name || `Unit #${unit.id}`} — KES{" "}
                    {Number(unit.monthly_rent).toLocaleString("en-KE")}
                  </option>
                ))}
              </select>

              {propertyId && availableUnits.length === 0 && (
                <p className="mt-1 text-xs text-amber-700">
                  No available units were found for this property.
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Tenant <span className="text-red-500">*</span>
              </label>

              <select
                value={tenantId}
                onChange={(event) => setTenantId(event.target.value)}
                required
                disabled={tenants.length === 0}
                className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-orange-500"
              >
                <option value="">Select a tenant</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {getTenantLabel(tenant)}
                  </option>
                ))}
              </select>

              {tenants.length === 0 && (
                <p className="mt-1 text-xs text-amber-700">
                  No tenants were returned. Create a tenant before
                  creating a lease.
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-5">
            <h2 className="font-semibold text-gray-800">
              Lease Terms
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Set the rental period, monthly rent, and security deposit.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Start Date <span className="text-red-500">*</span>
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                End Date
              </label>

              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-orange-500"
              />

              <p className="mt-1 text-xs text-gray-500">
                Leave blank for an open-ended lease.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Monthly Rent (KES){" "}
                <span className="text-red-500">*</span>
              </label>

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={monthlyRent}
                onChange={(event) => setMonthlyRent(event.target.value)}
                required
                placeholder="e.g. 16000"
                className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Security Deposit (KES)
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={depositAmount}
                onChange={(event) => setDepositAmount(event.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                saving ||
                !propertyId ||
                !unitId ||
                !tenantId ||
                Boolean(message)
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={18} />
              {saving ? "Creating Lease..." : "Create Lease"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
