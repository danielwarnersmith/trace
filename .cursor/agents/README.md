# Agent index

One-line purpose for each subagent. Use this (and conductor) to choose the right specialist.

| Agent | Purpose |
|-------|---------|
| **conductor** | Routes tasks to the right subagents; coordinates when work spans specialists. |
| **debugger** | Debugging specialist for errors, test failures, and unexpected behavior. |
| **eng-manager** | Engineering conductor: reads milestones, plans TODOs, delegates to agents, verifies and re-delegates until done, archives plans. Asks when ambiguous. |
| **git-doctor** | Debugs git and GitHub workflows; .gitignore, repo hygiene, what to track. |
| **plan-optimizer** | Optimizes plans and task lists; clarifies ambiguity, avoids regressions. |
| **product-manager** | Scopes next work from ROADMAP and repo; breaks into tasks and milestones; writes trace-spec/milestones/*.md with agent-ready context. |
| **spec-auditor** | Reads and evolves the product spec with the user; fills gaps, removes ambiguity for implementation. |
| **workflow-coach** | Workflow audit and improvement; efficiency, best practices, bleeding-edge patterns. |

To delegate: **@.cursor/agents Use the conductor to [task].**
