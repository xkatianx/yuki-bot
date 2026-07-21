# Running Yuki Bot with PM2 on Ubuntu

This guide sets up the bot as a background service that restarts on crash and
starts automatically when the machine boots.

## 1. Prerequisites

Install Bun (as the user that will own the process, **not** root). The install
script unpacks a zip, so `unzip` and `curl` must be present first — a fresh
Ubuntu image usually has neither, and the script fails with
`unzip is required to install bun`:

```bash
sudo apt update && sudo apt install -y curl unzip
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun --version
```

Install PM2. PM2 is a Node tool, so it needs Node/npm:

```bash
sudo apt update && sudo apt install -y nodejs npm
sudo npm install -g pm2
pm2 --version
```

Puppeteer's bundled Chrome needs a few system libraries on a headless server:

```bash
sudo apt install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
  libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
  libxrandr2 libgbm1 libasound2t64 libpango-1.0-0 libcairo2
```

## 2. Set up the project

```bash
git clone https://github.com/xkatianx/yuki-bot.git
cd yuki-bot
bun install
bun run prepare   # downloads Chrome for puppeteer
```

Create `.env.local` with your Discord/Google credentials (see
[README.md](README.md)) and put the Google service account key at
`secret/google.json`.

On a headless machine, add this to `.env.local` so Chrome can start:

```
PUPPETEER_LAUNCH_ARGS=--no-sandbox
```

Register slash commands once:

```bash
bun run slash
```

Verify it runs in the foreground before handing it to PM2:

```bash
bun run start
```

Stop it with `Ctrl+C` once you see the bot come online.

## 3. PM2 config

[pm2.config.cjs](pm2.config.cjs) describes the process:

```js
module.exports = {
  apps: [
    {
      name: "yuki-bot",
      script: "bun",
      args: "run start",
      interpreter: "none",
      env: {
        PATH: `${process.env.HOME}/.bun/bin:${process.env.PATH}`,
      },
    },
  ],
}
```

Notes:

- `interpreter: "none"` tells PM2 to exec `bun run start` as a plain child
  process. The more obvious `script: "src/index.ts", interpreter: "bun"` does
  not work here: PM2 wraps the entry point in a loader that `require()`s it,
  and `require()` cannot load a module using top-level `await`.
- The `PATH` entry is needed because PM2's startup service does not source
  `~/.bashrc`, so `~/.bun/bin/bun` would otherwise not be found.
- The working directory matters: Bun loads `.env.local` relative to it. PM2
  defaults it to the directory holding `pm2.config.cjs`, which is what you want.
  If you ever see the bot fail to find its config, pin it explicitly with
  `cwd: "/home/YOUR_USER/yuki-bot"`.
- The `.cjs` extension is required. `package.json` sets `"type": "module"`, so a
  `.js` config would be treated as ESM and PM2 — which `require()`s it — fails
  with `ERR_REQUIRE_ESM`.
- Do **not** put secrets in `env` here — this file is committed to git. Keep
  them in `.env.local`.

## 4. Start it

```bash
cd ~/yuki-bot
pm2 start pm2.config.cjs
pm2 logs yuki-bot        # confirm it connected to Discord
```

## 5. Auto-start on boot

```bash
pm2 startup systemd
```

That prints a `sudo env PATH=... pm2 startup systemd -u YOUR_USER --hp /home/YOUR_USER`
command — copy and run it exactly as printed. Then freeze the current process
list so it is restored at boot:

```bash
pm2 save
```

Test it:

```bash
sudo reboot
# after logging back in
pm2 list
```

## 6. Day-to-day commands

| Task               | Command                           |
| ------------------ | --------------------------------- |
| Status             | `pm2 list`                      |
| Live logs          | `pm2 logs yuki-bot`             |
| Last 200 log lines | `pm2 logs yuki-bot --lines 200` |
| Restart            | `pm2 restart yuki-bot`          |
| Stop               | `pm2 stop yuki-bot`             |
| Remove from PM2    | `pm2 delete yuki-bot`           |
| Resource usage     | `pm2 monit`                     |

Deploying an update:

```bash
cd ~/yuki-bot
git pull
bun install
bun run slash          # only if slash commands changed
pm2 restart yuki-bot
pm2 save               # only if the process list changed
```

## Troubleshooting

**`bun: command not found` / `Script not found`** — the `PATH` entry in
`pm2.config.cjs` did not resolve. Use an absolute path instead:
`script: "/home/YOUR_USER/.bun/bin/bun"`.

**`require() async module ... is unsupported`** — the config is using
`interpreter: "bun"`. Switch to the `script: "bun"` + `interpreter: "none"`
form shown above.

**Bot starts then exits immediately** — check `pm2 logs yuki-bot`. Usually a
missing env var; the app calls `fatal()` and dies. Confirm `.env.local` is in
the directory named by `cwd`.

**Restart loop after boot but fine manually** — almost always `cwd` missing or
wrong, so `.env.local` and `secret/google.json` are not found.

**Puppeteer fails to launch** — set `PUPPETEER_LAUNCH_ARGS=--no-sandbox` in
`.env.local` and make sure the system libraries in step 1 are installed.

**Logs growing too large** — install rotation:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```
