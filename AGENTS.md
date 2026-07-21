<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Finlytics — Guia do Projeto (para IAs e devs)

Dashboard de finanças pessoais multiusuário: transações, categorias, contas,
cartões de crédito (faturas e parcelamentos), orçamentos, metas, despesas
recorrentes, transferências, relatório anual e exportação CSV. Idioma **pt-BR**,
moeda **BRL**. Visual: tema escuro futurista com glassmorphism.

> Leia este arquivo inteiro antes de alterar o código. As convenções abaixo
> não são opcionais — quebrá-las introduz bugs de dinheiro ou de segurança.

## Stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript** + **React 19**
- **Tailwind CSS 4** (config em `src/app/globals.css`, sem `tailwind.config`)
- **Prisma 6** + **PostgreSQL** (Supabase em produção)
- **Recharts** (gráficos), **lucide-react** (ícones), **date-fns**
- Auth própria: `bcryptjs` (hash) + `jose` (JWT em cookie httpOnly)

## Como rodar localmente

Precisa de um Postgres (o do Supabase serve, ou um local). Não roda em SQLite.

```bash
npm install
cp .env.example .env     # preencha DATABASE_URL, DIRECT_URL, AUTH_SECRET
npx prisma migrate dev   # aplica migrações
npm run dev              # http://localhost:3000
npm run db:seed          # (opcional) cria demo@finlytics.app / demo1234
```

`npm run build` roda `prisma generate && prisma migrate deploy && next build`.
Ou seja, o build **exige** um banco acessível (aplica migrações). Em CI/local,
suba um Postgres antes de buildar.

## Convenções CRÍTICAS (não quebre)

### 1. Isolamento por usuário (segurança)
**Toda** query no servidor DEVE ser filtrada por `userId`. Nunca confie num id
vindo do cliente sem checar que pertence ao usuário logado. Use
`requireUser()` / `getCurrentUser()` de `src/lib/auth.ts`. As server actions
sempre revalidam a posse antes de alterar (`findFirst({ where: { id, userId } })`).
Um vazamento aqui expõe os dados financeiros de um usuário para outro.

### 2. Dinheiro em centavos (inteiro)
Todos os valores monetários são `Int` em **centavos** no banco e no código.
Nunca use float para dinheiro. Converta na borda:
- Exibir: `formatBRL(cents)` / `formatBRLCompact(cents)` (`src/lib/money.ts`)
- Ler input do usuário: `parseBRL(string)` → centavos
- Campo de formulário: componente `<MoneyInput>` (máscara ao vivo, prefixo R$).
  O valor enviado no form é string "1.234,56", que `parseBRL` entende.

### 3. Server Actions para mutações
Mutações ficam em `src/lib/actions/*.ts` (`"use server"`). Padrão de retorno:
`ActionState = { error?: string; ok?: boolean }`. No cliente use `useActionState`.
Toda action chama `revalidatePath("/", "layout")` após alterar. Componentes de
formulário envolvem a action num wrapper que fecha o modal quando `result.ok`.

### 4. Tipos de transação
`Transaction.type` ∈ `INCOME | EXPENSE | TRANSFER | CARD_PAYMENT`.
- `INCOME`/`EXPENSE`: têm `categoryId` e (`accountId` XOR `creditCardId`).
- `TRANSFER`: sem categoria; `accountId`=origem, `toAccountId`=destino.
- `CARD_PAYMENT`: sem categoria; `accountId`=conta debitada, `creditCardId`=cartão.
`categoryId` é **opcional** (null em TRANSFER/CARD_PAYMENT) — sempre trate o null
ao renderizar categoria. KPIs de receita/despesa filtram só `INCOME`/`EXPENSE`.

### 5. Cores validadas
A paleta em `src/lib/colors.ts` foi validada para contraste e daltonismo sobre
o fundo escuro. Ao escolher cores de séries/gráficos, use `CATEGORY_COLORS` na
ordem dada. O usuário pode escolher cor livre via `<ColorPicker>` (presets +
input nativo), mas os defaults e gráficos devem sair da paleta.

