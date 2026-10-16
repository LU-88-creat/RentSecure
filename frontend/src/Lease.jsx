
import { useState } from "react";
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
} from "lucide-react";

export default function Lease() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Page heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Lease Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage rental agreements, tenants, and lease statuses.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-white hover:bg-orange-700"
        >
          <Plus size={18} />
          Create Lease
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Leases", value: 0 },
          { label: "Pending", value: 0 },
          { label: "Active", value: 0 },
          { label: "Ended", value: 0 },
        ].map((item) => (
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
      <div className="flex flex-col sm:flex-row gap-3">
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
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      {/* Lease table placeholder */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800">Rental Agreements</h2>
          <p className="mt-1 text-sm text-gray-500">
            Your lease records will appear here.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-5 py-3 font-medium">Lease ID</th>
                <th className="px-5 py-3 font-medium">Property / Unit</th>
                <th className="px-5 py-3 font-medium">Tenant</th>
                <th className="px-5 py-3 font-medium">Monthly Rent</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-12 text-center text-gray-500"
                >
                  No lease data loaded yet.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
