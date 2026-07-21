module.exports = {
  apps: [
    {
      name: "yuki-bot", // Name of your application
      // Run bun as a plain child process. `interpreter: "bun"` instead makes
      // PM2 require() the entry point, which fails on async (top-level await)
      // modules with ERR "require() async module ... is unsupported".
      script: "bun",
      args: "run start",
      interpreter: "none",
      // cwd defaults to this file's directory, so .env.local is found.
      env: {
        PATH: `${process.env.HOME}/.bun/bin:${process.env.PATH}`, // Add "~/.bun/bin/bun" to PATH
      },
    },
  ],
}
