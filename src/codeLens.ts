import * as vscode from 'vscode';
import { MDPlanParser } from './parser';
import { Section } from './utils/types';
import { COMMANDS, REGEX_PATTERNS } from './utils/constants';
import { findSections, getIndentLevel } from './utils/sectionUtils';

export class MDPlanCodeLensProvider implements vscode.CodeLensProvider {

    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

    public refresh(): void {
        this._onDidChangeCodeLenses.fire();
    }

    provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
        if (!MDPlanParser.isMDPlanDocument(document)) {
            return [];
        }

        const codeLenses: vscode.CodeLens[] = [];
        const sections = findSections(document);

        for (const section of sections) {
            const range = new vscode.Range(section.line, 0, section.line, 0);

            codeLenses.push(new vscode.CodeLens(range, {
                title: "$(add) Add Task",
                command: COMMANDS.ADD_TASK,
                arguments: [document.uri, section.line, section.name]
            }));
        }

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const match = line.text.match(REGEX_PATTERNS.TASK);
            if (match) {
                const indent = match[1] || '';
                const indentLevel = getIndentLevel(indent);

                if (indentLevel === 0) {
                    const range = new vscode.Range(i, 0, i, 0);
                    codeLenses.push(new vscode.CodeLens(range, {
                        title: "$(move) Move",
                        command: COMMANDS.MOVE_TASK,
                        arguments: [document.uri, i, sections]
                    }));
                }
            }
        }

        return codeLenses;
    }
}
