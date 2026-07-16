"use client";

export function PrintButton({ label = "Imprimir" }: { label?: string }) {
  return (
    <button
      type="button"
      className="btn btn-secondary !min-h-10 !px-4 !text-sm"
      onClick={() => window.print()}
    >
      {label}
    </button>
  );
}
