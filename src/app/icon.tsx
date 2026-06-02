import { ImageResponse } from "next/og";

// Route segment config
export const runtime = "edge";

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      // ImageResponse JSX element
      <div
        style={{
          fontSize: 24,
          background: "linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          borderRadius: "8px",
          fontWeight: 900,
          boxShadow: "0 4px 6px -1px rgba(99, 102, 241, 0.5)",
        }}
      >
        S
      </div>
    ),
    // ImageResponse options
    {
      ...size,
    }
  );
}
