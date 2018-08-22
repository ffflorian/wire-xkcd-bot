import {ImageContent} from '@wireapp/core/dist/conversation/content/';
import * as logdown from 'logdown';

const PNGReader = require('png.js');
const JPEGReader = require('jpeg-js');
const {GifReader: GIFReader} = require('omggif');

const logger = logdown('wire-xkcd-bot/ImageTools', {
  logger: console,
  markdown: false,
});

interface ImageCheckOptions {
  mask?: number[];
  offset: number;
}

interface ImageData {
  extension: string;
  mimeType: string;
}

function checkImageType(buf: Buffer, options?: {mask?: number[]; offset?: number}): ImageData {
  const typeOptions: ImageCheckOptions = {
    offset: 0,
    ...options,
  };

  const check = (header: number[], options: ImageCheckOptions) => {
    for (let i = 0; i < header.length; i++) {
      if (options.mask) {
        if (header[i] !== (options.mask[i] & buf[i + options.offset])) {
          return false;
        }
      } else if (header[i] !== buf[i + options.offset]) {
        return false;
      }
    }

    return true;
  };

  if (check([0xff, 0xd8, 0xff], typeOptions)) {
    return {
      extension: 'jpg',
      mimeType: 'image/jpeg',
    };
  }

  if (check([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], typeOptions)) {
    return {
      extension: 'png',
      mimeType: 'image/png',
    };
  }

  if (check([0x47, 0x49, 0x46], typeOptions)) {
    return {
      extension: 'gif',
      mimeType: 'image/gif',
    };
  }

  throw new Error('Unknown image type.');
}

export async function parseImage(buffer: Buffer): Promise<ImageContent> {
  let width = 0;
  let height = 0;
  let imageType: ImageData = {
    extension: '',
    mimeType: '',
  };

  try {
    imageType = checkImageType(buffer);
  } catch (error) {
    logger.error(error);
  }

  switch (imageType.extension) {
    case 'jpg': {
      try {
        const rawImageData = JPEGReader.decode(buffer);
        height = rawImageData.height;
        width = rawImageData.width;
        logger.info(`Decoded image as JPEG with size ${width}*${height}.`);
      } catch (error) {
        logger.error('Failed to decode image as JPEG.', error);
      }
      break;
    }
    case 'png': {
      await new Promise((resolve, reject) => {
        new PNGReader(buffer).parse((error: Error, png: any) => {
          if (error) {
            return reject(error);
          }
          height = png.getHeight();
          width = png.getWidth();
          logger.info(`Decoded image as PNG with size ${width}*${height}.`);
          return resolve();
        });
      }).catch(error => logger.error('Failed to decode image as PNG.', error));

      break;
    }
    case 'gif': {
      try {
        const gifReader = new GIFReader(buffer);
        const frameInfo = gifReader.frameInfo(0);
        height = frameInfo.height;
        width = frameInfo.width;
        logger.info(`Decoded image as GIF with size ${width}*${height}.`);
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
    type: imageType.mimeType,
  };
}
