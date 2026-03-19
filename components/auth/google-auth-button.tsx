import { Button } from "@/components/ui/button";

export function GoogleAuthButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void | Promise<void>;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 w-full rounded-full border-border/70 bg-background shadow-sm transition-colors hover:bg-muted/60"
      disabled={disabled}
      onClick={onClick}
    >
      <GoogleIcon className="mr-3 h-5 w-5 shrink-0" />
      <span className="font-medium text-foreground">{label}</span>
    </Button>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.44a5.5 5.5 0 0 1-2.39 3.61v2.99h3.86c2.26-2.08 3.58-5.15 3.58-8.63Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.86-2.99c-1.07.72-2.44 1.14-4.07 1.14-3.13 0-5.78-2.11-6.73-4.95H1.29v3.08A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.3A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.57.37-2.3V6.62H1.29A12 12 0 0 0 0 12c0 1.93.46 3.76 1.29 5.38l3.98-3.08Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.43-3.43C17.94 1.15 15.24 0 12 0A11.99 11.99 0 0 0 1.29 6.62L5.27 9.7C6.22 6.86 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}
