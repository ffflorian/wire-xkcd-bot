import {MessageHandler} from '@wireapp/bot-api';
import {PayloadBundleIncoming, PayloadBundleType, ReactionType} from '@wireapp/core/dist/conversation/root';
import {TextContent} from '@wireapp/core/dist/conversation/content/';
import {Connection, ConnectionStatus} from '@wireapp/api-client/dist/commonjs/connection';
import {CommandService, CommandType, ParsedCommand} from './CommandService';
import {toHHMMSS} from './utils';
import {XKCDService} from './XKCDService';

const {version}: {version: string} = require('../package.json');

interface Config {
  developerConversationId?: string;
};

class MainHandler extends MessageHandler {
  private readonly developerConversationId?: string;
  private readonly helpText = `**Hello!** 😎 This is XKCD bot v${version} speaking.\n\nAvailable commands:\n${CommandService.formatCommands()}\n\nMore information about this bot: https://github.com/ffflorian/wire-xkcd-bot.\n\nPlease also visit https://xkcd.com.`;
  private answerCache: {
    [conversationId: string]: {
      content?: string;
      page: number;
      type: CommandType;
      waitingForContent: boolean;
    };
  };

  constructor({
    developerConversationId,
  }: Config) {
    super();
    this.developerConversationId = developerConversationId;
    this.answerCache = {};

    if (!this.developerConversationId) {
      console.warn('You did not specify a developer conversation ID and will not be able to receive feedback.');
    }
  }

  async handleEvent(payload: PayloadBundleIncoming) {
    switch (payload.type) {
      case PayloadBundleType.TEXT: {
        if (payload.conversation) {
          const messageContent = payload.content as TextContent;
          return this.handleText(payload.conversation, messageContent.text, payload.id);
        }
      }
      case PayloadBundleType.CONNECTION_REQUEST: {
        const connectRequest = payload.content as Connection;
        if (payload.conversation && connectRequest.status !== ConnectionStatus.CANCELLED) {
          return this.handleConnectionRequest(connectRequest.to, payload.conversation);
        }
      }
    }
  }

  async handleText(conversationId: string, text: string, messageId: string): Promise<void> {
    const {commandType, content, rawCommand} = CommandService.parseCommand(text);

    switch (commandType) {
      case CommandType.NO_COMMAND:
      case CommandType.UNKNOWN_COMMAND:
        break;
      default:
        await this.sendReaction(conversationId, messageId, ReactionType.LIKE);
    }

    if (this.answerCache[conversationId]) {
      const {type, waitingForContent} = this.answerCache[conversationId];
      if (waitingForContent) {
        await this.sendReaction(conversationId, messageId, ReactionType.LIKE);
        delete this.answerCache[conversationId];
        return this.answer(conversationId, {content, commandType: type, rawCommand});
      }
    }

    return this.answer(conversationId, {commandType, content, rawCommand});
  }

  async answer(conversationId: string, parsedCommand: ParsedCommand, page = 1) {
    const {content, rawCommand, commandType} = parsedCommand;
    switch (commandType) {
      case CommandType.HELP: {
        return this.sendText(conversationId, this.helpText);
      }
      case CommandType.UPTIME: {
        return this.sendText(conversationId, `Current uptime: ${toHHMMSS(process.uptime().toString())}`);
      }
      case CommandType.RANDOM: {
        let comicResult;

        try {
          comicResult = await XKCDService.getRandomComic();
        } catch (error) {
          return this.sendText(conversationId, error);
        }

        const {data, index} = comicResult;

        const image = {
          data,
          height: 289,
          type: 'image/png',
          width: 429,
        };

        await this.sendImage(conversationId, image);
        return this.sendText(conversationId, `Permanent link: https://xkcd.com/${index}`);
      }
      case CommandType.COMIC: {
        if (!content) {
          this.answerCache[conversationId] = {
            page,
            type: CommandType.COMIC,
            waitingForContent: true,
          };
          return this.sendText(conversationId, 'Which comic would you like to see?');
        }

        let comicResult;

        if (content === 'latest') {
          try {
            comicResult = await XKCDService.getLatestComic();
          } catch (error) {
            return this.sendText(conversationId, error);
          }
        } else if (!Number(content) || Number(content) < 1) {
          return this.sendText(conversationId, 'Invalid number specified.');
        } else {
          try {
            comicResult = await XKCDService.getComic(Number(content));
          } catch (error) {
            return this.sendText(conversationId, error);
          }
        }

        const {data, index} = comicResult;

        const image = {
          data,
          height: 289,
          type: 'image/png',
          width: 429,
        };

        await this.sendImage(conversationId, image);
        return this.sendText(conversationId, `Permanent link: https://xkcd.com/${index}/`);
      }
      case CommandType.LATEST: {
        let comicResult;

        try {
          comicResult = await XKCDService.getLatestComic();
        } catch (error) {
          return this.sendText(conversationId, error);
        }

        const {data, index} = comicResult;

        const image = {
          data,
          height: 289,
          type: 'image/png',
          width: 429,
        };

        await this.sendImage(conversationId, image);
        return this.sendText(conversationId, `Permanent link: https://xkcd.com/${index}`);
      }
      case CommandType.FEEDBACK: {
        if (!this.developerConversationId) {
          return this.sendText(conversationId, `Sorry, the developer did not specify a feedback channel.`);
        }

        if (!content) {
          this.answerCache[conversationId] = {
            page,
            type: CommandType.FEEDBACK,
            waitingForContent: true,
          };
          return this.sendText(conversationId, 'What would you like to tell the developer?');
        }

        await this.sendText(this.developerConversationId, `Feedback from a user:\n\n"${content}"`);
        delete this.answerCache[conversationId];
        return this.sendText(conversationId, 'Thank you for your feedback.');
      }
      case CommandType.UNKNOWN_COMMAND: {
        return this.sendText(conversationId, `Sorry, I don't know the command "${rawCommand}" yet.`);
      }
      default: {
        return this.sendText(conversationId, `Sorry, "${rawCommand}" is not implemented yet.`);
      }
    }
  }

  async handleConnectionRequest(userId: string, conversationId: string): Promise<void> {
    await this.sendConnectionResponse(userId, true);
    await this.sendText(conversationId, this.helpText);
  }
}

export {MainHandler};
