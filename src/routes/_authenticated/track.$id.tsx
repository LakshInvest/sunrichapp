import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, Check, Clock, Download, FileText, HelpCircle, Loader2, Minus, Phone, Plus, RefreshCw, StickyNote, Truck, UserRound } from "lucide-react";
import en from "@/locales/en.json";
import { PageShell } from "@/components/PageShell";
import { SheetDrawer } from "@/components/SheetDrawer";
import { ErrorState } from "@/components/catalog/states";
import { PaySection } from "@/components/quote/PaySection";
import { useLang } from "@/hooks/use-lang";
import { useOffline } from "@/hooks/use-offline";
import { useDataRefresh } from "@/hooks/use-data-refresh";
import { useAppSettings } from "@/lib/app-settings";
import { formatINR } from "@/lib/catalogue";
import { serverMessage } from "@/lib/form-errors";
import { indDate, indDateTime } from "@/lib/order-format";
import { requestDataRefresh } from "@/lib/data-refresh";
import { supabase } from "@/integrations/supabase/client";
import { billPdfUrl, discountLabel, fetchOrderExtras, type OrderExtras } from "@/lib/order-extras";
import { getPodUrls } from "@/lib/pod.functions";
import { isNative, shareLink } from "@/lib/native";
import {
  TONE_CLASS, TRACK_STEPS, addOrderNote, changedQty, countdown, fetchOrderDetail, requoteOrder, respondQuote, statusTone, trackStep, whoKey, type QuoteDetail,
} from "@/lib/quote-flow";

