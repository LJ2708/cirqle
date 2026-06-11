"use client";
// ============================================================
// /app/admin/scan/page.tsx
// Admin Check-in Scanner — Kamera, QR-Scan, checkin_user() RPC
// + aktiver Run + Statistik heute
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/theme";
import AdminNav from "../AdminNav";

const PINK = BRAND.pink;

export default function AdminScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanningRef = useRef(false);
  const [activeRun, setActiveRun] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [todayCount, setTodayCount] = useState(0);
  const [recentCheckins, setRecentCheckins] = useState<any[]>([]);
  const supabase = createClient();

  const loadActiveRun = useCallback(async () => {
    const { data } = await supabase
      .from("runs")
      .select("*")
      .eq("is_active", true)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();
    setActiveRun(data);
  }, [supabase]);

  const loadTodayStats = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data: runs } = await supabase
      .from("runs")
      .select("id")
      .eq("date", today);

    if (!runs?.length) {
      setTodayCount(0);
      setRecentCheckins([]);
      return;
    }
    const runIds = runs.map((r) => r.id);

    const { count } = await supabase
      .from("attendances")
      .select("*", { count: "exact", head: true })
      .in("run_id", runIds);

    const { data: recent } = await supabase
      .from("attendances")
      .select("*, profiles(name, tier)")
      .in("run_id", runIds)
      .order("checked_in_at", { ascending: false })
      .limit(10);

    setTodayCount(count ?? 0);
    setRecentCheckins(recent ?? []);
  }, [supabase]);

  useEffect(() => {
    loadActiveRun();
    loadTodayStats();
  }, [loadActiveRun, loadTodayStats]);

  async function startCamera() {
    if (!activeRun) {
      setError("Kein aktiver Run. Aktiviere zuerst einen Run unter „Runs“.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        scanningRef.current = true;
        setScanning(true);
        setResult(null);
        setError(null);
        scanLoop();
      }
    } catch {
      setError("Kamera-Zugriff verweigert.");
    }
  }

  function stopCamera() {
    scanningRef.current = false;
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }

  async function scanLoop() {
    const jsQR = (await import("jsqr")).default;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

    const frame = () => {
      if (!scanningRef.current) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(img.data, img.width, img.height);
        if (code?.data) {
          stopCamera();
          processCheckin(code.data);
          return;
        }
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  async function processCheckin(walletToken: string) {
    setResult({ loading: true });
    const { data, error } = await supabase.rpc("checkin_user", {
      p_wallet_token: walletToken.trim(),
      p_run_id: activeRun.id,
    });

    if (error) {
      setResult(null);
      setError(error.message);
      return;
    }
    setResult(data);
    if (data?.success) {
      loadTodayStats();
      setTimeout(() => {
        setResult(null);
        setError(null);
      }, 4000);
    }
  }

  async function deactivateRun() {
    if (!activeRun) return;
    await supabase
      .from("runs")
      .update({ is_active: false })
      .eq("id", activeRun.id);
    loadActiveRun();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BRAND.dark,
        color: "#fff",
        fontFamily: BRAND.syne,
        padding: "24px 16px",
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <AdminNav />

        <div
          style={{
            background: "#1a1a1a",
            borderRadius: 12,
            padding: "10px 16px",
            fontSize: 14,
            display: "inline-block",
            marginBottom: 20,
            fontFamily: BRAND.nunito,
          }}
        >
          Check-ins heute: <strong style={{ color: PINK }}>{todayCount}</strong>
        </div>

        {/* Active Run Banner */}
        {activeRun ? (
          <div
            style={{
              background: "#0F2010",
              border: "1px solid #22C55E33",
              borderRadius: 16,
              padding: "16px 20px",
              marginBottom: 24,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: BRAND.green,
                  fontWeight: 700,
                  letterSpacing: 1,
                  marginBottom: 4,
                }}
              >
                AKTIVER RUN
              </div>
              <div style={{ fontWeight: 700 }}>{activeRun.title}</div>
              <div
                style={{ fontSize: 13, color: "#6B7280", fontFamily: BRAND.nunito }}
              >
                {activeRun.location}
              </div>
            </div>
            <button
              onClick={deactivateRun}
              style={{
                background: "#22C55E22",
                border: "1px solid #22C55E55",
                color: BRAND.green,
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Deaktivieren
            </button>
          </div>
        ) : (
          <div
            style={{
              background: "#1A0A0A",
              border: `1px solid ${PINK}33`,
              borderRadius: 16,
              padding: "16px 20px",
              marginBottom: 24,
            }}
          >
            <div style={{ fontSize: 13, color: PINK, fontFamily: BRAND.nunito }}>
              ⚠️ Kein aktiver Run. Aktiviere einen Run unter{" "}
              <a href="/admin/runs" style={{ textDecoration: "underline" }}>
                Runs
              </a>
              .
            </div>
          </div>
        )}

        {/* Scanner Area */}
        <div
          style={{
            background: "#111",
            borderRadius: 20,
            overflow: "hidden",
            marginBottom: 24,
            position: "relative",
          }}
        >
          {scanning ? (
            <div style={{ position: "relative" }}>
              <video
                ref={videoRef}
                style={{
                  width: "100%",
                  display: "block",
                  maxHeight: 360,
                  objectFit: "cover",
                }}
                playsInline
                muted
              />
              <canvas ref={canvasRef} style={{ display: "none" }} />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    width: 220,
                    height: 220,
                    border: `3px solid ${PINK}`,
                    borderRadius: 16,
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
                    position: "relative",
                  }}
                />
              </div>
              <button
                onClick={stopCamera}
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  background: "rgba(0,0,0,0.7)",
                  border: "none",
                  color: "#fff",
                  borderRadius: 8,
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "inherit",
                }}
              >
                Stop
              </button>
            </div>
          ) : (
            <div style={{ padding: "60px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>📷</div>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
                QR Scanner
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "#6B7280",
                  marginBottom: 28,
                  lineHeight: 1.6,
                  fontFamily: BRAND.nunito,
                }}
              >
                Halte die Wallet-Karte des Mitglieds vor die Kamera
              </div>
              <button
                onClick={startCamera}
                disabled={!activeRun}
                style={{
                  background: activeRun ? PINK : "#333",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "16px 32px",
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: activeRun ? "pointer" : "not-allowed",
                  fontFamily: "inherit",
                }}
              >
                Scanner starten
              </button>
            </div>
          )}
        </div>

        {/* Result */}
        {result?.loading && (
          <div
            style={{
              background: "#111",
              borderRadius: 16,
              padding: 24,
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
            <div style={{ color: "#6B7280", fontFamily: BRAND.nunito }}>
              Einchecken…
            </div>
          </div>
        )}

        {result?.success && (
          <div
            style={{
              background: result.tier_upgraded ? "#1A0520" : "#0F2010",
              border: `1px solid ${result.tier_upgraded ? PINK : BRAND.green}33`,
              borderRadius: 16,
              padding: 24,
              marginBottom: 24,
              animation: "slideIn 0.3s ease",
            }}
          >
            {result.tier_upgraded && (
              <div
                style={{
                  background: PINK,
                  borderRadius: 8,
                  padding: "6px 12px",
                  marginBottom: 16,
                  fontSize: 13,
                  fontWeight: 700,
                  display: "inline-block",
                }}
              >
                🎉 INNER CIRCLE UNLOCK!
              </div>
            )}
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
              ✓ {result.name}
            </div>
            <div
              style={{
                color: "#6B7280",
                fontSize: 14,
                marginBottom: 16,
                fontFamily: BRAND.nunito,
              }}
            >
              Erfolgreich eingecheckt
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 12,
              }}
            >
              <div
                style={{
                  background: BRAND.dark,
                  borderRadius: 10,
                  padding: 12,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 800, color: BRAND.green }}>
                  +{result.points_earned}
                </div>
                <div style={{ fontSize: 11, color: "#6B7280" }}>Punkte</div>
              </div>
              <div
                style={{
                  background: BRAND.dark,
                  borderRadius: 10,
                  padding: 12,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 800, color: PINK }}>
                  🔥{result.streak}
                </div>
                <div style={{ fontSize: 11, color: "#6B7280" }}>Streak</div>
              </div>
              <div
                style={{
                  background: BRAND.dark,
                  borderRadius: 10,
                  padding: 12,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: result.tier === "pink" ? PINK : "#fff",
                  }}
                >
                  {result.tier === "pink" ? "💗" : "⚪"}
                </div>
                <div style={{ fontSize: 11, color: "#6B7280" }}>
                  {result.tier === "pink" ? "Inner Circle" : "Member"}
                </div>
              </div>
            </div>
            {result.bonus_points > 0 && (
              <div style={{ marginTop: 12, fontSize: 13, color: PINK }}>
                +{result.bonus_points} Streak Bonus!
              </div>
            )}
          </div>
        )}

        {result?.success === false && (
          <div
            style={{
              background: "#1A0A0A",
              border: `1px solid ${PINK}33`,
              borderRadius: 16,
              padding: 20,
              marginBottom: 24,
            }}
          >
            <div style={{ color: PINK, fontWeight: 700 }}>⚠️ {result.error}</div>
          </div>
        )}

        {error && (
          <div
            style={{
              background: "#1A0A0A",
              borderRadius: 16,
              padding: 16,
              marginBottom: 24,
            }}
          >
            <div
              style={{ color: "#f87171", fontSize: 14, fontFamily: BRAND.nunito }}
            >
              ❌ {error}
            </div>
          </div>
        )}

        {/* Recent Check-ins */}
        {recentCheckins.length > 0 && (
          <div>
            <div
              style={{
                fontSize: 12,
                color: "#6B7280",
                fontWeight: 700,
                letterSpacing: 1.5,
                marginBottom: 14,
              }}
            >
              LETZTE CHECK-INS
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentCheckins.map((a, i) => (
                <div
                  key={i}
                  style={{
                    background: "#111",
                    borderRadius: 12,
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background:
                          a.profiles?.tier === "pink" ? `${PINK}22` : "#1a1a1a",
                        border:
                          a.profiles?.tier === "pink"
                            ? `1.5px solid ${PINK}`
                            : "1.5px solid #333",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        color: a.profiles?.tier === "pink" ? PINK : "#6B7280",
                      }}
                    >
                      {a.profiles?.name?.charAt(0)}
                    </div>
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        fontFamily: BRAND.nunito,
                      }}
                    >
                      {a.profiles?.name}
                    </span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{ fontSize: 13, color: BRAND.green, fontWeight: 600 }}
                    >
                      +{a.points_earned}
                    </div>
                    <div style={{ fontSize: 11, color: "#6B7280" }}>
                      {new Date(a.checked_in_at).toLocaleTimeString("de-DE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
