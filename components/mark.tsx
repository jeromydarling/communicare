type Props = {
  className?: string;
};

export function Mark({ className }: Props) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M24 8 C 22 18, 22 30, 24 40 M24 8 C 26 18, 26 30, 24 40"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M16 15 C 19 18, 22 21, 24 24 M32 15 C 29 18, 26 21, 24 24"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M14 23 C 18 25, 22 26, 24 27 M34 23 C 30 25, 26 26, 24 27"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M16 31 C 19 32, 22 33, 24 33 M32 31 C 29 32, 26 33, 24 33"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wheat({ className }: Props) {
  return (
    <svg
      viewBox="0 0 24 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 31 L12 6"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {[8, 12, 16, 20, 24].map((y, i) => (
        <g key={i}>
          <ellipse
            cx="9"
            cy={y}
            rx="2.6"
            ry="1.8"
            transform={`rotate(-35 9 ${y})`}
            fill="currentColor"
            opacity="0.85"
          />
          <ellipse
            cx="15"
            cy={y}
            rx="2.6"
            ry="1.8"
            transform={`rotate(35 15 ${y})`}
            fill="currentColor"
            opacity="0.85"
          />
        </g>
      ))}
      <ellipse cx="12" cy="5" rx="2.4" ry="2" fill="currentColor" />
    </svg>
  );
}

export function Sun({ className }: Props) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle
        cx="20"
        cy="20"
        r="7"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="currentColor"
        fillOpacity="0.2"
      />
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const x1 = 20 + Math.cos(angle) * 11;
        const y1 = 20 + Math.sin(angle) * 11;
        const x2 = 20 + Math.cos(angle) * 17;
        const y2 = 20 + Math.sin(angle) * 17;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

export function Jar({ className }: Props) {
  return (
    <svg
      viewBox="0 0 32 40"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="10"
        y="3"
        width="12"
        height="4"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M8 9 L8 35 Q8 38 11 38 L21 38 Q24 38 24 35 L24 9 Z"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="currentColor"
        fillOpacity="0.12"
      />
      <line
        x1="8"
        y1="14"
        x2="24"
        y2="14"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="2 2"
        opacity="0.5"
      />
    </svg>
  );
}

export function Leaf({ className }: Props) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M5 27 C 5 12, 16 5, 27 5 C 27 16, 20 27, 5 27 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="currentColor"
        fillOpacity="0.15"
      />
      <path
        d="M5 27 C 12 21, 18 15, 25 8"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}

export function Barn({ className }: Props) {
  return (
    <svg
      viewBox="0 0 48 40"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M4 38 L4 18 L24 4 L44 18 L44 38 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="currentColor"
        fillOpacity="0.12"
      />
      <path
        d="M4 18 L24 4 L44 18"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="18"
        y="22"
        width="12"
        height="16"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <line x1="24" y1="22" x2="24" y2="38" stroke="currentColor" strokeWidth="1" />
      <line x1="18" y1="30" x2="30" y2="30" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
