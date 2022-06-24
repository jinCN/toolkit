const fs = require('fs')
let stateFile
const state = {}
async function saveState(){
  stateFile = stateFile || await fs.promises.open(`data/state.json`, 'w')
  await stateFile.truncate(0) // clear previous contents
  await stateFile.write(JSON.stringify(state), 0)
}

async function loadState() {
  let content = '{}'
  try {
    content = await fs.promises.readFile(`data/state.json`, 'utf8')
  } catch (e) {
    console.error(`e:`, e);
  }
  content = content || '{}'
  Object.assign(state, JSON.parse(content))
}

setInterval(() => saveState(), 5000);

module.exports={state,saveState,loadState}
