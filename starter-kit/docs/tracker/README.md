# Launch tracker (artifact)

`/kickoff` publishes this tracker **as its very first action** and sends the owner the link. You and the agents tick tasks off as they're done. Playbook section 22 has the background.

- `tracker.html` is the page. Tasks, the project header and quick links live in the artifact's database, so any chat can update them without republishing.
- `seed-tasks.json` is the starting checklist (37 tasks from MoveMatch's launch). Adapt titles to the vertical before seeding.

## How Claude creates it (in the new project)
1. Publish `docs/tracker/tracker.html` with the Artifact tool, `capabilities: {"db": {}, "user": {}}` and icon `checklist`. Change the `<title>` to "<Brand> Launch Tracker" first.
2. Seed it with one `ArtifactData` batch:
   - each task in `seed-tasks.json` → collection `tasks`, doc id = its `id`, with the other fields as data;
   - `meta/project` → `{name, lede, launch_date: "YYYY-MM-DD"}`;
   - `links` → `{label, url, note, order}`, one per console or page as they come to exist.
3. Write the tracker URL into `CLAUDE.md` ("Tracker:") and give the owner the link.
4. From then on: tick a task (`status: "done"`, `done_on`, a line on what was verified) when it's done, add tasks as they appear (owner `you` / `claude` / `external`, section `setup` / `now` / `launch` / `later`, `status: "waiting"` when blocked on someone else), and add step-by-step `steps` to every task the owner must do.
5. Before launch, reconcile every number in the tracker with the database and live settings. On MoveMatch the tracker said 5 movers while the database had 9.

Preview of the template: https://claude.ai/artifact/1e2JMry8hu8xhxEwPL3Dqe (private to the owner).
