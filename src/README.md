# Yuki Bot
A discord bot for managing google spreadsheets of puzzlehunts. 

## :mortar_board: How to

### Host a yuki bot
1. clone this repo
2. copy .env_template to .env and fill in it
3. ```Shell
    $ npm i 
   ```
4. ```Shell
    $ npm start 
   ```

### Create a Discord bot
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. New Application
3. Bot > Add Bot
4. Copy TOKEN and set it to your environment ==token_of_discord_bot==
5. Turn on MESSAGE CONTENT INTENT since you may need it
6. OAuth2
7. Copy CLIENT ID and set it to your environment `token_of_discord_bot`
8. OAuth2 > URL Generator
9. SCOPES ✅bot
10. BOT PERMISSIONS ✅Administrator (or only those permissions needed)
11. Copy the GENERATED URL and open it to invite your bot to your server

### Create a Google Service
TBD