### 6. Next.js 16 — diferenças que pegam
- Middleware chama-se **`src/proxy.ts`** (função `proxy`), não `middleware.ts`.
- `searchParams` e `params` das páginas são **Promises** — dê `await`.
- Prisma datasource usa `url` + `directUrl` (pooler + conexão direta).
- Na dúvida sobre uma API, leia `node_modules/next/dist/docs/`.

## Estrutura

```
src/
  proxy.ts                  # protege rotas via cookie de sessão (JWT)
  lib/
    prisma.ts               # singleton PrismaClient
    auth.ts                 # sessão, hash, getCurrentUser/requireUser
    money.ts                # formatBRL, parseBRL (centavos)
    colors.ts               # paleta validada (CVD/contraste)
    finance.ts              # TODOS os cálculos: saldos, KPIs, séries, fatura, matriz
    recurring.ts            # materializa recorrências pendentes (lazy, no layout)
    default-categories.ts   # categorias criadas no registro
    types.ts                # DTOs serializáveis (server → client)
    actions/                # server actions (mutações) por domínio
  app/
    (auth)/login|register   # telas públicas
    (app)/                  # área logada; layout busca user + dados do QuickAdd
      page.tsx              # DASHBOARD
      transactions|cards|budget|goals|recurring|accounts|categories|reports|settings
    api/export/route.ts     # exporta CSV (BOM UTF-8, separador ;)
  components/
    ui/                     # GlassCard, StatCard, Modal, MoneyInput, ColorPicker, PasswordInput, field, …
    charts/                 # Recharts (cashflow, donut, area) + tooltip de vidro
    layout/                 # Sidebar (nav + bottom nav mobile), Header
    transactions|cards|…    # componentes cliente por domínio (formulários, listas)
prisma/schema.prisma + migrations/ + seed.ts
```

## Padrão server → client

Páginas são Server Components: buscam dados via Prisma, mapeiam para **DTOs**
(`src/lib/types.ts`, datas viram ISO string) e passam para um componente cliente
`*-client.tsx` que cuida de interação (modais, filtros). Não passe objetos
Prisma crus (com `Date`) direto para client components.

## Cálculos financeiros (`src/lib/finance.ts`)

Centralize aqui qualquer lógica de agregação. Helpers principais:
`getMonthlySummary`, `getAccountsWithBalances`, `getCashflowSeries`,
`getExpensesByCategory`, `getBalanceSeries`, `getInvoiceTotal`,
`getCardOutstanding`, `getBudgetProgress`, `getYearSummary`,
`getYearCategoryMatrix`. As séries mensais disparam as queries **em paralelo**
(`Promise.all`) — mantenha assim (latência importa em produção, banco em SP).
Saldo de conta = inicial + receitas − despesas − pagamentos − transfer.saída
+ transfer.entrada. Fatura do cartão é calculada por período (não há tabela).

## Deploy (produção)

Vercel + Supabase (Postgres). Região das funções fixada em **São Paulo**
(`vercel.json` → `gru1`) para ficar perto do banco. Variáveis na Vercel:
`DATABASE_URL` (pooler 6543, `?pgbouncer=true`), `DIRECT_URL` (5432),
`AUTH_SECRET`. Push no GitHub dispara redeploy automático; o build aplica
migrações. **Nunca** comite segredos — `.env` é gitignored.

## Verificação

Não há suíte de testes commitada; a validação é feita com scripts Playwright
ad-hoc (Chromium) exercitando os fluxos de ponta a ponta contra um Postgres
local. Ao mexer em cálculo de dinheiro ou em isolamento por usuário, valide
end-to-end: registre 2 usuários, confirme que um não vê dados do outro, e
confira saldos/KPIs ao centavo. Rode `npm run build` (com banco de pé) antes de
concluir.

## Git

Branch de trabalho: `claude/personal-finance-dashboard-j96yki`; `main` é o
default. Se for colaborar junto de outro agente, dê `git pull` antes e trabalhe
em branch próprio para evitar conflitos.
