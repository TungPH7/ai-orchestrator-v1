# ao-kit-setup.md: set up a new project with the kit

> **For the main Claude Code session.** A developer opened Claude Code in a folder and typed "Làm theo
> `<kit>/ao-kit-setup.md`", or "làm tiếp `ao-kit-setup.md`" after reopening it. `<kit>` is the folder of this file.
> Spec: [SPEC-guided-setup.md](SPEC-guided-setup.md). What the developer reads: [docs/quick-start.md](docs/quick-start.md)
> and [docs/setup-steps.md](docs/setup-steps.md).

You set the project up with the developer, "the human": you ask, you run the commands, and you walk them through the
clicks only they can make. [docs/getting-started.md](docs/getting-started.md) holds every command, its real output and
the errors already met. This file gives the order and points to its sections: open the section a step names, and run its
command with this project's values. Part 3 of getting-started is a project on the kit's `next-nest` skeleton; part 5 is
apps from the human's own templates. Both start from an empty folder.

## Rules

1. **Speak Vietnamese** with the human, in plain words. For a click, give numbered steps: where to click, what to type.
   Then wait until they say it is done, and check it yourself (run the command again, or `doctor`) before going on.
2. **No secret in the chat.** Never ask for, take or print a token, a password or a key. The human sets each one as a
   Windows user variable (getting-started 2.3). If they paste one, say it is exposed: they revoke it, make a new one and
   set that. Check a variable only for being there:
   `powershell -NoProfile -Command "[bool][Environment]::GetEnvironmentVariable('JIRA_CI_TOKEN','User')"`.
   Never print a key file, a secrets file or a `.env`; check that a file exists with `Test-Path`.
3. **Templates are read only.** Never edit, commit, check out or clean anything in a template folder.
4. **Ask before anything that cannot be undone:** deleting a repo, a branch with commits, a Jira space, files.
5. **Every command can run again.** When one fails, read the "Nếu lỗi" lines of its section before trying anything else.
6. **Keep `.ai/setup/` up to date**, since the next session starts from it: `answers.md` (the table the human approved)
   and `progress.md` (one line per step done, with the time and what came out). Git ignores `.ai/`.

## Where you are

Look before you ask anything:

| What the folder holds | What to do |
|---|---|
| It is `<kit>` itself | Stop. Ask the human to make an empty folder, open Claude Code there and type the sentence again |
| Nothing, or only `README.md`, `LICENSE`, `.gitignore`, `.git`, `.ai/` | No `answers.md`: step 1. With `answers.md`: read it and `progress.md`, go on at the first step not done |
| Code, but no `.ai-orchestrator/project.yaml` | A project that has code: part 4 of getting-started, which this file does not cover yet. Say so, and stop |
| `.ai-orchestrator/project.yaml` | Read `answers.md` and `progress.md`, run `node <kit>/scripts/ao-kit.mjs doctor .`, go on at the first step not done |

## Session 1

### Step 1. Ask, then show one table to approve

Ask in four groups, each question with the value you propose. The human only changes what they want different.

1. **Stack.** The kit's skeleton `next-nest` (Next.js in `apps/web`, NestJS in `apps/api`; part 3), or apps from their
   templates (part 5). For templates, one line per app: name (lower case, digits, hyphens, at most 20 characters), stack
   (`nextjs`, `react` or `spring-boot`), template folder, branch (propose its current one:
   `git -C <folder> rev-parse --abbrev-ref HEAD`), public or not, and for a public app whether search engines index it
   (`--seo` or `--no-seo`). For each template, check and say:
   - it is a git repo; changes not committed (`git -C <folder> status --porcelain`) will not be copied;
   - files git tracks that look like secrets (`git -C <folder> ls-files` for `.env`, `*.pem`, `*.key`, `backups/`): propose
     `--exclude` for them;
   - folders that are not product code (study notes, prompts, logs, backups, `docs/readme/`): read its README and
     `CLAUDE.md`, and propose `--exclude` for each. Never exclude source, tests, config or the Maven wrapper.
2. **Project.** Name (the folder name, lower case: also the name on the VPS), title, Jira space key (2 to 10 capital
   letters or digits, starting with a letter), repo (`<gh login>/<name>`; `gh api user --jq .login`), public or private,
   approvers (the gh login). On the Free plan a private repo has 2,000 Actions minutes a month; when they ran out before,
   propose public.
