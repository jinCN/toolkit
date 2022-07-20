#!/usr/bin/env node
global.dataDir = 'data_IsContract'
const { getTransaction, getContract, isContract } = require('./utils')
const fs = require('fs')
const jsonlines = require('jsonlines')
const csv = require('csv-stream')
const Cb = require('@superjs/cb')
const { state, loadState, saveState } = require('./state')
class Writer{
  constructor (name) {
    this._name=name
  }
  at (k) {
    if (this[k]) return this[k]
    let stringifier = jsonlines.stringify()
    
    let s = fs.createWriteStream(`${__dirname}/${dataDir}/${this._name}_${k}.jsonl`, { flags: 'a' })
    stringifier.pipe(s)
    this[k] = stringifier
    return this[k]
  }
}

async function taskHandleAddresses () {
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
const sleep = ms=>new Promise(r=> setTimeout(r,ms))
async function retry (f, k = 10) {
  let delays = [1000, 10000, 20000, 40000, 60000];
  let ret;
  let hasRet = false;
  let ee;
  for (let i = 0; i < k; i++) {
    try {
      ret = await f();
      hasRet = true;
      break;
    } catch (e) {
      ee = e;
      await sleep(delays[i % 5]);
    }
  }
  if (hasRet)
    return ret;
  else
    throw ee;
}

async function taskCheckIsContract () {
  await loadState()
  var csvStream = csv.createStream()
  let ii=0
  let errors = new Writer('errors')
  let result = new Writer('result')
  let addrs=[]
  let cb= Cb.new()
  fs.createReadStream(`${dataDir}/nodes.csv`).pipe(csvStream).
  on('error', function (e) {
    console.error(e);
    errors.at('csv').write({ i: state.i, e })
  })
    .on('header', function (columns) {
      console.log(columns);
    })
    .on('data', async function (data) {
      addrs.push(data.address)
      await isContract(data.address)
    })
    .on('end', function (){
      cb.ok()
    })
  await cb
//    .on('column', function (key, value) {
//
//        // outputs the column name associated with the value found
//      console.log('#' + key + ' = ' + value);
//    })
  for(state.i = state.i||0;state.i<addrs.length;state.i++){
    console.log('i:',state.i)
    let i = state.i
    try{
      await retry(async ()=>{
        let isC = await isContract(addrs[i])
        await result.at('IsContract').write({addr:addrs[i],isContract:isC})
      })
    }catch (e) {
      console.error(`e:`, e)
      errors.at('IsContract').write({ i, addr: addrs[i], e })
    }
  }
  console.log('done')
}
async function main(){
  // console.log(1234)
  // let x=await isContract('0xdccdce5a4c97d465841cc375fe969725fd172ab7')
  // console.log('x:',x)
}
taskCheckIsContract().catch(e => {
  console.error(`e:`, e)
}).finally(()=>{
  saveState()

})
