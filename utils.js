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

const apiKeys= [
  '2S8GHIYDBBBHJXXDV496JHPQ42GJIBA85J',
  'NDWZ5PMNC6WQ2VNC67SRGQZ1WW8EGN5XXI',
  '6QXYHKZ7VRN7E23STNWZHUH645E4V7I83D',
  '3ZTKEDPPAJ7FX9QNRDSRPFWZSQFMPKNWPE',
  'YISARRQJ43DPPFKU2S4MV2HD39WTWBMCVD',
  'HIW48QW8X261P1TYKVD9E4EAH4PXSAU8DG',
  '15J92X3MMHHR58IKBKDQFVGUJM5HT3UFCX',
  'T68FUHEMQSZYB73AEFENZCAKQTYYAXFP78',
  'ZXF9ENEKAEXDHX5ZG16XZ6FC4EPSN63JZ1',
  'NXZKCHT3QUMDUVPV6APPYVY1GGN3ZMDKE2'
]
let ak = 0
async function isContract (addr) {
  let provider = providers[(k++) % providers.length]
  let bytecode = await provider.send('eth_getCode', [addr, 'latest'])
  if (bytecode && bytecode.length && bytecode.length > 2) {
    return true
  }
  return false
}

async function getContract (addr) {
  let { data: { result: sourceCodeList, message } } = await axios.get(`http://api.etherscan.io/api`, {
    params: {
      apikey: apiKeys[(ak++)%apiKeys.length],//'XD7SZFJG2873DS89XC7AECA7FRTXAXKAJ1',
      action: 'getsourcecode',
      address: addr,
      module: 'contract',
    },
  })
if(sourceCodeList==='Contract source code not verified'){
  sourceCodeList = null
} else if (message!= 'OK') throw new Error(sourceCodeList)
  let { data: { result: abi, message:message1 } } = await axios.get(`http://api.etherscan.io/api`, {
    params: {
      apikey: apiKeys[(ak++)%apiKeys.length],
      action: 'getabi',
      address: addr,
      module: 'contract'
    }
  })
  if (message1!= 'OK') throw new Error(abi)

  let provider = providers[(k++) % providers.length]
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
const sleep = ms=>new Promise(r=> setTimeout(r,ms))
async function retry (f, k = 15) {
  let delays = [1000, 3000, 5000, 10000, 20000];
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

module.exports = { getContract, getTransaction, isContract, mapTask,retry }
