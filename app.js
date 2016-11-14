'use strict';

if (!process.env.TELEGRAM_TOKEN) require('dotenv').config();

const request = require('request');
const log = console.log;
const cheerio = require('cheerio');
const token = process.env.TELEGRAM_TOKEN;
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(token, { polling: false });
const group = process.env.TELEGRAM_GROUP;
const redis = require('redis');
const client = redis.createClient();
const cron = require('node-cron');

const zipcodes = [
  '1024',
  '1011',
  '1012',
  '1015',
  '1016',
  '1017',
  '1018',
  '1052',
  '1053',
  '1054',
  '1071',
  '1072',
  '1073',
  '1074'
];

cron.schedule('*/3 * * * *', notify);

function notify() {

  request('http://www.mva.nl/koop/amsterdam/wonen/prijs-0-275000/', (error, response, body) => {
    if (error) return log('[ERROR]', error);
    if (response.statusCode !== 200) return log('[WARN] Not 200');
    const $ = cheerio.load(body);
    const foundHomes = [];

    $('div#ObjectsContainer div.ElementContainer').each((index, home) => {
      const $home = $(home);
      const zipcode = $home.find('h3 .postcode').text();
      const codeOnly = zipcode.substring(0, 4);

      if (zipcodes.indexOf(codeOnly) > -1) {
        foundHomes.push({
          zipcode,
          price: $home.find('.element_prijs2.prijs_aktief').text(),
          image: `http:${$home.find('img.element_img1').attr('src')}`,
          link: $home.find('h3 a').attr('href'),
          address: $home.find('h3 .adres').text()
        });
      }
    });

    for (const foundHome of foundHomes) {
      client.get(foundHome.link, (error, reply) => {
        if (error) return log('[ERROR]', error);
        if (reply) return;

        client.set(foundHome.link, true);
        bot.sendPhoto(group, foundHome.image, {
          caption: `${foundHome.price}
${foundHome.address} - ${foundHome.zipcode}
${foundHome.link}`
        });
      });
    }
  });
}

console.log('Adriaan!!');
