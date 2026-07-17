import { APP_TZ } from "@/lib/datetime";

/**
 * Idade é um fato civil brasileiro: vira à meia-noite de São Paulo, nunca no
 * calendário do servidor. Getters locais (getFullYear/getMonth/getDate) leem o
 * TZ do runtime — UTC nos containers de produção, onde o dia vira às 21:00 de
 * São Paulo, bem no meio do horário dos eventos.
 *
 * `birthDate` é uma data civil gravada como meio-dia de São Paulo (ver
 * registerUser). A âncora do meio-dia é o que torna a leitura segura: qualquer
 * fuso a menos de 12h de distância cai no mesmo dia.
 */
const ymdFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Dia civil de `d` em São Paulo, como [ano, mês, dia]. */
function saoPauloYmd(d: Date): [number, number, number] {
  // en-CA always formats a valid Date as YYYY-MM-DD, so the three parts are
  // present — but read them explicitly rather than trusting a destructure to
  // fill the tuple. A malformed part becomes NaN, which flows through to
  // isAtLeast18 as `NaN >= 18` === false, i.e. rejected (fail-closed).
  const parts = ymdFormatter.format(d).split("-");
  return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
}

export function yearsOldOn(birthDate: Date, on: Date): number {
  const [by, bm, bd] = saoPauloYmd(birthDate);
  const [oy, om, od] = saoPauloYmd(on);

  let age = oy - by;
  if (om < bm || (om === bm && od < bd)) {
    age -= 1;
  }
  return age;
}

export function isAtLeast18(birthDate: Date, on: Date = new Date()): boolean {
  return yearsOldOn(birthDate, on) >= 18;
}

/** Civil age (full years lived), accounting for month/day of the birthday. */
export function ageFrom(birthDate: Date, now: Date = new Date()): number {
  return yearsOldOn(birthDate, now);
}
