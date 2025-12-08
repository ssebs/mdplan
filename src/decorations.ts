import * as vscode from 'vscode';
import { MDPlanParser } from './parser';
import { REGEX_PATTERNS, COMMANDS } from './utils/constants';
import { getIndentLevel } from './utils/sectionUtils';

export class MDPlanDecorations {
    private actionDecorationType: vscode.TextEditorDecorationType;

    constructor() {
        // Create decoration showing ellipsis at the end of tasks
        this.actionDecorationType = vscode.window.createTextEditorDecorationType({
            after: {
                contentText: '...',
                margin: '0 0 0 2em',
                color: new vscode.ThemeColor('editorCodeLens.foreground'),
            },
            rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
        });
    }

    public updateDecorations(editor: vscode.TextEditor): void {
        if (!MDPlanParser.isMDPlanDocument(editor.document)) {
            this.clearDecorations(editor);
            return;
        }

        const tasks = this.findTasks(editor.document);
        const decorations: vscode.DecorationOptions[] = [];

        for (const task of tasks) {
            // Only add decorations for top-level tasks (not nested)
            if (task.indentLevel === 0) {
                const line = editor.document.lineAt(task.line);
                const lineEndPos = new vscode.Position(task.line, line.text.length);
                const range = new vscode.Range(lineEndPos, lineEndPos);

                decorations.push({
                    range,
                    hoverMessage: 'Click to add description or modify task'
                });
            }
        }

        editor.setDecorations(this.actionDecorationType, decorations);
    }

    public clearDecorations(editor: vscode.TextEditor): void {
        editor.setDecorations(this.actionDecorationType, []);
    }

    public dispose(): void {
        this.actionDecorationType.dispose();
    }

    private findTasks(document: vscode.TextDocument): Array<{ line: number; indentLevel: number }> {
        const tasks: Array<{ line: number; indentLevel: number }> = [];

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const match = line.text.match(REGEX_PATTERNS.TASK);
            if (match) {
                const indent = match[1] || '';
                const indentLevel = getIndentLevel(indent);
                tasks.push({ line: i, indentLevel });
            }
        }

        return tasks;
    }

    public async handleClick(editor: vscode.TextEditor, position: vscode.Position): Promise<void> {
        const line = editor.document.lineAt(position.line);

        if (!REGEX_PATTERNS.TASK.test(line.text)) {
            return;
        }

        // Find the checkbox position in the line
        const checkboxMatch = line.text.match(/^(\s*-\s+)(\[[^\]]*\])/);
        if (checkboxMatch) {
            const checkboxStart = checkboxMatch[1].length;
            const checkboxEnd = checkboxStart + checkboxMatch[2].length;

            // Check if click was on the checkbox
            if (position.character >= checkboxStart && position.character <= checkboxEnd) {
                await this.cycleTaskStatus(editor, position.line);
                return;
            }
        }

        // Calculate if click was in the decoration area (after the line end)
        const lineEndPos = line.text.length;
        const clickOffset = position.character - lineEndPos;

        // If click is within the decoration area (the "..." part)
        if (clickOffset >= 0) {
            // Directly call "Add Description" command
            await vscode.commands.executeCommand(COMMANDS.ADD_TASK_DETAILS, editor.document.uri, position.line);
        }
    }

    private async cycleTaskStatus(editor: vscode.TextEditor, lineNumber: number): Promise<void> {
        // Show status selection dropdown when clicking on checkbox
        await vscode.commands.executeCommand(COMMANDS.CHANGE_STATUS, editor.document.uri, lineNumber);
    }
}
