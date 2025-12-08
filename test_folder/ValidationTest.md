# Test File

> This file demonstrates MDPlan validation

## Valid Section
- [ ] This is a valid planned task
- [wip] This is in progress
- [x] This is done
- [blocked] This is blocked
  - [ ] This is a valid nested task
  > This is a comment under a task @2025-12-08

## Another Section
- [done] This should show an error - invalid status
- [ ] Valid task
    - [ ] This should error - too deeply nested
      - [ ] Way too nested

> This comment is not indented properly

- [ ] This task has no section above it (moved it above section)

<!-- mdplan -->
