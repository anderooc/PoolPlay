/**
 * Returns true if the email appears to use an institutional / academic domain.
 * Signup is restricted to these patterns; adjust the list if you need more regions.
 */
export function isCollegeEmail(email: string): boolean {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at < 1) return false;
  const domain = trimmed.slice(at + 1);
  if (!domain || domain.includes("..")) return false;

  const academicSuffixes = [
    ".edu", // US and some international
    ".ac.uk",
    ".edu.au",
    ".ac.nz",
    ".edu.sg",
    ".ac.za",
  ];

  return academicSuffixes.some((suffix) => domain.endsWith(suffix));
}
