import {
  DocumentFormattingEditProvider,
  DocumentSelector,
  ExtensionContext,
  RelativePattern,
  Terminal,
  TextDocument,
  commands,
  languages,
  window,
  workspace,
} from "vscode";

type Enum<TEnum> = TEnum[keyof TEnum];

const CONFIG_KEY = {
  PINT_ENABLE: "enablePint",
  PINT_EXECUTABLE: "pintExecutable",
  LARASTAN_ENABLE: "enableLarastan",
  LARASTAN_EXECUTABLE: "larastanExecutable",
} as const;

type Config = {
  [CONFIG_KEY.PINT_EXECUTABLE]: string;
  [CONFIG_KEY.LARASTAN_EXECUTABLE]: string;
  [CONFIG_KEY.PINT_ENABLE]: boolean;
  [CONFIG_KEY.LARASTAN_ENABLE]: boolean;
};

const TERMINAL_NAME = {
  PINT: "pint",
  LARASTAN: "larastan",
} as const;

type TerminalName = Enum<typeof TERMINAL_NAME>;

const name = "laraguide";

const getCommandName = <TValue extends string>(value: TValue) =>
  `${name}.${value}` as const;

const COMMAND_NAME = {
  FORMAT_FILE: getCommandName("format-file"),
  FORMAT_WORKSPACE: getCommandName("format-workspace"),
  ANALYZE_FILE: getCommandName("analyze-file"),
  ANALYZE_WORKSPACE: getCommandName("analyze-workspace"),
} as const;

const getCurrentDocument = () => {
  return window.activeTextEditor?.document;
};

const getWorkspace = (document: TextDocument) => {
  return workspace.getWorkspaceFolder(document.uri);
};

const getRelativePath = (document: TextDocument) => {
  const workspace = getWorkspace(document);
  if (!workspace) {
    return;
  }
  const filePath = document.uri.fsPath;
  const workspacePath = workspace.uri.fsPath;
  return filePath.replace(`${workspacePath}/`, "");
};

const executeCommand = (command: string, terminal: Terminal) => {
  terminal.sendText("clear", true);
  terminal.sendText(command, true);
};

const formatDocument = (
  document: TextDocument,
  terminal: Terminal,
  showTerminal: boolean
) => {
  const executable = getConfigValue(CONFIG_KEY.PINT_EXECUTABLE);
  if (!executable) {
    return;
  }

  const relativePath = getRelativePath(document);
  if (!relativePath) {
    return;
  }

  executeCommand(`${executable} ${relativePath}`, terminal);
  if (showTerminal) {
    terminal.show();
  }
};

const formatWorkspace = (terminal: Terminal) => {
  const executable = getConfigValue(CONFIG_KEY.PINT_EXECUTABLE);
  if (!executable) {
    return;
  }
  executeCommand(executable, terminal);
  terminal.show();
};

const analyzeDocument = (
  document: TextDocument,
  terminal: Terminal,
  showTerminal: boolean
) => {
  const executable = getConfigValue(CONFIG_KEY.LARASTAN_EXECUTABLE);
  if (!executable) {
    return;
  }

  const relativePath = getRelativePath(document);
  if (!relativePath) {
    return;
  }

  executeCommand(`${executable} --no-progress ${relativePath}`, terminal);
  if (showTerminal) {
    terminal.show();
  }
};

const analyzeWorkspace = (terminal: Terminal) => {
  const executable = getConfigValue(CONFIG_KEY.LARASTAN_EXECUTABLE);
  if (!executable) {
    return;
  }

  executeCommand(executable, terminal);
  terminal.show();
};

const getConfigValue = <TKey extends keyof Config>(key: TKey) => {
  const config = workspace.getConfiguration(name);
  const value = config.inspect<Config[TKey]>(key);
  if (!value) {
    return undefined;
  }
  const { defaultValue, globalValue, workspaceValue } = value;
  if (workspaceValue !== undefined) {
    return workspaceValue;
  }
  if (globalValue !== undefined) {
    return globalValue;
  }
  return defaultValue;
};

