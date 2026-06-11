import { BRAND } from "@/lib/theme";

// Öffentliche Landing — eingeloggte User gehen direkt über die Buttons weiter.
export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: BRAND.dark,
        color: "#fff",
        fontFamily: BRAND.nunito,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient orbs */}
      <div
        style={{
          position: "absolute",
          top: "-15%",
          right: "-10%",
          width: 480,
          height: 480,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${BRAND.pink}33, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-20%",
          left: "-10%",
          width: 420,
          height: 420,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${BRAND.pink}1A, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", textAlign: "center", maxWidth: 480 }}>
        <div
          style={{
            fontFamily: BRAND.syne,
            fontSize: 64,
            fontWeight: 800,
            letterSpacing: -2,
            lineHeight: 1,
          }}
        >
          cirqle
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 4,
            color: BRAND.pink,
            marginTop: 14,
            textTransform: "uppercase",
          }}
        >
          Run Club · Hannover
        </div>

        <p
          style={{
            fontSize: 17,
            color: "rgba(255,255,255,0.7)",
            lineHeight: 1.6,
            marginTop: 28,
          }}
        >
          Lauf mit. Sammle Punkte. Schalte das Pink frei.
          <br />
          Dein Run Club, deine Karte, deine Crew.
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            marginTop: 36,
            flexWrap: "wrap",
          }}
        >
          <a
            href="/join"
            style={{
              background: BRAND.pink,
              color: "#fff",
              borderRadius: 12,
              padding: "15px 28px",
              fontFamily: BRAND.syne,
              fontWeight: 800,
              fontSize: 16,
            }}
          >
            Member werden →
          </a>
          <a
            href="/shop"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.18)",
              color: "#fff",
              borderRadius: 12,
              padding: "15px 28px",
              fontFamily: BRAND.syne,
              fontWeight: 800,
              fontSize: 16,
            }}
          >
            Shop ansehen
          </a>
        </div>

        <div style={{ marginTop: 22 }}>
          <a
            href="/dashboard"
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.5)",
              fontWeight: 600,
            }}
          >
            Schon dabei? Zum Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
