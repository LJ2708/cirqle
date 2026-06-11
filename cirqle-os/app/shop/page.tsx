"use client";
// ============================================================
// /app/shop/page.tsx
// Merch Shop — tier-basiertes Locking + Mock-Checkout (kein Stripe)
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/theme";

const PINK = BRAND.pink;

// Demo-Produkte — nur sichtbar solange keine echte DB dranhängt (Preview/Design).
// Sobald Supabase Produkte liefert, werden diese hier ignoriert.
const DEMO_PRODUCTS = [
  {
    id: "demo-1",
    name: "cirqle Tee — White",
    description: "Unser klassisches Run-Shirt. Lightweight, atmungsaktiv.",
    price_cents: 2990,
    color: "white",
    category: "shirt",
    tier_required: null,
    sizes: ["S", "M", "L", "XL"],
  },
  {
    id: "demo-2",
    name: "cirqle Cap — White",
    description: "Clean Cap mit gesticktem cirqle Logo.",
    price_cents: 2490,
    color: "white",
    category: "cap",
    tier_required: null,
    sizes: ["One Size"],
  },
  {
    id: "demo-3",
    name: "cirqle Hoodie — White",
    description: "Post-Run Comfort. Organic Cotton.",
    price_cents: 5990,
    color: "black",
    category: "hoodie",
    tier_required: null,
    sizes: ["S", "M", "L", "XL"],
  },
  {
    id: "demo-4",
    name: "cirqle Tee — Pink",
    description: "Das Inner Circle Shirt. Nur für die Day Ones.",
    price_cents: 2990,
    color: "pink",
    category: "shirt",
    tier_required: "pink",
    sizes: ["S", "M", "L", "XL"],
  },
  {
    id: "demo-5",
    name: "cirqle Cap — Pink",
    description: "Inner Circle Cap. Du weißt, wer du bist.",
    price_cents: 2490,
    color: "pink",
    category: "cap",
    tier_required: "pink",
    sizes: ["One Size"],
  },
];

function euro(cents: number) {
  return (cents / 100).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}

