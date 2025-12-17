## Create a Discord bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. New Application
3. Bot > Add Bot
4. Copy TOKEN and set it to `DISCORD_BOT_TOKEN` in [.env.local](../../../.env.local)
5. Turn on MESSAGE CONTENT INTENT since you may need it
6. OAuth2
7. Copy CLIENT ID and set it to `DISCORD_BOT_ID` in [.env.local](../../../.env.local)
8. OAuth2 > URL Generator
9. SCOPES ✅bot
10. BOT PERMISSIONS ✅Administrator (or only those permissions needed)
11. Copy the GENERATED URL and open it to invite your bot to your guild
