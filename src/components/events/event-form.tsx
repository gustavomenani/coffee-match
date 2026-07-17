import { toDateTimeLocalValue } from "@/lib/datetime";

export type EventFormDefaults = {
  title?: string;
  slug?: string;
  venue?: string;
  address?: string;
  city?: string;
  startsAt?: string;
  endsAt?: string;
  capacityMen?: number;
  capacityWomen?: number;
  priceCents?: number;
  status?: string;
  earlyAccessUntil?: string;
};

function toDatetimeLocal(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 16);
  // Sempre exibe o horário de São Paulo, independente do TZ do runtime.
  return toDateTimeLocalValue(d);
}

const statuses = [
  { value: "draft", label: "Rascunho" },
  { value: "published", label: "Publicado" },
  { value: "sold_out", label: "Esgotado" },
  { value: "live", label: "Ao vivo" },
  { value: "closed", label: "Encerrado" },
] as const;

export function EventForm({
  action,
  defaults,
  submitLabel = "Salvar",
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaults?: EventFormDefaults;
  submitLabel?: string;
}) {
  const priceReais =
    defaults?.priceCents != null
      ? (defaults.priceCents / 100).toFixed(2)
      : "";

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="block">
        <span className="label">Título</span>
        <input
          name="title"
          required
          minLength={3}
          maxLength={120}
          defaultValue={defaults?.title ?? ""}
          className="field"
        />
      </label>

      <label className="block">
        <span className="label">Slug (URL)</span>
        <input
          name="slug"
          required
          minLength={3}
          maxLength={80}
          pattern="[a-z0-9\-]+"
          defaultValue={defaults?.slug ?? ""}
          placeholder="noite-paulista-2026-03"
          className="field"
        />
      </label>

      <label className="block">
        <span className="label">Local</span>
        <input
          name="venue"
          required
          minLength={2}
          maxLength={120}
          defaultValue={defaults?.venue ?? ""}
          className="field"
        />
      </label>

      <label className="block">
        <span className="label">Endereço</span>
        <input
          name="address"
          required
          minLength={5}
          maxLength={200}
          defaultValue={defaults?.address ?? ""}
          className="field"
        />
      </label>

      <label className="block">
        <span className="label">Cidade</span>
        <input
          name="city"
          required
          minLength={2}
          maxLength={80}
          defaultValue={defaults?.city ?? ""}
          className="field"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">Início</span>
          <input
            type="datetime-local"
            name="startsAt"
            required
            defaultValue={toDatetimeLocal(defaults?.startsAt)}
            className="field"
          />
        </label>
        <label className="block">
          <span className="label">Término</span>
          <input
            type="datetime-local"
            name="endsAt"
            required
            defaultValue={toDatetimeLocal(defaults?.endsAt)}
            className="field"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">Capacidade homens</span>
          <input
            type="number"
            name="capacityMen"
            required
            min={1}
            max={500}
            defaultValue={defaults?.capacityMen ?? 10}
            className="field"
          />
        </label>
        <label className="block">
          <span className="label">Capacidade mulheres</span>
          <input
            type="number"
            name="capacityWomen"
            required
            min={1}
            max={500}
            defaultValue={defaults?.capacityWomen ?? 10}
            className="field"
          />
        </label>
      </div>

      <label className="block">
        <span className="label">Preço (R$)</span>
        <input
          type="number"
          name="priceReais"
          required
          min={0}
          step="0.01"
          defaultValue={priceReais}
          placeholder="89.90"
          className="field"
        />
      </label>

      <label className="block">
        <span className="label">Venda antecipada para assinantes até (opcional)</span>
        <input
          type="datetime-local"
          name="earlyAccessUntil"
          defaultValue={toDatetimeLocal(defaults?.earlyAccessUntil)}
          className="field"
        />
        <span className="mt-1.5 block text-xs text-[var(--muted)]">
          Antes desse horário, só assinantes conseguem comprar. Vazio = venda
          aberta para todos desde a publicação.
        </span>
      </label>

      <label className="block">
        <span className="label">Status</span>
        <select
          name="status"
          defaultValue={defaults?.status ?? "draft"}
          className="field"
        >
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <button type="submit" className="btn btn-primary mt-2">
        {submitLabel}
      </button>
    </form>
  );
}
