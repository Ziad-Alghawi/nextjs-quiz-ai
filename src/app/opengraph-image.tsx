import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// The link preview for every page (LinkedIn, Slack, X…). It has no route params or request data,
// so Next renders it once at build time.
export const alt = "Quiz AI: from lecture PDF to exam-ready";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The light-mode values of the design tokens in globals.css; the image renders outside the page,
// so it can't read the CSS variables.
const colors = {
  foreground: "#020618",
  mutedForeground: "#62748e",
  blue: "#155dfc",
  panel: "#eef4ff",
};

export default async function OpenGraphImage() {
  const [geistBold, overview] = await Promise.all([
    readFile(join(process.cwd(), "src/assets/fonts/Geist-Bold.ttf")),
    readFile(join(process.cwd(), "public/images/overview-phone-light.png")),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "white",
        fontFamily: "Geist",
        color: colors.foreground,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 36,
          width: 660,
          padding: "0 40px 0 72px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 40 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 60,
              height: 60,
              borderRadius: 16,
              background: colors.blue,
            }}
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 6 9 17l-5-5"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          Quiz AI
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 62,
            lineHeight: 1.05,
            letterSpacing: "-0.035em",
          }}
        >
          <span>From lecture PDF</span>
          <span>to exam-ready.</span>
        </div>
        <div style={{ fontSize: 28, lineHeight: 1.35, color: colors.mutedForeground }}>
          Quizzes that explain every answer, made from your own course PDFs.
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          justifyContent: "center",
          margin: "56px 0 0 0",
          padding: "44px 0 0 0",
          borderTopLeftRadius: 32,
          background: colors.panel,
          overflow: "hidden",
        }}
      >
        {/* The Overview on a phone: the stats and the recent weeks of the heatmap stay readable at
            thumbnail size. */}
        <div
          style={{
            width: 430,
            height: 612,
            backgroundImage: `url(data:image/png;base64,${overview.toString("base64")})`,
            backgroundSize: "430px 612px",
            borderRadius: "20px 20px 0 0",
            boxShadow: "0 20px 60px -30px rgba(15,23,42,0.35)",
          }}
        />
      </div>
    </div>,
    { ...size, fonts: [{ name: "Geist", data: geistBold, weight: 700, style: "normal" }] },
  );
}
