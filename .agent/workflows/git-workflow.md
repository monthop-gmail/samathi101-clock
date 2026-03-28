---
description: How to run git and GitHub CLI commands
---

# Git & GitHub Workflow

**CRITICAL: NEVER use PowerShell directly for file operations or git commands. It corrupts UTF-8 Thai text encoding.**

// turbo-all

1. Always use `wsl` prefix for ALL commands: `wsl git status`, `wsl sed`, `wsl python3`, etc.
2. Use `wsl gh` for GitHub CLI commands
3. For multi-command chains, run each command separately (PowerShell doesn't support `&&`)
4. For file text replacements, use `wsl python3` or `wsl sed` — NEVER PowerShell `Set-Content` / `Get-Content`
5. Working directory should be the project root
