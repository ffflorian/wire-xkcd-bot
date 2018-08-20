import {ImageContent} from '@wireapp/core/dist/conversation/content/';
import * as ImageTools from './ImageTools';

import * as request from 'request';
import * as url from 'url';
import * as logdown from 'logdown';

interface ComicResult extends ImageContent {
  comment: string;
  index: number;
  title: string;
}

const baseUrl = 'https://xkcd.com';

const logger = logdown('wire-xkcd-bot/XKCDService', {
  logger: console,
  markdown: false,
});

function makeRequest(url: string, options: request.CoreOptions = {}): Promise<request.Response> {
  options = {
    ...options,
    headers: {
      ...options.headers,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:57.0) Gecko/20100101 Firefox/57.0',
    },
  };
  return new Promise((resolve, reject) =>
    request.get(url, options, (error: Error, response) => {
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
        return resolve(response);
      }

      reject('No result and no error.');
    })
  );
}

function regexExtract(regex: string, text: string): string {
  const regexResult = new RegExp(regex, 'gmi').exec(text) || [];
  const result = regexResult[1];
  if (!result) {
    throw new Error(`No result for expression "${regex}".`);
  }
  return result;
}

const extractComment = (body: string): string => regexExtract(' title="([^"]+)"', extractImageTag(body));
const extractImageTag = (body: string): string => regexExtract('<div id="comic">\n(.*)\n', body);
const extractImageUrl = (body: string): string => regexExtract(' src="([^"]+)"', extractImageTag(body));
const extractTitle = (body: string): string => regexExtract(' alt="([^"]+)"', extractImageTag(body));
const extractIndex = (body: string): number =>
  Number(regexExtract('Permanent link to this comic: https://xkcd.com/([0-9]+)/', body));

async function downloadImage(imageUrl: string): Promise<Buffer> {
  if (imageUrl.startsWith('//')) {
    imageUrl = 'https:' + imageUrl;
  }
  if (!url.parse(imageUrl)) {
    throw new Error(`Invalid URL "${imageUrl}".`);
  }
  const {body} = await makeRequest(imageUrl, {encoding: null});
  return body;
}

async function buildData(rawContentBody: string): Promise<ComicResult> {
  const comment = extractComment(rawContentBody);
  const index = extractIndex(rawContentBody);
  const imageUrl = extractImageUrl(rawContentBody);
  const title = extractTitle(rawContentBody);
  logger.info('Extracted data', {comment, index, imageUrl, title});

  const data = await downloadImage(imageUrl);
  const imageMetaData = await ImageTools.parseImage(data);

  return {
    ...imageMetaData,
    comment,
    data,
    index,
    title,
  };
}

const XKCDService = {
  async getRandomComic(): Promise<ComicResult> {
    const {body: rawContentBody} = await makeRequest('https://c.xkcd.com/random/comic/');
    return buildData(rawContentBody);
  },

  async getLatestComic(): Promise<ComicResult> {
    const {body: rawContentBody} = await makeRequest(baseUrl);
    return buildData(rawContentBody);
  },

  async getComic(index: number): Promise<ComicResult> {
    const {body: rawContentBody} = await makeRequest(`${baseUrl}/${index}`);
    return buildData(rawContentBody);
  },
};

export {XKCDService};
