import * as vscode from 'vscode';
import { MDPlanParser } from './parser';

interface Section {
    name: string;
    line: number;
    range: vscode.Range;
}

export class MDPlanCodeLensProvider implements vscode.CodeLensProvider {

    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

    public refresh(): void {
        this._onDidChangeCodeLenses.fire();
    }

    provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
        // Only process MDPlan markdown files
        if (!MDPlanParser.isMDPlanDocument(document)) {
            return [];
        }

        const codeLenses: vscode.CodeLens[] = [];
        const sections = this.findSections(document);

        // Add "Add Task" CodeLens after each section header
        for (const section of sections) {
            const range = new vscode.Range(section.line, 0, section.line, 0);

            codeLenses.push(new vscode.CodeLens(range, {
                title: "$(add) Add Task",
                command: 'mdplan.addTask',
                arguments: [document.uri, section.line, section.name]
            }));
        }

        // Task actions are now handled by decorations for a cleaner UX
        // CodeLens is only used for "Add Task" buttons on sections

        return codeLenses;
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
}
