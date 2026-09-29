export function SpeakerIcon({ level }: { level: number }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
      {level > 0.02 && (
        <path
          d="M16.5 9c1 1 1 5 0 6"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity={level > 0.5 ? 1 : 0.45}
        />
      )}
      {level > 0.5 && (
        <path
          d="M19 6.5c2.2 2.2 2.2 8.8 0 11"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      )}
      {level <= 0.02 && (
        <path d="M17 8.5l4 4m0-4l-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      )}
    </svg>
  );
}

export function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M19.4 13.6a7.6 7.6 0 0 0 0-3.2l1.9-1.3-1.6-2.8-2.2.7a7.7 7.7 0 0 0-2.8-1.6L14.3 3h-3.2l-.4 2.4a7.7 7.7 0 0 0-2.8 1.6l-2.2-.7-1.6 2.8 1.9 1.3a7.6 7.6 0 0 0 0 3.2l-1.9 1.3 1.6 2.8 2.2-.7a7.7 7.7 0 0 0 2.8 1.6l.4 2.4h3.2l.4-2.4a7.7 7.7 0 0 0 2.8-1.6l2.2.7 1.6-2.8-1.9-1.3Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
