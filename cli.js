#!/usr/bin/env node
global.dataDir = 'data_getContract'
const { getTransaction, getContract, isContract, mapTask, retry } = require('./utils')
const fs = require('fs')
const jsonlines = require('jsonlines')
const csv = require('csv-stream')
const Cb = require('@superjs/cb')
const { state, loadState, saveState } = require('./state')

class Writer {
  constructor (name) {
    this._name = name
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

async function taskCheckIsContract () {
  await loadState()
  var csvStream = csv.createStream()
  let ii = 0
  let errors = new Writer('errors')
  let resultFile = new Writer('result')
  let addrs = Buffer.allocUnsafe(10534705 * 20)
  let cb = Cb.new()
  let length = 0
  fs.createReadStream(`${dataDir}/nodes.csv`).pipe(csvStream).on('error', function (e) {
    console.error(e)
    errors.at('csv').write({ i: state.i, e })
  })
    .on('header', function (columns) {
      console.log(columns)
    })
    .on('data', async function (data) {
      addrs.set(Buffer.from(data.address.substring(2), 'hex'), length * 20)
      length++
    })
    .on('end', function () {
      cb.ok()
    })
  await cb
//    .on('column', function (key, value) {
//
//        // outputs the column name associated with the value found
//      console.log('#' + key + ' = ' + value);
//    })
  state.i = state.i || 0
  let start = state.i

  await mapTask(
    async j => {
      let i = start + j
      try {
        return await retry(async () => {
          let addr = '0x' + addrs.slice(i * 20, i * 20 + 20).toString('hex')
          let isC = await isContract(addr)
          return { addr, isContract: isC }
          // await result.at('IsContract').write({addr,isContract:isC})
        })
      } catch (e) {
        console.error(`e:`, e)
        errors.at('IsContract').write({ i, addr: addrs[i], e })
      }
    },
    async (result, j) => {
      try {
        let i = start + j
        await resultFile.at('IsContract').write(result)
        state.i = i
      } catch (e) {
        console.error('final error', i, e)
      }
    }, { n: length - start, concurrency: 20 })
  console.log('done')
}

async function taskGetContract () {
  await loadState()
  var parser = jsonlines.parse()

  let maxLines = 2500000
  let addrs = Buffer.allocUnsafe(maxLines * 20)
  let cb = Cb.new()
  let length = 0
  fs.createReadStream(`${dataDir}/result_IsContract.jsonl`).pipe(parser).on('data', function (data) {
      if (length >= maxLines) return

      if (data.isContract === true) {
        addrs.set(Buffer.from(data.addr.substring(2), 'hex'), length * 20)
        length++
      }
    }
  ).on('end', function () {
    cb.ok()
  }).on('error', function (e) {
    cb.err(e)
  })
  await cb

  let contracts = new Writer('contracts')

  let contractByVersions = new Writer('contractByVersions')

  let errors = new Writer('errors')

  state.i = state.i || 0
  let start = state.i
  let n = length - start
  console.log('length:', length)
  await mapTask(
    async j => {
      let i = start + j
      try {
        return retry(async () => await getContract('0x' + addrs.slice(i * 20, i * 20 + 20).toString('hex')))
      } catch (e) {
        errors.at('contracts').write({ i, addr: addrs[i], e })
      }
    },
    async (c, j) => {
      let i = start + j

      if(c!=null){
        try {
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
          console.error('final error', i, e)
        }
      }

      state.i = i
    },
    { n, concurrency: 10 })

  console.log('done')

}

taskGetContract().catch(e => {
  console.error(`e:`, e)
}).finally(() => {
  saveState()

})
