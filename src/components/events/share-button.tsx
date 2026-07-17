"use client";

export function ShareButton({
  title,
  text,
  url,
}: {
  title: string;
  text: string;
  url: string;
}) {
  async function onShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // User dismissed the native share sheet — nothing else to do.
      }
      return;
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
      "_blank",
      "noopener"
    );
  }

  return (
    <button type="button" onClick={onShare} className="btn btn-secondary w-full">
      Compartilhar
    </button>
  );
}
