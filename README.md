# Fleai

PWA mobile-first per valutare ritrovamenti da mercatino e trasformarli in annunci pronti alla vendita. L’interfaccia è in italiano, i calcoli usano EUR e il checkout non fa parte dell’MVP.

## Cosa include

- Hunting con 1–3 foto reali, comparabili web citati, fascia di rivendita, prezzo massimo, rischi e affidabilità calcolata dall’app.
- Shop con bozza Vinted, hero, scena contestualizzata, try-on adulto sintetico, formati 4:5/9:16, caption e slideshow Creatomate.
- Foto reali separate dagli asset generati; ogni asset AI viene ricodificato con watermark “Visualizzazione AI”.
- Shop pubblico e richieste di prenotazione senza pagamento; l’accettazione riserva l’oggetto e chiude le altre richieste.
- Supabase Auth, PostgreSQL, Storage, RLS, PGMQ, Edge Function consumer, Cron e retention.

Senza variabili d’ambiente l’app parte in modalità demo completa.

## Avvio locale

Richiede Node 20.9+ e npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Apri `http://localhost:3000`. Per lavorare con Supabase locale serve anche un daemon Docker attivo:

```bash
npm run supabase:start
npm run supabase:reset
```

## Configurazione Supabase

1. Applica in ordine le migrazioni in `supabase/migrations`, inclusa `20260719160000_profile_super_admin.sql`, prima del deploy Next.js.
2. Configura Auth email OTP e Google; aggiungi `/auth/callback` agli URL consentiti.
3. Imposta i secret della Edge Function: `APP_URL` e `INTERNAL_WORKER_SECRET` oltre ai secret Supabase automatici.
4. Salva in Vault l’URL completo della Function e la publishable key usati dal Cron:

```sql
select vault.create_secret('https://PROJECT.supabase.co/functions/v1/process-ai-jobs', 'fleai_worker_url');
select vault.create_secret('PUBLISHABLE_KEY', 'fleai_anon_key');
```

5. Distribuisci il consumer:

```bash
npx supabase functions deploy process-ai-jobs
```

Le policy Storage vincolano il bucket privato al primo segmento `auth.uid()`; il bucket pubblico riceve soltanto copie approvate dal route handler server. Riferimenti: [Storage RLS](https://supabase.com/docs/guides/storage/security/access-control), [PGMQ](https://supabase.com/docs/guides/queues/pgmq), [Cron + Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions).

## Super Admin

Il backoffice globale vive in `/admin` ed è separato dal workspace personale `/app`. Dopo aver applicato la migrazione più recente, apri **Table Editor → profiles** nel pannello Supabase e imposta `is_super_admin = true` sull'utente autorizzato. Il controllo legge il profilo a ogni richiesta: basta ricaricare Fleai.

Il ruolo è protetto dal trigger insieme a sospensioni e quote e non è modificabile dagli utenti normali. Sospensioni, moderazione, transizioni commerciali e modifiche amministrative sono validate lato server e registrate in `admin_audit_logs`.

## Provider

- OpenAI Responses: `OPENAI_FAST_MODEL=gpt-5.6-luna` gestisce riconoscimento e ricerca iniziali; se non identifica l'oggetto, non trova fonti o non conserva alcun comparabile EUR valido, la pipeline riprova con `OPENAI_ANALYSIS_MODEL=gpt-5.6-terra`. La sintesi resta sempre sul modello più capace e usa output Zod strict. Vedi la [guida ufficiale ai modelli GPT-5.6](https://developers.openai.com/api/docs/guides/latest-model).
- GPT Image: `OPENAI_IMAGE_MODEL=gpt-image-2-2026-04-21`; gli edit usano alta fedeltà e ricevono il watermark lato server.
- Creatomate: il template verticale deve esporre gli elementi dinamici `Title`, `Price`, `Image-1`, `Image-2`, `Image-3`. Il callback è verificato con metadata HMAC e stato recuperato server-side tramite API v2.
- Turnstile e Resend proteggono/notificano il modulo anonimo. Una mail fallita non elimina la richiesta.

I nomi completi delle variabili sono in `.env.example`. Non esporre mai service role, OpenAI key o secret provider con prefisso `NEXT_PUBLIC_`.

## Verifiche

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

La suite comprende formule Hunting, contratti AI, retry/idempotenza, error classification, dataset da 90 casi, percorsi demo e viewport 360/768/1440. `supabase/tests/rls.test.sql` copre anonimo, owner, altro utente, admin, email private e bucket; si esegue con `npx supabase test db` dopo l’avvio locale.

## Rollout

Usa progetti Supabase e Vercel separati per staging e produzione. Applica le migrazioni prima del codice, distribuisci la Function, configura i secret, poi verifica una lavorazione reale e un callback Creatomate in staging. Gli upload orfani vengono eliminati dopo 24 ore e le email delle richieste chiuse vengono anonimizzate dopo 90 giorni.