3. **Workflow**, one line of meaning each, defaults in brackets: `review.default` [on]; `runs.lanes_max` [1; from 2,
   items build side by side in worktrees, so propose 2 only with 16 GB of RAM or more]; `runs.agents_per_role` [1];
   `runs.budget_usd` [30, per `/ao-run`]; `runs.idle_hours` [8]. For templates: the Task that fits their code to the kit
   (step 10), with or without review [without, since the code is theirs; reviewed later with `/ao-review <KEY>`].
4. **VPS.** Deploy Development now, or later. Now: the host of each public app in each environment, on the domain of
   [docs/vps-setup.md](docs/vps-setup.md) (as `shop` does: `<name>-dev`, `<name>-staging`, `<name>` for the first app,
   `<name>-<app>-dev`… for the others).

Show one table of every answer. Only once the human approves it, write `.ai/setup/answers.md` (make `.ai/setup/` in the
folder) and go on.

### Step 2. The one-time preparation

Check, printing no secret:
- tools: `node --version` (24), `git --version`, `gh --version` (2.102.0 or later) and `gh auth status`,
  `claude --version`; for templates `corepack --version`; for Spring Boot, Docker Desktop (getting-started part 5 step 9
  says why);
- user variables (rule 2): `ATLASSIAN_AGENT_TOKEN`, `JIRA_CI_TOKEN`, `AO_DEV_APP_KEY_FILE`, `AO_REVIEW_APP_KEY_FILE`,
  `JIRA_ADMIN_EMAIL`, `JIRA_ADMIN_TOKEN`, `JIRA_ADMIN_CLASSIC_TOKEN`, and `AO_ENV_AUTH` when the project goes to the VPS;
  the two key files exist;
- the Apps: `ao-dev`, `ao-review`, `ao-merge`, and `ao-deploy` for the VPS. Their slugs and ids are in another project's
  `.ai-orchestrator/project.yaml`, or on the page of each App (GitHub → Settings → Developer settings → GitHub Apps →
  Edit: App ID). `gh api apps/<slug>` answers 404 for a private App, so do not count on it;
- Jira: `node <kit>/scripts/jira-check.mjs --space DEMO`, run in `<kit>`, says the site and its template space match the
  kit;
- the VPS, when chosen: ask whether its deployer runs ([docs/vps-setup.md](docs/vps-setup.md) sections 1–11).

What is missing, you walk the human through: [docs/jira-setup.md](docs/jira-setup.md) sections 1–8,
[docs/github-apps-setup.md](docs/github-apps-setup.md) sections 1, 2, 4, 7 and 8, [docs/vps-setup.md](docs/vps-setup.md)
sections 1–11. The VPS takes an hour or more: offer to deploy later. When the human set a variable, they close Claude
Code, open it again in this folder and type "làm tiếp `ao-kit-setup.md`": a session sees only the variables there when it
started.

### Step 3. The repo, and `ao-kit init`

1. `gh repo create <repo> --public` or `--private` (getting-started part 3 step 1). Add nothing to it.
2. `node <kit>/scripts/ao-kit.mjs init . --name … --title … --space … --repo … --approvers … --dev-app … --dev-app-id …
   --review-app … --review-app-id …` (part 3 step 2), with `--package-manager pnpm` for templates (part 5 step 2).
3. In `.ai-orchestrator/project.yaml`: `merge` and `merge_id` under `github.apps`, and the workflow answers that differ
   from the defaults (`review.default`, `runs.*`). Then `node <kit>/scripts/ao-kit.mjs render .`.

### Step 4. The apps from templates (part 5 only)

1. For each app, `node <kit>/scripts/ao-kit.mjs add . <app> --stack <stack> --from <folder> --ref <branch>
   --exclude <path>… [--public --seo|--no-seo]` (part 5 step 3; Spring Boot: part 5 step 9, item 2). Each run adds its
   section to `.ai/setup/add-report.md`.
2. Do the "By hand" lines of `add-report.md` now, before the first commit, since these files steer the kit and a later
   change to them is a PR the human merges: the `env:` of the app and the `database` key of `deploy.yaml`
   ([docs/vps-setup.md](docs/vps-setup.md) section 14, the shape in part 5 step 9 item 2), and `coverage_exclude`, from
   the list the line gives.
3. With the VPS: the `hosts` of each public app in `project.yaml` (part 5 step 4). A Next.js app that reads the API on
   the server takes `API_URL` and `AUTH_SECRET` from the secrets file: name them under `env:` of the app in `deploy.yaml`,
   and the localhost URLs the apps give each other under `env:` of the app in `project.yaml`, as `shop` does.