export const Route = createFileRoute("/_authenticated/track/$id")({
  head: () => ({
    meta: [
      { title: en.trackDetail.metaTitle },
      { name: "description", content: en.trackDetail.metaDescription },
      { property: "og:title", content: en.trackDetail.metaTitle },
      { property: "og:description", content: en.trackDetail.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { pay?: 1 } => (s["pay"] ? { pay: 1 } : {}),
  component: OrderPage,
});

function OrderPage() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const offline = useOffline();
  const settings = useAppSettings();
  const deva = lang === "en" ? "" : "font-deva";
  const [d, setD] = useState<QuoteDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState<"ask" | "reason" | null>(null);
  const [reason, setReason] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [, tick] = useState(0);
  const [x, setX] = useState<OrderExtras | null>(null);
  const [pods, setPods] = useState<Record<string, string | null>>({});
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setD(await fetchOrderDetail(id)); setError(null); } catch (e) { setError(serverMessage(e, t("common.loadError"))); }
    fetchOrderExtras(id).then(setX, (e) => console.warn("[sunrich] order extras", e));
  }, [id, t]);
  useEffect(() => { void load(); }, [load]);
  useDataRefresh(load, load);
  useEffect(() => {
    const ch = supabase.channel(`order-${id}`).on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `id=eq.${id}` }, () => void load()).subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [id, load]);
  useEffect(() => {
    for (const p of x?.parts ?? []) {
      if (!p.delivered_at || p.order_id in pods) continue;
      setPods((m) => ({ ...m, [p.order_id]: null }));
      getPodUrls({ data: { orderId: p.order_id } }).then((u) => setPods((m) => ({ ...m, [p.order_id]: u.photoUrl })), () => undefined);
    }
  }, [x, pods]);
  const openBill = async (path: string, no: string | null) => {
    setPdfBusy(path);
    try {
      const url = await billPdfUrl(path);
      if (!url) throw new Error("no url");
      if (isNative()) await shareLink({ title: no ?? t("quote.bill"), url });
      else window.open(url, "_blank", "noopener");
    } catch (e) { toast.error(serverMessage(e, t("quote.billError"))); }
    finally { setPdfBusy(null); }
  };
  useEffect(() => { const h = setInterval(() => tick((n) => n + 1), 60_000); return () => clearInterval(h); }, []);

  const act = async (fn: () => Promise<unknown>, ok?: string) => {
    if (busy || offline) return;
    setBusy(true);
    try { await fn(); if (ok) toast.success(ok); setEdits({}); requestDataRefresh(); await load(); }
    catch (e) { toast.error(serverMessage(e, t("quote.actionError"))); }
    finally { setBusy(false); }
  };

  const back = () => (window.history.length > 1 ? window.history.back() : void navigate({ to: "/track" }));
  const header = (
    <header className="sticky top-0 z-30 flex items-center gap-2 bg-background/95 px-3 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur-md">
      <button type="button" onClick={back} aria-label={t("registration.back")} className="flex h-11 w-11 items-center justify-center rounded-xl active:scale-95"><ArrowLeft className="h-5 w-5" /></button>
      <p className="min-w-0 flex-1 truncate text-base font-bold text-primary">{d?.order.order_no ?? ""}</p>
      <button type="button" onClick={() => void navigate({ to: "/queries/ask", search: { order: id, topic: undefined, subject: undefined, message: undefined, product: undefined } })} className="flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-primary"><HelpCircle className="h-4 w-4" />{t("quote.help")}</button>
    </header>
  );

  if (error && !d) return <PageShell>{header}<div className="px-5 pt-10"><ErrorState message={error} onRetry={() => void load()} /></div></PageShell>;
  if (!d) return <PageShell>{header}<div className="space-y-3 px-5 pt-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />)}</div></PageShell>;

  const o = d.order;
  const st = o.status;
  const paid = d.items.filter((i) => !i.is_free);
  const free = d.items.filter((i) => i.is_free);
  const left = countdown(o.quote_expires_at);
  const lastReject = d.payments[0]?.status === "rejected" ? d.payments[0] : d.payments.find((p) => p.reject_reason);
  const cancelNote = [...d.history].reverse().find((h) => h.status === "cancelled")?.note;
  const who = (by: string | null) => t(`quote.who.${whoKey(by)}`);
  const qtyOf = (lineId: string, q: number) => edits[lineId] ?? q;
  const step = trackStep(st);

  const itemsPlain = (
    <ul className="space-y-1.5">{d.items.map((i) => <li key={i.line_id} className="flex justify-between gap-3 text-sm"><span className="min-w-0 truncate text-foreground">{i.name}{i.pack_label ? <span className="text-muted-foreground"> · {i.pack_label}</span> : null}</span><span className="shrink-0 font-semibold">×{i.qty}{i.is_free && <FreeTag t={t} />}</span></li>)}</ul>
  );

  return (
    <PageShell className={deva} onRefresh={load}>
      {header}
      <div className="space-y-3 px-5 pb-28 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${TONE_CLASS[statusTone(st)]}`}>{t(`quote.status.${st}`, { defaultValue: t(`status.${st}`, { defaultValue: st }) })}</span>
          {o.placed_by_kind === "salesman" && <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">{t("quote.bySalesman")}</span>}
          <span className="ml-auto text-xs text-muted-foreground">{o.delivery_mode === "pickup" ? t("quote.modePickup") : t("quote.modeDelivery")} · {indDate(o.delivery_date, lang)}</span>
        </div>

        {st === "quote_requested" && (
          <section className="rounded-xl bg-card p-5 text-center shadow-sm">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning/20"><Clock className="h-7 w-7 animate-pulse text-warning-foreground" /></span>
            <p className="mt-3 text-lg font-bold text-primary">{t("quote.waitingTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("quote.sentBody")}</p>
            <div className="mt-4 text-left">{itemsPlain}</div>
          </section>
        )}

        {st === "quote_sent" && (
          <section className="rounded-xl bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2"><p className="text-lg font-bold text-primary">{t("quote.rateCame")}</p>{left && <span className="rounded-full bg-warning/20 px-2.5 py-1 text-xs font-bold text-warning-foreground">{t("quote.timeLeft", { h: left.hours, m: left.minutes })}</span>}</div>
            <ul className="mt-3 divide-y divide-border">
              {paid.map((i) => {
                const q = qtyOf(i.line_id, i.qty);
                return (
                  <li key={i.line_id} className="py-2.5">
                    <div className="flex justify-between gap-3"><span className="min-w-0 text-sm font-semibold text-foreground">{i.name}{i.pack_label ? <span className="font-normal text-muted-foreground"> · {i.pack_label}</span> : null}</span><span className="shrink-0 text-sm font-bold text-foreground">{formatINR((i.rate ?? 0) * q)}</span></div>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">{formatINR(i.rate ?? 0)} × {q}</span>
                      <span className="flex items-center rounded-full border border-border">
                        <button type="button" aria-label={t("home.decreaseQty")} onClick={() => setEdits((e) => ({ ...e, [i.line_id]: Math.max(0, q - 1) }))} className="flex h-11 w-11 items-center justify-center"><Minus className="h-4 w-4" /></button>
                        <input inputMode="numeric" aria-label={t("home.typeQty")} value={q} onChange={(e) => setEdits((x) => ({ ...x, [i.line_id]: parseInt(e.target.value.replace(/\D/g, "") || "0", 10) }))} className="w-10 bg-transparent text-center text-sm font-bold outline-none" />
                        <button type="button" aria-label={t("home.increaseQty")} onClick={() => setEdits((e) => ({ ...e, [i.line_id]: q + 1 }))} className="flex h-11 w-11 items-center justify-center"><Plus className="h-4 w-4" /></button>
                      </span>
                    </div>
                  </li>
                );
              })}
              {free.map((i) => <li key={i.line_id} className="flex justify-between gap-3 py-2.5 text-sm"><span className="min-w-0 text-foreground">{i.name}<span className="block text-xs font-bold text-success">{t("quote.freeOffer", { count: i.qty })}</span>{i.scheme ? <span className="block text-xs text-muted-foreground">{i.scheme}</span> : null}</span><span className="shrink-0 font-bold text-success">{formatINR(0)}</span></li>)}
            </ul>
            <div className="mt-2 space-y-1 border-t border-border pt-3">
              {x?.totals?.subtotal != null && <p className="flex justify-between gap-3 text-sm"><span className="text-muted-foreground">{t("quote.subtotal")}</span><span className="font-semibold text-foreground">{formatINR(x.totals.subtotal)}</span></p>}
              {(x?.discounts ?? []).filter((dc) => dc.amount).map((dc, k) => <p key={k} className="flex justify-between gap-3 text-sm font-semibold text-success"><span className="min-w-0">{discountLabel(dc, t("quote.discount"))}</span><span className="shrink-0">−{formatINR(dc.amount)}</span></p>)}
              <p className="flex items-end justify-between gap-3"><span className="text-sm font-semibold text-muted-foreground">{t("quote.grandTotal")}</span><span className="text-2xl font-bold text-primary">{formatINR(x?.totals?.grand_total ?? o.grand_total ?? 0)}</span></p>
            </div>
            {Object.keys(edits).length > 0 && <p className="mt-1 text-xs text-muted-foreground">{t("quote.qtyChangedNote")}</p>}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" disabled={busy || offline} onClick={() => setRejectOpen("ask")} className="min-h-12 rounded-xl border border-border text-base font-bold text-foreground disabled:opacity-50">{t("quote.reject")}</button>
              <button type="button" disabled={busy || offline} onClick={() => void act(() => respondQuote(id, true, { qty: changedQty(d.items, edits) }), t("quote.approved"))} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{t("quote.approve")}</button>
            </div>
          </section>
        )}

        {(st === "quote_expired" || st === "quote_rejected") && (
          <section className="rounded-xl bg-card p-5 text-center shadow-sm">
            <p className="text-lg font-bold text-foreground">{t(st === "quote_expired" ? "quote.expiredTitle" : "quote.rejectedTitle")}</p>
            <div className="mt-3 text-left">{itemsPlain}</div>
            <button type="button" disabled={busy || offline} onClick={() => void act(() => requoteOrder(id), t("quote.sentTitle"))} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground disabled:opacity-50"><RefreshCw className="h-4 w-4" />{t("quote.requote")}</button>
          </section>
        )}

        {(st === "quote_accepted" || st === "payment_rejected") && (
          <>
            {st === "payment_rejected" && <p role="alert" className="rounded-xl bg-destructive/10 p-4 text-sm font-semibold text-destructive">{t("quote.payRejected")}{lastReject?.reject_reason ? `: ${lastReject.reject_reason}` : ""}</p>}
            <PaySection orderId={id} orderNo={o.order_no} offline={offline} onDone={() => { toast.success(t("quote.paySent")); requestDataRefresh(); void load(); }} />
          </>
        )}

        {st === "payment_submitted" && (
          <section className="rounded-xl bg-card p-5 text-center shadow-sm">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/20"><Loader2 className="h-7 w-7 animate-spin text-accent-foreground" /></span>
            <p className="mt-3 text-lg font-bold text-primary">{t("quote.payChecking")}</p>
            {d.payments[0] && <p className="mt-1 text-sm text-muted-foreground">{t(`quote.method.${d.payments[0].method}`, { defaultValue: d.payments[0].method })}{d.payments[0].reference ? ` · ${d.payments[0].reference}` : ""} · {formatINR(d.payments[0].amount ?? o.grand_total ?? 0)}</p>}
          </section>
        )}

        {step >= 0 && (
          <section className="rounded-xl bg-card p-4 shadow-sm">
            <ol className="space-y-3">
              <li className="flex items-center gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-primary-foreground"><Check className="h-4 w-4" /></span><span className="text-sm font-bold text-foreground">{t("quote.track.rate")}</span></li>
              {TRACK_STEPS.map((s, i) => (
                <li key={s} className="flex items-center gap-3">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${i <= step ? "bg-secondary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i <= step ? <Check className="h-4 w-4" /> : <span className="text-xs font-bold">{i + 2}</span>}</span>
                  <span className={`text-sm ${i <= step ? "font-bold text-foreground" : "text-muted-foreground"}`}>{t(`quote.track.${s}`)}</span>
                </li>
              ))}
            </ol>
            {o.grand_total != null && <p className="mt-3 flex justify-between border-t border-border pt-3 text-sm"><span className="text-muted-foreground">{t("quote.grandTotal")}</span><span className="font-bold text-primary">{formatINR(o.grand_total)}</span></p>}
          </section>
        )}
        {step >= 0 && x && x.parts.length > 0 && x.parts.map((p) => (
          <section key={p.order_id} className="rounded-xl bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2"><p className="min-w-0 truncate text-sm font-bold text-primary">{p.plant ?? t("quote.plant")}</p><span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${TONE_CLASS[statusTone(p.status)]}`}>{t(`quote.status.${p.status}`, { defaultValue: t(`status.${p.status}`, { defaultValue: p.status }) })}</span></div>
            {p.vehicle_no && <p className="mt-2 flex items-center gap-2 text-base font-bold tracking-wide text-foreground"><Truck className="h-4 w-4 shrink-0 text-secondary" />{p.vehicle_no}</p>}
            {p.driver_name && <p className="mt-1 flex items-center gap-2 text-sm text-foreground"><UserRound className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="min-w-0 truncate">{p.driver_name}</span>{p.driver_mobile && <a href={`tel:${p.driver_mobile}`} className="ml-auto flex min-h-11 shrink-0 items-center gap-1 rounded-xl bg-secondary/15 px-3 text-xs font-bold text-primary"><Phone className="h-3.5 w-3.5" />{t("quote.call")}</a>}</p>}
            {p.gate_out_at && <p className="mt-1 text-xs text-muted-foreground">{t("quote.leftPlant", { at: indDateTime(p.gate_out_at, lang) })}</p>}
            {p.delivered_at && <p className="mt-1 text-xs font-semibold text-success">{t("quote.deliveredAt", { at: indDateTime(p.delivered_at, lang) })}</p>}
            {p.delivered_at && (pods[p.order_id] ? <img src={pods[p.order_id]!} alt={t("quote.podPhoto")} loading="lazy" className="mt-2 max-h-56 w-full rounded-xl object-cover" /> : <p className="mt-1 text-xs text-muted-foreground">{t("quote.noPhoto")}</p>)}
          </section>
        ))}
        {(x?.bills ?? []).map((b) => (
          <section key={b.invoice_id} className="rounded-xl bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-primary">{t("quote.bill")} {b.invoice_no ?? ""}</p><p className="text-xs text-muted-foreground">{[b.invoice_date ? indDate(b.invoice_date, lang) : null, b.plant].filter(Boolean).join(" · ")}</p></div>{b.total != null && <p className="shrink-0 text-base font-bold text-foreground">{formatINR(b.total)}</p>}</div>
            {(b.einv || b.ewb_no) && <div className="mt-2 flex flex-wrap gap-1.5">{b.einv && <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">{t("quote.einv")}</span>}{b.ewb_no && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{t("quote.ewb", { no: b.ewb_no })}</span>}</div>}
            {b.pdf_path ? <button type="button" disabled={pdfBusy === b.pdf_path || offline} onClick={() => void openBill(b.pdf_path!, b.invoice_no)} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50">{pdfBusy === b.pdf_path ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{t("quote.downloadBill")}</button> : <p className="mt-2 text-xs text-muted-foreground">{t("quote.billSoon")}</p>}
          </section>
        ))}
        {step >= 0 && !(x && x.parts.length > 0) && d.parts.map((p) => (
          <section key={p.order_no} className="rounded-xl bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2"><p className="text-sm font-bold text-primary">{p.order_no}</p><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${TONE_CLASS[statusTone(p.status)]}`}>{t(`quote.status.${p.status}`, { defaultValue: p.status })}</span></div>
            {p.packs != null && <p className="mt-1 text-xs text-muted-foreground">{t("quote.packs", { count: p.packs })}</p>}
            {p.vehicle_no && <p className="mt-2 flex items-center gap-2 text-base font-bold tracking-wide text-foreground"><Truck className="h-4 w-4 text-secondary" />{p.vehicle_no}</p>}
            {p.transporter && <p className="text-xs text-muted-foreground">{p.transporter}</p>}
            {p.driver_name && <p className="mt-1 flex items-center gap-2 text-sm text-foreground"><UserRound className="h-4 w-4 text-muted-foreground" />{p.driver_name}{p.driver_mobile && <a href={`tel:${p.driver_mobile}`} className="ml-auto flex min-h-10 items-center gap-1 rounded-xl bg-secondary/15 px-3 text-xs font-bold text-primary"><Phone className="h-3.5 w-3.5" />{t("quote.call")}</a>}</p>}
            {p.invoice_id && <button type="button" onClick={() => void navigate({ to: "/invoice/$id", params: { id: p.invoice_id! } })} className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold"><FileText className="h-4 w-4" />{t("quote.viewBill")}{p.invoice_no ? ` · ${p.invoice_no}` : ""}</button>}
          </section>
        ))}

        {st === "cancelled" && <section className="rounded-xl bg-muted p-4"><p className="font-bold text-muted-foreground">{t("status.cancelled")}</p>{cancelNote && <p className="mt-1 text-sm text-muted-foreground">{cancelNote}</p>}</section>}

        {o.delivery_mode !== "pickup" && o.address && <p className="rounded-xl bg-card p-4 text-sm text-foreground shadow-sm"><span className="block text-xs font-semibold text-muted-foreground">{t("quote.step.address")}</span>{o.address}</p>}

        <section className="rounded-xl bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between"><p className="text-sm font-bold text-foreground">{t("quote.notes")}</p><button type="button" disabled={offline} onClick={() => setNoteOpen(true)} className="flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-bold text-primary disabled:opacity-50"><StickyNote className="h-4 w-4" />{t("quote.writeNote")}</button></div>
          {d.notes.length === 0 ? <p className="mt-1 text-xs text-muted-foreground">{t("quote.noNotes")}</p> : (
            <ul className="mt-2 space-y-2">{d.notes.map((n, i) => <li key={i} className="rounded-xl bg-muted px-3 py-2"><p className="text-sm text-foreground">{n.body}</p><p className="mt-0.5 text-xs text-muted-foreground">{who(n.by)} · {indDateTime(n.at, lang)}</p></li>)}</ul>
          )}
        </section>

        {d.history.length > 0 && (
          <details className="rounded-xl bg-card p-4 shadow-sm"><summary className="cursor-pointer text-sm font-bold text-foreground">{t("quote.history")}</summary>
            <ul className="mt-2 space-y-1.5">{d.history.map((h, i) => <li key={i} className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{t(`quote.status.${h.status ?? ""}`, { defaultValue: h.status ?? "" })}</span> · {who(h.by)} · {indDateTime(h.at, lang)}{h.note ? ` — ${h.note}` : ""}</li>)}</ul>
          </details>
        )}
      </div>

      <SheetDrawer open={rejectOpen !== null} onOpenChange={(v) => !v && setRejectOpen(null)}>
        <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {rejectOpen === "ask" ? (
            <>
              <p className="text-lg font-bold text-primary">{t("quote.talkFirst")}</p>
              {settings?.supportPhone && <a href={`tel:${settings.supportPhone}`} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground"><Phone className="h-4 w-4" />{t("quote.callUs")}</a>}
              <button type="button" onClick={() => setRejectOpen("reason")} className="mt-2 min-h-12 w-full rounded-xl border border-border font-bold text-destructive">{t("quote.rejectYes")}</button>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-primary">{t("quote.reasonTitle")}</p>
              <textarea value={reason} onChange={(e) => setReason(e.target.value.slice(0, 300))} rows={3} placeholder={t("quote.reasonPlaceholder")} className="mt-3 w-full rounded-xl border border-input bg-card p-3 text-base" />
              <button type="button" disabled={busy || offline} onClick={() => { setRejectOpen(null); void act(() => respondQuote(id, false, { reason: reason.trim() || null })); }} className="mt-3 min-h-12 w-full rounded-xl bg-destructive font-bold text-destructive-foreground disabled:opacity-50">{t("quote.reject")}</button>
            </>
          )}
        </div>
      </SheetDrawer>

      <SheetDrawer open={noteOpen} onOpenChange={setNoteOpen}>
        <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <p className="text-lg font-bold text-primary">{t("quote.writeNote")}</p>
          <textarea autoFocus value={noteText} onChange={(e) => setNoteText(e.target.value.slice(0, 500))} rows={4} className="mt-3 w-full rounded-xl border border-input bg-card p-3 text-base" />
          <button type="button" disabled={!noteText.trim() || busy || offline} onClick={() => { const body = noteText.trim(); setNoteOpen(false); setNoteText(""); void act(() => addOrderNote(id, body), t("quote.noteSaved")); }} className="mt-3 min-h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground disabled:opacity-50">{t("quote.save")}</button>
        </div>
      </SheetDrawer>
    </PageShell>
  );
}

function FreeTag({ t }: { t: (k: string) => string }) {
  return <span className="ml-1.5 rounded bg-success/15 px-1.5 py-0.5 text-xs font-bold text-success">{t("quote.free")}</span>;
}
