const hre = require("hardhat");
const fs = require("fs");
require("dotenv").config();

//глобальные?
let config,arb,owner,inTrade,balances;
const network = hre.network.name;
if (network === 'aurora') config = require('./../config/aurora.json');

//load massive of dex routers and tokens ~171
// console.log(`Loaded ${config.routes.length} routes`);

const main = async () => {
    await setup();
    await lookForQuadTrade();
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


const lookForQuadTrade = async () => {
    let targetRoute;
    targetRoute = searchForRoutes();
    
    try {
        //чек баланса ниар
      let tradeSize = balances[targetRoute.token1].balance;
      //оценка профитности аврора вона трис ниа юсдт вона аврора
      const amtBack = await arb.estimateQuadDexTrade(targetRoute.router1, targetRoute.router2, targetRoute.router3, targetRoute.token1, targetRoute.token2, targetRoute.token3, targetRoute.token4, tradeSize);
      const multiplier = ethers.BigNumber.from(config.minBasisPointsPerTrade+10000);
      const sizeMultiplied = tradeSize.mul(multiplier);
      const divider = ethers.BigNumber.from(9961);
      const profitTarget = sizeMultiplied.div(divider);
      if (amtBack.gt(profitTarget)) {
        await QuadTrade(targetRoute.router1, targetRoute.router2, targetRoute.router3, targetRoute.token1, targetRoute.token2, targetRoute.token3, targetRoute.token4, tradeSize);
      } else {
        await lookForQuadTrade();
      }
    } catch (e) {
      console.log(e);
      await lookForQuadTrade();	
    }
  }
// аврора вона трис- ниа юсдт вона аврора
const QuadTrade = async (router1,router2,router3,baseToken,token2,token3,token4,amount) => {
    if (inTrade === true) {
      await lookForQuadTrade();	
      return false;
    }
    try {
      inTrade = true;
      console.log('> Making dualTrade...');
      const tx = await arb.connect(owner).QuadDexTrade(router1, router2, router3, baseToken, token2, token3, token4, amount); //{ gasPrice: 1000000000003, gasLimit: 500000 }
      await tx.wait();
      inTrade = false;
      await lookForDualTrade();
    } catch (e) {
      console.log(e);
      inTrade = false;
      await lookForDualTrade();
    }
  }
  
  const setup = async () => {
    [owner] = await ethers.getSigners();
    console.log(`Owner: ${owner.address}`);
    const IArb = await ethers.getContractFactory('Arb');
    arb = await IArb.attach(config.arbContract);
    balances = {};
    for (let i = 0; i < config.baseAssets.length; i++) {
      const asset = config.baseAssets[i];
      const interface = await ethers.getContractFactory('WETH9');
      const assetToken = await interface.attach(asset.address);
      const balance = await assetToken.balanceOf(config.arbContract);
      console.log(asset.sym, balance.toString());
      balances[asset.address] = { sym: asset.sym, balance, startBalance: balance };
    }
    setTimeout(() => {
      setInterval(() => {
        logResults();
      }, 600000);
      logResults();
    }, 120000);
  }
  
  const logResults = async () => {
    console.log(`############# LOGS #############`);
      for (let i = 0; i < config.baseAssets.length; i++) {
      const asset = config.baseAssets[i];
      const interface = await ethers.getContractFactory('WETH9');
      const assetToken = await interface.attach(asset.address);
      balances[asset.address].balance = await assetToken.balanceOf(config.arbContract);
      const diff = balances[asset.address].balance.sub(balances[asset.address].startBalance);
      const basisPoints = diff.mul(10000).div(balances[asset.address].startBalance);
      console.log(`#  ${asset.sym}: ${basisPoints.toString()}bps`);
    }
  }
  
  process.on('uncaughtException', function(err) {
    console.log('UnCaught Exception 83: ' + err);
    console.error(err.stack);
    fs.appendFile('./critical.txt', err.stack, function(){ });
  });
  
  process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: '+p+' - reason: '+reason);
  });
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });