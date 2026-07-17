/**
 * Fuso horário canônico do produto.
 *
 * Eventos Coffee Match são presenciais no Brasil e as datas devem SEMPRE
 * ser exibidas no horário do evento (America/Sao_Paulo), independente do
 * TZ do servidor (UTC na nuvem) ou do visitante.
 */
export const APP_TZ = "America/Sao_Paulo";

/** Ex.: "16/07/2026, 20:00" */
export function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: APP_TZ,
  }).format(d);
}

/** Ex.: "quinta-feira, 16 de julho de 2026 às 20:00" */
export function formatDateTimeLong(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: APP_TZ,
  }).format(d);
}

/** Ex.: "16 de jul. de 2026" */
export function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeZone: APP_TZ,
  }).format(d);
}

/** Ex.: "qui., 16 de jul., 20:00" */
export function formatWeekdayTime(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: APP_TZ,
  }).format(d);
}

const DATETIME_LOCAL_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/**
 * Interpreta um valor de <input type="datetime-local"> ("YYYY-MM-DDTHH:mm")
 * como horário de São Paulo, independente do TZ do runtime.
 *
 * São Paulo é UTC-3 fixo desde 2019 (o horário de verão brasileiro foi
 * abolido pelo Decreto 9.772/2019), então o offset "-03:00" é constante e
 * não há DST a considerar.
 *
 * Retorna null para entrada inválida.
 */
export function parseAppDateTimeLocal(s: string): Date | null {
  if (!DATETIME_LOCAL_RE.test(s)) return null;
  const d = new Date(`${s}:00-03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Inverso de parseAppDateTimeLocal: monta o valor "YYYY-MM-DDTHH:mm" que
 * representa `d` no horário de São Paulo, para preencher inputs
 * datetime-local corretamente em qualquer TZ de runtime.
 */
export function toDateTimeLocalValue(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  // en-CA + hour12:false pode render "24" para meia-noite em alguns runtimes.
  const hour = get("hour") === "24" ? "00" : get("hour");

  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}
