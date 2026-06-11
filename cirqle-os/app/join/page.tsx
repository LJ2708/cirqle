"use client";
// ============================================================
// /app/join/page.tsx
// Signup / Login via Supabase Magic Link
// ============================================================

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/theme";

function JoinForm() {
  const supabase = createClient();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      (typeof window !== "undefined" ? window.location.origin : "");

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        // Name landet in raw_user_meta_data → handle_new_user() Trigger.
        data: { name: name.trim() },
        emailRedirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BRAND.dark,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: BRAND.nunito,
      }}
    >
      {/* Ambient orb */}
      <div
        style={{
          position: "fixed",
          top: "-10%",
          right: "-10%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${BRAND.pink}33, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <div style={{ width: "100%", maxWidth: 400, position: "relative" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              fontFamily: BRAND.syne,
              fontSize: 34,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: -1,
            }}
          >
            cirqle
          </div>
          <div style={{ fontSize: 14, color: BRAND.muted, marginTop: 4 }}>
            Der Laufclub. Für die Day Ones.
          </div>
        </div>

        <div
          style={{
            background: "#141414",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 24,
            padding: 28,
          }}
        >
          {sent ? (
            <div style={{ textAlign: "center", padding: "12px 4px" }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>📬</div>
              <div
                style={{
                  fontFamily: BRAND.syne,
                  fontSize: 20,
                  fontWeight: 800,
                  color: "#fff",
                  marginBottom: 8,
                }}
              >
                Check deine Mails
              </div>
              <div style={{ fontSize: 14, color: BRAND.muted, lineHeight: 1.6 }}>
                Wir haben dir einen Magic Link an
                <br />
                <strong style={{ color: "#fff" }}>{email}</strong>
                <br />
                geschickt. Tippe drauf und du bist drin.
              </div>
              <button
                onClick={() => setSent(false)}
                style={{
                  marginTop: 22,
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: BRAND.muted,
                  borderRadius: 10,
                  padding: "10px 18px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Andere Email nutzen
              </button>
            </div>
          ) : (
            <form onSubmit={sendMagicLink}>
              <div
                style={{
                  fontFamily: BRAND.syne,
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#fff",
                  marginBottom: 6,
                }}
              >
                Werde Member
              </div>
              <div style={{ fontSize: 14, color: BRAND.muted, marginBottom: 24 }}>
                Kein Passwort. Wir schicken dir einen Login-Link.
              </div>

              <label style={labelStyle}>Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Max Mustermann"
                required
                style={inputStyle}
              />

              <label style={{ ...labelStyle, marginTop: 16 }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="du@email.de"
                required
                style={inputStyle}
              />

              {error && (
                <div
                  style={{
                    marginTop: 14,
                    fontSize: 13,
                    color: "#f87171",
                  }}
                >
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  marginTop: 24,
                  background: BRAND.pink,
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "15px",
                  fontSize: 16,
                  fontWeight: 800,
                  fontFamily: BRAND.syne,
                  cursor: loading ? "wait" : "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Sende Link…" : "Magic Link senden →"}
              </button>
            </form>
          )}
        </div>

        <div
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "#4B5563",
            marginTop: 20,
          }}
        >
          Mit dem Beitritt akzeptierst du die cirqle Hausregeln.
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: BRAND.muted,
  marginBottom: 7,
  letterSpacing: 0.3,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#0D0D0D",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  padding: "14px 16px",
  fontSize: 15,
  color: "#fff",
  outline: "none",
};

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinForm />
    </Suspense>
  );
}
