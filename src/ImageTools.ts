import {ImageContent} from '@wireapp/core/dist/conversation/content/';
import * as logdown from 'logdown';

import {ImageData as XKCDImageData} from '@ffflorian/xkcdjs/dist/XKCDResult';
const PNGReader = require('png.js');
const JPEGReader = require('jpeg-js');
const {GifReader: GIFReader} = require('omggif');

const logger = logdown('wire-xkcd-bot/ImageTools', {
  logger: console,
  markdown: false,
});

interface ImageData {
  extension: string;
  mimeType: string;
}

export async function parseImage(image: XKCDImageData): Promise<ImageContent> {
  const {data: buffer, mimeType} = image;

  let width = 0;
  let height = 0;

  switch (mimeType) {
    case 'image/jpeg': {
      try {
        const rawImageData = JPEGReader.decode(buffer);
        height = rawImageData.height;
        width = rawImageData.width;
        logger.info(`Decoded image as JPEG with size ${width}x${height}.`);
      } catch (error) {
        logger.error('Failed to decode image as JPEG.', error);
      }
      break;
    }
    case 'image/png': {
      await new Promise((resolve, reject) => {
        new PNGReader(buffer).parse((error: Error, png: any) => {
          if (error) {
            return reject(error);
          }
          height = png.getHeight();
          width = png.getWidth();
          logger.info(`Decoded image as PNG with size ${width}x${height}.`);
          return resolve();
        });
      }).catch(error => logger.error('Failed to decode image as PNG.', error));

      break;
    }
    case 'image/gif': {
      try {
        const gifReader = new GIFReader(buffer);
        const frameInfo = gifReader.frameInfo(0);
        height = frameInfo.height;
        width = frameInfo.width;
        logger.info(`Decoded image as GIF with size ${width}x${height}.`);
      } catch (error) {
        logger.error('Failed to decode image as GIF.', error);
      }
      break;
    }
  }

  return {
    data: buffer,
    width,
    height,
    type: mimeType || '',
  };
}
