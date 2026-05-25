// Lightweight server-renderable JSON-LD injector. Renders a <script>
// tag with the given object. Used on the homepage (WebSite + Organization),
// farm pages (LocalBusiness), and the manifesto (Article).

export function JsonLd({ data }: { data: object | object[] }) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <>
      {payload.map((entry, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(entry) }}
        />
      ))}
    </>
  );
}
