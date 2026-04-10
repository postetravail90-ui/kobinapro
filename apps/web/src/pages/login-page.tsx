import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/auth-store";
import { supabase } from "../lib/supabase";

export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const { loading, otpSent, signInEmail, signInPhoneOtp, verifyPhoneOtp } = useAuthStore();

  const [mode, setMode] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onEmailSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    try {
      await signInEmail(email.trim(), password);
      const uid = useAuthStore.getState().user?.id;
      if (uid) {
        const { data: profile } = await supabase.from("users").select("role").eq("id", uid).maybeSingle();
        navigate(profile?.role === "superadmin" ? "/admin" : "/app", { replace: true });
      } else {
        navigate("/app", { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible");
    }
  }

  async function onPhoneSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    try {
      if (!otpSent) {
        await signInPhoneOtp(phone.trim());
        return;
      }
      await verifyPhoneOtp(phone.trim(), otp.trim());
      const uid = useAuthStore.getState().user?.id;
      if (uid) {
        const { data: profile } = await supabase.from("users").select("role").eq("id", uid).maybeSingle();
        navigate(profile?.role === "superadmin" ? "/admin" : "/app", { replace: true });
      } else {
        navigate("/app", { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP invalide");
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: 16, fontFamily: "Inter, system-ui, sans-serif" }}>
      <h1>Connexion</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button type="button" onClick={() => setMode("email")}>Email</button>
        <button type="button" onClick={() => setMode("phone")}>Telephone OTP</button>
      </div>

      {mode === "email" ? (
        <form onSubmit={onEmailSubmit} style={{ display: "grid", gap: 10 }}>
          <input placeholder="email@domaine.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button disabled={loading} type="submit">{loading ? "Connexion..." : "Se connecter"}</button>
        </form>
      ) : (
        <form onSubmit={onPhoneSubmit} style={{ display: "grid", gap: 10 }}>
          <input placeholder="+2250700000000" value={phone} onChange={(e) => setPhone(e.target.value)} />
          {otpSent && <input placeholder="Code OTP" value={otp} onChange={(e) => setOtp(e.target.value)} />}
          <button disabled={loading} type="submit">
            {loading ? "Traitement..." : otpSent ? "Verifier OTP" : "Envoyer OTP"}
          </button>
        </form>
      )}

      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
    </main>
  );
}
