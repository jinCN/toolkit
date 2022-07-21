const axios = require('axios')
const { ethers } = require('ethers')
const Cb = require('@superjs/cb')

ethers.utils.Logger.setLogLevel('off')
const rpc = 'https://mainnet.infura.io/v3/af88d7776e3f4e1888ac935b9b16effd'
const keys = [
  '1532d4c722424ce9b5bb69cf2139b0cc',
  'a102aceaf39541e0b7972ae47886d840',
  '2c615b94cf1b47ce84ca8023d5a64dca',
  'ca989c6248604abdb6eb31b25f70afc7',
  '5770c7b734cd44c8b2560fbaa239de01',
  '9b110e408b544e22b09edfbaedccbcec',
  '546ac9bb413048b4bbf8edc423519cc2',
  'df044d9c323649e3ac9d54116364718f',
  '54dae3b76894457d88d270c1c4fa7e61',
  'c000f14a5943499bae0e3edcfbbd96aa'
]
const providers = keys.map(v => new ethers.providers.JsonRpcProvider('https://mainnet.infura.io/v3/' + v))
let k = 0

async function isContract (addr) {
  let provider = providers[(k++) % providers.length]
  let bytecode = await provider.send('eth_getCode', [addr, 'latest'])
  if (bytecode && bytecode.length && bytecode.length > 2) {
    return true
  }
  return false
}

async function getContract (addr) {
  let { data: { result: sourceCodeList } } = await axios.get(`http://api.etherscan.io/api`, {
    params: {
      apikey: 'XD7SZFJG2873DS89XC7AECA7FRTXAXKAJ1',
      action: 'getsourcecode',
      address: addr,
      module: 'contract',
    },
  })
  let { data: { result: abi } } = await axios.get(`http://api.etherscan.io/api`, {
    params: {
      apikey: 'XD7SZFJG2873DS89XC7AECA7FRTXAXKAJ1',
      action: 'getabi',
      address: addr,
      module: 'contract'
    }
  })
  let bytecode = await provider.send('eth_getCode', [addr, 'latest'])
  return { addr, abi, bytecode, sourceCodeList }
}

async function getTransaction (addr) {
  let { data: { result: txList } } = await axios.get(`http://api.etherscan.io/api`, {
    params: {
      apikey: 'XD7SZFJG2873DS89XC7AECA7FRTXAXKAJ1',
      module: 'account',
      action: 'txlist',
      address: addr,
      startblock: 0,
      endblock: 99999999,
      page: 1,
      sort: 'desc'
    }
  })
  return { addr, txList }
}

const mapTask = async (mapper, mapperFinal = async() => {}, {n,concurrency}) => {
  if (typeof mapper !== 'function') {
    throw new TypeError('mapper function is required')
  }

  if (typeof mapperFinal !== 'function') {
    throw new TypeError('mapperFinal function is required')
  }

  if (!(typeof concurrency === 'number' && concurrency >= 1)) {
    throw new TypeError(`Expected \`concurrency\` to be a number from 1 and up, got \`${concurrency}\` (${typeof concurrency})`)
  }


  if (!(typeof n === 'number' && n >= 1)) {
    throw new TypeError(`Expected \`n\` to be a number from 1 and up, got \`${n}\` (${typeof n})`)
  }

  let promises = []
  let resolvedCount = 0
  let cb = Cb.new()

  for (let i = 0; i < n; i++) {
    promises.push(mapper(i))

    if (i >= concurrency) {
      let ret = await promises[0]
      promises.shift()
      mapperFinal(ret, i - concurrency).finally(()=>{
        resolvedCount++
        if(resolvedCount===n){
          cb.ok()
        }
      })
    }



  }
  for (let i = 0; i < concurrency; i++) {
    let ret = await promises[0]
    promises.shift()
    mapperFinal(ret, n - concurrency + i).finally(()=>{
      resolvedCount++
      if(resolvedCount===n){
        cb.ok()
      }
    })
  }
  await cb
}

module.exports = { getContract, getTransaction, isContract, mapTask }
