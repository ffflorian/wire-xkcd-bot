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

enum CommandType {
  HELP,
  LATEST,
  NO_COMMAND,
  COMIC,
  RANDOM,
  UNKNOWN_COMMAND,
  UPTIME,
}

const basicCommands: BasicCommand[] = [
  {
    command: 'help',
    description: 'Display this message.',
    parseArguments: false,
    type: CommandType.HELP,
  },
  {
    command: 'latest',
    description: 'Get the latest comic.',
    parseArguments: false,
    type: CommandType.LATEST,
  },
  {
    command: 'comic',
    description: 'Get a comic.',
    parseArguments: true,
    type: CommandType.COMIC,
  },
  {
    command: 'uptime',
    description: 'Get the current uptime of this bot.',
    parseArguments: false,
    type: CommandType.UPTIME,
  },
  {
    command: 'random',
    description: 'Get a random comic.',
    parseArguments: false,
    type: CommandType.RANDOM,
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
