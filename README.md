# Nébula — Dashboard de Finanças Pessoais

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
  automaticamente nas faturas futuras.
- **Orçamento mensal por categoria** com barras de progresso e alerta de
  estouro.
- **Metas de economia** com valor-alvo, prazo e histórico de aportes.
- **Recorrentes**: contas fixas (aluguel, assinaturas, salário) lançadas
  automaticamente todo mês; pause e reative quando quiser.
- **Categorias e contas** personalizáveis (nome, ícone, cor).

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Prisma + SQLite ·
Recharts · autenticação própria com sessão JWT em cookie httpOnly (bcrypt +
jose).

## Como rodar

```bash
npm install
cp .env.example .env      # edite AUTH_SECRET para um valor forte
npx prisma migrate dev    # cria o banco SQLite (prisma/dev.db)
npm run dev               # http://localhost:3000
```

Crie sua conta em `/register`. Sua noiva cria a dela no mesmo endereço — os
dados são completamente separados por usuário.

### Dados de demonstração (opcional)

```bash
npm run db:seed
# login: demo@nebula.app · senha: demo1234
```

## Produção

```bash
npm run build && npm start
```

O banco é um arquivo SQLite local (`prisma/dev.db`), ideal para rodar em um
servidor próprio/VPS (faça backup do arquivo!). Para hospedar em plataformas
serverless como a Vercel, troque o datasource do Prisma por Postgres ou Turso,
pois o sistema de arquivos lá é efêmero.

## Estrutura

```
src/
  lib/            # auth, dinheiro (centavos), cálculos financeiros, actions
  app/(auth)/     # login e registro
  app/(app)/      # páginas autenticadas (dashboard, transações, …)
  components/     # ui base (vidro), gráficos, formulários
prisma/           # schema, migrações e seed
```
