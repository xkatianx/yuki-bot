# Yuki Bot

A discord bot for managing google spreadsheets of puzzlehunts.

## Prerequisites

- [Bun](https://bun.sh) 1.3 or higher

## Setup

1. Clone this repo

   ```bash
   git clone https://github.com/xkatianx/yuki-bot.git
   ```

1. Copy [.env](.env) to .env.local

1. Prepare necessary info:
   - [Google](./src/util/google/readme.md)
   - [Discord](./src/util/discord/readme.md)

   > [!NOTE]
   > If you are running on Heroku, you may need to add `PUPPETEER_LAUNCH_ARGS=--no-sandbox` to [.env.local](.env.local).
   >
   > see: https://pptr.dev/troubleshooting

1. Install dependencies:

   ```bash
   bun install
   ```

1. Install browser for puppeteer:

   ```bash
   bun run prepare
   ```

1. Register slash commands:

   ```bash
   bun run slash
   ```

1. Run the bot:

   ```bash
   bun run start
   ```

## Development

```bash
bun run dev
```

## Tests

```bash
bun test
```

Tests run with `--no-env-file` so they do not load your local `.env` (see `package.json`).