4. `node <kit>/scripts/ao-kit.mjs check .` prints `project.yaml OK: …`.

### Step 5. The Jira space

`node <kit>/scripts/ao-kit.mjs setup jira .` (part 3 step 3). The board columns and the column limit are clicks: give the
human the steps of that section, word for word, then run the command again until it prints
`jira:check: Jira space <KEY> matches tracker/jira.yaml` with no `By hand` line.

### Step 6. The Apps on the repo

`ao-dev`, `ao-review`, `ao-merge`, and `ao-deploy` for the VPS: the clicks of part 3 step 4, once for each App. The API
cannot do it with the human's gh login: listing installations needs a token of a GitHub App (du-an-1, 403). Ask for these
clicks together with the board columns of step 5 and the key of step 8, so the human goes to the browser once. Check
afterwards with `doctor` (rows `ao-dev`, `ao-review`).

### Step 7. The first commit, and the push

Part 3 step 5: run the four checks first. Templates, part 5 step 5: skip them, since the template code is not fitted yet.
Then `git add -A`, one commit `chore(scaffold): set up <name> with ao-kit` (templates: `…, and <apps> from templates`),
`git push -u origin develop`, `git push origin develop:main`. The `pre-commit` hook scans for secrets: when it stops on a
template file, show the human the line and ask; mark it `gitleaks:allow` only when they say it is no secret. On this first
commit the hook skips its Suppressions check, so the `eslint-disable` and `@SuppressWarnings` lines a template has pass;
from the next commit on, and in every PR, a line that switches a check off needs its `reason:`.

### Step 8. GitHub, and the first CI

1. The key of `ao-merge`: the clicks of part 3 step 6. Then
   `node <kit>/scripts/ao-kit.mjs setup github . --merge-app-key-file "<the .pem>"`, and the human deletes the file.
2. GitHub for Atlassian on the repo: the clicks of part 3 step 6, "Bạn làm".
3. `gh run list --repo <repo> --workflow CI --branch develop`. No run: the human enables Actions (part 3 step 7), then
   `gh workflow run CI --repo <repo> --ref develop`. Part 3: CI is green. Templates: red at `build-test`, `policy` or
   `secrets`, which step 10 fixes. Dependabot opens PRs of security updates, one per folder: those of a package that
   step 10 bumps close by themselves; the moderate and low ones stay open for the first Task of the project, and step 14
   names them. `secrets` runs
   gitleaks, which can flag a template line the `pre-commit` hook passed, such as the name of a localStorage key
   (du-an-1), and the CI log names no file. Find the file and line with `gitleaks git --redact` on this machine, never
   the value: the gitleaks release of the version that `ci.yml` pins, checked against the release's checksums, in a temp
   folder. Show the human the line; when they say it is no secret, step 10 marks it `gitleaks:allow reason: …`.
4. **End of session 1.** Write `progress.md`, then tell the human, numbered: type `/exit`; run `claude` again in this
   folder; accept the trust question; keep both MCP servers ticked and choose **Enable selected** (part 3 step 8); type
   "làm tiếp `ao-kit-setup.md`".

## Session 2

### Step 9. Trust and MCP

`claude mcp list` prints `✔ Connected` for `atlassian` and `chrome-devtools`. `Pending approval`: the human runs `/mcp`
and allows both.

### Step 10. Fit the template code to the kit (part 5 only)

The code changes of `add-report.md` go through one Task and one PR, which change nothing in `.ai-orchestrator/`
(part 5 step 7; Spring Boot, step 9 items 3–4):
1. `/ao-intake` makes the Task from `add-report.md`. When the human chose no review, they add the label
   `ao-review-skip` on Jira themselves (numbered clicks: open the item, **Labels**, type `ao-review-skip`, **Enter**): a
   skip label that the agents' account sets does not count (SPEC-review-per-item.md 2.4), and `/ao-intake` writes as
   that account. `ao-step.mjs status <KEY>` then prints `skipped (label ao-review-skip, put by you)`. Then they Refine it.
