"use client";

export function GlitchTipTestButtons() {
  return (
    <div className="flex flex-col gap-4 p-8">
      <button
        type="button"
        className="w-fit rounded border px-4 py-2"
        onClick={() => {
          throw new Error("glitchtip front test");
        }}
      >
        GlitchTip front test
      </button>
      <button
        type="button"
        className="w-fit rounded border px-4 py-2"
        onClick={() => {
          void fetch("/api/glitchtip-test");
        }}
      >
        GlitchTip server test
      </button>
    </div>
  );
}
