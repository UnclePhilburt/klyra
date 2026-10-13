# Supporter Edition setup — not live yet

Source: UnclePhilburt/klyra. Local integration only; no build or payment tests run.

## Provision
1. Apply supabase/migrations/20261012_supporter.sql to the existing Supabase project.
2. Configure cloudflare/commerce/wrangler.toml with the Square sandbox location and exact public webhook URL. Keep CHECKOUT_ENABLED=false.
3. Set Worker secrets using interactive `wrangler secret put`: SQUARE_ACCESS_TOKEN, SQUARE_WEBHOOK_SIGNATURE_KEY, SUPABASE_SERVICE_ROLE_KEY. Never commit or paste secrets into chat.
4. Bind a private R2 bucket as DOWNLOADS. Set WINDOWS_KEY and MAC_KEY to installer object keys.
5. Deploy the commerce Worker. Subscribe Square to payment.created, payment.updated, refund.created, refund.updated at its /webhook endpoint.
6. Set NEXT_PUBLIC_COMMERCE_URL to the Worker origin when building the website. Its SITE_ORIGIN must match the site origin.
7. Verify sandbox checkout, webhook rejection, duplicate delivery, refund revocation, cross-account isolation, and both downloads before production. No tests have been run yet.
8. Switch Square credentials/location/webhook and SQUARE_ENVIRONMENT to production, verify again, then enable checkout and publish the website. Production ignores sandbox purchases.

## Important remaining access integration
Existing CDN installer/game URLs are public. Website download gating alone does NOT prevent direct downloads or enforce ownership in the launcher/game. Before selling desktop access, protect game distribution and have the launcher/backend check the authenticated account's production entitlement. Preserve free browser access. Decide how existing users should be handled before enforcement. Do not simply enable checkout and claim complete protection.

## Behavior
The server chooses USD 4.99 and the account from verified Supabase authentication. Square's verified webhook and a fresh payment/order lookup update purchase records. Clients cannot write these tables. Status is derived from completed, unrefunded purchases; any refund removes that purchase's access. Duplicate and older webhooks cannot overwrite newer payment state. Receipts stay attached to their account.

## Further hardening before launch
Add request rate limiting and pending-checkout reuse, dispute handling, webhook reconciliation for missed events, and operational alerts. Download endpoint currently buffers installers in the browser; signed short-lived streaming downloads are preferable for large game archives.
