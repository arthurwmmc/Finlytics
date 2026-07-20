# Finlytics — Dashboard de Finanças Pessoais

Dashboard de finanças pessoais com visual futurista em glassmorphism: gráficos,
indicadores, orçamentos, metas, cartões de crédito com faturas e parcelamentos,
despesas recorrentes e **múltiplos usuários com dados 100% isolados** (cada
pessoa cria sua conta com e-mail e senha e vê apenas os próprios dados).

## Funcionalidades

- **Dashboard**: saldo total, receitas/despesas/economia do mês com variação vs
  mês anterior, fluxo de caixa dos últimos 6 meses, despesas por categoria,
  evolução do saldo, orçamentos, metas, faturas e últimas transações.
- **Transações**: receitas e despesas com categoria, conta ou cartão, filtros
  por tipo/categoria/conta/busca e navegação por mês.
- **Cartões de crédito**: limite, fechamento e vencimento; fatura calculada por
  período com navegação mês a mês; **compras parceladas** (até 24x) lançadas
  automaticamente nas faturas futuras; **pagamento de fatura** debitando uma
  conta, com saldo devedor real e selo de fatura paga.
- **Transferências entre contas** (ex: Banco → Poupança) sem inflar os números
  de receita/despesa do mês.
- **Orçamento mensal por categoria** com barras de progresso e alerta de
  estouro.
- **Metas de economia** com valor-alvo, prazo e histórico de aportes.
- **Recorrentes**: contas fixas (aluguel, assinaturas, salário) lançadas
  automaticamente todo mês; pause e reative quando quiser.
- **Categorias e contas** personalizáveis (nome, ícone, cor).
- **Relatório anual**: KPIs do ano, fluxo de caixa de 12 meses e matriz de
  despesas categoria × mês.
- **Exportação CSV** (compatível com Excel) de todas as transações ou de um ano.
- **Ajustes**: editar nome/e-mail e trocar a senha.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Prisma + PostgreSQL
(Supabase) · Recharts · autenticação própria com sessão JWT em cookie httpOnly
(bcrypt + jose).

## Deploy: Vercel + Supabase (grátis)

### 1. Banco no Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (anote a senha do
   banco).
2. Em **Project Settings → Database → Connection string**, copie as duas URLs:
   - **Transaction pooler** (porta `6543`) → será o `DATABASE_URL` — adicione
     `?pgbouncer=true` no final;
   - **Session/Direct** (porta `5432`) → será o `DIRECT_URL`.

### 2. App na Vercel

1. Em [vercel.com](https://vercel.com), **Add New → Project** e importe este
   repositório do GitHub (framework Next.js é detectado sozinho).
2. Em **Environment Variables**, defina:
   - `DATABASE_URL` — a URL do pooler (com `?pgbouncer=true`);
   - `DIRECT_URL` — a URL direta;
   - `AUTH_SECRET` — um segredo longo e aleatório (`openssl rand -base64 32`).
3. **Deploy.** O build já roda `prisma migrate deploy`, criando as tabelas no
   Supabase automaticamente.

Pronto: acesse a URL da Vercel, crie sua conta em `/register` e sua noiva cria
a dela no mesmo endereço — os dados são completamente isolados por usuário.

## Rodar localmente

Precisa de um Postgres — pode ser o próprio Supabase (use as mesmas URLs no
`.env`) ou um Postgres local:

```bash
npm install
cp .env.example .env      # preencha DATABASE_URL, DIRECT_URL e AUTH_SECRET
npx prisma migrate dev    # aplica as migrações
npm run dev               # http://localhost:3000
```

### Dados de demonstração (opcional)

```bash
npm run db:seed
# login: demo@finlytics.app · senha: demo1234
```

## Estrutura

```
src/
  lib/            # auth, dinheiro (centavos), cálculos financeiros, actions
  app/(auth)/     # login e registro
  app/(app)/      # páginas autenticadas (dashboard, transações, …)
  components/     # ui base (vidro), gráficos, formulários
prisma/           # schema, migrações e seed
```
