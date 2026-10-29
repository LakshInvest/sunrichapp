import { useState } from "react";
import { cn } from "@/lib/utils";

export function initialsOf(name?: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return letters ? letters.toUpperCase() : "S";
}

/** Avatar circle: the profile photo when present, else initials on aqua. */
export function ProfileAvatar({
  src,
  name,
  className,
}: {
  src?: string | null;
  name?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name ?? ""}
        onError={() => setFailed(true)}
        className={cn("rounded-full object-cover", className)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={name ?? ""}
      className={cn(
        "flex items-center justify-center rounded-full bg-secondary font-bold text-primary-foreground",
        className,
      )}
    >
      {initialsOf(name)}
    </div>
  );
}
