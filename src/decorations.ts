import * as vscode from 'vscode';
import { MDPlanParser } from './parser';

interface Section {
    name: string;
    line: number;
    range: vscode.Range;
}

export class MDPlanDecorations {
    private actionDecorationType: vscode.TextEditorDecorationType;

    constructor() {
        // Create decoration that appears on hover at the far right
        // Using minimal, subtle styling that doesn't interfere with content
        this.actionDecorationType = vscode.window.createTextEditorDecorationType({
            after: {
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

                // Show action icons that are clickable
                decorations.push({
                    range,
                    renderOptions: {
                        after: {
                            contentText: '$(ellipsis)',
                            margin: '0 0 0 2em',
                        }
                    },
                    hoverMessage: new vscode.MarkdownString('$(check) **Status** | $(arrow-both) **Move** | $(add) **Add Details**\n\n*Click to show actions*')
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
        const taskRegex = /^(\s*)-\s+\[([^\]]*)\]\s*(.*)/;

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const match = line.text.match(taskRegex);
            if (match) {
                const indent = match[1] || '';
                const indentLevel = Math.floor(indent.length / 2);
                tasks.push({ line: i, indentLevel });
            }
        }

        return tasks;
    }

    private findSections(document: vscode.TextDocument): Section[] {
        const sections: Section[] = [];
        const sectionRegex = /^##\s+(.+)/;

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const match = line.text.match(sectionRegex);
            if (match) {
                sections.push({
                    name: match[1],
                    line: i,
                    range: line.range
                });
            }
        }

        return sections;
    }

    public handleClick(editor: vscode.TextEditor, position: vscode.Position): void {
        const line = editor.document.lineAt(position.line);
        const taskRegex = /^(\s*)-\s+\[([^\]]*)\]\s*(.*)/;

        if (!taskRegex.test(line.text)) {
            return;
        }

        // Calculate which icon was clicked based on position
        const lineEndPos = line.text.length;
        const clickOffset = position.character - lineEndPos;

        // If click is within the decoration area (after the line end)
        if (clickOffset >= 0) {
            // Show a quick pick menu with all actions
            this.showActionMenu(editor, position.line);
        }
    }

    private async showActionMenu(editor: vscode.TextEditor, line: number): Promise<void> {
        const sections = this.findSections(editor.document);

        const actions = [
            {
                label: '$(check) Change Status',
                description: 'Update task status',
                command: 'mdplan.changeStatus',
                args: [editor.document.uri, line]
            },
            {
                label: '$(arrow-both) Move Task',
                description: 'Move to different section',
                command: 'mdplan.moveTask',
                args: [editor.document.uri, line, sections]
            },
            {
                label: '$(add) Add Details',
                description: 'Add subtask, comment, or code block',
                command: 'mdplan.addTaskDetails',
                args: [editor.document.uri, line]
            }
        ];

        const selected = await vscode.window.showQuickPick(actions, {
            placeHolder: 'Select task action'
        });

        if (selected) {
            await vscode.commands.executeCommand(selected.command, ...selected.args);
        }
    }
}
