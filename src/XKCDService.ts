import * as request from 'request';

interface ComicResult {
  comment: string;
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
        if (result) {
          if (result.statusCode === 404) {
            return reject('Sorry, I could not find this.');
          }
          if (result.statusCode !== 200) {
            return reject(`Sorry, something went wrong (status code ${result.statusCode}).`);
          }
          return resolve(result);
        }
        if (error) {
          return reject(error);
        }
        reject('No result and no error.');
      })
    );
  },

  extractImageTag(rawContentBody: string): string {
    const regexResult = new RegExp('<div id="comic">\n(.*)\n', 'gmi').exec(rawContentBody) || [];
    return regexResult[1];
  },

  extractComment(rawContentBody: string): string {
    const imageTag = XKCDService.extractImageTag(rawContentBody);
    const regexResult = new RegExp(' title="([^"]+)"', 'gmi').exec(imageTag) || [];
    return regexResult[1];
  },

  extractImageUrl(rawContentBody: string): string {
    const imageTag = XKCDService.extractImageTag(rawContentBody);
    const regexResult = new RegExp(' src="([^"]+)"', 'gmi').exec(imageTag) || [];
    return regexResult[1];
  },

  extractIndex(rawContentBody: string): number {
    const regexResult =
      new RegExp('Permanent link to this comic: https://xkcd.com/([0-9]+)/', 'gmi').exec(rawContentBody) || [];
    return Number(regexResult[1]);
  },

  extractTitle(rawContentBody: string): number {
    const imageTag = XKCDService.extractImageTag(rawContentBody);
    const regexResult = new RegExp(' alt="([^"]+)"', 'gmi').exec(imageTag) || [];
    return Number(regexResult[1]);
  },

  async getRandomComic(): Promise<ComicResult> {
    const {body: rawContentBody} = await XKCDService.makeRequest('https://c.xkcd.com/random/comic/');
    const comment = XKCDService.extractComment(rawContentBody);
    const index = XKCDService.extractIndex(rawContentBody);
    const imageUrl = XKCDService.extractImageUrl(rawContentBody);
    const data = await XKCDService.downloadImage(imageUrl);

    return {
      comment,
      data,
      index,
    };
  },

  async downloadImage(imageUrl: string): Promise<Buffer> {
    if (imageUrl.startsWith('//')) {
      imageUrl = 'https:' + imageUrl;
    }
    const imageResult = await XKCDService.makeRequest(imageUrl, {encoding: null});
    return imageResult.body;
  },

  async getLatestComic(): Promise<ComicResult> {
    const {body: rawContentBody} = await XKCDService.makeRequest(baseUrl);
    const comment = XKCDService.extractComment(rawContentBody);
    const imageUrl = XKCDService.extractImageUrl(rawContentBody);
    const data = await XKCDService.downloadImage(imageUrl);
    const index = XKCDService.extractIndex(rawContentBody);

    return {
      comment,
      data,
      index,
    };
  },

  async getComic(index: number): Promise<ComicResult> {
    const {body: rawContentBody} = await XKCDService.makeRequest(`${baseUrl}/${index}`);
    const comment = XKCDService.extractComment(rawContentBody);
    const imageUrl = XKCDService.extractImageUrl(rawContentBody);
    const data = await XKCDService.downloadImage(imageUrl);

    return {
      comment,
      data,
      index,
    };
  },
};

export {XKCDService};
