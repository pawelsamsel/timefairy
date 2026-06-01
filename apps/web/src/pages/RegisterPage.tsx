import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, User } from "lucide-react";
import { useAuth } from "../lib/auth";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AuthFormLink, LoginShell } from "@/components/auth/login-shell";
import { cn } from "@/lib/utils";

const authInputClass =
  "h-11 w-full rounded-lg border-0 bg-imperial-blue-800/60 pl-10 text-sm text-white placeholder:text-imperial-blue-200 focus-visible:ring-2 focus-visible:ring-steel-azure/80";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register({ email, password, name });
      navigate("/app/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoginShell footer={<AuthFormLink prompt="Already have an account?" linkText="Log in" to="/login" />}>
      <form onSubmit={onSubmit} className="space-y-5">
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="name" className="text-imperial-blue-100">
            Name
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-imperial-blue-200" />
            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={authInputClass}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reg-email" className="text-imperial-blue-100">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-imperial-blue-200" />
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={authInputClass}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reg-password" className="text-imperial-blue-100">
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-imperial-blue-200" />
            <input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className={authInputClass}
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className={cn(
            "w-full h-11 rounded-lg font-semibold text-imperial-blue",
            "bg-gold hover:bg-school-bus-yellow shadow-md",
          )}
        >
          {loading ? "Creating account…" : "Sign up"}
        </Button>
      </form>
    </LoginShell>
  );
}
