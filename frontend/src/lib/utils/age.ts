/** Mirrors the backend rule in schemas/patient.py: age is derived, never stored. */
export function calculateAge(dateOfBirth: string, today = new Date()): number {
  const dob = new Date(dateOfBirth);
  const hadBirthday =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  return today.getFullYear() - dob.getFullYear() - (hadBirthday ? 0 : 1);
}
