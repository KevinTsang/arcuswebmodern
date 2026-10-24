/**
 * ArcusLogo — the Arcus mark: six colored sectors around an isometric cube.
 *
 * Inline SVG so it stays crisp at any size; size it with className
 * (e.g. "w-8 h-8"). Decorative by default — pass `label` when the logo
 * isn't accompanied by visible "Arcus" text.
 */

interface ArcusLogoProps {
  className?: string;
  label?: string;
}

// Outer sectors, counterclockwise from 30°. Colors sampled from the mobile app icon.
const SECTORS = [
  { d: 'M0 0L86.6 -50A100 100 0 0 0 0 -100Z', fill: '#F28E5C' },
  { d: 'M0 0L0 -100A100 100 0 0 0 -86.6 -50Z', fill: '#ECCF59' },
  { d: 'M0 0L-86.6 -50A100 100 0 0 0 -86.6 50Z', fill: '#68CD81' },
  { d: 'M0 0L-86.6 50A100 100 0 0 0 0 100Z', fill: '#6287E0' },
  { d: 'M0 0L0 100A100 100 0 0 0 86.6 50Z', fill: '#493475' },
  { d: 'M0 0L86.6 50A100 100 0 0 0 86.6 -50Z', fill: '#EB5D5F' },
];

// Cube faces: top (split light/white), left, right.
const FACES = [
  { d: 'M0 0L53.7 -31L0 -62Z', fill: '#FFFFFF' },
  { d: 'M0 0L0 -62L-53.7 -31Z', fill: '#E8E8E8' },
  { d: 'M0 0L-53.7 -31L-53.7 31L0 62Z', fill: '#D1D1D1' },
  { d: 'M0 0L0 62L53.7 31L53.7 -31Z', fill: '#F6F6F6' },
];

export function ArcusLogo({ className, label }: ArcusLogoProps) {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  return (
    <svg viewBox="-101 -101 202 202" className={className} {...a11y}>
      {/* Matching thin strokes hide anti-aliasing seams between adjacent shapes */}
      {[...SECTORS, ...FACES].map(({ d, fill }) => (
        <path key={d} d={d} fill={fill} stroke={fill} strokeWidth={0.6} strokeLinejoin="round" />
      ))}
    </svg>
  );
}
