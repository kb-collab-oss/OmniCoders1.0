// Logo : un carnet (couverture violette, reliure sombre) avec un signet jaune.
export default function Logo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <rect x="6" y="4" width="36" height="40" rx="8" fill="#2157F3" />
      <rect x="6" y="4" width="9" height="40" rx="4" fill="#0A2468" />
      <path d="M26 4h9v18l-4.5-4-4.5 4z" fill="#FFD84D" />
      <path d="M21 30h14M21 36h9" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}
