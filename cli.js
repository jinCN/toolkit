#!/usr/bin/env node
const { getTransaction } = require('./index')
const fsPromise = require('fs/promises')
async function main () {
  let addrsJson = await fsPromise.readFile('addrs.json')
  let addrsObj = JSON.parse(addrsJson)
  let addrs = Object.keys(addrsObj)
  for (let i = 0; i < 10; i++) {
    let ret = await getTransaction(addrs[i])

    await fsPromise.writeFile('data.jsonl', '\n' + JSON.stringify(ret), { flag: 'a' })
  }
  console.log(ret)
}

main().catch(e => {
  console.error(`e:`, e)
})
