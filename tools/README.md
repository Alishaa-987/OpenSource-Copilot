# tools

Maintenance and diagnostic scripts for this workspace. Nothing here is part of
a deployed service — these are run by hand, from the repository root.

| Script | Purpose |
| --- | --- |
| `diagnose-issues.js` | Prints every imported repository with its stored issue counts by state, the newest rows, and whether the progress/activity/notification tables exist. Use it when the UI shows something the database probably disagrees with. |
| `repair-issues.js` | One-off repair: reopens issue rows that the monitor wrongly marked closed and deletes the false `issue_closed` notifications those sweeps generated. Safe because the import path only ever stores open issues. |
| `restart-services.ps1` | Windows helper that restarts the backend services and the web app together. |

## Running the Node scripts

Both read `DATABASE_URL` from the root `.env`:

```bash
node -r dotenv/config tools/diagnose-issues.js
node -r dotenv/config tools/repair-issues.js
```

Write their output to a file if you want to keep it — do not commit it, the
repository root ignores `*.log` and the diagnostic `.txt` dumps.
