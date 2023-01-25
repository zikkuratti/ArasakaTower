const hre = require("hardhat");
const fs = require("fs");
require("dotenv").config();

let config,arb,owner,inTrade,balances;
const network = hre.network.name;
if (network === 'goerli') config = require('./../config/goerli.json');
