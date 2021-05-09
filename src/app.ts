import { isNil, isString } from 'lodash';

import express from 'express';
import request from 'request';
import { Request, Response } from 'express';

import cors from 'cors';
import cookieParser from 'cookie-parser';
import querystring from 'querystring';

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
    console.log('clientId: ' + process.env.client_id);
    console.log(isString(process.env.client_id));

    this.app = express();
    this.config();

    this.app.use(express.json({
      limit: '100mb',
    }));

    // Dev logging middleware
    if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    }

    this.app.use(express.static(__dirname + '/public'))
      .use(cors())
      .use(cookieParser());

    const stateKey = 'spotify_auth_state';

    this.app.get('/login', (req: Request, res: Response) => {

      const state = this.generateRandomString(16);
      res.cookie(stateKey, state);

      // your application requests authorization
      const scope = 'user-read-private user-read-email';
      res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
          response_type: 'code',
          client_id: process.env.client_id,
          scope: scope,
          redirect_uri: process.env.redirect_uri,
          state: state
        }));
    });

    this.app.get('/callback', (req: Request, res: Response) => {

      // your application requests refresh and access tokens
      // after checking the state parameter

      const code = req.query.code || null;
      const state = req.query.state || null;
      const storedState = req.cookies ? req.cookies[stateKey] : null;

      if (state === null || state !== storedState) {
        res.redirect('/#' +
          querystring.stringify({
            error: 'state_mismatch'
          }));
      } else {
        res.clearCookie(stateKey);
        var authOptions = {
          url: 'https://accounts.spotify.com/api/token',
          form: {
            code: code,
            redirect_uri: process.env.redirect_uri,
            grant_type: 'authorization_code'
          },
          headers: {
            'Authorization': 'Basic ' + (new Buffer(process.env.client_id + ':' + process.env.client_secret).toString('base64'))
          },
          json: true
        };

        request.post(authOptions, (error, response, body) => {
          if (!error && response.statusCode === 200) {

            var access_token = body.access_token,
              refresh_token = body.refresh_token;

            var options = {
              url: 'https://api.spotify.com/v1/me',
              headers: { 'Authorization': 'Bearer ' + access_token },
              json: true
            };

            // use the access token to access the Spotify Web API
            request.get(options, function (error, response, body) {
              console.log(body);
            });

            // we can also pass the token to the browser to make requests from there
            res.redirect('/#' +
              querystring.stringify({
                access_token: access_token,
                refresh_token: refresh_token
              }));
          } else {
            res.redirect('/#' +
              querystring.stringify({
                error: 'invalid_token'
              }));
          }
        });
      }
    });

    console.log('end of constructor');
  }

  generateRandomString(length: number): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  };

  private config(): void {
    let port: any = process.env.PORT;
    if (port === undefined || port === null || port === '') {
      port = 8888;
    }
    this.app.set('port', port);
  }

}

export default new App().app;
