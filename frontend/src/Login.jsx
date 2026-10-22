
import { useState } from "react";
import { LockKeyhole, Mail, Eye, EyeOff, UserRound } from "lucide-react";

export default function Login({ onLoginSuccess }) {
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (isSigningUp && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `http://localhost:5000/api/users/${isSigningUp ? "register" : "login"}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            isSigningUp
              ? { full_name: fullName, email, password }
              : { email, password }
          ),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            (isSigningUp
              ? "Sign up failed. Please try again."
              : "Login failed. Please check your details.")
        );
      }

      if (isSigningUp) {
        setIsSigningUp(false);
        setPassword("");
        setConfirmPassword("");
        setSuccess("Your account has been created. Sign in to continue.");
        return;
      }

      if (!data.token) {
        throw new Error("Login failed. Please try again.");
      }

      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the RentSecure backend. Check that your backend server is running."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-white">
            <LockKeyhole size={28} />
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            RentSecure
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {isSigningUp
              ? "Create an account to get started"
              : "Sign in to manage your rental properties"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isSigningUp && (
            <div>
              <label
                htmlFor="full-name"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Full name
              </label>

              <div className="relative">
                <UserRound
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="full-name"
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                  required
                  className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email address
            </label>

            <div className="relative">
              <Mail
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Password
            </label>

            <div className="relative">
              <LockKeyhole
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={
                  isSigningUp ? "At least 8 characters" : "Enter your password"
                }
                autoComplete={isSigningUp ? "new-password" : "current-password"}
                minLength={isSigningUp ? 8 : undefined}
                maxLength={72}
                required
                className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-12 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {isSigningUp && (
            <div>
              <label
                htmlFor="confirm-password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Confirm password
              </label>

              <div className="relative">
                <LockKeyhole
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Enter your password again"
                  autoComplete="new-password"
                  maxLength={72}
                  required
                  className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="rounded-lg bg-green-50 p-3 text-sm text-green-700"
            >
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? isSigningUp
                ? "Creating account..."
                : "Signing in..."
              : isSigningUp
                ? "Create account"
                : "Sign In"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600">
          {isSigningUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setIsSigningUp(!isSigningUp);
              setError("");
              setSuccess("");
            }}
            className="font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-60"
          >
            {isSigningUp ? "Sign in" : "Sign up"}
          </button>
        </p>

        <p className="mt-6 text-center text-xs text-slate-500">
          Secure access to your rental management dashboard
        </p>
      </div>
    </div>
  );
}
