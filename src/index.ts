import * as dotenv from 'dotenv';
dotenv.config();

import {Bot} from '@wireapp/bot-api';
import {MainHandler} from './MainHandler';

['WIRE_EMAIL', 'WIRE_PASSWORD'].forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Environment variable "${envVar}" is not set. Please define it or create a .env file.`);
  }
});

const bot = new Bot({
  email: process.env.WIRE_EMAIL!,
  password: process.env.WIRE_PASSWORD!,
});

const mainHandler = new MainHandler();

bot.addHandler(mainHandler);
bot.start();
