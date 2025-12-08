import * as vscode from 'vscode';
import { Section, TaskBlock } from './utils/types';
import { REGEX_PATTERNS, SECTION_NAMES, INDENTATION } from './utils/constants';
import { getTaskBlock, findOrCreateDoneSection, createTimestamp } from './utils/sectionUtils';

export class MDPlanCommands {

    static async addTask(uri: vscode.Uri, sectionLine: number, sectionName: string): Promise<void> {
        const document = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(document);

        // Find the line to insert the task (after section header and optional description)
        let insertLine = sectionLine + 1;

        // Skip the description line if it exists (starts with >)
        if (insertLine < document.lineCount) {
            const nextLine = document.lineAt(insertLine).text;
            if (nextLine.trim().startsWith('>')) {
                insertLine++;
            }
        }

        // Ask for task description
        const taskText = await vscode.window.showInputBox({
            prompt: `Enter task for section "${sectionName}"`,
            placeHolder: 'Task description'
        });

        if (!taskText) {
            return;
        }

        const edit = new vscode.WorkspaceEdit();
        const insertPosition = new vscode.Position(insertLine, 0);
        edit.insert(uri, insertPosition, `- [ ] ${taskText}\n`);

        await vscode.workspace.applyEdit(edit);
    }

    static async moveTask(uri: vscode.Uri, taskLine: number, sections: Section[]): Promise<void> {
        const document = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(document);

        if (sections.length === 0) {
            vscode.window.showWarningMessage('No sections found in document');
            return;
        }

        // Get the task block (task + all nested content)
        const taskBlock = getTaskBlock(document, taskLine);
        if (!taskBlock) {
            vscode.window.showWarningMessage('Could not identify task block');
            return;
        }

        // Show quick pick for section selection
        const sectionItems = sections.map(s => ({
            label: s.name,
            description: `Line ${s.line + 1}`,
            section: s
        }));

        const selected = await vscode.window.showQuickPick(sectionItems, {
            placeHolder: 'Select destination section'
        });

        if (!selected) {
            return;
        }

        // Find insertion point (after section header/description, before first task or at end of section)
        let insertLine = selected.section.line + 1;

        // Skip description if exists
        if (insertLine < document.lineCount && document.lineAt(insertLine).text.trim().startsWith('>')) {
            insertLine++;
        }

        // Apply edit: delete old, insert new
        const edit = new vscode.WorkspaceEdit();

        // Delete the task block from original location
        const deleteRange = new vscode.Range(
            new vscode.Position(taskBlock.startLine, 0),
            new vscode.Position(taskBlock.endLine + 1, 0)
        );
        edit.delete(uri, deleteRange);

        // Adjust insert line if we're moving down in the same document
        const adjustedInsertLine = insertLine > taskBlock.startLine ?
            insertLine - (taskBlock.endLine - taskBlock.startLine + 1) : insertLine;

        // Insert at new location
        const insertPosition = new vscode.Position(adjustedInsertLine, 0);
        edit.insert(uri, insertPosition, taskBlock.text);

        await vscode.workspace.applyEdit(edit);
    }

    static async changeStatus(uri: vscode.Uri, taskLine: number): Promise<void> {
        const document = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(document);

        const line = document.lineAt(taskLine);
        const taskRegex = /^(\s*-\s+)\[([^\]]*)\](\s+.*)$/;
        const match = line.text.match(taskRegex);

        if (!match) {
            vscode.window.showWarningMessage('Not a valid task line');
            return;
        }

        const statuses = [
            { label: '[ ] Planned', value: '[ ]', description: 'Task not started' },
            { label: '[wip] In Progress', value: '[wip]', description: 'Task is being worked on' },
            { label: '[x] Done', value: '[x]', description: 'Task completed' },
            { label: '[blocked] Blocked', value: '[blocked]', description: 'Task is blocked' }
        ];

        const selected = await vscode.window.showQuickPick(statuses, {
            placeHolder: 'Select new status'
        });

        if (!selected) {
            return;
        }

        // If marking as done, move to Done section with timestamp
        if (selected.value === '[x]') {
            await MDPlanCommands.moveTaskToDone(uri, taskLine, document);
            return;
        }

        const prefix = match[1];
        const suffix = match[3];
        const newText = `${prefix}${selected.value}${suffix}`;

