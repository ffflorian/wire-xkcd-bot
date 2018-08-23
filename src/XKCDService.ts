import {ImageContent} from '@wireapp/core/dist/conversation/content/';
import * as ImageTools from './ImageTools';

import {XKCD} from '@ffflorian/xkcdjs';
import * as request from 'request';
import * as url from 'url';
import * as logdown from 'logdown';

interface ComicResult extends ImageContent {
  comment: string;
  index: number;
  title: string;
}

class XKCDService {
  private readonly XKCD: XKCD;
  private readonly logger: logdown.Logger;

  constructor() {
    this.XKCD = new XKCD();
    this.logger = logdown('wire-xkcd-bot/XKCDService', {
      logger: console,
      markdown: false,
    });
  }

  private downloadImage(imageUrl: string): Promise<Buffer> {
    if (!url.parse(imageUrl)) {
      throw new Error(`Invalid URL "${imageUrl}".`);
    }

    const options = {
      encoding: null,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:57.0) Gecko/20100101 Firefox/57.0',
      },
    };

    return new Promise((resolve, reject) =>
      request.get(imageUrl, options, (error: Error, response) => {
        if (error) {
          return reject(error);
        }

        if (response) {
          if (response.statusCode === 404) {
            return reject('Sorry, I could not find this.');
          }
          if (response.statusCode !== 200) {
            return reject(`Sorry, something went wrong (status code ${response.statusCode}).`);
          }
          if (response.body) {
            return resolve(response.body);
          }
          return reject(`Sorry, something went wrong (no body received).`)
        }

        reject('No result and no error.');
      })
    );
  }

  async getRandomComic(): Promise<ComicResult> {
    const xkcdResult = await this.XKCD.getRandom();
    this.logger.info(`Got random comic with data:`, xkcdResult);

    const {num: index, img: imageLink, alt: comment, title} = xkcdResult;
    const image = await this.downloadImage(imageLink);
    const imageMetaData = await ImageTools.parseImage(image);

    return {
      ...imageMetaData,
      comment,
      index,
      title,
    };
  }

  async getLatestComic(): Promise<ComicResult> {
    const xkcdResult = await this.XKCD.getLatest();
    this.logger.info(`Got latest comic with data:`, xkcdResult);

    const {num: index, img: imageLink, alt: comment, title} = xkcdResult;
    const image = await this.downloadImage(imageLink);
    const imageMetaData = await ImageTools.parseImage(image);

    return {
      ...imageMetaData,
      comment,
      index,
      title,
    };
  }

  async getComic(index: number): Promise<ComicResult> {
    const xkcdResult = await this.XKCD.getByIndex(index);
    this.logger.info(`Got comic by ID ${index} with data:`, xkcdResult);

    const {img: imageLink, alt: comment, title} = xkcdResult;
    const image = await this.downloadImage(imageLink);
    const imageMetaData = await ImageTools.parseImage(image);

    return {
      ...imageMetaData,
      comment,
      index,
      title,
    };
  }
}

export {XKCDService};
