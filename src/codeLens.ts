import * as vscode from 'vscode';
import { MDPlanParser } from './parser';
import { Section } from './utils/types';
import { COMMANDS } from './utils/constants';
import { findSections } from './utils/sectionUtils';

export class MDPlanCodeLensProvider implements vscode.CodeLensProvider {

    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

    public refresh(): void {
        this._onDidChangeCodeLenses.fire();
    }

    provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
        // Only process MDPlan markdown files
        if (!MDPlanParser.isMDPlanDocument(document)) {
            return [];
        }

        const codeLenses: vscode.CodeLens[] = [];
        const sections = findSections(document);

        // Add "Add Task" CodeLens after each section header
        for (const section of sections) {
            const range = new vscode.Range(section.line, 0, section.line, 0);

            codeLenses.push(new vscode.CodeLens(range, {
                title: "$(add) Add Task",
                command: COMMANDS.ADD_TASK,
                arguments: [document.uri, section.line, section.name]
            }));
        }

        return codeLenses;
    }
}
