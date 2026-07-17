import Link from "next/link";

/** Slug de cidade: lowercase, sem acentos, não-alfanumérico vira hífen. */
export function slugifyCity(city: string): string {
  return city
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function chipClass(active: boolean): string {
  return [
    "btn !min-h-9 !px-4 !py-1.5 !text-xs",
    active ? "btn-primary" : "btn-secondary",
  ].join(" ");
}

/**
 * Chips de filtro por cidade — links puros para que a URL reflita o estado
 * (/eventos e /eventos?cidade=<slug>). Renderizar apenas com 2+ cidades.
 */
export function CityFilter({
  cities,
  activeSlug,
}: {
  cities: string[];
  activeSlug: string | null;
}) {
  return (
    <nav
      aria-label="Filtrar eventos por cidade"
      className="mb-8 flex flex-wrap items-center gap-2"
    >
      <Link
        href="/eventos"
        className={chipClass(activeSlug === null)}
        aria-current={activeSlug === null ? "page" : undefined}
      >
        Todas
      </Link>
      {cities.map((city) => {
        const slug = slugifyCity(city);
        const active = slug === activeSlug;
        return (
          <Link
            key={slug}
            href={`/eventos?cidade=${slug}`}
            className={chipClass(active)}
            aria-current={active ? "page" : undefined}
          >
            {city}
          </Link>
        );
      })}
    </nav>
  );
}
