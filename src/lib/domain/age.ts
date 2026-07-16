export function yearsOldOn(birthDate: Date, on: Date): number {
  let age = on.getFullYear() - birthDate.getFullYear();
  const m = on.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && on.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
}

export function isAtLeast18(birthDate: Date, on: Date = new Date()): boolean {
  return yearsOldOn(birthDate, on) >= 18;
}
