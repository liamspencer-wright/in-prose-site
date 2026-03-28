"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: '"Crimson Text", serif',
          backgroundColor: "#fbf1ec",
          color: "#1b1b1b",
          display: "flex",
          minHeight: "100svh",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "2.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "1.125rem", opacity: 0.65, marginBottom: "1.5rem" }}>
            A critical error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              cursor: "pointer",
              backgroundColor: "#ff7f32",
              color: "white",
              border: "none",
              borderRadius: "10px",
              padding: "0.75rem 1.5rem",
              fontSize: "1.125rem",
              fontWeight: 700,
              fontFamily: "inherit",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
