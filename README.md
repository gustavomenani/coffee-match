# Coffee Match

MVP web de **speed dating** para o Brasil: organizar e vender eventos, check-in no local, votação de interesse no celular e matches mútuos com revelação de contato (WhatsApp/Instagram).

## Stack

| Camada | Tecnologia |
|--------|------------|
| App | Next.js (App Router) + TypeScript + Tailwind |
| DB | Prisma + PostgreSQL |
| Auth | Auth.js (NextAuth v5) — e-mail + senha |
| Pagamentos | Mercado Pago (Preferences + Preapproval + webhook) |
| Notificações | E-mails HTML (Resend) + Web Push (VAPID) |

## Funcionalidades

- **Eventos públicos** — listagem e detalhe por slug, vagas por gênero, status (publicado / esgotado / ao vivo), filtro por cidade (`/eventos?cidade=...`) e seção de noites anteriores
- **Cadastro e login** — participante 18+, perfil com WhatsApp, Instagram, foto, bio e até 5 interesses; lockout após tentativas falhas + rate limiting persistente (Postgres)
- **Reset de senha** — `/esqueci-senha` + `/redefinir-senha`, token de uso único (só o hash SHA-256 vai ao banco), e-mail com link
- **Compra de ingresso** — checkout Mercado Pago (Pix/cartão) ou bypass de dev; 1 ingresso pago por usuário+evento; reuso de pending; cancelamento de pending expirado (>2h)
- **Assinatura Apoiador** — R$ 10/mês via Mercado Pago Preapproval (`/assinatura`): selo de apoiador + **acesso antecipado** às vendas (campo `earlyAccessUntil` do evento: enquanto ativo, só assinantes compram)
- **Reembolso** — total, pelo admin (reembolsa no MP antes de marcar o ingresso) e também via webhook (`refunded` / `charged_back`), sempre idempotente
- **Lista de espera "avise-me"** — captura de e-mail em evento esgotado (honeypot anti-bot, dedup por evento+e-mail); quando abre vaga, dispara e-mail automaticamente
- **Meus ingressos** — lista + QR de porta e de votação
- **Meus matches** — histórico de matches de todas as noites em `/meus-matches`
- **Admin** — CRUD de eventos, capacidade homens/mulheres, preço, acesso antecipado, status
- **Check-in** — lista de pagos na porta (noite), leitor de QR pela câmera (BarcodeDetector) ou check-in manual, exportação CSV
- **Sessão da noite** — abrir/fechar/reabrir votação
- **Votação** — cédula sim/não no celular (só check-in + votação aberta + WhatsApp), com bio e interesses de cada pessoa na cédula
- **Matches** — cálculo mútuo; revelação de contato (WhatsApp/Instagram); lista de quem curtiu; e-mail + push "matches prontos" ao fechar a votação
- **E-mails transacionais** — HTML com identidade visual: ingresso pago, lembrete D-1, vaga aberta, matches prontos, reset de senha (sem Resend configurado, loga no console + audit)
- **Web Push** — opt-in em `/minha-conta` (VAPID; gere as chaves com `npm run push:keys`); endpoints mortos são removidos automaticamente
- **PWA** — manifest + service worker network-first (instalável, recebe push)
- **Crons** — `expire-pending` (cancela pendings vencidos), `event-reminders` (lembrete D-1) e `cleanup-audit` (retenção de 90 dias do audit log), protegidos por `CRON_SECRET`
- **Webhook MP** — marca ingresso pago de forma idempotente (valida valor/moeda e assinatura); processa reembolsos e o ciclo de vida da assinatura; pode marcar evento esgotado
- **Segurança** — headers CSP/HSTS, sanitização de entradas, audit log, rate limiting compartilhado entre instâncias
- **Páginas legais** — termos, privacidade, regras, reembolso
- **Testes** — unitários (Vitest) + smoke E2E (Playwright)

## Pré-requisitos

- **Node.js 20+**
- **Docker** (recomendado para Postgres local) ou Postgres 16+
- npm

## Setup

### 1. Banco Postgres (Docker)

Porta padrão `5432`. Se estiver ocupada, use **5437**:

```bash
# porta 5432
docker run -d --name coffee-match-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=coffeematch \
  -p 5432:5432 \
  postgres:16

# alternativa se 5432 estiver ocupada
docker run -d --name coffee-match-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=coffeematch \
  -p 5437:5432 \
  postgres:16
```

### 2. Variáveis de ambiente

```bash
cp .env.example .env
```

