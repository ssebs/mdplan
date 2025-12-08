/**
 * Regular expression patterns used throughout MDPlan
 */
export const REGEX_PATTERNS = {
	/** Matches task lines: `- [ ] Task text` */
	TASK: /^(\s*)-\s+\[([^\]]*)\]\s*(.*)/,

	/** Matches section headers: `## Section Name` */
	SECTION: /^##\s+(.+)/,

	/** Matches comment lines: `> comment text` */
	COMMENT: /^(\s*)>\s+(.+)/,

	/** Matches title lines: `# Title` */
	TITLE: /^#\s+/
} as const;

/**
 * Valid task status values
 */
export const VALID_STATUSES = ['[ ]', '[wip]', '[x]', '[blocked]'] as const;

/**
 * MDPlan marker that must be present in document
 */
export const MDPLAN_MARKER = '<!-- mdplan -->';

/**
 * Command identifiers used throughout the extension
 */
export const COMMANDS = {
	ADD_TASK: 'mdplan.addTask',
	MOVE_TASK: 'mdplan.moveTask',
	CHANGE_STATUS: 'mdplan.changeStatus',
	DELETE_TASK: 'mdplan.deleteTask',
	ADD_TASK_DETAILS: 'mdplan.addTaskDetails',
	HELLO_WORLD: 'mdplan.helloWorld'
} as const;

/**
 * Special section names
 */
export const SECTION_NAMES = {
	DONE: 'done',
	DONE_BRACKETED: '[done]'
} as const;

/**
 * Indentation settings
 */
export const INDENTATION = {
	/** Spaces per indent level */
	SPACES_PER_LEVEL: 2,

	/** Maximum nesting level for tasks */
	MAX_NESTING_LEVEL: 1
} as const;
