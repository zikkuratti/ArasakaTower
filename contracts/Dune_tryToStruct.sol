//SPDX-License-Identifier: Unlicense refactor this for trade.js dex kinda
pragma solidity ^0.8.4;

import "hardhat/console.sol";

import "@openzeppelin/contracts/access/Ownable.sol";

interface IERC20 {
	function totalSupply() external view returns (uint);
	function balanceOf(address account) external view returns (uint);
	function transfer(address recipient, uint amount) external returns (bool);
	function allowance(address owner, address spender) external view returns (uint);
	function approve(address spender, uint amount) external returns (bool);
	function transferFrom(address sender, address recipient, uint amount) external returns (bool);
	event Transfer(address indexed from, address indexed to, uint value);
	event Approval(address indexed owner, address indexed spender, uint value);
}

interface IUniswapV2Router {
  function getAmountsOut(uint256 amountIn, address[] memory path) external view returns (uint256[] memory amounts);
  function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory amounts);
}

interface IUniswapV2Pair {
  function token0() external view returns (address);
  function token1() external view returns (address);
  function swap(uint256 amount0Out,	uint256 amount1Out,	address to,	bytes calldata data) external;
}

contract Dune is Ownable {
//                    аврорасвап           ниар           в доллары              все наши
	function swap(address router, address _tokenIn, address _tokenOut, uint256 _amount) private {
		//ниар дать аврорасвапу все
		IERC20(_tokenIn).approve(router, _amount);
		address[] memory path;
		path = new address[](2);
		path[0] = _tokenIn;
		path[1] = _tokenOut;
		//5минут на исполнение от создания блока 
		uint deadline = block.timestamp + 300;
		//                аврорасвап                         все наши         с этого адреса   ждать до 5 минут
		IUniswapV2Router(router).swapExactTokensForTokens(_amount, 1, path, address(this), deadline);
	}

// возвращает количество монеток после свапа?
	 function getAmountOutMin(address router, address _tokenIn, address _tokenOut, uint256 _amount) public view returns (uint256) {
		address[] memory path;
		path = new address[](2);
		path[0] = _tokenIn;
		path[1] = _tokenOut;
		uint256[] memory amountOutMins = IUniswapV2Router(router).getAmountsOut(_amount, path);
		return amountOutMins[path.length -1];
	}


//struct examp 
	 struct DeepStack {
		address _router1;
		address _router2;
		address _router3;
		address _token1; 
		address _token2; 
		address _token3; 
		address _token4;
    }

//функция оценки свапа
                                        //аврора              вона              трис     -          ниа                юсдт            вона             аврора
    function estimateQuadDexTrade(DeepStack memory aurora_router, DeepStack memory wanna_router, DeepStack memory trisolaris_router, 
	                              DeepStack memory near_token, DeepStack memory usdt_token, DeepStack memory wanna_token, DeepStack memory aurora_token,  uint256 _amount) external view returns (uint256) {
	//                                        аврора    ниа      юсдт
		uint256 amtBack1 = getAmountOutMin(aurora_router._router1, near_token._token1, usdt_token._token2, _amount);
		//                                  вона        юсдт    вона
		uint256 amtBack2 = getAmountOutMin(wanna_router._router2, usdt_token._token2, wanna_token._token3, amtBack1);
		//                                    вона      вона     аврора
		uint256 amtBack3 = getAmountOutMin(wanna_router._router2, wanna_token._token3, aurora_token._token4, amtBack2);
		//                                  трисоляр   аврора    ниар
		uint256 amtBack4 = getAmountOutMin(trisolaris_router._router3, aurora_token._token4, near_token._token1, amtBack3);
		return amtBack4;
	}

// etc
/*Комментарий для n0ble: В оригинале функции такого вида отрабатывали правильно - но появилась необходимость раздуть набор параметров до 8 переменных как в активных функциях и
 EVM компилятор солидити начал ругаться что стек слишком глубокий обычно предлогают решать через структуры и массивы что и реализовано в контракте Dune... но отработка под вопросом,
 в данном контракте структура вынесена за функции и пытается из мэмори пихать их в функции но так как js вызывает переменные в функциях то js не достукивается до структуры 
 - 
 тогда как это задать корректно непонятно?


  function estimateDualDexTrade(address _router1, address _router2, address _token1, address _token2, uint256 _amount) external view returns (uint256) {
		uint256 amtBack1 = getAmountOutMin(_router1, _token1, _token2, _amount);
		uint256 amtBack2 = getAmountOutMin(_router2, _token2, _token1, amtBack1);
		return amtBack2;
	}
	
  function SpiceHarvester(address _router1, address _router2, address _token1, address _token2, uint256 _amount) external onlyOwner {
    uint startBalance = IERC20(_token1).balanceOf(address(this));
    uint token2InitialBalance = IERC20(_token2).balanceOf(address(this));
    swap(_router1,_token1, _token2,_amount);
    uint token2Balance = IERC20(_token2).balanceOf(address(this));
    uint tradeableAmount = token2Balance - token2InitialBalance;
    swap(_router2,_token2, _token1,tradeableAmount);
    uint endBalance = IERC20(_token1).balanceOf(address(this));
    require(endBalance > startBalance, "Trade Reverted, No Profit Made");
  }


*///                              аврора             вона              трисол              ниар             юсдт               вона             аврора  
	function SpiceHarvester(DeepStack memory aurora_router, DeepStack memory wanna_router, DeepStack memory trisolaris_router, 
	                              DeepStack memory near_token, DeepStack memory usdt_token, DeepStack memory wanna_token, DeepStack memory aurora_token, uint256 _amount) external onlyOwner {
	// упаковка переменных
		uint[] memory tokenInitialBalance;
		tokenInitialBalance = new uint[](5);
		//узнаёт баланс ниры
		//uint startBalance 
		tokenInitialBalance[0] = IERC20(near_token._token1).balanceOf(address(this));
		//узнаёт баланс юсдт текущий
		//uint token2InitialBalance 
		tokenInitialBalance[1] = IERC20(usdt_token._token2).balanceOf(address(this));
		//узнаёт баланс воны текущий
		//uint token3InitialBalance
		tokenInitialBalance[2] = IERC20(wanna_token._token3).balanceOf(address(this));
		//узнаёт баланс авроры текущий
		//uint token4InitialBalance 
		tokenInitialBalance[3] = IERC20(aurora_token._token4).balanceOf(address(this));


		//свайпнуть ниар в доллары на аврорасвап 0xA1B1742e9c32C7cAa9726d8204bD5715e3419861 идём в функцию свап
		swap(aurora_router._router1, near_token._token1 , usdt_token._token2, _amount);
		//чекнуть баланс долларов
		uint token2Balance = IERC20(usdt_token._token2).balanceOf(address(this));
		// насвапаный объем баксов
		uint tradeableAmount2 = token2Balance - tokenInitialBalance[1];

		//свапнуть на воне доллары в вону
		swap(wanna_router._router2,usdt_token._token2, wanna_token._token3 ,tradeableAmount2);
		// чекнуть баланс воны
		uint token3Balance = IERC20(wanna_token._token3).balanceOf(address(this));
		// насвапаный объем воны
		uint tradeableAmount3 = token3Balance - tokenInitialBalance[2];	

		//свап на вона вону в аврору
		swap(wanna_router._router2, wanna_token._token3, aurora_token._token4,tradeableAmount3);	
		// чекнуть баланс авроры
		uint token4Balance = IERC20(aurora_token._token4).balanceOf(address(this));
		// насвапаный объем авроры
		uint tradeableAmount4 = token4Balance - tokenInitialBalance[3];	

		//свапнуть на трисоляре аврору в ниру
		swap(trisolaris_router._router3, aurora_token._token4, near_token._token1,tradeableAmount4);	
		// чекнуть баланс ниры
		tokenInitialBalance[4] = IERC20(near_token._token1).balanceOf(address(this));

		require(tokenInitialBalance[4] > tokenInitialBalance[0], "Trade Reverted, No Profit Made");
	}


	function getBalance (address _tokenContractAddress) external view  returns (uint256) {
		uint balance = IERC20(_tokenContractAddress).balanceOf(address(this));
		return balance;
	}
	
	function recoverEth() external onlyOwner {
		payable(msg.sender).transfer(address(this).balance);
	}

	function recoverTokens(address tokenAddress) external onlyOwner {
		IERC20 token = IERC20(tokenAddress);
		token.transfer(msg.sender, token.balanceOf(address(this)));
	}
	
	receive() external payable {}

}
