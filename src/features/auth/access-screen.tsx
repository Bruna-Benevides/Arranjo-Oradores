import { LockKeyhole } from "lucide-react";
import type { ReactNode } from "react";

interface AccessScreenProps {
  titulo: string;
  subtitulo: string;
  children: ReactNode;
}

export function AccessScreen({ titulo, subtitulo, children }: AccessScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-card">
        <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-accent">
          <LockKeyhole className="h-7 w-7 text-brand" />
        </span>
        <h1 className="font-display text-3xl font-semibold leading-tight text-foreground">
          {titulo}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitulo}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
