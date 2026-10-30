import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Star } from "lucide-react";
import { FEEDBACK_TAGS, rateMyOrder, skipRating } from "@/lib/feedback";
import { serverMessage } from "@/lib/form-errors";

/** Star rating + quick tags + comment for a delivered order. */
export function RateOrderCard({
  orderId,
  orderNo,
  onDone,
  allowSkip = false,
}: {
  orderId: string;
  orderNo: string;
  onDone: (rating: number) => void;
  allowSkip?: boolean;
}) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!rating || saving) return;
    setSaving(true);
    try {
      await rateMyOrder(orderId, rating, tags, comment);
      toast.success(t("feedback.thanks"));
      onDone(rating);
    } catch (e) {
      toast.error(serverMessage(e, t("registration.errGeneric")));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-accent/40 bg-accent/5 p-4 shadow-sm">
      <p className="text-sm font-bold text-foreground">{t("feedback.title")}</p>
      <p className="text-xs text-muted-foreground">{t("feedback.sub", { no: orderNo })}</p>
      <div className="mt-2 flex gap-1" role="radiogroup" aria-label={t("feedback.title")}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={t("feedback.stars", { count: n })}
            onClick={() => setRating(n)}
            className="flex h-11 w-11 items-center justify-center rounded-xl transition active:scale-90"
          >
            <Star className={`h-7 w-7 ${n <= rating ? "fill-accent text-accent" : "text-muted-foreground"}`} aria-hidden />
          </button>
        ))}
      </div>
      {rating > 0 && (
        <>
          <div className="mt-2 flex flex-wrap gap-2">
            {FEEDBACK_TAGS.map((tag) => {
              const on = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setTags((x) => (on ? x.filter((y) => y !== tag) : [...x, tag]))}
                  className={`min-h-9 rounded-full border px-3 text-xs font-semibold ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}
                >
                  {t(`feedback.tags.${tag}`)}
                </button>
              );
            })}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            rows={2}
            placeholder={t("feedback.commentPh")}
            className="mt-3 w-full rounded-xl border border-input bg-card px-3 py-2 text-foreground outline-none focus:border-secondary"
          />
        </>
      )}
      <div className="mt-3 flex gap-2">
        {allowSkip && (
          <button
            type="button"
            onClick={() => {
              skipRating(orderId);
              onDone(0);
            }}
            className="min-h-11 flex-1 rounded-xl border border-border bg-card text-sm font-semibold text-foreground"
          >
            {t("feedback.skip")}
          </button>
        )}
        <button
          type="button"
          disabled={!rating || saving}
          onClick={() => void submit()}
          className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {t("feedback.submit")}
        </button>
      </div>
    </section>
  );
}
