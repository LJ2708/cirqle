"use client";
// ============================================================
// /app/admin/runs/page.tsx
// Runs anlegen / aktivieren / deaktivieren / löschen
// Nur ein Run sollte gleichzeitig aktiv sein.
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/theme";
import AdminNav from "../AdminNav";

const PINK = BRAND.pink;

function nextSunday() {
  const d = new Date();
  const day = d.getDay(); // 0 = So
  const add = day === 0 ? 7 : 7 - day;
  d.setDate(d.getDate() + add);
  return d.toISOString().split("T")[0];
}

export default function AdminRunsPage() {
  const supabase = createClient();
  const [runs, setRuns] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [date, setDate] = useState(nextSunday());
  const [title, setTitle] = useState("Sunday Run");
  const [location, setLocation] = useState("Codos, Hannover");
  const [points, setPoints] = useState(100);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("runs")
      .select("*")
      .order("date", { ascending: false });
    setRuns(data ?? []);

    if (data?.length) {
      const { data: atts } = await supabase
        .from("attendances")
        .select("run_id")
        .in(
          "run_id",
          data.map((r) => r.id),
        );
      const c: Record<string, number> = {};
      (atts ?? []).forEach((a) => {
        c[a.run_id] = (c[a.run_id] ?? 0) + 1;
      });
      setCounts(c);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function createRun(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("runs").insert({
      date,
      title: title.trim() || "Sunday Run",
      location: location.trim(),
      points,
      is_active: false,
    });
    setSaving(false);
    if (error) alert(error.message);
    else {
      setTitle("Sunday Run");
      load();
    }
  }

  async function toggleActive(run: any) {
    if (!run.is_active) {
      // Alle anderen deaktivieren — nur ein aktiver Run gleichzeitig.
      await supabase
        .from("runs")
        .update({ is_active: false })
        .neq("id", run.id);
    }
    const { error } = await supabase
      .from("runs")
      .update({ is_active: !run.is_active })
      .eq("id", run.id);
    if (error) alert(error.message);
    load();
  }

  async function deleteRun(run: any) {
    if (
      !confirm(
        `Run „${run.title}" wirklich löschen? Alle Check-ins dieses Runs gehen verloren.`,
      )
    )
      return;
    const { error } = await supabase.from("runs").delete().eq("id", run.id);
    if (error) alert(error.message);
    load();
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
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <AdminNav />

        {/* Neuen Run anlegen */}
        <form
          onSubmit={createRun}
          style={{
            background: "#141414",
            border: "1px solid #262626",
            borderRadius: 18,
            padding: 20,
            marginBottom: 28,
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>
            Neuen Run anlegen
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Datum">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                style={inputStyle}
              />
            </Field>
            <Field label="Punkte">
              <input
                type="number"
                value={points}
                min={0}
                onChange={(e) => setPoints(Number(e.target.value))}
                style={inputStyle}
              />
            </Field>
          </div>

          <div style={{ marginTop: 12 }}>
            <Field label="Titel">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sunday Run #2"
                style={inputStyle}
              />
            </Field>
          </div>

          <div style={{ marginTop: 12 }}>
            <Field label="Ort">
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              width: "100%",
              marginTop: 18,
              background: PINK,
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: 14,
              fontSize: 15,
              fontWeight: 800,
              fontFamily: BRAND.syne,
              cursor: saving ? "wait" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Speichere…" : "Run anlegen"}
          </button>
        </form>

        {/* Run-Liste */}
        <div
          style={{
            fontSize: 12,
            color: "#6B7280",
            fontWeight: 700,
            letterSpacing: 1.5,
            marginBottom: 14,
          }}
        >
          ALLE RUNS
        </div>

        {loading ? (
          <div style={{ color: "#6B7280", fontFamily: BRAND.nunito }}>Lädt…</div>
        ) : runs.length === 0 ? (
          <div style={{ color: "#6B7280", fontFamily: BRAND.nunito }}>
            Noch keine Runs angelegt.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {runs.map((run) => (
              <div
                key={run.id}
                style={{
                  background: "#141414",
                  border: `1px solid ${run.is_active ? "#22C55E55" : "#262626"}`,
                  borderRadius: 14,
                  padding: "16px 18px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    {run.is_active && (
                      <div
                        style={{
                          fontSize: 10,
                          color: BRAND.green,
                          fontWeight: 700,
                          letterSpacing: 1,
                          marginBottom: 4,
                        }}
                      >
                        ● AKTIV
                      </div>
                    )}
                    <div style={{ fontWeight: 700, fontSize: 16 }}>
                      {run.title}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#6B7280",
                        fontFamily: BRAND.nunito,
                        marginTop: 2,
                      }}
                    >
                      {new Date(run.date).toLocaleDateString("de-DE", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}{" "}
                      · {run.location}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#4B5563",
                        fontFamily: BRAND.nunito,
                        marginTop: 4,
                      }}
                    >
                      {run.points}P · {counts[run.id] ?? 0} Check-ins
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      alignItems: "flex-end",
                    }}
                  >
                    <button
                      onClick={() => toggleActive(run)}
                      style={{
                        background: run.is_active ? "#22C55E22" : PINK,
                        border: run.is_active
                          ? "1px solid #22C55E55"
                          : "none",
                        color: run.is_active ? BRAND.green : "#fff",
                        borderRadius: 8,
                        padding: "7px 14px",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {run.is_active ? "Deaktivieren" : "Aktivieren"}
                    </button>
                    <button
                      onClick={() => deleteRun(run)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#6B7280",
                        fontSize: 12,
                        cursor: "pointer",
                        fontFamily: BRAND.nunito,
                      }}
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "block" }}>
      <span
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 700,
          color: "#6B7280",
          marginBottom: 7,
          fontFamily: BRAND.nunito,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#0D0D0D",
  border: "1px solid #262626",
  borderRadius: 10,
  padding: "12px 14px",
  fontSize: 15,
  color: "#fff",
  outline: "none",
  fontFamily: "Nunito, sans-serif",
};
