---
name: debug
description: |
  Systematic debugging workflow. Use when investigating bugs, unexpected behavior,
  or test failures. Enforces root-cause analysis before any code changes.
argument-hint: "[bug description or error message]"
---

Debug the following issue: $ARGUMENTS

Follow these four steps IN ORDER. Do not skip ahead.

## 1. 重現

Find a reliable way to reproduce the bug.
- Identify the exact steps or input that triggers it
- Confirm it fails consistently
- If it cannot be reproduced, state that and stop

## 2. 根因

Trace to the actual line of code causing the problem.
- Read the relevant code paths — do not guess
- Use subagents to investigate if the scope is wide
- State the root cause in one sentence: "X happens because Y"

## 3. 修復

Propose the minimal fix.
- Write a failing test that reproduces the bug FIRST
- Then propose the code change
- The fix should be as small as possible — do not refactor surrounding code

## 4. 驗證

Confirm the fix is correct and safe.
- The previously failing test now passes
- All existing tests still pass
- Typecheck and lint pass
- List any edge cases considered