Ajuste `DATABASE_URL` se usar a porta 5437:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5437/coffeematch?schema=public"
```

Gere um `AUTH_SECRET` real em produção:

```bash
openssl rand -base64 32
```

### 3. Dependências, schema e seed

```bash
npm i
npx prisma migrate dev   # aplica as migrations (ou: npx prisma db push em dev)
npm run db:seed
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

> **Migrations:** o repositório tem a baseline `prisma/migrations/0_init`. Em produção use `npm run db:migrate` (`prisma migrate deploy`); em dev, `npm run db:migrate:dev` cria novas migrations. `npm run db:push` continua funcionando para prototipagem local, mas não gera histórico.

### Conta admin (seed)

| Campo | Valor |
|-------|--------|
| E-mail | `admin@coffeematch.local` |
| Senha | `admin123456` |

**Troque a senha em produção.**

### Noite demo completa (opcional)

`npm run db:seed-demo` cria uma noite **ao vivo com votação aberta**: 8 homens + 8 mulheres pagos e com check-in, bios/interesses preenchidos, votos pré-lançados (4 matches garantidos ao fechar) e 2 assinantes de exemplo.

| Campo | Valor |
|-------|--------|
| Participantes | `rafael@demo.coffeematch.local`, `ana@demo.coffeematch.local`, ... (primeiro nome) |
| Senha (todos) | `demo123456` |

Dica: entre como `gustavo@demo.coffeematch.local` para votar do zero; como admin, encerre a votação para gerar os matches.

## Variáveis de ambiente

Espelha a validação de `src/lib/env.ts` (o app falha ao subir com config inválida em produção):

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | Postgres (Prisma) |
| `AUTH_SECRET` | Sim | Min. 16 chars (32+ e sem `change-me` em produção) |
| `AUTH_URL` | Não | URL base para o Auth.js |
| `NEXT_PUBLIC_APP_URL` | Em produção | URL pública do app (links de e-mail, QR, retorno do MP). Em produção, `NEXT_PUBLIC_APP_URL` **ou** `AUTH_URL` é obrigatória — sem uma delas o app subiria mandando links `http://localhost:3000` em e-mail de reset de senha |
| `TRUSTED_PROXY_HOPS` | Não | Quantos proxies confiáveis existem entre o cliente e o app (padrão `1`). Define de qual posição do `x-forwarded-for` o IP é lido — ver `src/lib/security/ip.ts`. `1` serve para Vercel e para um nginx único; use `2` se houver CDN na frente |
| `MERCADOPAGO_ACCESS_TOKEN` | Em produção | Token do MP; `TEST-DEV-BYPASS` é proibido em produção |
| `MERCADOPAGO_WEBHOOK_SECRET` | Não | Valida a assinatura `x-signature` do webhook (recomendado em produção) |
| `CRON_SECRET` | Não | Min. 16 chars; protege `GET /api/cron/*` (sem ela as rotas respondem 503) |
| `ALLOW_DEV_BYPASS` | Não | `1`/`true` libera o checkout fake em dev; ignorada/proibida em produção |
| `E2E_DISABLE_RATE_LIMIT` | Não | `1` desliga o rate limit (somente testes). **Proibida em produção** — o app se recusa a subir com ela, assim como com um `AUTH_SECRET` contendo `e2e-auth-secret` (esse valor também desliga todos os limites) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Não | Web Push; sem elas o recurso fica desligado (`npm run push:keys`) |
| `VAPID_SUBJECT` | Não | `mailto:...` ou URL `https://` do responsável |

Lidas diretamente (fora de `env.ts`): `RESEND_API_KEY` + `EMAIL_FROM` (envio real de e-mail — sem elas, loga no console + audit) e `AUTH_TRUST_HOST` (Auth.js atrás de proxy/local).

## Mercado Pago

- **Sandbox real:** coloque o access token de teste em `MERCADOPAGO_ACCESS_TOKEN` (ex.: `TEST-...`) e configure o webhook se necessário.
- **Dev local / E2E sem MP:** use `MERCADOPAGO_ACCESS_TOKEN=TEST-DEV-BYPASS` + `ALLOW_DEV_BYPASS=1`. O checkout (e a assinatura) marca como pago/ativo e redireciona sem chamar a API do Mercado Pago.

## Scripts

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Serve o build |
| `npm run lint` | ESLint |
| `npm run test` | Testes unitários (Vitest) |
| `npm run test:watch` | Vitest em watch |
| `npm run test:e2e` | Playwright (smoke E2E) |
| `npm run db:generate` | `prisma generate` |
| `npm run db:push` | `prisma db push` (prototipagem em dev) |
| `npm run db:migrate` | `prisma migrate deploy` (produção/CI) |
| `npm run db:migrate:dev` | `prisma migrate dev` |
| `npm run db:seed` | Seed base (org + admin + evento demo) |
| `npm run db:seed-demo` | Noite demo com votação aberta (16 participantes) |
| `npm run db:seed-e2e` | Fixtures dos testes E2E |
| `npm run db:studio` | Prisma Studio |
| `npm run push:keys` | Gera o par de chaves VAPID (Web Push) |
| `npm run security:check` | `npm audit --audit-level=high` |

