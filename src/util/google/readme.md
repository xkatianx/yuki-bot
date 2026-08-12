## Create a Google Service

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
1. Create a new project or select an existing project
1. Enable the following APIs:
   - Google Drive API
   - Google Sheets API
1. Create a new service account
1. Download the credentials file and save it as `google.json` inside [`secret`](../../../secret/)

## Create a registry spreadsheet

The registry is a single spreadsheet the bot uses as an index of every
guild's root folder and logging channel, so it can find them with one read
on restart:

1. Create an empty Google spreadsheet (any name, keep the default sheet)
1. Share it with the service account email as an **Editor**
1. Copy the spreadsheet ID from its url
   (`https://docs.google.com/spreadsheets/d/<this part>/edit`)
   and add `REGISTRY_SHEET_ID=<the ID>` to `.env.local`

The bot fills the registry in by itself: `/root <url>` writes one row per
guild, and the channel the command is used in becomes the logging channel.