        const edit = new vscode.WorkspaceEdit();
        edit.replace(uri, line.range, newText);
        await vscode.workspace.applyEdit(edit);
    }

    static async deleteTask(uri: vscode.Uri, taskLine: number): Promise<void> {
        const document = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(document);

        // Get the task block (task + all nested content)
        const taskBlock = getTaskBlock(document, taskLine);
        if (!taskBlock) {
            vscode.window.showWarningMessage('Could not identify task block');
            return;
        }

        // Confirm deletion
        const taskText = document.lineAt(taskLine).text.trim();
        const confirm = await vscode.window.showWarningMessage(
            `Delete task: "${taskText}"?`,
            { modal: true },
            'Delete'
        );

        if (confirm !== 'Delete') {
            return;
        }

        const edit = new vscode.WorkspaceEdit();
        const deleteRange = new vscode.Range(
            new vscode.Position(taskBlock.startLine, 0),
            new vscode.Position(taskBlock.endLine + 1, 0)
        );
        edit.delete(uri, deleteRange);

        await vscode.workspace.applyEdit(edit);
    }

    static async addTaskDetails(uri: vscode.Uri, taskLine: number): Promise<void> {
        const document = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(document);

        const taskText = document.lineAt(taskLine).text;
        const taskMatch = taskText.match(/^(\s*)-\s+\[/);
        if (!taskMatch) {
            vscode.window.showWarningMessage('Not a valid task line');
            return;
        }

        const baseIndent = taskMatch[1];
        const detailIndent = baseIndent + ' '.repeat(INDENTATION.SPACES_PER_LEVEL);

        // Define detail type options
        const detailTypes = [
            {
                label: '$(checklist) Subtask',
                description: 'Add a nested checklist item',
                value: 'subtask'
            },
            {
                label: '$(note) Code Block',
                description: 'Add a markdown code block for details',
                value: 'codeblock'
            },
            {
                label: '$(comment) Comment',
                description: 'Add a comment/note',
                value: 'comment'
            },
            {
                label: '$(comment) Comment with Timestamp',
                description: 'Add a comment with today\'s date',
                value: 'comment-timestamp'
            },
            {
                label: '$(comment) Comment with User',
                description: 'Add a comment with date and username',
                value: 'comment-user'
            },
            {
                label: '$(list-unordered) Bullet Point',
                description: 'Add a bullet point for context',
                value: 'bullet'
            }
        ];

        const selected = await vscode.window.showQuickPick(detailTypes, {
            placeHolder: 'Select detail type to add'
        });

        if (!selected) {
            return;
        }

        let insertText = '';
        let cursorOffset = 0;

        switch (selected.value) {
            case 'subtask':
                insertText = `${detailIndent}- [ ] `;
                cursorOffset = insertText.length;
                break;

            case 'codeblock':
                insertText = `${detailIndent}- \`\`\`md\n${detailIndent}  \n${detailIndent}  \`\`\`\n`;
                cursorOffset = insertText.indexOf('\n') + 1 + detailIndent.length + 2;
                break;

            case 'comment':
                insertText = `${detailIndent}> `;
                cursorOffset = insertText.length;
                break;

            case 'comment-timestamp':
                const timestamp = createTimestamp();
                insertText = `${detailIndent}> `;
                const commentText = ` @${timestamp}`;
                cursorOffset = insertText.length;
                insertText += commentText;
                break;

            case 'comment-user':
                const timestampUser = createTimestamp();
                insertText = `${detailIndent}> `;
                const commentWithUser = ` @${timestampUser} - @`;
                cursorOffset = insertText.length;
                insertText += commentWithUser;
                break;

            case 'bullet':
                insertText = `${detailIndent}- `;
                cursorOffset = insertText.length;
                break;
        }

        // Find the insertion point (right after the task line)
        const insertLine = taskLine + 1;
        const insertPosition = new vscode.Position(insertLine, 0);

        const edit = new vscode.WorkspaceEdit();
        edit.insert(uri, insertPosition, insertText + '\n');

        await vscode.workspace.applyEdit(edit);

        // Move cursor to the appropriate position for typing
        const newPosition = document.positionAt(
            document.offsetAt(insertPosition) + cursorOffset
        );
        editor.selection = new vscode.Selection(newPosition, newPosition);
    }

    private static async moveTaskToDone(uri: vscode.Uri, taskLine: number, document: vscode.TextDocument): Promise<void> {
        // Get the task block
        const taskBlock = getTaskBlock(document, taskLine);
        if (!taskBlock) {
            vscode.window.showWarningMessage('Could not identify task block');
            return;
        }

        // Find or create the Done section
        const doneSection = findOrCreateDoneSection(document);

        // Update task status to [x]
        const taskText = document.lineAt(taskLine).text;
        const taskMatch = taskText.match(/^(\s*-\s+)\[([^\]]*)\](\s+.*)$/);
        if (!taskMatch) {
            return;
        }

        const prefix = taskMatch[1];
        const suffix = taskMatch[3];
        const updatedTaskLine = `${prefix}[x]${suffix}`;

        // Create timestamp comment
        const timestamp = createTimestamp();
        const commentLine = `  > completed @${timestamp}`;

        // Build the new task block with timestamp
        const taskLines = taskBlock.text.split('\n');
        taskLines[0] = updatedTaskLine; // Replace first line with [x] status

        // Insert comment after the main task line (before any subtasks)
        taskLines.splice(1, 0, commentLine);
        const newTaskBlock = taskLines.join('\n');

        // Apply the edit
        const edit = new vscode.WorkspaceEdit();

        // Delete from original location
        const deleteRange = new vscode.Range(
            new vscode.Position(taskBlock.startLine, 0),
            new vscode.Position(taskBlock.endLine + 1, 0)
        );
        edit.delete(uri, deleteRange);

        // Insert at Done section
        const insertPosition = new vscode.Position(doneSection.insertLine, 0);
        edit.insert(uri, insertPosition, newTaskBlock);

        await vscode.workspace.applyEdit(edit);
    }
}
