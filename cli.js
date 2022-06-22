#!/usr/bin/env node
const { getTransaction, getContract } = require('./utils')
const fs = require('fs')
const jsonlines = require('jsonlines')
class Writer{
  constructor (name) {
    this._name=name
  }
  at (k) {
    if (this[k]) return this[k]
    let stringifier = jsonlines.stringify()
    
    let s = fs.createWriteStream(`${__dirname}/data/${this._name}_${k}.jsonl`, { flags: 'a' })
    stringifier.pipe(s)
    this[k] = stringifier
    return this[k]
  }
}
async function main () {
  let addrsJson = await fs.promises.readFile('addrs.json')
  let addrsObj = JSON.parse(addrsJson)
  let addrs = Object.keys(addrsObj)
  let contracts= new Writer('contracts')
  let transactions = new Writer('transactions')
  let contractByVersions = new Writer('contractByVersions')
  let errors = new Writer('errors')
  let stateFile=await fs.promises.open(`${__dirname}/data/state.json`)
  for (let i = 0; i < 10; i++) {
    await stateFile.writeFile({i})
    try {
      let t = await getTransaction(addrs[i])
  
      transactions.at(i / 1000 >> 0).write(t)
    }catch (e) {
      errors.at('transaction').write({i,addr:addrs[i],e})
    }

    try {
      let c = await getContract('0x712db54daa836b53ef1ecbb9c6ba3b9efb073f40')
      contracts.at(i / 1000 >> 0).write(c)
      if (c?.sourceCodeList?.[0]?.CompilerVersion?.startsWith('v0.5')) {
        contractByVersions.at('0_5').write(c)
      } else if (c?.sourceCodeList?.[0]?.CompilerVersion?.startsWith('v0.6')) {
        contractByVersions.at('0_6').write(c)
      } else if (c?.sourceCodeList?.[0]?.CompilerVersion?.startsWith('v0.7')) {
        contractByVersions.at('0_7').write(c)
      } else if (c?.sourceCodeList?.[0]?.CompilerVersion?.startsWith('v0.8')) {
        contractByVersions.at('0_8').write(c)
      }
    }catch (e) {
      errors.at('contracts').write({ i, addr: addrs[i], e })
    }
  }
  console.log('done')
}

main().catch(e => {
  console.error(`e:`, e)
})
