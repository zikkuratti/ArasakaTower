const hre = require("hardhat");
const fs = require("fs");
require("dotenv").config();

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
  */
  const searchForRoutes = () => {
    const targetRoute = {};
    targetRoute.router1 = config.routers[Math.floor(Math.random()*config.routers.length)].address;
    targetRoute.router2 = config.routers[Math.floor(Math.random()*config.routers.length)].address;
    targetRoute.token1 = config.baseAssets[Math.floor(Math.random()*config.baseAssets.length)].address;
    targetRoute.token2 = config.tokens[Math.floor(Math.random()*config.tokens.length)].address;
    return targetRoute;
  }