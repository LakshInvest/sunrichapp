import { useTranslation } from "react-i18next";
import { CloudOff, PackageSearch, RefreshCw, SearchX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SmartImage } from "@/components/SmartImage";

/** Skeletons shown while catalogue data loads. */
export function HeroSkeleton() {
  return (
    <div className="px-5 pb-20 pt-6">
      <Skeleton className="h-5 w-28 rounded-full" />
      <Skeleton className="mt-6 h-10 w-3/5" />
      <Skeleton className="mt-3 h-4 w-2/5" />
    </div>
  );
}

export function GridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 px-5">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-2.5">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="mt-2 h-4 w-4/5" />
          <Skeleton className="mt-1 h-3 w-1/2" />
          <div className="mt-2 flex items-center justify-between">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-9 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChipsSkeleton() {
  return (
    <div className="mt-5 flex gap-2 overflow-hidden px-5">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-11 w-24 shrink-0 rounded-full" />
      ))}
    </div>
  );
}

export function BannerSkeleton() {
  return (
    <div className="mt-5 px-5">
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}

/** Data screen error with a Retry button. */
export function ErrorState({ message, onRetry }: { message?: string | null; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-3 px-8 py-14 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <CloudOff className="h-8 w-8 text-destructive" aria-hidden />
      </span>
      <p className="text-base font-semibold text-foreground">{t("errors.title")}</p>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition active:scale-95"
      >
        <RefreshCw className="h-4 w-4" aria-hidden />
        {t("errors.retry")}
      </button>
    </div>
  );
}

/** Friendly empty state. */
export function EmptyState({
  title,
  body,
  icon = PackageSearch,
}: {
  title: string;
  body?: string;
  icon?: typeof PackageSearch;
}) {
  const Icon = icon;
  return (
    <div className="flex flex-col items-center px-8 py-14 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
        <Icon className="h-8 w-8 text-secondary" aria-hidden />
      </span>
      <p className="mt-4 text-base font-semibold text-foreground">{title}</p>
      {body && <p className="mt-1 max-w-72 text-sm text-muted-foreground">{body}</p>}
    </div>
  );
}

/** Search found nothing — offer the Sunrich team. */
export function NoResultsState() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={SearchX}
      title={t("catalog.noResultsTitle")}
      body={t("catalog.noResultsBody")}
    />
  );
}

/** Small banner image for an empty catalogue row. */
export function CatalogueImage({
  src,
  alt,
  className,
  fallbackSrc,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackSrc?: string | null;
}) {
  return <SmartImage src={src} alt={alt} className={className} fallbackSrc={fallbackSrc} />;
}