const registerFormatter = ({
  larastanTerminal,
  larastanEnabled,
  pintEnabled,
  pintTerminal,
}: {
  larastanTerminal?: Terminal;
  larastanEnabled: boolean;
  pintEnabled: boolean;
  pintTerminal?: Terminal;
}) => {
  const document = getCurrentDocument();
  if (!document) {
    return;
  }
  const workspace = getWorkspace(document);
  if (!workspace) {
    return;
  }
  const pattern = new RelativePattern(workspace, "**/*.php");
  const selector: DocumentSelector = {
    language: "php",
    pattern,
  };
  const provider: DocumentFormattingEditProvider = {
    provideDocumentFormattingEdits(document, options, token) {
      if (pintEnabled && pintTerminal) {
        formatDocument(document, pintTerminal, false);
      }
      if (larastanEnabled && larastanTerminal) {
        analyzeDocument(document, larastanTerminal, false);
      }
      return [];
    },
  };

  languages.registerDocumentFormattingEditProvider(selector, provider);
};

const registerFormatFileCommand = (terminal: Terminal) =>
  commands.registerCommand(COMMAND_NAME.FORMAT_FILE, () => {
    const document = getCurrentDocument();
    if (!document) {
      return;
    }
    formatDocument(document, terminal, true);
  });

const registerFormatWorkspaceCommand = (terminal: Terminal) =>
  commands.registerCommand(COMMAND_NAME.FORMAT_WORKSPACE, () => {
    formatWorkspace(terminal);
  });

const registerAnalyzeFileCommand = (terminal: Terminal) =>
  commands.registerCommand(COMMAND_NAME.ANALYZE_FILE, () => {
    const document = getCurrentDocument();
    if (!document) {
      return;
    }
    analyzeDocument(document, terminal, true);
  });

const registerAnalyzeWorkspaceCommand = (terminal: Terminal) =>
  commands.registerCommand(COMMAND_NAME.ANALYZE_WORKSPACE, () => {
    analyzeWorkspace(terminal);
  });

const activatePint = () => {
  const enabled = getConfigValue(CONFIG_KEY.PINT_ENABLE);
  if (!enabled) {
    return {
      enabled: false,
    } as const;
  }

  const terminal = getTerminal(TERMINAL_NAME.PINT);
  const formatFileCommand = registerFormatFileCommand(terminal);
  const formatWorkspaceCommand = registerFormatWorkspaceCommand(terminal);

  return {
    enabled,
    terminal,
    formatFileCommand,
    formatWorkspaceCommand,
  } as const;
};

const activateLarastan = () => {
  const enabled = getConfigValue(CONFIG_KEY.LARASTAN_ENABLE);
  if (!enabled) {
    return {
      enabled: false,
    } as const;
  }
  const terminal = getTerminal(TERMINAL_NAME.LARASTAN);
  terminal.show();
  const analyzeFileCommand = registerAnalyzeFileCommand(terminal);
  const analyzeWorkspaceCommand = registerAnalyzeWorkspaceCommand(terminal);

  return {
    enabled,
    terminal,
    analyzeFileCommand,
    analyzeWorkspaceCommand,
  } as const;
};

const getTerminal = (name: TerminalName) => {
  const terminal = window.terminals.find((terminal) => terminal.name === name);
  return terminal || window.createTerminal(name);
};

export function activate(context: ExtensionContext) {
  const {
    enabled: larastanEnabled,
    terminal: larastanTerminal,
    analyzeFileCommand,
    analyzeWorkspaceCommand,
  } = activateLarastan();

  if (larastanEnabled) {
    context.subscriptions.push(analyzeFileCommand, analyzeWorkspaceCommand);
  }

  const {
    enabled: pintEnabled,
    terminal: pintTerminal,
    formatFileCommand,
    formatWorkspaceCommand,
  } = activatePint();

  if (pintEnabled) {
    context.subscriptions.push(formatFileCommand, formatWorkspaceCommand);
  }

  registerFormatter({
    pintEnabled,
    pintTerminal,
    larastanEnabled,
    larastanTerminal,
  });
}

export function deactivate() {}
