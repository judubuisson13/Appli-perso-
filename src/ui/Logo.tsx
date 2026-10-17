/** Emblème de l'appli : trois anneaux de laiton qui tournent lentement, comme un instrument d'horlogerie. */
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <circle className="ring r3" cx="24" cy="24" r="22" fill="none" stroke="var(--accent)" strokeOpacity="0.45" strokeWidth="1" strokeDasharray="1 4.2" />
      <path className="ring r1" d="M24 7 A17 17 0 1 1 7 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" />
      <path className="ring r2" d="M36 24 A12 12 0 0 1 12 24" fill="none" stroke="var(--accent-2)" strokeWidth="1.4" strokeLinecap="round" />
      <circle className="core" cx="24" cy="24" r="3.6" fill="var(--accent)" />
    </svg>
  );
}
