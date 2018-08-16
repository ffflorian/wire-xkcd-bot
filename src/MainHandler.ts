import {MessageHandler} from '@wireapp/bot-api';
import {PayloadBundleIncoming, PayloadBundleType, ReactionType} from '@wireapp/core/dist/conversation/root';
import {TextContent} from '@wireapp/core/dist/conversation/content/';
import {Connection, ConnectionStatus} from '@wireapp/api-client/dist/commonjs/connection';
import {CommandService, CommandType, ParsedCommand} from './CommandService';
import {toHHMMSS} from './utils';
import {XKCDService} from './XKCDService';

const {version}: {version: string} = require('../package.json');

class MainHandler extends MessageHandler {
  private searchService: XKCDService;
  private readonly helpText = `**Hello!** 😎 This is XKCD bot v${version} speaking.\n\nAvailable commands:\n${CommandService.formatCommands()}\n\nMore information about this bot: https://github.com/ffflorian/wire-xkcd-bot.\n\nPlease also visit https://xkcd.com`;
  private answerCache: {
    [conversationId: string]: {
      content?: string;
      page: number;
      type: CommandType;
      waitingForContent: boolean;
    };
  };

  constructor() {
    super();
    this.searchService = new XKCDService();
    this.answerCache = {};
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

  private static morePagesText(moreResults: number, resultsPerPage: number): string {
    const isOne = moreResults === 1;
    return `\n\nThere ${isOne ? 'is' : 'are'} ${moreResults} more result${
      isOne ? '' : 's'
    }. Would you like to see ${resultsPerPage} more? Answer with "yes" or "no".`;
  }

  async handleText(conversationId: string, text: string, messageId: string): Promise<void> {
    const {commandType, content, rawCommand} = CommandService.parseCommand(text);

    switch (commandType) {
      case CommandType.ANSWER_NO:
      case CommandType.ANSWER_YES:
      case CommandType.NO_COMMAND:
      case CommandType.UNKNOWN_COMMAND:
        break;
      default:
        await this.sendReaction(conversationId, messageId, ReactionType.LIKE);
    }

    if (this.answerCache[conversationId]) {
      const {content: cachedContent, type, page, waitingForContent} = this.answerCache[conversationId];
      if (waitingForContent) {
        await this.sendReaction(conversationId, messageId, ReactionType.LIKE);
        delete this.answerCache[conversationId];
        return this.answer(conversationId, {content, commandType: type, rawCommand});
      }
      switch (commandType) {
        case CommandType.ANSWER_YES: {
          await this.sendReaction(conversationId, messageId, ReactionType.LIKE);
          return this.answer(conversationId, {content: cachedContent, commandType: type, rawCommand}, page + 1);
        }
        case CommandType.ANSWER_NO: {
          await this.sendReaction(conversationId, messageId, ReactionType.LIKE);
          delete this.answerCache[conversationId];
          await this.sendText(conversationId, 'Okay.');
          return;
        }
      }
    }

    return this.answer(conversationId, {commandType, content, rawCommand});
  }

  async answer(conversationId: string, parsedCommand: ParsedCommand, page = 1) {
    const {content, rawCommand, commandType} = parsedCommand;
    switch (commandType) {
      case CommandType.HELP:
        return this.sendText(conversationId, this.helpText);
      case CommandType.UPTIME:
        return this.sendText(conversationId, `Current uptime: ${toHHMMSS(process.uptime().toString())}`);
      case CommandType.BOWER: {
        if (!content) {
          this.answerCache[conversationId] = {
            page,
            type: CommandType.BOWER,
            waitingForContent: true,
          };
          return this.sendText(conversationId, 'What would you like to search on Bower?');
        }
        await this.sendText(conversationId, `Searching for "${content}" on Bower ...`);
        let {result, moreResults, resultsPerPage} = await this.searchService.searchXKCD(content, page);
        if (moreResults > 0) {
          result += MainHandler.morePagesText(moreResults, resultsPerPage);
          this.answerCache[conversationId] = {
            page,
            type: CommandType.BOWER,
            waitingForContent: false,
          };
        } else {
          delete this.answerCache[conversationId];
        }
        return this.sendText(conversationId, result);
      }

      case CommandType.UNKNOWN_COMMAND:
        return this.sendText(conversationId, `Sorry, I don't know the command "${rawCommand}" yet.`);
    }
  }

  async handleConnectionRequest(userId: string, conversationId: string): Promise<void> {
    await this.sendConnectionResponse(userId, true);
    await this.sendText(conversationId, this.helpText);
  }
}

export {MainHandler};
