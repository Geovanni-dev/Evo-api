import 'dotenv/config'; // loads the environment variables
import express, { type Express } from 'express'; // loads the express framework
import cors from 'cors'; // loads the cors middleware
import mealsRoutes from './lib/meals/routes/mealsRoutes.js'; // loads the meals routes

class Server {
  public app: Express; // definition of the app property type as express.Application

  constructor() {
    if (process.env.NODE_ENV === 'production') {
      console.log = () => {}; // disable console.log in production
    }
    this.app = express(); // create a new express application
    this.middlewares(); // call the middlewares method
    this.routes(); // call the routes method
  }
  // MIDDLEWARES
  private middlewares(): void {
    this.app.use(cors()); // enable cors
    this.app.use(express.json()); // enable json parsing
  }
  // ROUTES
  private routes(): void {
    this.app.use('/meals', mealsRoutes);
    this.app.get('/', (_req, res) => {
      res.send('Servidor rodando com sucesso!');
    });
  }
}

export const app = new Server().app; // create a new instance of the Server class
