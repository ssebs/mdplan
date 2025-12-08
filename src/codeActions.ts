import * as vscode from 'vscode';
import { INDENTATION } from './utils/constants';

export class MDPlanCodeActionProvider implements vscode.CodeActionProvider {

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
    ): vscode.CodeAction[] | undefined {
        const codeActions: vscode.CodeAction[] = [];

        for (const diagnostic of context.diagnostics) {
            if (diagnostic.source !== 'mdplan') {
                continue;
            }

            // Fix invalid task status
            if (diagnostic.message.includes('Invalid task status')) {
                const suggestedFix = (diagnostic as any).suggestedFix;
                if (suggestedFix) {
                    codeActions.push(this.createFixStatusAction(document, diagnostic, suggestedFix));
                }
            }

            // Fix tasks not under section
            if (diagnostic.message.includes('Tasks must be under a section')) {
                codeActions.push(this.createAddSectionAction(document, diagnostic));
            }

            // Fix excessive nesting
            if (diagnostic.message.includes('nested 1 level deep')) {
                codeActions.push(this.createReduceIndentAction(document, diagnostic));
            }

            // Fix comment indentation
            if (diagnostic.message.includes('Comments should be indented')) {
                codeActions.push(this.createIndentCommentAction(document, diagnostic));
            }
        }

        return codeActions;
    }

    private createFixStatusAction(
        document: vscode.TextDocument,
        diagnostic: vscode.Diagnostic,
        suggestedFix: string
    ): vscode.CodeAction {
        const action = new vscode.CodeAction(
            `Replace with ${suggestedFix}`,
            vscode.CodeActionKind.QuickFix
        );
        action.diagnostics = [diagnostic];
        action.isPreferred = true;

        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, diagnostic.range, suggestedFix);
        action.edit = edit;

        return action;
    }

    private createAddSectionAction(
        document: vscode.TextDocument,
        diagnostic: vscode.Diagnostic
    ): vscode.CodeAction {
        const action = new vscode.CodeAction(
            'Add section header above',
            vscode.CodeActionKind.QuickFix
        );
        action.diagnostics = [diagnostic];

        const edit = new vscode.WorkspaceEdit();
        const lineNumber = diagnostic.range.start.line;
        const insertPosition = new vscode.Position(lineNumber, 0);

        // Insert a section header before the task
        edit.insert(document.uri, insertPosition, '## New Section\n');
        action.edit = edit;

        return action;
    }

    private createReduceIndentAction(
        document: vscode.TextDocument,
        diagnostic: vscode.Diagnostic
    ): vscode.CodeAction {
        const action = new vscode.CodeAction(
            'Reduce indentation to 1 level',
            vscode.CodeActionKind.QuickFix
        );
        action.diagnostics = [diagnostic];

        const edit = new vscode.WorkspaceEdit();
        const line = document.lineAt(diagnostic.range.start.line);
        const text = line.text;

        // Remove excessive indentation (keep only configured spaces per level)
        const taskMatch = text.match(/^\s*(-\s+\[.*)/);
        if (taskMatch) {
            const indent = ' '.repeat(INDENTATION.SPACES_PER_LEVEL);
            const newText = indent + taskMatch[1];
            edit.replace(document.uri, line.range, newText);
        }
        action.edit = edit;

        return action;
    }

    private createIndentCommentAction(
        document: vscode.TextDocument,
        diagnostic: vscode.Diagnostic
    ): vscode.CodeAction {
        const action = new vscode.CodeAction(
            'Indent comment under task',
            vscode.CodeActionKind.QuickFix
        );
        action.diagnostics = [diagnostic];

        const edit = new vscode.WorkspaceEdit();
        const line = document.lineAt(diagnostic.range.start.line);
        const text = line.text;

        // Add configured indentation
        const indent = ' '.repeat(INDENTATION.SPACES_PER_LEVEL);
        const newText = indent + text.trimStart();
        edit.replace(document.uri, line.range, newText);
        action.edit = edit;

        return action;
    }
}
