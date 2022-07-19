const axios = require('axios')
const { ethers } = require('ethers')

const rpc = 'https://mainnet.infura.io/v3/af88d7776e3f4e1888ac935b9b16effd'

const provider = new ethers.providers.JsonRpcProvider(rpc)
async function isContract (addr) {
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

module.exports = { getContract, getTransaction, isContract }
