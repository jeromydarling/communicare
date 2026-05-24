// A hand-drawn-feel farm scene SVG, used as the photo-bleed on /come-in.
// No external image dependency — renders crisp at any size, no broken
// assets if the network is flaky.

export function FarmScene({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 1200"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden
    >
      <defs>
        {/* Dawn-warm sky gradient */}
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFEADB" />
          <stop offset="35%" stopColor="#F8DEC9" />
          <stop offset="55%" stopColor="#EFD5C1" />
          <stop offset="100%" stopColor="#B5563E" />
        </linearGradient>
        {/* Distant hills */}
        <linearGradient id="hills-back" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7D2C18" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#56423E" stopOpacity="0.85" />
        </linearGradient>
        {/* Mid hills */}
        <linearGradient id="hills-mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4F6B55" />
          <stop offset="100%" stopColor="#324D38" />
        </linearGradient>
        {/* Foreground field */}
        <linearGradient id="field" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ECC15F" />
          <stop offset="100%" stopColor="#8F6D0E" />
        </linearGradient>
        {/* Sun glow */}
        <radialGradient id="sun-glow" cx="0.7" cy="0.35" r="0.4">
          <stop offset="0%" stopColor="#FFFCEE" stopOpacity="0.9" />
          <stop offset="40%" stopColor="#ECC15F" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ECC15F" stopOpacity="0" />
        </radialGradient>
        {/* SVG noise filter for grain */}
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0.15  0 0 0 0 0.10  0 0 0 0 0.05  0 0 0 0.18 0" />
          <feComposite operator="in" in2="SourceGraphic" />
        </filter>
      </defs>

      {/* Sky */}
      <rect x="0" y="0" width="800" height="900" fill="url(#sky)" />
      <rect x="0" y="0" width="800" height="900" fill="url(#sun-glow)" />

      {/* Sun */}
      <circle cx="560" cy="420" r="60" fill="#FFEADB" opacity="0.85" />
      <circle cx="560" cy="420" r="40" fill="#FFF8F5" />

      {/* Far hills */}
      <path
        d="M 0 720 C 100 680, 200 700, 320 685 C 440 670, 560 695, 680 678 C 740 670, 780 680, 800 685 L 800 900 L 0 900 Z"
        fill="url(#hills-back)"
      />

      {/* Mid hills */}
      <path
        d="M 0 800 C 80 780, 180 800, 280 790 C 380 780, 460 800, 560 795 C 660 790, 740 800, 800 795 L 800 900 L 0 900 Z"
        fill="url(#hills-mid)"
      />

      {/* Field with subtle furrows */}
      <rect x="0" y="880" width="800" height="320" fill="url(#field)" />
      <g stroke="#8B6818" strokeOpacity="0.35" strokeWidth="2" fill="none">
        <path d="M 0 920 Q 400 905, 800 925" />
        <path d="M 0 960 Q 400 945, 800 965" />
        <path d="M 0 1010 Q 400 990, 800 1015" />
        <path d="M 0 1070 Q 400 1045, 800 1075" />
        <path d="M 0 1140 Q 400 1110, 800 1145" />
      </g>

      {/* Distant tree line */}
      <g fill="#324D38" opacity="0.85">
        <ellipse cx="80" cy="790" rx="28" ry="22" />
        <ellipse cx="140" cy="785" rx="20" ry="18" />
        <ellipse cx="200" cy="788" rx="32" ry="24" />
        <ellipse cx="380" cy="790" rx="22" ry="20" />
        <ellipse cx="640" cy="788" rx="36" ry="28" />
        <ellipse cx="700" cy="785" rx="24" ry="20" />
      </g>

      {/* Barn — left, in silhouette against the hills */}
      <g transform="translate(160, 740)">
        {/* Barn body */}
        <path
          d="M 0 60 L 0 25 L 50 0 L 100 25 L 100 60 Z"
          fill="#1A1410"
          stroke="#1F140A"
          strokeWidth="1"
        />
        {/* Door */}
        <rect x="38" y="35" width="24" height="25" fill="#1F140A" />
        <line x1="50" y1="35" x2="50" y2="60" stroke="#3A2A1A" strokeWidth="0.5" />
        {/* Roof line accent */}
        <path d="M 0 25 L 50 0 L 100 25" fill="none" stroke="#8F6D0E" strokeWidth="1.2" />
        {/* Silo */}
        <rect x="100" y="20" width="12" height="40" fill="#1A1410" />
        <ellipse cx="106" cy="20" rx="6" ry="3" fill="#1A1410" />
      </g>

      {/* Fence */}
      <g stroke="#3A2A1A" strokeWidth="2" fill="none" opacity="0.85">
        <line x1="0" y1="850" x2="800" y2="855" />
        <line x1="0" y1="865" x2="800" y2="868" />
        {Array.from({ length: 24 }).map((_, i) => {
          const x = (i * 800) / 24;
          return <line key={i} x1={x} y1="845" x2={x} y2="880" />;
        })}
      </g>

      {/* A single wheat sheaf in the lower right corner */}
      <g transform="translate(670, 990) scale(2.5)" fill="#8F6D0E" opacity="0.9">
        <line
          x1="12"
          y1="32"
          x2="12"
          y2="6"
          stroke="#8F6D0E"
          strokeWidth="1.2"
        />
        {[8, 12, 16, 20, 24].map((y, i) => (
          <g key={i}>
            <ellipse
              cx="9"
              cy={y}
              rx="2.6"
              ry="1.8"
              transform={`rotate(-35 9 ${y})`}
            />
            <ellipse
              cx="15"
              cy={y}
              rx="2.6"
              ry="1.8"
              transform={`rotate(35 15 ${y})`}
            />
          </g>
        ))}
        <ellipse cx="12" cy="5" rx="2.4" ry="2" />
      </g>

      {/* Grain overlay */}
      <rect
        x="0"
        y="0"
        width="800"
        height="1200"
        fill="rgba(26,20,16,0.06)"
        filter="url(#grain)"
      />
    </svg>
  );
}
