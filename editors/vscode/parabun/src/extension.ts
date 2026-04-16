import * as vscode from "vscode";
import { LanguageClient, LanguageClientOptions, ServerOptions } from "vscode-languageclient/node";

let client: LanguageClient | undefined;

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration("parabun");
  const lspPath = config.get<string>("lsp.path", "parabun");
  const lspScript = context.asAbsolutePath("server/parabun-lsp.ts");

  const serverOptions: ServerOptions = {
    command: lspPath,
    args: ["run", lspScript, "--stdio"],
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: "file", language: "parabun-ts" },
      { scheme: "file", language: "parabun-tsx" },
      { scheme: "file", language: "parabun-js" },
      { scheme: "file", language: "parabun-jsx" },
    ],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher("**/*.{pts,ptsx,pjs,pjsx}"),
    },
  };

  client = new LanguageClient("parabun-lsp", "Parabun Language Server", serverOptions, clientOptions);

  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  return client?.stop();
}
