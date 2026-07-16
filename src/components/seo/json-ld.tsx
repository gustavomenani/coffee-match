type JsonLdProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

/**
 * Safe JSON-LD injection for Google / rich results.
 * @see https://nextjs.org/docs/app/guides/json-ld
 */
export function JsonLd({ data }: JsonLdProps) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(
          payload.length === 1 ? payload[0] : payload
        ).replace(/</g, "\\u003c"),
      }}
    />
  );
}
