import * as vscode from 'vscode';
import { REGEX_PATTERNS, VALID_STATUSES, MDPLAN_MARKER, INDENTATION } from './utils/constants';
import { getIndentLevel } from './utils/sectionUtils';

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
        const match = line.match(REGEX_PATTERNS.TASK);
        if (!match) {
            return null;
        }

        const indent = match[1] || '';
        const statusText = match[2];
        const taskText = match[3];
        const indentLevel = getIndentLevel(indent);

        let status: TaskStatus;
        const statusWithBrackets = `[${statusText}]`;
        if (VALID_STATUSES.includes(statusWithBrackets as any)) {
            status = statusWithBrackets as TaskStatus;
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
            if (i === 0 && text.trim() && !text.match(REGEX_PATTERNS.TITLE)) {
                issues.push({
                    range: line.range,
                    message: 'MDPlan files should start with a title (# Title)',
                    severity: vscode.DiagnosticSeverity.Warning
                });
            }

            if (text.match(REGEX_PATTERNS.TITLE)) {
                titleLine = i;
            }

            // Check for sections
            if (text.match(REGEX_PATTERNS.SECTION)) {
                lastSectionLine = i;
                continue;
            }

            // Check for tasks
            const taskMatch = text.match(REGEX_PATTERNS.TASK);
            if (taskMatch) {
                const indent = taskMatch[1] || '';
                const statusText = taskMatch[2];
                const indentLevel = getIndentLevel(indent);

                // Validate task is under a section
                if (lastSectionLine === -1) {
                    issues.push({
                        range: line.range,
                        message: 'Tasks must be under a section (## Section Name)',
                        severity: vscode.DiagnosticSeverity.Error
                    });
                }

                // Validate status
                const statusWithBrackets = `[${statusText}]`;
                if (!VALID_STATUSES.includes(statusWithBrackets as any)) {
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
                if (indentLevel > INDENTATION.MAX_NESTING_LEVEL) {
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
            const commentMatch = text.match(REGEX_PATTERNS.COMMENT);
            if (commentMatch) {
                const indent = commentMatch[1] || '';
                const indentLevel = getIndentLevel(indent);

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
            return TaskStatus.Done;
        }
        if (lower === 'progress' || lower === 'in progress' || lower === 'doing' || lower === 'wip') {
            return TaskStatus.InProgress;
        }
        if (lower === 'blocked' || lower === 'block' || lower === 'waiting') {
            return TaskStatus.Blocked;
        }
        if (lower === 'todo' || lower === 'planned' || lower === '' || lower === ' ') {
            return TaskStatus.Planned;
        }

        // Default to planned
        return TaskStatus.Planned;
    }
}
