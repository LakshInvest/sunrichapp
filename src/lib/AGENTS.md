# src/lib rules

- `otp.functions.ts`: `sendOtp` returns `use_pin` for `is_demo_mobile` numbers (no WhatsApp); public server fns (service role inside handlers); `pinLogin` calls service-role `check_pin`; `verifyOtp` returns `trusted` for the sent device id. Why: no passwords; server decides device trust.
- `catalogue.ts` `fetchCatalogue()` is the only catalogue source (authenticated `my_catalogue` RPC, caches last good copy, served without network when under 5 min old unless `{force:true}`; `arrangeCatalogue` sorts by category then product sort_order and drops empty categories); favourites via `toggle_favourite`; Home content from `app_hero`, `app_home_sections`, `product_categories`, `app_banners`; null image URLs use bundled fallbacks by product code. Why: never query price-plan tables directly.
- `registration.functions.ts` reads; writes via `start_registration`, `add_customer_document`, `submit_registration`; docs upload to `customer-docs` at `<customer_id>/<uuid>.<ext>`. Why: existing schema only.
- `profile.functions.ts` `clearMyPhoto` is the only way to null a photo (RPC coalesces null; no own-update RLS). Avatars: `avatars` bucket at exactly `<user_id>/avatar-<timestamp>.jpg`, 512×512 JPEG < 300 KB, old file deleted after swap. Why: backend constraints.
- `query-staff.functions.ts` `getStaffNames` and `invoice.functions.ts` `getInvoiceFirm` verify access via RLS, then read `user_profiles` / `firms`+`firm_bank_accounts` with the service role. Why: customers cannot select those rows.
- `billing.ts` reads invoices/receipts and `customer_open_bills`/`customer_statement` RPCs. Why: RLS scopes them to the customer.
- `orders.ts`: own-order filter relies on `customer_id` in ORDER_SELECT; keep it in sync with `fetchMyOrders()`. Shared order/status label helpers live in `order-format.ts`. Why: RLS also returns distributor-routed rows.
- `app-settings.ts` is the only reader of Command Center `app_settings`; screens use `useAppSettings()` and its pure rule helpers. Why: one cache, testable rules.
- `native.ts` wraps Capacitor and must stay a no-op on the web; plugins are imported dynamically. Why: the web app must not depend on native APIs.
