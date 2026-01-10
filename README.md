# Yuki Bot

A discord bot for managing google spreadsheets of puzzlehunts.

## Prerequisites

- Node.js 24 or higher
- pnpm installed globally (`npm install -g pnpm`)

## Setup

1. Clone this repo

    ```bash
    git clone https://github.com/xkatianx/yuki-bot.git
    ```

1. Copy [.env](.env) to .env.local

1. Prepare necessary info:
   - [Google](./src/util/google/readme.md)
   - [Discord](./src/util/discord/readme.md)

1. Install dependencies:

    ```bash
    pnpm install
    ```

1. Install browser for puppeteer:

    ```bash
    pnpm prepare
    ```

1. Register slash commands:

    ```bash
    pnpm slash
    ```

1. Run the bot:

    ```bash
    pnpm start
    ```
