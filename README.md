# Finanças — Controle Financeiro Pessoal

**Disciplina:** Programação Web Full Stack — Engenharia de Software
**Tipo:** Projeto avaliativo (Projeto 2)
**Modalidade:** grupos de até 3 pessoas

## Integrantes
- _Fernando Souza_
- _Rayssa Okamura_

## Contexto

No Projeto 1, o grupo construiu apenas a camada front-end de uma SPA em React, consumindo uma API JSON pública. No **Projeto 2**, o grupo constrói as duas pontas da aplicação: uma **API REST própria** em Node.js/Express, conectada a um banco de dados, e a **SPA em React** que a consome.

O tema, comum a todos os grupos, é uma aplicação de **controle financeiro pessoal**. O usuário se cadastra, faz login e registra suas movimentações de dinheiro. Cada movimentação (**lançamento**) é:

- de um de dois tipos: **entrada** (dinheiro que chega) ou **saída** (dinheiro que sai);
- relacionada a uma **categoria** (alimentação, saúde, mobilidade, moradia, lazer, salário…);
- relacionada a uma **fonte** (entradas) ou **destino** (saídas): salário, cartão Nubank, Visa crédito, poupança, conta corrente, dinheiro…

Com esses dados, a aplicação deve gerar **relatórios**: gastos por categoria, movimentação por fonte/destino e previsão das faturas dos cartões de crédito. Como desafio (pontuação extra), uma **página de saúde financeira** com projeções e dicas geradas a partir dos dados do próprio usuário.

## Tecnologias

| Requisito do enunciado | Como foi atendido |
| --- | --- |
| Node.js + Express (back-end) | API REST em `backend/` (Express 5, ES Modules) |
| React.js (front-end) | SPA em `frontend/` (React 18 + Vite + React Router) |
| Banco com persistência real | PostgreSQL (`backend/database/schema.sql`) |
| Autenticação por token (JWT) | `jsonwebtoken` + `bcrypt` para hash de senha; rotas protegidas por middleware |

Também usados: `pg`, `cors`, `dotenv`, `express-rate-limit` (limite de tentativas de login).

## Status das funcionalidades

| Funcionalidade | Back-end | Front-end |
| --- | :---: | :---: |
| Cadastro (com validação de CPF, e-mail e senha) | ✅ | ✅ |
| Login com JWT e rota `/me` | ✅ | ✅ |
| Categorias (CRUD) | ✅ | ✅ |
| Fontes/destinos: renda, conta e cartão de crédito (CRUD) | ✅ | ✅ |
| Lançamentos de entrada e saída (com parcelamento) | ⏳ só tabela | ⏳ |
| Relatório: gastos por categoria | ⏳ | ⏳ |
| Relatório: movimentação por fonte/destino | ⏳ | ⏳ |
| Previsão de faturas dos cartões | ⏳ | ⏳ |
| Extra: saúde financeira | ⏳ | ⏳ |

## Modelo de dados

- **usuarios** — nome, e-mail e CPF únicos, senha com hash.
- **categorias** — por usuário, tipo `entrada` ou `saida`.
- **fontes_destinos** — por usuário, tipo `renda`, `conta` ou `cartao_credito` (cartão exige dia de fechamento, dia de vencimento e limite).
- **lancamentos** — tipo, descrição, valor, data, categoria, fonte/destino, parcela atual / total de parcelas e `grupo_parcelamento`.

No cadastro, o usuário já recebe categorias padrão (Salário, Alimentação, Moradia, Saúde, Mobilidade, Lazer, Educação, Outros) e uma "Conta Corrente".

## Como rodar

**Requisitos:** Node.js 18+ e PostgreSQL.

### 1. Banco de dados
```bash
psql -U postgres -c "CREATE DATABASE financas_db;"
psql -U postgres -d financas_db -f backend/database/schema.sql
```

### 2. Back-end
```bash
cd backend
cp .env.example.txt .env   # edite DATABASE_URL (usuário/senha) e JWT_SECRET
npm install
npm run dev                # http://localhost:3000  (teste: /ping)
```

### 3. Front-end
```bash
cd frontend
npm install
npm run dev                # http://localhost:5173
```
Se o back-end usar outra porta, crie `frontend/.env` com `VITE_API_URL=http://localhost:PORTA/api`.

### Primeiro acesso
Não há usuário padrão: clique em **Cadastre-se**. É preciso um CPF válido e uma senha com 8+ caracteres, com letras e números.

## API

Todas as rotas, exceto cadastro e login, exigem `Authorization: Bearer <token>`.

| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/api/auth/cadastro` | Cria usuário |
| POST | `/api/auth/login` | Retorna token (1h) e dados do usuário |
| GET | `/api/auth/me` | Dados do usuário logado |
| GET / POST | `/api/categorias` | Lista / cria categoria |
| PUT / DELETE | `/api/categorias/:id` | Edita / exclui categoria |
| GET / POST | `/api/fontes-destinos` | Lista / cria fonte ou destino |
| PUT / DELETE | `/api/fontes-destinos/:id` | Edita / exclui |

Erros de validação retornam `{ "erro": "...", "campos": { "campo": "mensagem" } }`.

## Estrutura
```
backend/
  database/schema.sql
  src/{config, middlewares, models, routes, server.js}
frontend/
  src/{pages, api.js, useCrud.js, components.jsx, main.jsx}
```
