import { Browser } from "./discord/yuki/channelManager/browser.js";
import { done } from "./misc/cli.js";

/*
const ph = new Puzzlehunt('https://www.puzzle.university', 'yuki', 'yukiiscute')
await ph.login()
const [, r] = await ph.addRound('https://www.puzzle.university/round/econ')
debug(r.scan())
*/

// const ss = 'https://docs.google.com/spreadsheets/d/1bz4CNoEH6PUA5uStRUqngbUpPMph51ug2vagWu8Y0fk/edit#gid=349470310'
// const mainSS = GSpreadsheet.fromUrl(ss)
// await mainSS.initGph()
// await mainSS.scanPuzzles('https://www.huntinality.com/rounds/spells')

// var scriptName = path.basename(__filename)
// info(scriptName)

// const url = 'https://drive.google.com/drive/folders/1hze-rzGW5Cv876JcseKH99q22iGUxUPr'
// const folder = GFolder.fromUrl(url)
// const valid = await folder.checkWritePermission()
// debug(valid)

async function testLogin() {
  const url = "https://2024.galacticpuzzlehunt.com";
  const gph = new Browser(url);
  await gph.login("yuki", "yukiiscute", url + "/login");
  await gph.screenshot("after_login.png");
  await gph.browse("https://2024.galacticpuzzlehunt.com/puzzle/d5b404e5");
  // await sleep(5000);
  await gph.screenshot("browse_puzzle.png");
  done("!");
}

await testLogin();

// const url = "https://docs.qq.com/sheet/DWEt5TG1sSHhWcGxQ?tab=BB08J2";
// using browser = new Browser(url);
// await browser.browse(url);
// debug(await browser.getTitle());
