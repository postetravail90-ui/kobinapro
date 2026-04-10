# Paystack

## Webhook

- Edge Function : `supabase/functions/paystack-webhook`
- Verification : HMAC SHA-512, header `X-Paystack-Signature`
- Idempotence : table `paystack_webhook_events`, contrainte unique sur `reference`
- Variables Deno : `PAYSTACK_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

## Metadata attendue (charge.success)

Pour activer un abonnement, envoyer dans les metadata Paystack :

- `business_id` : UUID du business
- `plan_id` : UUID du plan
