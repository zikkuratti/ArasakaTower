const hre = require("hardhat");
const fs = require("fs");
require("dotenv").config();

//глобальные?
let config,arb,owner,inTrade,balances;
const network = hre.network.name;
if (network === 'goerli') config = require('./../config/goerli.json');

//load massive of dex routers and tokens ~171
console.log(`Loaded ${config.routes.length} routes`);

const main = async () => {
    await setup();
    await lookForDualTrade();
  }

  /*парсер конфига при текущих значениях рандомизует от 0 до 2 какой декс мы юзанём всего 7 к 10 вероятность на второй элемент. 
  Возможно имеет смысл дописать сравнение чтобы второй токен не выбирался таким же как первый  в случае одинаковой биржи теряет смысл но возможно сжигает газ? 
   "baseAssets"- aave contracts addreses goerli
    "routes": [
     // uni https://docs.uniswap.org/contracts/v3/reference/deployments 
     //sushi https://docs.sushi.com/docs/Developers/Deployment%20Addresses 
     //usdc-uniswapgoerli https://app.uniswap.org/#/tokens/ethereum/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 
     //daiunigoerli https://app.uniswap.org/#/tokens/ethereum/0x6B175474E89094C44Da98b954EedeAC495271d0F

возвращает случайны массив адресов из конфига
    const targetRoute = {router1:uniswap0x, router2:sushi0x, token1:baseusdc0x, token2:tokens0x} 
  */
  const searchForRoutes = () => {
    const targetRoute = {};
    //auroraswap 0
    targetRoute.router1 = config.routers[0].address;
    //wannaswap 1
    targetRoute.router2 = config.routers[1].address;
    //trisolaris 2
    targetRoute.router3 = config.routers[2].address;
    // near 0
    targetRoute.token1 = config.baseAssets[0].address;
    //usdt 1
    targetRoute.token2 = config.tokens[1].address;
    //wanna 2
    targetRoute.token3 = config.tokens[2].address;
    //aurora 3
    targetRoute.token4 = config.tokens[3].address;
    return targetRoute;
  }

//пробегается по списку квартетов  роутесов и заряжает переменные таргетроут как только доходит до конца обнуляется  
let goodCount = 0;
const useGoodRoutes = () => {
  const targetRoute = {};
  const route = config.routes[goodCount];
  goodCount += 1;
  if (goodCount >= config.routes.length) goodCount = 0;
  targetRoute.router1 = route[0];
  targetRoute.router2 = route[1];
  targetRoute.token1 = route[2];
  targetRoute.token2 = route[3];
  return targetRoute;
}

const lookForDualTrade = async () => {
    let targetRoute;
    if (config.routes.length > 0) {
      targetRoute = useGoodRoutes();
    } else {
      targetRoute = searchForRoutes();
    }
    try {
      let tradeSize = balances[targetRoute.token1].balance;
      const amtBack = await arb.estimateDualDexTrade(targetRoute.router1, targetRoute.router2, targetRoute.token1, targetRoute.token2, tradeSize);
      const multiplier = ethers.BigNumber.from(config.minBasisPointsPerTrade+10000);
      const sizeMultiplied = tradeSize.mul(multiplier);
      const divider = ethers.BigNumber.from(10000);
      const profitTarget = sizeMultiplied.div(divider);
      if (!config.routes.length > 0) {
        fs.appendFile(`./data/${network}RouteLog.txt`, `["${targetRoute.router1}","${targetRoute.router2}","${targetRoute.token1}","${targetRoute.token2}"],`+"\n", function (err) {});
      }
      if (amtBack.gt(profitTarget)) {
        await dualTrade(targetRoute.router1,targetRoute.router2,targetRoute.token1,targetRoute.token2,tradeSize);
      } else {
        await lookForDualTrade();
      }
    } catch (e) {
      console.log(e);
      await lookForDualTrade();	
    }
  }