"use client";
// ============================================================
// /app/dashboard/page.tsx
// Member Dashboard — Punkte, Streak, Tier, Wallet Card (QR PNG),
// Vouchers, Run-Verlauf
// ============================================================

import { useState, useEffect, useCallback } from "react";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/theme";

const PINK = BRAND.pink;

export default function DashboardPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [myVouchers, setMyVouchers] = useState<any[]>([]);
  const [recentRuns, setRecentRuns] = useState<any[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"vouchers" | "history">("vouchers");

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/join";
      return;
    }

    const [{ data: prof }, { data: vts }, { data: uvs }, { data: att }] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase
          .from("voucher_types")
          .select("*, partners(name, logo_url)")
          .eq("is_active", true),
        supabase
          .from("user_vouchers")
          .select("*, voucher_types(title, partners(name))")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("attendances")
          .select("*, runs(date, title)")
          .eq("user_id", user.id)
          .order("checked_in_at", { ascending: false })
          .limit(10),
      ]);

    setProfile(prof);
    setVouchers(vts ?? []);
    setMyVouchers(uvs ?? []);
    setRecentRuns(att ?? []);
    setLoading(false);

    // QR aus wallet_token erzeugen
    if (prof?.wallet_token) {
      const url = await QRCode.toDataURL(prof.wallet_token, {
        width: 320,
        margin: 1,
        color: { dark: "#0D0D0D", light: "#FFFFFF" },
        errorCorrectionLevel: "M",
      });
      setQrDataUrl(url);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function claimVoucher(voucherId: string) {
    setClaiming(voucherId);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data, error } = await supabase.rpc("claim_voucher", {
      p_user_id: user!.id,
      p_voucher_type: voucherId,
    });
    setClaiming(null);
    if (data?.success) loadData();
    else alert(data?.error ?? error?.message ?? "Fehler");
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/join";
  }

  // ── Branded Wallet-Card als PNG rendern + Download ──────────
  async function downloadCardPng() {
    if (!profile || !qrDataUrl) return;
    const isPink = profile.tier === "pink";
    const W = 1080;
    const H = 680;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Hintergrund
    if (isPink) {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, "#FF4FA3");
      g.addColorStop(1, "#FF8EC7");
      ctx.fillStyle = g;
    } else {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, "#1a1a1a");
      g.addColorStop(1, "#0D0D0D");
      ctx.fillStyle = g;
    }
    ctx.fillRect(0, 0, W, H);

    // Deko-Kreis
    ctx.fillStyle = isPink ? "rgba(255,255,255,0.12)" : "rgba(255,79,163,0.10)";
    ctx.beginPath();
    ctx.arc(W - 80, 120, 180, 0, Math.PI * 2);
    ctx.fill();

    // Marke + Tier
    ctx.fillStyle = "#fff";
    ctx.font = "800 64px Syne, sans-serif";
    ctx.fillText("cirqle", 64, 110);
    ctx.font = "700 24px Nunito, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillText(isPink ? "INNER CIRCLE" : "MEMBER", 64, 150);

    // QR (weißer Rahmen)
    const qrImg = new Image();
    await new Promise<void>((resolve) => {
      qrImg.onload = () => resolve();
      qrImg.src = qrDataUrl;
    });
    const qrSize = 300;
    const qrX = 64;
    const qrY = 230;
    ctx.fillStyle = "#fff";
    ctx.fillRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40);
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    // Name + Stats rechts neben QR
    const tx = qrX + qrSize + 80;
    ctx.fillStyle = "#fff";
    ctx.font = "800 48px Syne, sans-serif";
    ctx.fillText(profile.name, tx, qrY + 60);

    ctx.font = "700 28px Nunito, sans-serif";
    ctx.fillStyle = isPink ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.6)";
    ctx.fillText(`${profile.total_points} Punkte`, tx, qrY + 120);
    ctx.fillText(`${profile.current_streak}🔥 Streak`, tx, qrY + 165);
    ctx.fillText(`${profile.total_runs} Runs`, tx, qrY + 210);

    // Footer
    ctx.font = "600 22px Nunito, sans-serif";
    ctx.fillStyle = isPink ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.4)";
    ctx.fillText("Beim Run abscannen lassen · cirqle Run Club", 64, H - 50);

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `cirqle-karte-${profile.name?.split(" ")[0] ?? "member"}.png`;
    a.click();
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: BRAND.surface,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: `3px solid ${PINK}`,
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
    );
  }

  const isPink = profile?.tier === "pink";
  const nextTierRuns = Math.max(0, 3 - (profile?.current_streak ?? 0));
  const streakPercent = Math.min(100, ((profile?.current_streak ?? 0) / 3) * 100);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BRAND.surface,
        fontFamily: BRAND.nunito,
        paddingBottom: 100,
      }}
    >
      {/* Header */}
      <div
        style={{
          background: isPink ? PINK : BRAND.dark,
          padding: "56px 24px 80px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            maxWidth: 480,
            margin: "0 auto",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.6)",
                marginBottom: 4,
              }}
            >
              {isPink ? "Inner Circle" : "Member"}
            </div>
            <div
              style={{
                fontFamily: BRAND.syne,
                fontSize: 26,
                fontWeight: 800,
                color: "#fff",
              }}
            >
              Hey, {profile?.name?.split(" ")[0]} 👋
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {profile?.is_admin && (
              <a
                href="/admin/scan"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#fff",
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  borderRadius: 8,
                  padding: "7px 11px",
                }}
              >
                Admin
              </a>
            )}
            <button
              onClick={signOut}
              title="Abmelden"
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: isPink ? "rgba(255,255,255,0.25)" : `${PINK}33`,
                border: `2px solid ${isPink ? "rgba(255,255,255,0.4)" : PINK}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: BRAND.syne,
                fontSize: 20,
                fontWeight: 800,
                color: isPink ? "#fff" : PINK,
                cursor: "pointer",
              }}
            >
              {profile?.name?.charAt(0)}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ maxWidth: 480, margin: "-44px auto 0", padding: "0 16px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 10,
            marginBottom: 20,
          }}
        >
          {[
            { label: "Punkte", value: profile?.total_points, color: PINK },
            { label: "Streak", value: `${profile?.current_streak}🔥`, color: BRAND.amber },
            { label: "Runs", value: profile?.total_runs, color: BRAND.green },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                background: "#fff",
                border: `1px solid ${BRAND.border}`,
                borderRadius: 16,
                padding: "16px 12px",
                textAlign: "center",
                boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  fontFamily: BRAND.syne,
                  fontSize: 22,
                  fontWeight: 800,
                  color,
                }}
              >
                {value}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: BRAND.muted,
                  marginTop: 3,
                  fontWeight: 600,
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Tier Progress */}
        {!isPink && (
          <div
            style={{
              background: "#fff",
              border: `1px solid ${BRAND.border}`,
              borderRadius: 18,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: BRAND.syne,
                    fontWeight: 700,
                    fontSize: 15,
                    color: BRAND.dark,
                  }}
                >
                  Inner Circle freischalten
                </div>
                <div style={{ fontSize: 12, color: BRAND.muted, marginTop: 2 }}>
                  Noch {nextTierRuns} Run{nextTierRuns !== 1 ? "s" : ""} für eine
                  3er Streak
                </div>
              </div>
              <div style={{ fontSize: 28 }}>💗</div>
            </div>
            <div
              style={{
                background: "#F3F3F1",
                borderRadius: 50,
                height: 8,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${streakPercent}%`,
                  background: `linear-gradient(90deg, ${PINK}, #FF8EC7)`,
                  borderRadius: 50,
                  transition: "width 0.5s ease",
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: BRAND.muted, marginTop: 8 }}>
              {profile?.current_streak}/3 Runs in Folge
            </div>
          </div>
        )}

        {isPink && (
          <div
            style={{
              background: `${PINK}0F`,
              border: `1.5px solid ${PINK}33`,
              borderRadius: 18,
              padding: 20,
              marginBottom: 20,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>💗</div>
            <div
              style={{
                fontFamily: BRAND.syne,
                fontWeight: 800,
                fontSize: 16,
                color: PINK,
              }}
            >
              Inner Circle Member
            </div>
            <div style={{ fontSize: 13, color: BRAND.muted, marginTop: 4 }}>
              Du trägst das Pink.
            </div>
          </div>
        )}

        {/* Wallet Card mit echtem QR */}
        <div
          style={{
            background: BRAND.dark,
            borderRadius: 20,
            padding: 24,
            marginBottom: 20,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -20,
              right: -20,
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: `${PINK}15`,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              fontFamily: BRAND.syne,
              fontWeight: 800,
              fontSize: 16,
              color: "#fff",
              marginBottom: 4,
            }}
          >
            Deine cirqle Karte
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#6B7280",
              marginBottom: 20,
              lineHeight: 1.5,
            }}
          >
            QR Code zum Abscannen beim Run. Punkte werden automatisch
            gutgeschrieben.
          </div>

          {/* Card visual */}
          <div
            style={{
              background: isPink
                ? `linear-gradient(135deg, ${PINK}, #FF8EC7)`
                : "linear-gradient(135deg, #1a1a1a, #2a2a2a)",
              borderRadius: 14,
              padding: 18,
              marginBottom: 20,
              border: `1px solid ${
                isPink ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)"
              }`,
              display: "flex",
              gap: 16,
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 96,
                height: 96,
                background: "#fff",
                borderRadius: 10,
                padding: 6,
                flexShrink: 0,
              }}
            >
              {qrDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="cirqle QR"
                  style={{ width: "100%", height: "100%", display: "block" }}
                />
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: BRAND.syne,
                  fontWeight: 800,
                  fontSize: 18,
                  color: "#fff",
                }}
              >
                cirqle
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.7)",
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                {isPink ? "INNER CIRCLE" : "MEMBER"}
              </div>
              <div
                style={{
                  fontFamily: BRAND.syne,
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                {profile?.name}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.6)",
                  marginTop: 2,
                }}
              >
                {profile?.total_points} Punkte · {profile?.total_runs} Runs
              </div>
            </div>
          </div>

          <button
            onClick={downloadCardPng}
            style={{
              width: "100%",
              background: PINK,
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: 14,
              fontSize: 14,
              fontWeight: 800,
              fontFamily: BRAND.syne,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            ⬇ Karte als PNG herunterladen
          </button>
          <div
            style={{
              fontSize: 11,
              color: "#4B5563",
              marginTop: 10,
              textAlign: "center",
            }}
          >
            Apple / Google Wallet folgt in Phase 4.
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            background: "#F3F3F1",
            borderRadius: 12,
            padding: 4,
            marginBottom: 20,
          }}
        >
          {(["vouchers", "history"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 9,
                border: "none",
                background: activeTab === tab ? "#fff" : "transparent",
                color: activeTab === tab ? BRAND.dark : BRAND.muted,
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                fontFamily: BRAND.syne,
                boxShadow:
                  activeTab === tab ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.2s",
              }}
            >
              {tab === "vouchers" ? "Vouchers" : "Verlauf"}
            </button>
          ))}
        </div>

        {/* Voucher Tab */}
        {activeTab === "vouchers" && (
          <div>
            <div
              style={{
                fontSize: 12,
                color: BRAND.muted,
                fontWeight: 700,
                letterSpacing: 1.5,
                marginBottom: 14,
              }}
            >
              VERFÜGBAR
            </div>
            {vouchers.map((v) => {
              const canAfford = (profile?.total_points ?? 0) >= v.points_cost;
              const tierOk = !v.tier_required || profile?.tier === v.tier_required;
              const available = canAfford && tierOk;
              return (
                <div
                  key={v.id}
                  style={{
                    background: "#fff",
                    border: `1px solid ${BRAND.border}`,
                    borderRadius: 16,
                    padding: "18px 16px",
                    marginBottom: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    opacity: available ? 1 : 0.6,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: BRAND.syne,
                        fontWeight: 700,
                        fontSize: 15,
                        marginBottom: 3,
                      }}
                    >
                      {v.title}
                    </div>
                    <div style={{ fontSize: 12, color: BRAND.muted }}>
                      {v.partners?.name}
                    </div>
                    {v.tier_required === "pink" && (
                      <div
                        style={{
                          fontSize: 11,
                          color: PINK,
                          fontWeight: 600,
                          marginTop: 3,
                        }}
                      >
                        💗 Inner Circle only
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => available && claimVoucher(v.id)}
                    disabled={!available || claiming === v.id}
                    style={{
                      background: available ? PINK : "#F3F3F1",
                      color: available ? "#fff" : BRAND.muted,
                      border: "none",
                      borderRadius: 10,
                      padding: "8px 16px",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: available ? "pointer" : "not-allowed",
                    }}
                  >
                    {claiming === v.id ? "…" : `${v.points_cost}P`}
                  </button>
                </div>
              );
            })}

            {myVouchers.length > 0 && (
              <>
                <div
                  style={{
                    fontSize: 12,
                    color: BRAND.muted,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    marginTop: 24,
                    marginBottom: 14,
                  }}
                >
                  MEINE VOUCHER
                </div>
                {myVouchers.map((uv) => (
                  <div
                    key={uv.id}
                    style={{
                      background: uv.redeemed ? "#F9F9F9" : BRAND.pinkLight,
                      border: `1px solid ${
                        uv.redeemed ? BRAND.border : `${PINK}33`
                      }`,
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontFamily: BRAND.syne,
                            fontWeight: 700,
                            fontSize: 14,
                          }}
                        >
                          {uv.voucher_types?.title}
                        </div>
                        <div style={{ fontSize: 12, color: BRAND.muted }}>
                          {uv.voucher_types?.partners?.name}
                        </div>
                      </div>
                      <div
                        style={{
                          fontFamily: BRAND.syne,
                          fontWeight: 800,
                          fontSize: 18,
                          color: uv.redeemed ? BRAND.muted : PINK,
                          letterSpacing: 2,
                          textDecoration: uv.redeemed ? "line-through" : "none",
                        }}
                      >
                        {uv.code}
                      </div>
                    </div>
                    {uv.redeemed && (
                      <div
                        style={{ fontSize: 11, color: BRAND.muted, marginTop: 8 }}
                      >
                        Eingelöst
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div>
            {recentRuns.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  color: BRAND.muted,
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 12 }}>🏃‍♂️</div>
                <div style={{ fontWeight: 600 }}>Noch keine Runs dabei</div>
                <div style={{ fontSize: 14, marginTop: 4 }}>
                  Komm zum nächsten Sunday Run!
                </div>
              </div>
            ) : (
              recentRuns.map((a, i) => (
                <div
                  key={i}
                  style={{
                    background: "#fff",
                    border: `1px solid ${BRAND.border}`,
                    borderRadius: 14,
                    padding: "14px 16px",
                    marginBottom: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: BRAND.syne,
                        fontWeight: 700,
                        fontSize: 14,
                      }}
                    >
                      {a.runs?.title}
                    </div>
                    <div style={{ fontSize: 12, color: BRAND.muted }}>
                      {new Date(a.checked_in_at).toLocaleDateString("de-DE", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontFamily: BRAND.syne,
                        fontWeight: 800,
                        color: BRAND.green,
                        fontSize: 15,
                      }}
                    >
                      +{a.points_earned}
                    </div>
                    <div style={{ fontSize: 11, color: BRAND.muted }}>
                      Streak: {a.streak_at_time}🔥
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Shop Link */}
        <a
          href="/shop"
          style={{
            display: "block",
            textAlign: "center",
            marginTop: 24,
            background: BRAND.dark,
            color: "#fff",
            borderRadius: 14,
            padding: 16,
            fontFamily: BRAND.syne,
            fontWeight: 800,
            fontSize: 15,
          }}
        >
          Zum Merch Shop →
        </a>
      </div>
    </div>
  );
}
