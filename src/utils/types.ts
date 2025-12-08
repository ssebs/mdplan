import * as vscode from 'vscode';

/**
 * Represents a section in the document (## Section Name)
 */
export interface Section {
	name: string;
	line: number;
	range: vscode.Range;
}

/**
 * Represents a task block with its boundaries and content
 */
export interface TaskBlock {
	startLine: number;
	endLine: number;
	text: string;
}

/**
 * Location information for a section insertion
 */
export interface SectionLocation {
	insertLine: number;
	sectionLine: number;
}
