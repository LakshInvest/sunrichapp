import { useState } from "react";
import { cn } from "@/lib/utils";

export function initialsOf(name?: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return letters ? letters.toUpperCase() : "S";
}

/** Avatar circle: the profile photo when present, else initials on the primary colour. */
export function ProfileAvatar({
  src,
  name,
  className,
}: {
  src?: string | null | undefined;
  name?: string | null | undefined;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name ?? ""}
        onError={() => setFailed(true)}
        className={cn("aspect-square shrink-0 rounded-full bg-muted object-cover", className)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={name ?? ""}
      className={cn(
        "flex aspect-square shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground",
        className,
      )}
    >
      {initialsOf(name)}
    </div>
  );
}
