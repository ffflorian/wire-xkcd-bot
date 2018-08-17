import * as request from 'request';

interface ComicResult {
  data: Buffer;
  index: number;
}

const baseUrl = 'https://xkcd.com';

const XKCDService = {
  makeRequest(url: string, options: request.CoreOptions = {}): Promise<request.Response> {
    options = {
      ...options,
      headers: {
        ...options.headers,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:57.0) Gecko/20100101 Firefox/57.0',
      },
    };
    return new Promise((resolve, reject) =>
      request.get(url, options, (error: Error, result) => {
        if (result.statusCode === 404) {
          return reject('Sorry, I could not find this.');
        }
        if (result.statusCode !== 200) {
          return reject(`Sorry, something went wrong (status code ${result.statusCode}).`);
        }
        if (error) {
          return reject(error.toString());
        }
        return resolve(result);
      })
    );
  },

  extractIndex(rawContentBody: string): number {
    const regexResult =
      new RegExp('Permanent link to this comic: https://xkcd.com/([0-9]+)/', 'gmi').exec(rawContentBody) || [];
    return Number(regexResult[1]);
  },

  async getRandomComic(): Promise<ComicResult> {
    const {body: rawContentBody} = await XKCDService.makeRequest('https://c.xkcd.com/random/comic/');
    const imageUrl = XKCDService.extractImageUrl(rawContentBody);
    const imageResult = await XKCDService.makeRequest(`https:${imageUrl}`, {encoding: null});
    const index = XKCDService.extractIndex(rawContentBody);

    return {
      data: imageResult.body,
      index,
    };
  },

  extractImageUrl(rawContentBody: string): string {
    const regexResult = new RegExp('<div id="comic">\n<img src="([^"]+)"', 'gmi').exec(rawContentBody) || [];
    return regexResult[1];
  },

  async getLatestComic(): Promise<ComicResult> {
    const {body: rawContentBody} = await XKCDService.makeRequest(baseUrl);
    const index = XKCDService.extractIndex(rawContentBody);
    const imageUrl = XKCDService.extractImageUrl(rawContentBody);
    const imageResult = await XKCDService.makeRequest(`https:${imageUrl}`, {encoding: null});

    return {
      data: imageResult.body,
      index,
    };
  },

  async getComic(index: number): Promise<ComicResult> {
    const {body: rawContentBody} = await XKCDService.makeRequest(`${baseUrl}/${index}`);
    const imageUrl = XKCDService.extractImageUrl(rawContentBody);
    const imageResult = await XKCDService.makeRequest(`https:${imageUrl}`, {encoding: null});

    return {
      data: imageResult.body,
      index,
    };
  },
};

export {XKCDService};
