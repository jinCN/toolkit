const { getTransaction, getContract } = require('./utils')
const fs = require('fs')
var jsonlines = require('jsonlines')

main = async () => {
//  let t = await getTransaction('0x712db54daa836b53ef1ecbb9c6ba3b9efb073f40')
  //  let c =await getContract('0x712db54daa836b53ef1ecbb9c6ba3b9efb073f40')
//
//  var stringifier = jsonlines.stringify()
//
//  stringifier.pipe(fs.createWriteStream('./data1.jsonl', { flags: 'a' }))
//
//  stringifier.write({ test: 'This is a test!' })
//  stringifier.write({ jsonlines: 'is awesome' })
//  stringifier.end()
  
  let stateFile = await fs.promises.open(`${__dirname}/${dataDir}/state.json`, 'w')
  await stateFile.write(JSON.stringify({ i: 1 }),0)
  await stateFile.truncate(0);                         // clear previous contents
  await stateFile.write(JSON.stringify({ i: 2 }),0)
  
}
main()
