export function isMinor(dob: Date): boolean {
  const today = new Date();
  const age =
    today.getFullYear() -
    dob.getFullYear() -
    (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
      ? 1
      : 0);
  return age < 18;
}
