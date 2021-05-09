import express from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';

import { Routes } from './routes';

class App {

  public app: express.Application;
  public route: Routes = new Routes();

  constructor() {

    // load env variables
    dotenv.config({ path: './/src/config/config.env' });
    console.log('port env: ' + process.env.PORT);

    this.app = express();
    this.config();

    this.app.use(express.json({
      limit: '100mb',
    }));

    // Dev logging middleware
    if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    }

    this.route.routes(this.app);

    console.log('end of constructor');
  }

  private config(): void {
    // pre Heroku
    // const port = process.env.PORT || 8000;
    // this.app.set('port', port);

    // for Heroku, from mrs
    let port: any = process.env.PORT;
    if (port === undefined || port === null || port === '') {
      port = 8000;
    }
    this.app.set('port', port);
  }

}

export default new App().app;
