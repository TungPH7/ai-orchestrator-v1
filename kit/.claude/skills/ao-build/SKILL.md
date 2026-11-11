---
name: ao-build
description: Build a Ready item of the SDLC contract with its dev agent, up to a draft PR with CI done, which waits for the human's preview.
argument-hint: <KEY>
disable-model-invocation: true
---

## Check

!`node .ai-orchestrator/scripts/ao-step.mjs build $0`

## What to do

- On STOP, tell the human the reason and the command or clicks it names, in Vietnamese, and stop.
- On GO, run `node .ai-orchestrator/scripts/ao-step.mjs build $0 --go` with the Bash tool in the background, with a
  timeout of 7200000 ms, and wait for its notification. Do not poll.
  Do not run any agent yourself, and do not change Jira or GitHub yourself.
- Then read `.ai/runs/<KEY>/last.md`, where KEY is the item the check printed, and report in Vietnamese: what each
  agent did and cost, the questions left, what the human must do at a gate (numbered clicks), and the next command.
- When the build ends at a draft PR, list the files in `.ai/runs/<KEY>/preview/` (the screenshots of `fe-dev`, the
  API samples of `be-dev`), and give the human the two ways on: `/ao-preview <KEY>` to run the apps on the PR branch,
  or `/ao-review <PR>` to skip the preview. To ask for changes after the preview, they write
  `/ao-fix <PR> be: … fe: …`.
