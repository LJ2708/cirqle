"use client";

import { usePathname } from "next/navigation";
import { BRAND } from "@/lib/theme";

const LINKS = [
  { href: "/admin/scan", label: "Scanner" },
  { href: "/admin/runs", label: "Runs" },
];

export default function AdminNav() {
  const path = usePathname();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 28,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: BRAND.pink,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontWeight: 800, fontSize: 16, color: "#fff" }}>c</span>
        </div>
        <div>
          <div
            style={{
              fontFamily: BRAND.syne,
              fontWeight: 800,
              fontSize: 18,
              color: "#fff",
            }}
          >
            cirqle Admin
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {LINKS.map((l) => {
          const active = path === l.href;
          return (
            <a
              key={l.href}
              href={l.href}
              style={{
                fontFamily: BRAND.syne,
                fontSize: 13,
                fontWeight: 700,
                color: active ? "#fff" : BRAND.muted,
                background: active ? BRAND.pink : "#1a1a1a",
                border: `1px solid ${active ? BRAND.pink : "#262626"}`,
                borderRadius: 9,
                padding: "8px 14px",
              }}
            >
              {l.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}
