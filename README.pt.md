<p align="right">
  <a href="README.md">🇺🇸 English</a>
</p>

# Evo

> API backend do **Evo**, um app mobile first de nutrição com IA que será lançado nas lojas de aplicativos (App Store / Google Play).

🚧 **Projeto em desenvolvimento ativo.** Funcionalidades, rotas e schema do banco ainda estão sujeitos a mudanças frequentes. Não recomendado para uso em produção.

## Sobre o projeto

O Evo ajuda o usuário a registrar refeições, acompanhar metas nutricionais (calorias, macros) e receber planos alimentares gerados por Inteligência Artificial (Google Gemini), tudo a partir de um app mobile. Este repositório contém apenas a **API** que serve o app.

## Funcionalidades

- 🍽️ **Refeições** — registro, listagem, edição e exclusão de refeições e itens, com resumo diário
- 🎯 **Metas nutricionais (TDEE)** — cálculo e atualização de metas de calorias e macronutrientes
- 🤖 **Chat com IA** — conversa nutricional integrada com Gemini
- 📋 **Plano alimentar** — geração automática de plano alimentar via IA, respeitando restrições e preferências do usuário
- ⚙️ **Preferências e restrições alimentares** — configuração de tipo de dieta, alimentos excluídos, restrições (glúten, lactose, etc.)
- 🥗 **Base de alimentos** — referência nutricional de alimentos (calorias e macros por 100g)
- ⚡ **Cache com Redis** — cache de metas, refeições, plano alimentar e preferências

> ⚠️ Autenticação de usuário (login, JWT) ainda **não está implementada** — as rotas atualmente operam com um usuário padrão (`DEFAULT_USER_ID`) para fins de desenvolvimento.

## Tecnologias

- [Node.js](https://nodejs.org/) + [TypeScript](https://www.typescriptlang.org/)
- [Express 5](https://expressjs.com/)
- [Prisma ORM](https://www.prisma.io/) + PostgreSQL
- [Redis](https://redis.io/) (cache)
- [Google Gemini API](https://ai.google.dev/) (`@google/genai`) — IA generativa
- [Zod](https://zod.dev/) — validação de schemas
- [Cloudinary](https://cloudinary.com/) — upload/armazenamento de imagens
- [Nodemailer](https://nodemailer.com/) — envio de e-mails
- [Bcrypt](https://www.npmjs.com/package/bcrypt) / [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) — preparados para autenticação (em implementação)
- ESLint + Prettier — padronização de código

## Estrutura do projeto

```
src/
├── app.ts                 # configuração do Express e registro das rotas
├── server.ts               # ponto de entrada (inicia o servidor)
└── lib/
    ├── AI/                  # chat com IA (Gemini)
    ├── meals/               # refeições e itens
    ├── meal-plan/           # geração e gestão de plano alimentar
    ├── nutrition-goals/     # metas nutricionais (TDEE)
    ├── user-preferences/    # preferências e restrições alimentares
    ├── prisma/              # client do Prisma
    └── redis/               # client do Redis

prisma/
├── schema.prisma            # modelagem do banco de dados
└── seed.ts                  # seed inicial do banco
```

Cada módulo em `src/lib` segue o padrão `controller/`, `routes/`, `services/` e (quando aplicável) `schemas/`.

## Requisitos de ambiente

- Node.js 20+
- Yarn
- PostgreSQL
- Redis
- Uma chave de API do [Google Gemini](https://ai.google.dev/)

### Variáveis de ambiente

| Variável              | Descrição                                       |
| ---------------------- | ------------------------------------------------ |
| `DATABASE_URL`         | String de conexão com o PostgreSQL               |
| `REDIS_URL`            | String de conexão com o Redis                    |
| `GEMINI_API_KEY`       | Chave de API do Google Gemini                    |
| `GOOGLE_GENAI_API_KEY` | Chave de API do Google GenAI                     |
| `DEFAULT_USER_ID`      | ID de usuário padrão usado enquanto não há login |
| `ADMIN_NAME`           | Nome do usuário administrador (seed)             |
| `ADMIN_EMAIL`          | E-mail do usuário administrador (seed)           |
| `ADMIN_PASSWORD`       | Senha do usuário administrador (seed)             |
| `PORT`                 | Porta do servidor (opcional, padrão `3000`)      |

### Banco de dados

```bash
yarn prisma:generate   # gera o Prisma Client
yarn prisma:migrate    # aplica as migrations
yarn seed               # popula o banco com dados iniciais
```

### Rodando o servidor

```bash
yarn dev     # modo desenvolvimento (hot reload)
yarn build   # gera build de produção
yarn start   # roda o build de produção
```

O servidor sobe por padrão em `http://localhost:3000`.

## Endpoints principais

| Método | Rota                              | Descrição                          |
| ------ | ---------------------------------- | ----------------------------------- |
| GET    | `/`                                 | Health check                        |
| POST   | `/meals`                           | Cria uma refeição                   |
| GET    | `/meals/daily`                     | Lista refeições do dia              |
| GET    | `/meals/daily/:mealType`           | Detalha refeição por tipo           |
| GET    | `/meals/summary`                   | Resumo nutricional diário           |
| PUT    | `/meals/daily/:mealId`             | Atualiza refeição                   |
| DELETE | `/meals/daily/:mealId`             | Remove refeição                     |
| DELETE | `/meals/daily/:mealId/:itemId`     | Remove item de uma refeição         |
| GET    | `/TDEE`                             | Consulta meta nutricional           |
| PUT    | `/TDEE`                             | Cria/atualiza meta nutricional      |
| POST   | `/ai/chat`                         | Chat com a IA nutricional           |
| GET    | `/meal-plan/active`                | Consulta plano alimentar ativo      |
| POST   | `/meal-plan/generate`              | Gera novo plano alimentar via IA    |
| PUT    | `/meal-plan`                       | Atualiza plano alimentar            |
| GET    | `/preferences`                     | Consulta preferências alimentares   |
| PATCH  | `/preferences`                     | Atualiza preferências alimentares   |
| GET    | `/preferences/restrictions`        | Consulta restrições alimentares     |
| PATCH  | `/preferences/restrictions`        | Atualiza restrições alimentares     |

Coleção do Postman disponível em [`postman/`](./postman).

## Scripts disponíveis

| Comando               | Descrição                                  |
| ---------------------- | -------------------------------------------- |
| `yarn dev`             | Inicia o servidor em modo desenvolvimento   |
| `yarn build`           | Gera o Prisma Client e compila o TypeScript |
| `yarn start`           | Executa o build de produção                 |
| `yarn prisma:generate` | Gera o Prisma Client                        |
| `yarn prisma:migrate`  | Executa as migrations do Prisma             |
| `yarn seed`            | Popula o banco com dados iniciais           |
| `yarn lint`            | Executa o ESLint                            |
| `yarn lint:fix`        | Executa o ESLint e corrige o que for possível |
| `yarn format`          | Formata o código com Prettier               |

## Roadmap

- [ ] Autenticação de usuários (JWT / OAuth Google e Apple)
- [ ] App mobile (front-end)
- [ ] Upload de fotos de refeições (reconhecimento por IA)
- [ ] Histórico de peso e hidratação na API
- [ ] Publicação nas lojas de aplicativos

## Licença

Projeto proprietário — código de uso restrito, sem licença open source. Todos os direitos reservados.

## Autor

Geovani Rodrigues
