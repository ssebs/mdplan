import * as vscode from 'vscode';
import { MDPlanParser } from './parser';

export class MDPlanDiagnostics {
    private diagnosticCollection: vscode.DiagnosticCollection;

    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('mdplan');
    }

    public updateDiagnostics(document: vscode.TextDocument): void {
        // Only process MDPlan markdown files
        if (!MDPlanParser.isMDPlanDocument(document)) {
            this.diagnosticCollection.delete(document.uri);
            return;
        }

        // Clear diagnostics if file is empty
        if (document.getText().trim() === '') {
            this.diagnosticCollection.delete(document.uri);
            return;
        }

        const issues = MDPlanParser.validateDocument(document);
        const diagnostics: vscode.Diagnostic[] = issues.map(issue => {
            const diagnostic = new vscode.Diagnostic(
                issue.range,
                issue.message,
                issue.severity
            );
            diagnostic.source = 'mdplan';

            // Store suggested fix in diagnostic for use by code actions
            if (issue.suggestedFix) {
                (diagnostic as any).suggestedFix = issue.suggestedFix;
            }

            return diagnostic;
        });

        this.diagnosticCollection.set(document.uri, diagnostics);
    }

    public deleteDiagnostics(document: vscode.TextDocument): void {
        this.diagnosticCollection.delete(document.uri);
    }

    public dispose(): void {
        this.diagnosticCollection.dispose();
    }

    public getDiagnostics(uri: vscode.Uri): readonly vscode.Diagnostic[] {
        return this.diagnosticCollection.get(uri) || [];
    }
}
