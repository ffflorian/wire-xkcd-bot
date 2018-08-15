interface BasicCommand {
  command: string;
  description: string;
  parseArguments: boolean;
  type: CommandType;
}

export interface ParsedCommand {
  commandType: CommandType;
  content?: string;
  rawCommand: string;
}

interface AnswerCommand {
  command: string;
  type: CommandType;
}

enum CommandType {
  ANSWER_NO,
  ANSWER_YES,
  BOWER,
  CRATES,
  HELP,
  NO_COMMAND,
  NPM,
  SERVICES,
  TYPES,
  UNKNOWN_COMMAND,
  UPTIME,
}

const answerCommands: AnswerCommand[] = [
  {
    command: 'yes',
    type: CommandType.ANSWER_YES,
  },
  {
    command: 'no',
    type: CommandType.ANSWER_NO,
  },
];

const basicCommands: BasicCommand[] = [
  {
    command: 'help',
    description: 'Display this message.',
    parseArguments: false,
    type: CommandType.HELP,
  },
  {
    command: 'services',
    description: 'List the available services.',
    parseArguments: false,
    type: CommandType.SERVICES,
  },
  {
    command: 'uptime',
    description: 'Get the current uptime of this bot.',
    parseArguments: false,
    type: CommandType.UPTIME,
  },
  {
    command: 'npm',
    description: 'Search for a package on npm.',
    parseArguments: true,
    type: CommandType.NPM,
  },
  {
    command: 'bower',
    description: 'Search for a package on Bower.',
    parseArguments: true,
    type: CommandType.BOWER,
  },
  {
    command: 'types',
    description: 'Search for type definitions on TypeSearch.',
    parseArguments: true,
    type: CommandType.TYPES,
  },
  {
    command: 'crates',
    description: 'Search for a package on crates.io.',
    parseArguments: true,
    type: CommandType.CRATES,
  },
];

const CommandService = {
  formatCommands(): string {
    return basicCommands
      .sort((a, b) => a.command.localeCompare(b.command))
      .reduce((prev, command) => prev + `\n- **/${command.command}**: ${command.description}`, '');
  },
  parseCommand(message: string): ParsedCommand {
    const messageMatch = message.match(/\/(\w+)(?: (.*))?/);

    for (const answerCommand of answerCommands) {
      if (message.toLowerCase() === answerCommand.command) {
        return {
          commandType: answerCommand.type,
          rawCommand: message.toLowerCase(),
        };
      }
    }

    if (messageMatch && messageMatch.length) {
      const parsedCommand = messageMatch[1].toLowerCase();
      const parsedArguments = messageMatch[2];

      for (const command of basicCommands) {
        if (command.command === parsedCommand) {
          return {
            commandType: command.type,
            content: command.parseArguments ? parsedArguments : '',
            rawCommand: parsedCommand,
          };
        }
      }
      return {
        commandType: CommandType.UNKNOWN_COMMAND,
        rawCommand: parsedCommand,
      };
    }
    return {
      content: message,
      rawCommand: message,
      commandType: CommandType.NO_COMMAND,
    };
  },
};

export {CommandService, CommandType};
