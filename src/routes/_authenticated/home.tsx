import { createFileRoute, useRoute, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import en from "@/locales/en.json";
import { getBrands, type Brand } from "@/lib/brands";
import { Logo } from "@/components/Logo";
import { BottomNav } from "@/components/BottomNav";
import { useLang } from "@/hooks/use-lang";

const brandsQueryOptions = queryOptions({
  queryKey: ["brands"],
  queryFn: () => getBrands(),
});

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: en.home.metaTitle },
      { name: "description", content: en.home.metaDescription },
      { property: "og:title", content: en.home.metaTitle },
      { property: "og:description", content: en.home.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(brandsQueryOptions),
  errorComponent: HomeError,
  component: Home,
});

function brandName(brand: Brand, lang: string): string {
  if (lang === "hi") return brand.nameHi || brand.name;
  if (lang === "mr") return brand.nameMr || brand.name;
  return brand.name;
}

function safeColor(hex: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : "#2EA3C7";
}

function BrandCard({ brand }: { brand: Brand }) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const name = brandName(brand, lang);
  return (
    <button
      type="button"
      className="w-full overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition active:scale-[0.99]"
      aria-label={t("home.title") + ": " + name}
    >
      <div
        className="h-2 w-full"
        style={{ backgroundColor: safeColor(brand.colorHex) }}
      />
      <div className="flex min-h-20 items-center justify-between px-5 py-4">
        <span
          className={`text-2xl font-semibold text-primary ${lang === "en" ? "" : "font-deva"}`}
        >
          {name}
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      </div>
    </button>
  );
}

function Home() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { data: brands } = useSuspenseQuery(brandsQueryOptions);

  return (
    <main
      className={`mx-auto min-h-screen max-w-md bg-background px-5 pb-28 pt-8 ${lang === "en" ? "" : "font-deva"}`}
    >
      <div className="flex items-center justify-between">
        <Logo size="md" />
      </div>
      <div className="mt-8 h-1 w-12 rounded-full bg-accent" />
      <h1 className="mt-4 text-3xl font-bold text-primary">{t("home.title")}</h1>
      <div className="mt-6 flex flex-col gap-4">
        {brands.map((brand) => (
          <BrandCard key={brand.id} brand={brand} />
        ))}
      </div>
      <BottomNav />
    </main>
  );
}

function HomeError({ error, reset }: ErrorComponentProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { lang } = useLang();
  return (
    <main
      className={`flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center ${lang === "en" ? "" : "font-deva"}`}
    >
      <p className="text-lg font-semibold text-primary">{t("home.loadError")}</p>
      <p className="text-sm text-muted-foreground">
        {error instanceof Error ? error.message : String(error)}
      </p>
      <button
        type="button"
        onClick={async () => {
          await router.invalidate({ sync: true });
          reset();
        }}
        className="min-h-12 rounded-xl bg-primary px-6 font-semibold text-primary-foreground shadow-md active:scale-[0.98]"
      >
        {t("home.retry")}
      </button>
      <BottomNav />
    </main>
  );
}
