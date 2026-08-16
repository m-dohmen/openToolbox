<!-- SPDX-License-Identifier: Apache-2.0 -->
# The openToolbox skill

One skill, `skills/opentoolbox-tool/SKILL.md`, that walks an AI coding agent from *"I need
something to track supplier audits"* to a finished, renamed HTML file. Claude Code and Codex both
read the same file — the format is identical.

Install it once and you no longer have to find this repository first: describe the tool you want in
any directory and the agent clones the template, runs the interview, writes `src/domain.js`, builds
and hands over.

## Claude Code

```bash
claude plugin marketplace add m-dohmen/openToolbox
claude plugin install opentoolbox@opentoolbox
```

## Codex

No marketplace equivalent — copy the skill directory:

```bash
git clone --depth 1 https://github.com/m-dohmen/openToolbox /tmp/opentoolbox
mkdir -p ~/.codex/skills
cp -R /tmp/opentoolbox/plugin/skills/opentoolbox-tool ~/.codex/skills/
```

Codex's slash commands are a fixed set and cannot be extended, so the skill is reached through
`/skills` or fires on its own when what you describe matches its description.

## Without installing anything

The skill is convenience, not a requirement. Point any agent at the repository and
[`AGENTS.md`](../AGENTS.md) tells it the same thing:

> Build me a tool for tracking supplier audits, based on openToolbox
> (https://github.com/m-dohmen/openToolbox).

## What lives where

The split is deliberate, because two documents that both explain the schema will drift apart:

| | |
| --- | --- |
| [`AGENTS.md`](../AGENTS.md) | **Knowledge.** The `SCHEMA` shape, field types, calculated fields, multiple entities, dashboards, the rules that break a single-file build. |
| [`SKILL.md`](skills/opentoolbox-tool/SKILL.md) | **Procedure.** Fetch the template, interview, write, build, verify, set the handover switches, deliver. |

`SKILL.md` points at `AGENTS.md` for everything in the left column and says outright that
`AGENTS.md` wins where the two disagree. Keep it that way when editing either.
