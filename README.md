# gcmetrics

Laugh leaderboards for your iMessage group chats, read straight from the Messages database on your Mac and published as a website. Point it at any number of group chats. Nothing personal is ever committed: your config, exported data, and tokens are gitignored.

Each chat gets a hand-drawn card ([drawably](https://www.drawably.dev/)) with its group photo and four tables:

- Funniest per message: laugh reacts received divided by messages sent.
- Funniest messages: the ten most-laughed-at messages, with the picture if there was one.
- Laughs the most: who gives the most laugh reacts, and their most common reaction.
- Most called `word`: who gets called a word of your choice the most (optional).

## What counts as a laugh

Haha, heart, sticker, and emoji tapbacks count. Thumbs up, thumbs down, exclamation, question, and negative emoji (the `BAD_EMOJI` list in `rules.py`) do not, in any skin tone. A thread reply that contains a laugh word counts as a laugh for the message it replies to. Laugh words are lol, lmao, and ha in any spelling, including run-ons and keyboard mash (LOLOLOL, LLLLOOL, lmaooo, HAHAHAHA, HAAHIOAJHA). Names and words that merely contain ha, like Sarah or halal, do not count. Removed reacts are not counted, laughing at your own message is not counted, and one person laughing at one message counts once.

## Requirements

- A Mac with Messages signed in. Everyone in the chat needs a contact card so names are published instead of phone numbers. The export stops and lists anyone who is missing one.
- [uv](https://docs.astral.sh/uv/) for the Python scripts and [pnpm](https://pnpm.io/) for the site.
- Full Disk Access for whatever runs the scripts (System Settings > Privacy & Security > Full Disk Access). Your terminal app for manual runs. `/bin/bash` for the daily job, see below.
- Optional: a Vercel account for hosting and Vercel Blob for images.

## Setup

1. Clone the repo and create your config:

   ```
   cp config.example.toml config.toml
   uv run laughs.py --list      # find your group chat names
   ```

   Edit `config.toml` with your name, the chats, an optional word to count, and optional nicknames. If two chats share a name, use the ROWID from the list instead.

2. Export the data:

   ```
   uv run export.py
   ```

   This writes `web/data/<chat>.json`. Images go to `web/public/attachments/` unless `BLOB_READ_WRITE_TOKEN` is set, in which case they upload to Vercel Blob.

3. Run the site:

   ```
   cd web && pnpm install && pnpm dev
   ```

## Command line only

You do not need the website to get the numbers.

```
uv run laughs.py "Chat One" --me "Your Name"
uv run mentions.py fob "Chat One" "Chat Two" --me "Your Name" --alias Sam="Samuel Example"
```

## Deploying

```
cd web
vercel link
vercel blob create-store <name> --access public
vercel integration-resource connect <name> <project>
vercel env pull .env.local
vercel deploy --prod
```

`vercel deploy` uploads your working tree, including the gitignored `data/` folder, so the site gets your numbers without them ever entering git. `web/.vercelignore` controls what is uploaded.

`scripts/daily.sh` re-exports and deploys. Install it as a daily launchd job:

```
scripts/install-daily.sh
```

That checks the tools are on the PATH the job will use (`scripts/env.sh`), writes a plist pointing at this checkout into `~/Library/LaunchAgents/`, and loads it. It runs at 06:00 and logs to `~/Library/Logs/gcmetrics.log`. launchd runs the job as `/bin/bash`, and macOS attributes file access to that program, so grant Full Disk Access to `/bin/bash` (in the Full Disk Access list press the plus button, then Cmd+Shift+G and enter `/bin/bash`). Re-run the installer after moving the folder. Remove the job with `scripts/uninstall-daily.sh`.

## Development

The site enforces strict limits on every push: cyclomatic complexity 7, cognitive complexity 10, 250 lines per file, 100% line and branch coverage, 100% mutation score, no dead or copied code, no `any`.

```
cd web && pnpm verify
```

The Python side is a set of single-file uv scripts. Check them with:

```
uv run tests.py
uvx ruff check --select ALL --ignore D,T201,COM812,E501,CPY001,TRY003,EM101,EM102 --config "lint.mccabe.max-complexity=7" .
uvx pyright *.py
```

## License

MIT. See `LICENSE`.
