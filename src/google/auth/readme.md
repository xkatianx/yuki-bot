# Google Auth

## Requirements

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing project
3. Enable the following APIs:

- Google Drive API
- Google Sheets API

4. Create a new service account
5. Download the credentials file and save it as `credentials.json`
6. Set the environment variable `GOOGLE_APPLICATION_CREDENTIALS` to the path of the credentials file (preferably `./secret/credentials.json`)
