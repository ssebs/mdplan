import * as vscode from 'vscode';
import { Section, SectionLocation, TaskBlock } from './types';
import { REGEX_PATTERNS, SECTION_NAMES, INDENTATION } from './constants';

/**
 * Finds all sections in a document
 */
export function findSections(document: vscode.TextDocument): Section[] {
	const sections: Section[] = [];

	for (let i = 0; i < document.lineCount; i++) {
		const line = document.lineAt(i);
		const match = line.text.match(REGEX_PATTERNS.SECTION);
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

/**
 * Finds or determines where the Done section should be
 */
export function findOrCreateDoneSection(document: vscode.TextDocument): SectionLocation {
	let doneSectionLine = -1;
	let firstSectionLine = -1;
	let insertLine = -1;

	// Look for existing Done section and track first section
	for (let i = 0; i < document.lineCount; i++) {
		const line = document.lineAt(i).text;
		const match = line.match(REGEX_PATTERNS.SECTION);

		if (match) {
			const sectionName = match[1].trim().toLowerCase();

			// Track first section for insertion if we need to create Done
			if (firstSectionLine === -1) {
				firstSectionLine = i;
			}

			// Check for Done section (case-insensitive, with or without brackets)
			if (sectionName === SECTION_NAMES.DONE || sectionName === SECTION_NAMES.DONE_BRACKETED) {
				doneSectionLine = i;

				// Find insertion point after section header and optional description
				insertLine = i + 1;

				// Skip description if exists
				if (insertLine < document.lineCount && document.lineAt(insertLine).text.trim().startsWith('>')) {
					insertLine++;
				}

				break;
			}
		}
	}

	// If Done section exists, return insertion point
	if (doneSectionLine !== -1) {
		return { insertLine, sectionLine: doneSectionLine };
	}

	// Done section doesn't exist - return where it should be inserted
	if (firstSectionLine !== -1) {
		return { insertLine: firstSectionLine + 1, sectionLine: -1 };
	}

	// No sections found at all - insert at beginning
	return { insertLine: 0, sectionLine: -1 };
}

/**
 * Extracts a complete task block including all nested content
 */
export function getTaskBlock(document: vscode.TextDocument, taskLine: number): TaskBlock | null {
	const taskText = document.lineAt(taskLine).text;
	const taskMatch = taskText.match(/^(\s*)-\s+\[/);
	if (!taskMatch) {
		return null;
	}

	const baseIndent = taskMatch[1].length;
	let endLine = taskLine;
	const lines: string[] = [taskText];

	// Find all lines that belong to this task (indented content below)
	for (let i = taskLine + 1; i < document.lineCount; i++) {
		const line = document.lineAt(i).text;

		// Empty lines might be part of the block, but we need to look ahead
		if (line.trim() === '') {
			// Look ahead to see if there's more content
			let hasMoreContent = false;
			for (let j = i + 1; j < document.lineCount; j++) {
				const nextLine = document.lineAt(j).text;
				if (nextLine.trim() === '') {
					continue;
				}

				// Check if next non-empty line is still part of this task
				const nextIndent = nextLine.match(/^(\s*)/)?.[1].length || 0;
				if (nextIndent > baseIndent && !nextLine.match(/^(\s*)-\s+\[/) && !nextLine.match(REGEX_PATTERNS.SECTION)) {
					hasMoreContent = true;
				}
				break;
			}

			if (hasMoreContent) {
				lines.push(line);
				endLine = i;
				continue;
			} else {
				// Empty line at end of block, stop here
				break;
			}
		}

		// If it's another task at the same level, stop
		if (line.match(/^(\s*)-\s+\[/) && line.match(/^(\s*)/)?.[1].length === baseIndent) {
			break;
		}

		// If it's a section header, stop
		if (line.match(REGEX_PATTERNS.SECTION)) {
			break;
		}

		// If line is indented more than base, it's part of this task
		const lineIndent = line.match(/^(\s*)/)?.[1].length || 0;
		if (lineIndent > baseIndent) {
			lines.push(line);
			endLine = i;
		} else {
			// Line is at same or less indentation and not a task - stop
			break;
		}
	}

	return {
		startLine: taskLine,
		endLine,
		text: lines.join('\n') + '\n'
	};
}

/**
 * Calculate indentation level from indent string
 */
export function getIndentLevel(indent: string): number {
	return Math.floor(indent.length / INDENTATION.SPACES_PER_LEVEL);
}

/**
 * Create timestamp string in YYYY-MM-DD format
 */
export function createTimestamp(): string {
	const date = new Date();
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