2. You change the code on the Task's branch, as the main session did in `shop` (PR #5 and #9 there list the usual
   changes), and open the PR through `ao-dev`. For a Spring Boot app, copy `.env.example` to `.env` with new random
   passwords first, so its database runs on this machine. When its `docker-compose.yml` names the container, the volume
   or the network with a fixed default, such as `learn-postgres`, also set those names in `.env` to names of this
   project, with `COMPOSE_PROJECT_NAME`, and move `POSTGRES_HOST_PORT` and `DB_PORT` off a port that another database
   holds (`docker ps`). Two projects from one template otherwise share one volume, whose password is the other
   project's (du-an-1 and `shop`). For an app whose server checks a secret when it starts, such as `AUTH_SECRET` of the
   Next.js template, write its local env file (`.env.development`, which git ignores) with a new random value: the
   template commits only `.env.example`, and without the value `/ao-preview` stops with `web did not answer`.
3. `/ao-preview <KEY>` runs the apps once CI is green on the PR; the human looks at them.
4. `next dev` writes `apps/<app>/AGENTS.md` on its first run, and stopping the preview names it as a file that appeared.
   Read it: when it is only the block between `BEGIN:nextjs-agent-rules` and `END:nextjs-agent-rules`, commit it in the
   Task's PR, as PR #5 of `shop` did, so the next preview does not name it again.
5. `/ao-review <PR>` once CI is green on the head: the item skips review, so it posts the trace of the skip on the head
   and no agent runs; it also stops the preview. The human approves the PR at gate ③ (or you, when they gave you that
   right). When it is merged, cancel the Task with a comment that names the PR. CI on `develop` is green from here.

### Step 11. Development on the VPS (when chosen)

Part 5 step 8, and step 9 item 5 for a database:
1. Open the VPS (vps-setup section 9). Its kit must be at the commit that vps-setup section 12 pins, or later; copy it
   there otherwise (section 12).
2. Make the secrets files (sections 13 and 14; a database name with `_`, such as `du_an_1`), put the entry that `doctor`
   prints under `projects:` of `/etc/ao/deployer.yaml`, before the top-level `backup:` key, then `baseline`.
3. Do this before the PR of step 10 merges: its merge then deploys by itself once CI on `develop` is green (du-an-1).
   When it merged already, `/ao-rollback development <sha>` makes the first deploy.
4. Caddy gets the certificates of the new hosts within about a minute; until then a call fails in TLS. Each public app
   then answers on its Development host: 401 without basic auth, 200 with it.
5. With a database: run the backup once and `restore-check` (section 15), then pull the copy to this machine with
   `ao-backup-pull.mjs pull` (section 16), so that the row of backup copies in `doctor` passes.
6. Close the VPS again (section 9), unless the human says to keep it open.

### Step 12. `doctor`

`node <kit>/scripts/ao-kit.mjs doctor .` until `Every row passes.` The VPS row and the row of `ao-deploy` are
questions; step 11 answered them. With a Java app, the row `Docker is running` needs Docker Desktop: when the human runs
it only on demand, start it for `doctor`, then quit it again.

### Step 13. `verify`

`node <kit>/scripts/ao-kit.mjs verify .`: one write on Jira, GitHub and the VPS, each cleaned up, every row passing. Then
read the Task it names through the `atlassian` MCP server: it is Cancelled and has the label `ao-kit-verify`. That read
uses the agents' token, the way every agent reaches Jira.

### Step 14. Hand over

Tell the human, in a few lines: the repo, the board, the Development hosts, what you did for them, anything left open
(such as the Dependabot PRs still open, and the files of this machine only: `.env` files with their random values), and
that the first piece of work starts with `/ao-intake` (getting-started part 6). A Task of step 10 that skipped review
is in the first release: that release needs `/ao-review <KEY>` after merge, as `ao-step.mjs status` says. Then run
`/ao-status`.

## Time, as measured

| What | Where measured | Time |
|---|---|---|
| `init` with `next-nest` | `ao-green` | about 2.5 minutes |
| `init --package-manager pnpm` | `shop` | 25 seconds |
| `add`, one app | `shop` | 13–35 seconds |
| First commit, two apps, 799 files, through the hooks | `shop` | 143 seconds |
| First commit, three apps, through the hooks | du-an-1 | 133 seconds |
| `setup github`, a public repo | du-an-1 | 28 seconds |
| CI of the Task's PR, with the Java tests | du-an-1 | about 5 minutes |
| `/ao-preview`, three apps, with `pnpm install` | du-an-1 | 2 minutes 14 seconds |
| First deploy of three apps with a database | `shop`, du-an-1 | about 18.5 minutes |
| `doctor`, `verify` | du-an-1 | 22 seconds, 10 seconds |
| The whole setup, from the empty folder to `verify`, three templates and the VPS | du-an-1 | about 5 hours, with the kit fixes the run found; the human clicked once, in one round of the browser |
