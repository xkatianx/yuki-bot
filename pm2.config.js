module.exports = {
  apps: [
    {
      name: "yuki-bot", // Name of your application
      script: "src/index.ts", // Entry point of your application
      interpreter: "bun", // Bun interpreter
      // cwd defaults to this file's directory, so .env.local is found.
      env: {
        PATH: `${process.env.HOME}/.bun/bin:${process.env.PATH}`, // Add "~/.bun/bin/bun" to PATH
      },
    },
  ],
}
