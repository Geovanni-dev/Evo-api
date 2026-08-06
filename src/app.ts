import 'dotenv/config';
import express, { type Express } from 'express';
import cors from 'cors';
import mealsRoutes from './lib/meals/routes/mealsRoutes.js';
import nutritionGoalsRoutes from './lib/nutrition-goals/routes/nutritionGoalsRoutes.js';
import iaRoutes from './lib/AI/routes/aiRoutes.js';
import userPreferences from './lib/user-preferences/routes/preferencesRoutes.js';
import userMealPlan from './lib/meal-plan/routes/mealPlanRoutes.js';

//============================== Server

class Server {
  public app: Express;

  constructor() {
    this.app = express();
    this.middlewares();
    this.routes();
  }

  private middlewares(): void {
    this.app.use(cors());
    this.app.use(express.json());
  }

  private routes(): void {
    this.app.use('/meals', mealsRoutes);
    this.app.use('/TDEE', nutritionGoalsRoutes);
    this.app.use('/ai', iaRoutes);
    this.app.use('/preferences', userPreferences);
    this.app.use('/meal-plan', userMealPlan);
    this.app.get('/', (_req, res) => {
      res.send('Servidor rodando com sucesso!');
    });
  }
}

export const app = new Server().app;
