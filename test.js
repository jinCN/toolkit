const { getTransaction, getContract } = require('./utils')

main = async () => {
  let t = await getTransaction('0x712db54daa836b53ef1ecbb9c6ba3b9efb073f40')
  let c = await getContract('0x712db54daa836b53ef1ecbb9c6ba3b9efb073f40')
  console.log(`1:`, 1)
  let x = 1
}
main()
