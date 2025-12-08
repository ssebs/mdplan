import * as vscode from 'vscode';
import { MDPlanDiagnostics } from './diagnostics';
import { MDPlanCodeActionProvider } from './codeActions';
import { MDPlanCodeLensProvider } from './codeLens';
import { MDPlanCommands } from './commands';
import { MDPlanDecorations } from './decorations';

function isBlankDocument(doc: vscode.TextDocument): boolean {
	const text = doc.getText().trim();
	return text === '';
}

async function suggestMDPlanSnippet(doc: vscode.TextDocument) {
	const message = 'This is a blank markdown file. Would you like to create an MDPlan file?';
	const action = 'Use MDPlan Template';

	const result = await vscode.window.showInformationMessage(message, action);

	if (result === action) {
		const editor = vscode.window.activeTextEditor;
		if (editor && editor.document === doc) {
			// Insert the MDPlan template snippet
			const snippet = new vscode.SnippetString([
				'# ${1:Project Name}',
				'',
				'> ${2:Project description}',
				'',
				'## Todo',
				'- [ ] ${3:First task}',
				'',
				'## Done',
				'',
				'',
				'<!-- mdplan -->'
			].join('\n'));

			await editor.insertSnippet(snippet, new vscode.Position(0, 0));
		}
	}
}

export function activate(context: vscode.ExtensionContext) {

	console.log('MDPlan extension is now active!');

	// Initialize diagnostics
	const diagnostics = new MDPlanDiagnostics();

	// Register code action provider
	const codeActionProvider = vscode.languages.registerCodeActionsProvider(
		{ language: 'markdown' },
		new MDPlanCodeActionProvider(),
		{
			providedCodeActionKinds: MDPlanCodeActionProvider.providedCodeActionKinds
		}
	);

	// Register CodeLens provider
	const codeLensProvider = new MDPlanCodeLensProvider();
	const codeLensDisposable = vscode.languages.registerCodeLensProvider(
		{ language: 'markdown' },
		codeLensProvider
	);

	// Initialize decorations provider
	const decorations = new MDPlanDecorations();

	// Update decorations for active editor
	function updateDecorations() {
		const editor = vscode.window.activeTextEditor;
		if (editor && editor.document.languageId === 'markdown') {
			decorations.updateDecorations(editor);
		}
	}

	// Update decorations when document opens or changes
	const onDidOpenTextDocument = vscode.workspace.onDidOpenTextDocument(doc => {
		diagnostics.updateDiagnostics(doc);

		// Suggest snippet for blank markdown files
		if (doc.languageId === 'markdown' && isBlankDocument(doc)) {
			suggestMDPlanSnippet(doc);
		}

		updateDecorations();
	});

	const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument(event => {
		diagnostics.updateDiagnostics(event.document);
		codeLensProvider.refresh();
		updateDecorations();
	});

	const onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor(editor => {
		if (editor) {
			updateDecorations();
		}
	});

	const onDidCloseTextDocument = vscode.workspace.onDidCloseTextDocument(doc => {
		diagnostics.deleteDiagnostics(doc);
	});

	// Handle clicks on decorations
	const onDidChangeTextEditorSelection = vscode.window.onDidChangeTextEditorSelection(event => {
		const editor = event.textEditor;
		const selection = event.selections[0];

		// Only handle single clicks (no selection)
		if (selection && selection.isEmpty) {
			decorations.handleClick(editor, selection.active);
		}
	});

	// Check all open documents on activation
	vscode.workspace.textDocuments.forEach(doc => {
		diagnostics.updateDiagnostics(doc);
	});

	// Update decorations for currently active editor
	updateDecorations();

	// Register commands
	const addTaskCommand = vscode.commands.registerCommand('mdplan.addTask', MDPlanCommands.addTask);
	const moveTaskCommand = vscode.commands.registerCommand('mdplan.moveTask', MDPlanCommands.moveTask);
	const changeStatusCommand = vscode.commands.registerCommand('mdplan.changeStatus', MDPlanCommands.changeStatus);
	const deleteTaskCommand = vscode.commands.registerCommand('mdplan.deleteTask', MDPlanCommands.deleteTask);
	const addTaskDetailsCommand = vscode.commands.registerCommand('mdplan.addTaskDetails', MDPlanCommands.addTaskDetails);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('mdplan.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from mdplan!');
	});

	context.subscriptions.push(
		disposable,
		diagnostics,
		decorations,
		codeActionProvider,
		codeLensDisposable,
		onDidOpenTextDocument,
		onDidChangeTextDocument,
		onDidChangeActiveTextEditor,
		onDidChangeTextEditorSelection,
		onDidCloseTextDocument,
		addTaskCommand,
		moveTaskCommand,
		changeStatusCommand,
		deleteTaskCommand,
		addTaskDetailsCommand
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
