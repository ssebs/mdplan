import * as vscode from 'vscode';

export interface Task {
    line: number;
    status: TaskStatus;
    indentLevel: number;
    text: string;
    range: vscode.Range;
}

export enum TaskStatus {
    Planned = '[ ]',
    InProgress = '[wip]',
    Done = '[x]',
    Blocked = '[blocked]',
    Invalid = 'INVALID'
}

export interface ValidationIssue {
    range: vscode.Range;
    message: string;
    severity: vscode.DiagnosticSeverity;
    suggestedFix?: string;
}

const VALID_STATUSES = ['[ ]', '[wip]', '[x]', '[blocked]'];
const TASK_REGEX = /^(\s*)-\s+\[([^\]]*)\]\s*(.*)/;
const SECTION_REGEX = /^##\s+(.+)/;
const COMMENT_REGEX = /^(\s*)>\s+(.+)/;
const MDPLAN_MARKER = '<!-- mdplan -->';

export class MDPlanParser {

    /**
     * Check if a document contains the MDPlan marker
     */
    static isMDPlanDocument(document: vscode.TextDocument): boolean {
        if (document.languageId !== 'markdown') {
            return false;
        }
        return document.getText().includes(MDPLAN_MARKER);
    }

    static parseTask(line: string, lineNumber: number, document: vscode.TextDocument): Task | null {
        const match = line.match(TASK_REGEX);
        if (!match) {
            return null;
        }

        const indent = match[1] || '';
        const statusText = match[2];
        const taskText = match[3];
        const indentLevel = Math.floor(indent.length / 2); // Assuming 2 spaces per indent

        let status: TaskStatus;
        if (VALID_STATUSES.includes(`[${statusText}]`)) {
            status = `[${statusText}]` as TaskStatus;
        } else {
            status = TaskStatus.Invalid;
        }

        const range = document.lineAt(lineNumber).range;

        return {
            line: lineNumber,
            status,
            indentLevel,
            text: taskText,
            range
        };
    }

    static validateDocument(document: vscode.TextDocument): ValidationIssue[] {
        const issues: ValidationIssue[] = [];
        let lastSectionLine = -1;
        let titleLine = -1;

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const text = line.text;

            // Check for title (should be first non-empty line)
            if (i === 0 && text.trim() && !text.match(/^#\s+/)) {
                issues.push({
                    range: line.range,
                    message: 'MDPlan files should start with a title (# Title)',
                    severity: vscode.DiagnosticSeverity.Warning
                });
            }

            if (text.match(/^#\s+/)) {
                titleLine = i;
            }

            // Check for sections
            if (text.match(SECTION_REGEX)) {
                lastSectionLine = i;
                continue;
            }

            // Check for tasks
            const taskMatch = text.match(TASK_REGEX);
            if (taskMatch) {
                const indent = taskMatch[1] || '';
                const statusText = taskMatch[2];
                const indentLevel = Math.floor(indent.length / 2);

                // Validate task is under a section
                if (lastSectionLine === -1) {
                    issues.push({
                        range: line.range,
                        message: 'Tasks must be under a section (## Section Name)',
                        severity: vscode.DiagnosticSeverity.Error
                    });
                }

                // Validate status
                if (!VALID_STATUSES.includes(`[${statusText}]`)) {
                    const statusStart = text.indexOf('[');
                    const statusEnd = text.indexOf(']', statusStart) + 1;
                    issues.push({
                        range: new vscode.Range(
                            new vscode.Position(i, statusStart),
                            new vscode.Position(i, statusEnd)
                        ),
                        message: `Invalid task status: [${statusText}]. Valid statuses: [ ], [wip], [x], [blocked]`,
                        severity: vscode.DiagnosticSeverity.Error,
                        suggestedFix: this.guessBestStatus(statusText)
                    });
                }

                // Validate indentation (max 1 level of nesting)
                if (indentLevel > 1) {
                    issues.push({
                        range: new vscode.Range(
                            new vscode.Position(i, 0),
                            new vscode.Position(i, indent.length)
                        ),
                        message: 'Tasks can only be nested 1 level deep',
                        severity: vscode.DiagnosticSeverity.Error
                    });
                }
            }

            // Check for comments
            const commentMatch = text.match(COMMENT_REGEX);
            if (commentMatch) {
                const indent = commentMatch[1] || '';
                const indentLevel = Math.floor(indent.length / 2);

                // Comments should be indented under a task, or be a description after the title
                const isDescriptionUnderTitle = indentLevel === 0 && titleLine >= 0 && i > titleLine && lastSectionLine === -1;
                const isCommentAfterSection = indentLevel === 0 && lastSectionLine === i - 1;

                if (indentLevel === 0 && !isDescriptionUnderTitle && !isCommentAfterSection) {
                    issues.push({
                        range: line.range,
                        message: 'Comments should be indented under a task or follow a section header',
                        severity: vscode.DiagnosticSeverity.Warning
                    });
                }
            }
        }

        return issues;
    }

    private static guessBestStatus(invalidStatus: string): string {
        const lower = invalidStatus.toLowerCase().trim();

        if (lower === 'done' || lower === 'complete' || lower === 'completed') {
            return '[x]';
        }
        if (lower === 'progress' || lower === 'in progress' || lower === 'doing' || lower === 'wip') {
            return '[wip]';
        }
        if (lower === 'blocked' || lower === 'block' || lower === 'waiting') {
            return '[blocked]';
        }
        if (lower === 'todo' || lower === 'planned' || lower === '' || lower === ' ') {
            return '[ ]';
        }

        // Default to planned
        return '[ ]';
    }
}
