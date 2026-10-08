import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export const alt = "CollabSpace — Collaborative Workspace for Product Teams";
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
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#09090b",
          backgroundImage:
            "radial-gradient(circle at 25px 25px, #18181b 2%, transparent 0%), radial-gradient(circle at 75px 75px, #18181b 2%, transparent 0%)",
          backgroundSize: "100px 100px",
          color: "#fafafa",
          fontFamily: "sans-serif",
          padding: "60px 80px",
        }}
      >
        {/* Glow backdrop */}
        <div
          style={{
            position: "absolute",
            width: "600px",
            height: "300px",
            background:
              "radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(16, 185, 129, 0.08) 50%, transparent 70%)",
            filter: "blur(60px)",
            top: "165px",
          }}
        />

        {/* Brand Container */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            marginBottom: "32px",
          }}
        >
          {/* Logo SVG Representation */}
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "18px",
              backgroundColor: "#111319",
              border: "2px solid #282a30",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "14px",
                top: "15px",
                width: "22px",
                height: "22px",
                borderRadius: "6px",
                backgroundColor: "#8083ff",
              }}
            />
            <div
              style={{
                position: "absolute",
                right: "14px",
                bottom: "15px",
                width: "22px",
                height: "22px",
                borderRadius: "6px",
                backgroundColor: "#4edea3",
              }}
            />
          </div>

          <div
            style={{
              fontSize: "64px",
              fontWeight: 800,
              letterSpacing: "-2px",
              color: "#fafafa",
            }}
          >
            CollabSpace
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: "36px",
            fontWeight: 700,
            textAlign: "center",
            maxWidth: "900px",
            lineHeight: 1.3,
            color: "#fafafa",
            marginBottom: "20px",
          }}
        >
          Work together, in context.
        </div>

        {/* Sub-headline */}
        <div
          style={{
            fontSize: "22px",
            color: "#a1a1aa",
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: 1.5,
            marginBottom: "40px",
          }}
        >
          The all-in-one collaborative workspace for fast-moving product teams to plan, track, and ship.
        </div>

        {/* Feature Badges */}
        <div
          style={{
            display: "flex",
            gap: "16px",
          }}
        >
          {["Project Tracking", "Task Boards", "Real-Time Chat", "Sprint Analytics"].map(
            (badge) => (
              <div
                key={badge}
                style={{
                  padding: "10px 20px",
                  borderRadius: "9999px",
                  backgroundColor: "#18181b",
                  border: "1px solid #27272a",
                  color: "#d4d4d8",
                  fontSize: "15px",
                  fontWeight: 600,
                }}
              >
                {badge}
              </div>
            )
          )}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