export default function ShopPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartItem, setCartItem] = useState<any>(null); // Produkt im Checkout-Modal
  const [size, setSize] = useState<string>("M");
  const [placing, setPlacing] = useState(false);
  const [orderDone, setOrderDone] = useState(false);

  const load = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const [{ data: prods }, prof] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .eq("in_stock", true)
          .order("sort_order", { ascending: true }),
        user
          ? supabase.from("profiles").select("*").eq("id", user.id).single()
          : Promise.resolve({ data: null }),
      ]);

      // Demo-Fallback nur wenn die DB (noch) keine Produkte liefert.
      setProducts(prods && prods.length > 0 ? prods : DEMO_PRODUCTS);
      setProfile(prof?.data ?? null);
    } catch {
      // Keine erreichbare DB (z.B. Preview ohne Supabase) → Demo-Produkte.
      setProducts(DEMO_PRODUCTS);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  function openCheckout(p: any) {
    setCartItem(p);
    setSize(p.sizes?.[0] ?? "M");
    setOrderDone(false);
  }

  async function mockCheckout() {
    if (!cartItem) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/join?next=/shop";
      return;
    }

    setPlacing(true);
    // Mock: Order direkt als "paid" anlegen (Stripe kommt in Phase 2)
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        total_cents: cartItem.price_cents,
        status: "paid",
      })
      .select()
      .single();

    if (!error && order) {
      await supabase.from("order_items").insert({
        order_id: order.id,
        product_id: cartItem.id,
        quantity: 1,
        size,
        price_cents: cartItem.price_cents,
      });
      setOrderDone(true);
    } else {
      alert(error?.message ?? "Bestellung fehlgeschlagen");
    }
    setPlacing(false);
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

  const tier = profile?.tier ?? "white";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BRAND.surface,
        fontFamily: BRAND.nunito,
        paddingBottom: 60,
      }}
    >
      {/* Header */}
      <div style={{ background: BRAND.dark, padding: "48px 24px 32px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <a
            href="/dashboard"
            style={{ fontSize: 13, color: BRAND.muted, fontWeight: 600 }}
          >
            ← Dashboard
          </a>
          <div
            style={{
              fontFamily: BRAND.syne,
              fontSize: 32,
              fontWeight: 800,
              color: "#fff",
              marginTop: 12,
            }}
          >
            cirqle Shop
          </div>
          <div style={{ fontSize: 14, color: BRAND.muted, marginTop: 4 }}>
            Trag das, was du beim Run trägst.
            {profile && (
              <>
                {" "}
                Du bist{" "}
                <strong style={{ color: tier === "pink" ? PINK : "#fff" }}>
                  {tier === "pink" ? "Inner Circle 💗" : "Member ⚪"}
                </strong>
                .
              </>
            )}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {products.map((p) => {
          const locked = p.tier_required && tier !== p.tier_required;
          return (
            <div
              key={p.id}
              style={{
                background: "#fff",
                border: `1px solid ${BRAND.border}`,
                borderRadius: 18,
                overflow: "hidden",
                position: "relative",
                boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
              }}
            >
              {/* Bild / Platzhalter */}
              <div
                style={{
                  aspectRatio: "1 / 1",
                  background:
                    p.color === "pink"
                      ? `linear-gradient(135deg, ${PINK}, #FF8EC7)`
                      : p.color === "black"
                        ? "linear-gradient(135deg, #2a2a2a, #0D0D0D)"
                        : "linear-gradient(135deg, #f5f5f4, #e7e5e4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  filter: locked ? "grayscale(0.4)" : "none",
                }}
              >
                <span
                  style={{
                    fontFamily: BRAND.syne,
                    fontWeight: 800,
                    fontSize: 34,
                    color:
                      p.color === "white"
                        ? "#0D0D0D"
                        : "rgba(255,255,255,0.85)",
                  }}
                >
                  cirqle
                </span>
                {locked && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(13,13,13,0.55)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      textAlign: "center",
                      padding: 16,
                    }}
                  >
                    <div style={{ fontSize: 30 }}>🔒</div>
                    <div
                      style={{
                        fontFamily: BRAND.syne,
                        fontWeight: 800,
                        fontSize: 14,
                        marginTop: 8,
                      }}
                    >
                      Inner Circle
                    </div>
                    <div
                      style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 4 }}
                    >
                      Schalte nach 3er Streak frei
                    </div>
                  </div>
                )}
              </div>

              {/* Info */}
              <div style={{ padding: 16 }}>
                <div
                  style={{
                    fontFamily: BRAND.syne,
                    fontWeight: 700,
                    fontSize: 15,
                  }}
                >
                  {p.name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: BRAND.muted,
                    marginTop: 4,
                    minHeight: 32,
                    lineHeight: 1.4,
                  }}
                >
                  {p.description}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 12,
                  }}
                >
                  <div
                    style={{
                      fontFamily: BRAND.syne,
                      fontWeight: 800,
                      fontSize: 18,
                    }}
                  >
                    {euro(p.price_cents)}
                  </div>
                  <button
                    onClick={() => !locked && openCheckout(p)}
                    disabled={locked}
                    style={{
                      background: locked ? "#F3F3F1" : PINK,
                      color: locked ? BRAND.muted : "#fff",
                      border: "none",
                      borderRadius: 10,
                      padding: "9px 16px",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: locked ? "not-allowed" : "pointer",
                    }}
                  >
                    {locked ? "Gesperrt" : "Kaufen"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mock-Checkout Modal */}
      {cartItem && (
        <div
          onClick={() => !placing && setCartItem(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              width: "100%",
              maxWidth: 440,
              borderRadius: "24px 24px 0 0",
              padding: 24,
              animation: "slideIn 0.25s ease",
            }}
          >
            {orderDone ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                <div
                  style={{
                    fontFamily: BRAND.syne,
                    fontWeight: 800,
                    fontSize: 20,
                  }}
                >
                  Bestellung eingegangen
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: BRAND.muted,
                    marginTop: 8,
                    lineHeight: 1.5,
                  }}
                >
                  {cartItem.name} ({size}) — {euro(cartItem.price_cents)}
                  <br />
                  Wir versenden manuell. (Mock — kein echter Zahlungsvorgang.)
                </div>
                <button
                  onClick={() => setCartItem(null)}
                  style={{
                    marginTop: 22,
                    width: "100%",
                    background: BRAND.dark,
                    color: "#fff",
                    border: "none",
                    borderRadius: 12,
                    padding: 15,
                    fontSize: 15,
                    fontWeight: 800,
                    fontFamily: BRAND.syne,
                    cursor: "pointer",
                  }}
                >
                  Fertig
                </button>
              </div>
            ) : (
              <>
                <div
                  style={{
                    fontFamily: BRAND.syne,
                    fontWeight: 800,
                    fontSize: 20,
                    marginBottom: 4,
                  }}
                >
                  {cartItem.name}
                </div>
                <div
                  style={{ fontSize: 14, color: BRAND.muted, marginBottom: 20 }}
                >
                  {euro(cartItem.price_cents)}
                </div>

                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: BRAND.muted,
                    marginBottom: 8,
                  }}
                >
                  GRÖSSE
                </div>
                <div
                  style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}
                >
                  {(cartItem.sizes ?? ["S", "M", "L", "XL"]).map((s: string) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      style={{
                        minWidth: 48,
                        padding: "10px 0",
                        borderRadius: 10,
                        border: `1.5px solid ${size === s ? PINK : BRAND.border}`,
                        background: size === s ? BRAND.pinkLight : "#fff",
                        color: size === s ? PINK : BRAND.dark,
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: "pointer",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <button
                  onClick={mockCheckout}
                  disabled={placing}
                  style={{
                    width: "100%",
                    background: PINK,
                    color: "#fff",
                    border: "none",
                    borderRadius: 12,
                    padding: 15,
                    fontSize: 15,
                    fontWeight: 800,
                    fontFamily: BRAND.syne,
                    cursor: placing ? "wait" : "pointer",
                    opacity: placing ? 0.7 : 1,
                  }}
                >
                  {placing
                    ? "Bestelle…"
                    : `Mock-Checkout · ${euro(cartItem.price_cents)}`}
                </button>
                <div
                  style={{
                    fontSize: 11,
                    color: BRAND.muted,
                    textAlign: "center",
                    marginTop: 10,
                  }}
                >
                  Stripe-Zahlung folgt in Phase 2.
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
