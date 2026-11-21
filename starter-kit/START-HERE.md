# Start a new project: what to do and what to paste

## Before (5 minutes)
1. Create a new, empty **private GitHub repo** for the project (e.g. `paintmatch`) and install the Claude GitHub App on it.
2. Open **Claude Code** on that repo. The desktop app on your Mac is best, so the agents can use your Chrome; in the terminal, `claude --chrome`. A cloud session at claude.ai/code also works for code-only work.

## The first message (copy, fill in the <…>, paste)

```
New project: <one line, e.g. "painters in central Israel: customers get several quotes for painting their home">.
Brand name / domain if I have one: <… or "not yet">.

1. Install the MoveMatch starter kit into this repo: clone https://github.com/ezmenaged-ui/movematch into a temporary folder (not inside this repo) and run `bash starter-kit/install.sh <full path of this repo>`. Don't change anything in the movematch repo. Commit the result here.
2. Read CLAUDE.md and docs/PLAYBOOK.md (start with sections 0, 19 and 20).
3. Run the kickoff exactly as written in .claude/commands/kickoff.md, as if I typed "/kickoff <my one line>". Start with the entrepreneur stage and ask me its questions as multiple choice: at most 4 at a time, recommended option first, plain words.
4. After I approve stage 1, show me only the items in docs/OWNER-PREFLIGHT.md that I still need to do, and run the preflight check when I say I'm done.

Standing choices: ChatGPT builds the Google Ads campaigns from a brief you write (docs/ads/); you paste it into ChatGPT in my Chrome and check what it built. Microsoft Clarity records the funnel pages. Anything that needs paying: stop, add it to the top of docs/QUESTIONS.md and send me a push notification.
```

## After that
- **When stage 1 is approved:** do the preflight hour (`docs/OWNER-PREFLIGHT.md`).
- **To keep working with the agents:** say "continue the kickoff", or start a new session and type `/kickoff`. The commands work by name from the second session on.
- **To leave it running** (overnight, or when you're busy): type `/autopilot`. Keep the Mac plugged in and awake.
- **Each morning:** read `docs/DIGEST-<date>.md` and answer `docs/QUESTIONS.md` (payments 💳 first). Then `/kickoff` to approve drafts and `/autopilot` again.
- **Ads:** the agent pastes the brief into ChatGPT in your Chrome, and Claude checks the result. You only press Enable.
- **Launch day:** QA says go, you enable the ads, then tell Claude "switch autonomy to live".
