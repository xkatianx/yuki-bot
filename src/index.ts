// import { PuzzleHunt } from './puzzlehunt/main.js'

import { Yuki } from './discord/yuki.js'
import { env } from './misc/env.js'

// const ph1 = new PuzzleHunt(0)
// const sheetUrl = 'https://docs.google.com/spreadsheets/d/1xPS4Ig-nuI3nO6Cipzf4JxP4sx6OZqBIDLefRKGmrZQ/edit#gid=349470310'
// await ph1.setSheet(sheetUrl)

// const browseUrl = 'https://grandhuntdigital.com/puzzle/reel-to-reel-cinematography'
// const page = await ph1.browse(browseUrl)
// await ph1.appendPuzzle(page.title, browseUrl)
// TODO detect dupe puzzle

const bot = new Yuki(env.DC.TOKEN).login()
if (env.DC.CID != null) bot.setLogChannel(env.DC.CID)
