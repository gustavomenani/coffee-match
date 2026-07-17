import { describe, it, expect } from "vitest";
import {
  APP_TZ,
  formatDate,
  formatDateTime,
  formatDateTimeLong,
  formatWeekdayTime,
  parseAppDateTimeLocal,
  toDateTimeLocalValue,
} from "@/lib/datetime";

describe("datetime (America/Sao_Paulo fixo)", () => {
  it("exporta o TZ canônico do produto", () => {
    expect(APP_TZ).toBe("America/Sao_Paulo");
  });

  it("parseAppDateTimeLocal interpreta datetime-local como horário SP (UTC-3)", () => {
    const d = parseAppDateTimeLocal("2026-07-16T20:00");
    expect(d).not.toBeNull();
    // 20:00 em SP = 23:00 UTC (SP é UTC-3 fixo, sem DST desde 2019)
    expect(d!.toISOString()).toBe("2026-07-16T23:00:00.000Z");
  });

  it("parseAppDateTimeLocal interpreta meia-noite corretamente", () => {
    const d = parseAppDateTimeLocal("2026-01-01T00:00");
    expect(d!.toISOString()).toBe("2026-01-01T03:00:00.000Z");
  });

  it("parseAppDateTimeLocal rejeita entradas inválidas", () => {
    expect(parseAppDateTimeLocal("")).toBeNull();
    expect(parseAppDateTimeLocal("2026-07-16")).toBeNull();
    expect(parseAppDateTimeLocal("2026-07-16T20:00:00")).toBeNull();
    expect(parseAppDateTimeLocal("16/07/2026 20:00")).toBeNull();
    expect(parseAppDateTimeLocal("2026-13-40T99:99")).toBeNull();
    expect(parseAppDateTimeLocal("banana")).toBeNull();
  });

  it("toDateTimeLocalValue monta o valor SP a partir de um Date UTC", () => {
    // 23:00 UTC = 20:00 em SP
    expect(toDateTimeLocalValue(new Date("2026-07-16T23:00:00.000Z"))).toBe(
      "2026-07-16T20:00"
    );
    // 02:00 UTC = 23:00 do dia anterior em SP (vira o dia)
    expect(toDateTimeLocalValue(new Date("2026-07-17T02:00:00.000Z"))).toBe(
      "2026-07-16T23:00"
    );
    // meia-noite em SP (03:00 UTC) — não pode virar "24:xx"
    expect(toDateTimeLocalValue(new Date("2026-07-17T03:00:00.000Z"))).toBe(
      "2026-07-17T00:00"
    );
  });

  it("roundtrip parse → toValue é estável", () => {
    for (const s of ["2026-07-16T20:00", "2026-01-01T00:00", "2025-12-31T23:59"]) {
      expect(toDateTimeLocalValue(parseAppDateTimeLocal(s)!)).toBe(s);
    }
  });

  it("formatDateTime formata pt-BR curto no horário SP", () => {
    const d = new Date("2026-07-16T23:00:00.000Z"); // 20:00 SP
    expect(formatDateTime(d)).toBe("16/07/2026, 20:00");
  });

  it("formatDateTimeLong formata pt-BR completo no horário SP", () => {
    const d = new Date("2026-07-16T23:00:00.000Z"); // quinta, 20:00 SP
    expect(formatDateTimeLong(d)).toBe(
      "quinta-feira, 16 de julho de 2026 às 20:00"
    );
  });

  it("formatDate formata só a data no horário SP (vira o dia vs UTC)", () => {
    // 02:00 UTC de 17/07 = 23:00 SP de 16/07
    const d = new Date("2026-07-17T02:00:00.000Z");
    expect(formatDate(d)).toBe("16 de jul. de 2026");
  });

  it("formatWeekdayTime formata dia da semana + hora no horário SP", () => {
    const d = new Date("2026-07-16T23:00:00.000Z"); // qui., 20:00 SP
    expect(formatWeekdayTime(d)).toBe("qui., 16 de jul., 20:00");
  });
});
