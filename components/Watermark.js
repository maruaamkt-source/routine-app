export default function Watermark() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none select-none fixed z-30 bottom-14 left-3 md:bottom-4 md:left-auto md:right-5 text-left md:text-right"
      style={{ opacity: 0.35 }}
    >
      <p
        className="tracked text-xs"
        style={{
          fontFamily: "var(--font-fraunces), serif",
          color: "rgb(var(--bone))",
        }}
      >
        ROUTINE
      </p>
      <p
        className="text-[10px]"
        style={{
          fontFamily: "var(--font-inter), sans-serif",
          color: "rgb(var(--mute))",
        }}
      >
        sua rotina, no controle
      </p>
    </div>
  );
}