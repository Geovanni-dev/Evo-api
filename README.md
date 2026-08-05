<p align="right">
  <a href="README.pt.md">🇧🇷 Português</a>
</p>

# Evo

> Backend API for **Evo**, a mobile-first nutrition app powered by AI that will be released on the app stores (App Store / Google Play).

🚧 **Actively under development.** Features, routes, and database schema are still subject to frequent changes. Not recommended for production use.

## About the project

Evo helps users log meals, track nutritional goals (calories, macros), and receive AI-generated meal plans (Google Gemini), all from a mobile app. This repository contains only the **API** that powers the app.

## Features

- 🍽️ **Meals** — create, list, update, and delete meals and items, with a daily summary
- 🎯 **Nutritional goals (TDEE)** — calculation and update of calorie and macronutrient targets
- 🤖 **AI chat** — nutrition-focused conversation powered by Gemini
- 📋 **Meal plan** — automatic meal plan generation via AI, respecting user restrictions and preferences
- ⚙️ **Preferences and dietary restrictions** — diet type configuration, excluded foods, restrictions (gluten, lactose, etc.)
- 🥗 **Food reference database** — nutritional reference for foods (calories and macros per 100g)
- ⚡ **Redis caching** — caching for goals, meals, meal plan, and preferences

> ⚠️ User authentication (login, JWT) is **not implemented yet** — routes currently operate with a default user (`DEFAULT_USER_ID`) for development purposes.

## Tech stack

- [Node.js](https://nodejs.org/) + [TypeScript](https://www.typescriptlang.org/)
- [Express 5](https://expressjs.com/)
- [Prisma ORM](https://www.prisma.io/) + PostgreSQL
- [Redis](https://redis.io/) (cache)
- [Google Gemini API](https://ai.google.dev/) (`@google/genai`) — generative AI
- [Zod](https://zod.dev/) — schema validation
- [Cloudinary](https://cloudinary.com/) — image upload/storage
- [Nodemailer](https://nodemailer.com/) — email sending
- [Bcrypt](https://www.npmjs.com/package/bcrypt) / [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) — ready for authentication (in progress)
- ESLint + Prettier — code standards

## Project structure

```
src/
├── app.ts                 # Express setup and route registration
├── server.ts               # entry point (starts the server)
└── lib/
    ├── AI/                  # AI chat (Gemini)
    ├── meals/               # meals and items
    ├── meal-plan/           # meal plan generation and management
    ├── nutrition-goals/     # nutritional goals (TDEE)
    ├── user-preferences/    # dietary preferences and restrictions
    ├── prisma/              # Prisma client
    └── redis/               # Redis client

prisma/
├── schema.prisma            # database schema
└── seed.ts                  # initial database seed
```

Each module under `src/lib` follows the `controller/`, `routes/`, `services/`, and (when applicable) `schemas/` pattern.

## Environment requirements

- Node.js 20+
- Yarn
- PostgreSQL
- Redis
- A [Google Gemini](https://ai.google.dev/) API key

### Environment variables

| Variable               | Description                                    |
| ----------------------- | ------------------------------------------------ |
| `DATABASE_URL`         | PostgreSQL connection string                     |
| `REDIS_URL`            | Redis connection string                          |
| `GEMINI_API_KEY`       | Google Gemini API key                            |
| `GOOGLE_GENAI_API_KEY` | Google GenAI API key                             |
| `DEFAULT_USER_ID`      | Default user ID used while there's no login       |
| `ADMIN_NAME`           | Admin user name (seed)                           |
| `ADMIN_EMAIL`          | Admin user email (seed)                          |
| `ADMIN_PASSWORD`       | Admin user password (seed)                       |
| `PORT`                 | Server port (optional, defaults to `3000`)       |

### Database

```bash
yarn prisma:generate   # generates the Prisma Client
yarn prisma:migrate    # applies migrations
yarn seed               # seeds the database with initial data
```

### Running the server

```bash
yarn dev     # development mode (hot reload)
yarn build   # production build
yarn start   # runs the production build
```

The server runs on `http://localhost:3000` by default.

## Main endpoints

| Method | Route                              | Description                        |
| ------ | ---------------------------------- | ----------------------------------- |
| GET    | `/`                                 | Health check                        |
| POST   | `/meals`                           | Create a meal                       |
| GET    | `/meals/daily`                     | List today's meals                  |
| GET    | `/meals/daily/:mealType`           | Get meal details by type            |
| GET    | `/meals/summary`                   | Daily nutritional summary           |
| PUT    | `/meals/daily/:mealId`             | Update a meal                       |
| DELETE | `/meals/daily/:mealId`             | Delete a meal                       |
| DELETE | `/meals/daily/:mealId/:itemId`     | Delete an item from a meal          |
| GET    | `/TDEE`                             | Get nutritional goal                |
| PUT    | `/TDEE`                             | Create/update nutritional goal      |
| POST   | `/ai/chat`                         | Chat with the nutrition AI          |
| GET    | `/meal-plan/active`                | Get the active meal plan            |
| POST   | `/meal-plan/generate`              | Generate a new meal plan via AI     |
| PUT    | `/meal-plan`                       | Update the meal plan                |
| GET    | `/preferences`                     | Get dietary preferences             |
| PATCH  | `/preferences`                     | Update dietary preferences          |
| GET    | `/preferences/restrictions`        | Get dietary restrictions            |
| PATCH  | `/preferences/restrictions`        | Update dietary restrictions         |

Postman collection available in [`postman/`](./postman).

## Available scripts

| Command                | Description                                  |
| ------------------------ | ----------------------------------------------- |
| `yarn dev`             | Starts the server in development mode          |
| `yarn build`           | Generates the Prisma Client and compiles TS    |
| `yarn start`           | Runs the production build                      |
| `yarn prisma:generate` | Generates the Prisma Client                    |
| `yarn prisma:migrate`  | Runs Prisma migrations                         |
| `yarn seed`            | Seeds the database with initial data           |
| `yarn lint`            | Runs ESLint                                     |
| `yarn lint:fix`        | Runs ESLint and fixes what it can              |
| `yarn format`          | Formats the code with Prettier                 |

## Roadmap

- [ ] User authentication (JWT / Google and Apple OAuth)
- [ ] Mobile app (front-end)
- [ ] Meal photo upload (AI recognition)
- [ ] Weight and hydration history in the API
- [ ] App store release

## License

Proprietary project — restricted-use code, no open source license. All rights reserved.

## Author

Geovani Rodrigues
