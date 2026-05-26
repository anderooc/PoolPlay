export type RegistrationSchoolFields = {
  id: string;
  status: string;
  teamId: string;
  teamUniversity: string;
  schoolId: string | null;
  schoolName: string | null;
};

export type PendingSchoolGroup<T extends RegistrationSchoolFields> = {
  key: string;
  label: string;
  /** Shown under the school name when linked to a school program. */
  subtitle: string | null;
  registrations: T[];
};

export function groupPendingRegistrationsBySchool<T extends RegistrationSchoolFields>(
  registrations: T[]
): PendingSchoolGroup<T>[] {
  const map = new Map<string, PendingSchoolGroup<T>>();

  for (const reg of registrations) {
    const key = reg.schoolId ?? `team:${reg.teamId}`;
    const label = reg.schoolName ?? reg.teamUniversity;
    const subtitle = reg.schoolId ? reg.teamUniversity : null;
    const existing = map.get(key);
    if (existing) {
      existing.registrations.push(reg);
    } else {
      map.set(key, {
        key,
        label,
        subtitle,
        registrations: [reg],
      });
    }
  }

  return [...map.values()].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
  );
}
