import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
};

function toDatetimeLocal(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
      <Label>
        <span className="font-medium text-zinc-800">Título</span>
        <Input
          name="title"
          required
          minLength={3}
          maxLength={120}
          defaultValue={defaults?.title ?? ""}
        />
      </Label>

      <Label>
        <span className="font-medium text-zinc-800">Slug (URL)</span>
        <Input
          name="slug"
          required
          minLength={3}
          maxLength={80}
          pattern="[a-z0-9\-]+"
          defaultValue={defaults?.slug ?? ""}
          placeholder="noite-paulista-2026-03"
        />
      </Label>

      <Label>
        <span className="font-medium text-zinc-800">Local</span>
        <Input
          name="venue"
          required
          minLength={2}
          maxLength={120}
          defaultValue={defaults?.venue ?? ""}
        />
      </Label>

      <Label>
        <span className="font-medium text-zinc-800">Endereço</span>
        <Input
          name="address"
          required
          minLength={5}
          maxLength={200}
          defaultValue={defaults?.address ?? ""}
        />
      </Label>

      <Label>
        <span className="font-medium text-zinc-800">Cidade</span>
        <Input
          name="city"
          required
          minLength={2}
          maxLength={80}
          defaultValue={defaults?.city ?? ""}
        />
      </Label>

      <div className="grid gap-4 sm:grid-cols-2">
        <Label>
          <span className="font-medium text-zinc-800">Início</span>
          <Input
            type="datetime-local"
            name="startsAt"
            required
            defaultValue={toDatetimeLocal(defaults?.startsAt)}
          />
        </Label>
        <Label>
          <span className="font-medium text-zinc-800">Término</span>
          <Input
            type="datetime-local"
            name="endsAt"
            required
            defaultValue={toDatetimeLocal(defaults?.endsAt)}
          />
        </Label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Label>
          <span className="font-medium text-zinc-800">Capacidade homens</span>
          <Input
            type="number"
            name="capacityMen"
            required
            min={1}
            max={500}
            defaultValue={defaults?.capacityMen ?? 10}
          />
        </Label>
        <Label>
          <span className="font-medium text-zinc-800">Capacidade mulheres</span>
          <Input
            type="number"
            name="capacityWomen"
            required
            min={1}
            max={500}
            defaultValue={defaults?.capacityWomen ?? 10}
          />
        </Label>
      </div>

      <Label>
        <span className="font-medium text-zinc-800">Preço (R$)</span>
        <Input
          type="number"
          name="priceReais"
          required
          min={0}
          step="0.01"
          defaultValue={priceReais}
          placeholder="89.90"
        />
      </Label>

      <Label>
        <span className="font-medium text-zinc-800">Status</span>
        <select
          name="status"
          defaultValue={defaults?.status ?? "draft"}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500"
        >
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </Label>

      <Button type="submit" className="mt-2">
        {submitLabel}
      </Button>
    </form>
  );
}
