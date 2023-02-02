const hre = require("hardhat");
const fs = require("fs");
require("dotenv").config();

//глобальные?
let config,dune,owner,inTrade,balances;
const network = hre.network.name;
if (network === 'aurora') config = require('./../config/harvester.json');

//load massive of dex routers and tokens ~171
 console.log(`Loaded ${config.routes.length} routes`);

const main = async () => {
    await setup();
    //console.log('setup is well')
    await lookForQuadTrade();
  }

  
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

  let goodCount = 0;
  const useGoodRoutes = () => {
    const targetRoute = {};
    const route = config.routes[goodCount];
    goodCount += 1;
    if (goodCount >= config.routes.length) goodCount = 0;
    targetRoute.router1 = route[0];
    targetRoute.router2 = route[1];
    targetRoute.router3 = route[2];
    targetRoute.token1 = route[3];
    targetRoute.token2 = route[4];
    targetRoute.token3 = route[5];
    targetRoute.token4 = route[6];
    return targetRoute;
  }

const lookForQuadTrade = async () => {
  let targetRoute;
  if (config.routes.length > 0) {
    targetRoute = useGoodRoutes();
  } else {
    targetRoute = searchForRoutes();
  }
    try {
      console.log('ping DEX '+Date.now());
        //чек баланса ниар
      let tradeSize = balances[targetRoute.token1].balance;
      
      //оценка профитности аврора вона трис ниа юсдт вона аврора
      const amtBack = await dune.estimateQuadDexTradeFirst(targetRoute.router1, targetRoute.router2, targetRoute.token1, targetRoute.token2, targetRoute.token3, tradeSize);
      const amtBack2 = await dune.estimateQuadDexTradeSecond(targetRoute.router2, targetRoute.router3, targetRoute.token1, targetRoute.token3, targetRoute.token4, amtBack);
      const multiplier = ethers.BigNumber.from(config.minBasisPointsPerTrade+10000);
      const sizeMultiplied = tradeSize.mul(multiplier);
      const divider = ethers.BigNumber.from(9942);
      const profitTarget = sizeMultiplied.div(divider);
      console.log("Profit is: "+ (((amtBack2.toString() * 100) / profitTarget.toString()).toFixed(2)-100)+ "%");
      if (!config.routes.length > 0) {
        fs.appendFile(`./data/${network}RouteLog.txt`, `["${targetRoute.router1}","${targetRoute.router2}","${targetRoute.router3}","${targetRoute.token1}","${targetRoute.token2}","${targetRoute.token3}","${targetRoute.token4}"],`+"\n", function (err) {});
      }
      if (amtBack2.gt(profitTarget)) {
        await quadTrade(targetRoute.router1, targetRoute.router2, targetRoute.router3, targetRoute.token1, targetRoute.token2, targetRoute.token3, targetRoute.token4, tradeSize);
      } else {
        await lookForQuadTrade();
      }
    } catch (e) {
      console.log(e);
      await lookForQuadTrade();
    }
  }
// аврора вона трис- ниа юсдт вона аврора
const quadTrade = async (router1,router2,router3,baseToken,token2,token3,token4,amount) => {
    if (inTrade === true) {
      await lookForQuadTrade();
      return false;
    }
    try {
      inTrade = true;
      console.log('> Making quadTrade...');
      const tx = await dune.connect(owner).SpiceHarvester(router1, router2, router3, baseToken, token2, token3, token4, amount); //{ gasPrice: 1000000000003, gasLimit: 500000 }
      await tx.wait();
      inTrade = false;
      await lookForQuadTrade();
    } catch (e) {
      console.log(e);
      inTrade = false;
      await lookForQuadTrade();
    }
  }
  
  const setup = async () => {
    [owner] = await ethers.getSigners();
    console.log(`Owner: ${owner.address}`);
    const IDune = await ethers.getContractFactory('Dune');
    dune = await IDune.attach(config.duneContract);
    balances = {};
    for (let i = 0; i < config.baseAssets.length; i++) {
      const asset = config.baseAssets[i];
      const interface = await ethers.getContractFactory('WETH9');
      const assetToken = await interface.attach(asset.address);
      const balance = await assetToken.balanceOf(config.duneContract);
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
      balances[asset.address].balance = await assetToken.balanceOf(config.duneContract);
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
