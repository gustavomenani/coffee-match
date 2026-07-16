# Coffee Match

MVP web de **speed dating** para o Brasil: organizar e vender eventos, check-in no local, votação de interesse no celular e matches mútuos com revelação de contato (WhatsApp/Instagram).

## Stack

| Camada | Tecnologia |
|--------|------------|
| App | Next.js (App Router) + TypeScript + Tailwind |
| DB | Prisma + PostgreSQL |
| Auth | Auth.js (NextAuth v5) — e-mail + senha |
| Pagamentos | Mercado Pago (Preferences + webhook) |

## Funcionalidades do MVP

- **Eventos públicos** — listagem e detalhe por slug, vagas por gênero, status (publicado / esgotado / ao vivo)
- **Cadastro e login** — participante 18+, perfil com WhatsApp, Instagram e foto
- **Compra de ingresso** — checkout Mercado Pago (Pix/cartão) ou bypass de dev; 1 ingresso pago por usuário+evento; reuso de pending; cancelamento de pending expirado (>2h)
- **Meus ingressos** — lista + QR de porta e de votação
- **Admin** — CRUD de eventos, capacidade homens/mulheres, preço, status
- **Check-in** — lista de pagos na porta (noite)
- **Sessão da noite** — abrir/fechar votação
- **Votação** — cédula sim/não no celular (só check-in + votação aberta + WhatsApp)
- **Matches** — cálculo mútuo; revelação de contato (WhatsApp/Instagram); lista de quem curtiu
- **Webhook MP** — marca ingresso pago de forma idempotente; pode marcar evento esgotado
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
docker run -d --name Coffee Match-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=Coffee Match \
  -p 5432:5432 \
  postgres:16

# alternativa se 5432 estiver ocupada
docker run -d --name Coffee Match-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=Coffee Match \
  -p 5437:5432 \
  postgres:16
```

### 2. Variáveis de ambiente

```bash
cp .env.example .env
```

Ajuste `DATABASE_URL` se usar a porta 5437:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5437/Coffee Match?schema=public"
```

Gere um `AUTH_SECRET` real em produção:

```bash
openssl rand -base64 32
```

### 3. Dependências, schema e seed

```bash
npm i
npx prisma db push
npm run db:seed
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

### Conta admin (seed)

| Campo | Valor |
|-------|--------|
| E-mail | `admin@coffeematch.local` |
| Senha | `admin123456` |

**Troque a senha em produção.**

## Mercado Pago

- **Sandbox real:** coloque o access token de teste em `MERCADOPAGO_ACCESS_TOKEN` (ex.: `TEST-...`) e configure o webhook se necessário.
- **Dev local / E2E sem MP:** use `MERCADOPAGO_ACCESS_TOKEN=TEST-DEV-BYPASS`. O checkout marca o ingresso como pago e redireciona para `/pagamento/sucesso` sem chamar a API do Mercado Pago.

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
| `npm run db:push` | `prisma db push` |
| `npm run db:seed` | Seed (org + admin) |
| `npm run db:studio` | Prisma Studio |

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
| `/eventos` | Lista de eventos publicados |
| `/eventos/[slug]` | Detalhe do evento + compra de ingresso |
| `/login` | Login |
| `/cadastro` | Cadastro de participante |
| `/pagamento/sucesso` | Retorno pós-pagamento (aprovado) |
| `/pagamento/pendente` | Retorno pós-pagamento (pendente) |
| `/termos` | Termos de uso |
| `/privacidade` | Política de privacidade |
| `/regras` | Regras do evento |
| `/reembolso` | Política de reembolso |

### Participante (autenticado)

| Rota | Descrição |
|------|-----------|
| `/minha-conta` | Perfil (WhatsApp, Instagram, foto local) |
| `/meus-ingressos` | Lista de ingressos |
| `/meus-ingressos/[ticketId]` | Ingresso + QR da porta e da votação |
| `/evento/[id]/votar` | Cédula de votação (noite) |
| `/evento/[id]/matches` | Matches mútuos + contatos |
| `/evento/[id]/curtidas` | Quem curtiu você (não mútuo) |

### Admin (role admin)

| Rota | Descrição |
|------|-----------|
| `/admin` | Dashboard |
| `/admin/eventos` | Lista de eventos |
| `/admin/eventos/novo` | Criar evento |
| `/admin/eventos/[id]` | Detalhe / check-in / gestão |
| `/admin/eventos/[id]/noite` | Abrir/fechar votação (sessão da noite) |
| `/admin/eventos/[id]/matches` | Matches do evento |

### APIs

| Rota | Descrição |
|------|-----------|
| `/api/auth/[...nextauth]` | Auth.js |
| `/api/checkout` | Inicia preferência Mercado Pago (ou bypass) |
| `/api/webhooks/mercadopago` | Webhook de pagamento |

## Fluxo da noite (resumo)

1. **Antes:** admin publica o evento; participantes compram ingresso (MP ou bypass).
2. **Na porta:** admin faz check-in dos presentes.
3. **Rodadas:** conversas offline (mesas/rodízio) — fora do app.
4. **Votação:** admin abre a sessão de votação; participantes votam sim/não no celular (`/evento/[id]/votar`).
5. **Encerramento:** admin fecha a votação; o sistema calcula matches mútuos.
6. **Resultados:** participantes veem matches com contatos e, se quiserem, a lista de quem curtiu.

## Licença

Uso interno / MVP — ver repositório do projeto.
