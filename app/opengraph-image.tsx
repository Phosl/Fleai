import { ImageResponse } from "next/og";

export const alt =
  "Fleai, l’app AI per valutare e rivendere oggetti trovati ai mercatini";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#17352f",
          color: "#f4f0e7",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: "72px",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: "-1px",
          }}
        >
          <span
            style={{
              background: "#d7ff5f",
              borderRadius: 18,
              color: "#17352f",
              display: "flex",
              padding: "16px 22px",
            }}
          >
            Fleai
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              fontSize: 72,
              fontWeight: 850,
              letterSpacing: "-4px",
              lineHeight: 1.02,
              maxWidth: 950,
            }}
          >
            Trova valore. Crea storie. Rivendi meglio.
          </div>
          <div
            style={{
              color: "#aec1bb",
              display: "flex",
              fontSize: 30,
              lineHeight: 1.35,
              maxWidth: 920,
            }}
          >
            Dalle foto a una stima prudente e a una scheda pronta per la
            vendita.
          </div>
        </div>

        <div
          style={{
            background: "#ff6b4a",
            borderRadius: 999,
            display: "flex",
            height: 20,
            width: 250,
          }}
        />
      </div>
    ),
    size,
  );
}
