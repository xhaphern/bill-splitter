interface GoogleProps {
  className?: string;
}

export function Google({ className = "h-6 w-6" }: GoogleProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6 1.54 7.38 2.84l5.02-4.91C33.64 4.1 29.3 2 24 2 14.82 2 7.39 7.64 4.7 15.17l6.45 5.02C12.62 13.8 17.83 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h12.65c-.55 2.98-2.15 5.51-4.58 7.21l7.01 5.44C43.8 37.23 46.5 31.4 46.5 24.5z"
      />
      <path
        fill="#FBBC05"
        d="M11.15 20.19l-6.45-5.02C3.64 18.6 3 21.46 3 24.5c0 3 .64 5.86 1.7 8.33l6.48-5.06c-.38-1.18-.58-2.44-.58-3.77 0-1.3.21-2.55.55-3.81z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.85 0 10.77-1.93 14.36-5.23l-7.01-5.44c-1.95 1.31-4.46 2.1-7.35 2.1-6.17 0-11.38-4.3-13.2-10.13l-6.48 5.06C7.39 40.36 14.82 46 24 46z"
      />
      <path fill="none" d="M3 3h42v42H3z" />
    </svg>
  );
}
