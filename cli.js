#!/usr/bin/env node
const { getTransaction, getContract } = require('./utils')
const fs = require('fs')
const jsonlines = require('jsonlines')
const { state, loadState, saveState } = require('./state')
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
  await loadState()
  let addrsJson = await fs.promises.readFile(`${__dirname}/addrs.json`)
  let addrsObj = JSON.parse(addrsJson)
  let addrs = Object.keys(addrsObj)
  let contracts = new Writer('contracts')
  let transactions = new Writer('transactions')
  let contractByVersions = new Writer('contractByVersions')
  let errors = new Writer('errors')
  
  let getContracts = async () => {
    for (state.ci = state.ci || 0; state.ci < addrs.length; state.ci++) {
      let i = state.ci
      try {
        let c = await getContract(addrs[i])
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
      } catch (e) {
        errors.at('contracts').write({ i, addr: addrs[i], e })
      }
    }
  }
  let p1 = getContracts().catch(e => {
    console.error(`getContracts e:`, e)
  })
  let getTransactions = async () => {
    for (state.i = state.i || 0; state.i < addrs.length; state.i++) {
      let i = state.i
      
      try {
        let t = await getTransaction(addrs[i])
        
        transactions.at(i / 1000 >> 0).write(t)
      } catch (e) {
        errors.at('transaction').write({ i, addr: addrs[i], e })
      }
    }
  }
  let p2 = getTransactions().catch(e => {
    console.error(`getTransactions e:`, e)
  })
  await p1
  await p2
  console.log('done')
}

main().catch(e => {
  console.error(`e:`, e)
  saveState()
})