### Verificação rápida

```bash
npm run test
npm run build
# opcional: npx playwright install chromium && npm run test:e2e
```

## Mapa de rotas

### Públicas

| Rota | Descrição |
|------|-----------|
| `/` | Landing |
| `/eventos` | Lista de eventos publicados (`?cidade=...` filtra) + noites anteriores |
| `/eventos/[slug]` | Detalhe do evento + compra de ingresso + "avise-me" quando esgotado |
| `/assinatura` | Pitch da assinatura Apoiador (assinar/cancelar exige login) |
| `/login` | Login |
| `/cadastro` | Cadastro de participante |
| `/esqueci-senha` | Solicita link de reset de senha |
| `/redefinir-senha` | Define nova senha via token do e-mail |
| `/pagamento/sucesso` | Retorno pós-pagamento (aprovado) |
| `/pagamento/pendente` | Retorno pós-pagamento (pendente) |
| `/termos` | Termos de uso |
| `/privacidade` | Política de privacidade |
| `/regras` | Regras do evento |
| `/reembolso` | Política de reembolso |

### Participante (autenticado)

| Rota | Descrição |
|------|-----------|
| `/minha-conta` | Perfil (WhatsApp, Instagram, foto, bio, interesses) + notificações push |
| `/meus-ingressos` | Lista de ingressos |
| `/meus-ingressos/[ticketId]` | Ingresso + QR da porta e da votação |
| `/meus-matches` | Histórico de matches de todas as noites |
| `/evento/[id]/votar` | Cédula de votação (noite) com bio + interesses |
| `/evento/[id]/matches` | Matches mútuos + contatos |
| `/evento/[id]/curtidas` | Quem curtiu você (não mútuo) |

### Admin (role admin)

| Rota | Descrição |
|------|-----------|
| `/admin` | Dashboard |
| `/admin/eventos` | Lista de eventos |
| `/admin/eventos/novo` | Criar evento (inclui acesso antecipado para assinantes) |
| `/admin/eventos/[id]` | Detalhe / gestão / reembolso de ingressos |
| `/admin/eventos/[id]/noite` | Operação da noite: check-in (QR pela câmera ou manual) + abrir/fechar votação |
| `/admin/eventos/[id]/matches` | Matches do evento |
| `/admin/eventos/[id]/checkins` | Download CSV da lista de check-in |

### APIs

| Rota | Descrição |
|------|-----------|
| `/api/auth/[...nextauth]` | Auth.js |
| `/api/checkout` | Inicia preferência Mercado Pago (ou bypass) |
| `/api/webhooks/mercadopago` | Webhook de pagamento, reembolso e assinatura |
| `/api/health` | Liveness + ping no banco (200 ok / 503 degraded) |
| `/api/cron/expire-pending` | Cancela ingressos pendentes vencidos (Bearer `CRON_SECRET`) |
| `/api/cron/event-reminders` | E-mail lembrete D-1 para ingressos pagos (Bearer `CRON_SECRET`) |
| `/api/cron/cleanup-audit` | Apaga audit logs com +90 dias (Bearer `CRON_SECRET`) |

Os crons devem ser chamados por um agendador externo (Vercel Cron, GitHub Actions schedule, crontab) com o header `Authorization: Bearer $CRON_SECRET`.

## Fluxo da noite (resumo)

1. **Antes:** admin publica o evento (com acesso antecipado opcional para assinantes); participantes compram ingresso (MP ou bypass); D-1 o cron envia o lembrete.
2. **Na porta:** admin faz check-in dos presentes — escaneando o QR do ingresso com a câmera ou pela lista.
3. **Rodadas:** conversas offline (mesas/rodízio) — fora do app.
4. **Votação:** admin abre a sessão de votação; participantes votam sim/não no celular (`/evento/[id]/votar`), vendo bio e interesses de cada pessoa.
5. **Encerramento:** admin fecha a votação; o sistema calcula matches mútuos e avisa por e-mail + push quem deu match.
6. **Resultados:** participantes veem matches com contatos e, se quiserem, a lista de quem curtiu; tudo fica no histórico em `/meus-matches`.

## Licença

Uso interno / MVP — ver repositório do projeto.
