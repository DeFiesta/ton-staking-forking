const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function wrapEth(amountInEth) {
    const [deployer] = await ethers.getSigners();
    const WETHAbi = JSON.parse(fs.readFileSync(path.join(__dirname, "../abis/WETH.json"), "utf8"));
    const WETHAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; // Mainnet WETH address
    const WETH = await ethers.getContractAt(WETHAbi, WETHAddress);

    const amountInWei = ethers.utils.parseEther(amountInEth.toString());
    const tx = await WETH.deposit({ value: amountInWei });
    await tx.wait();
}

async function convertWethToWton(amountInWeth) {
    const [deployer] = await ethers.getSigners();
    const swapRouterAbi = JSON.parse(fs.readFileSync(path.join(__dirname, "../abis/ISwapRouter.json"), "utf8"));
    const swapRouterAddress = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"; // Mainnet SwapRouter address
    const swapRouter = await ethers.getContractAt(swapRouterAbi, swapRouterAddress);

    const WETHAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; // Mainnet WETH address
    const WTON_ADDRESS = "0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2";
    const amountInWei = ethers.utils.parseEther(amountInWeth.toString());

    // Approve the SwapRouter contract to spend WETH
    const WETHAbi = JSON.parse(fs.readFileSync(path.join(__dirname, "../abis/IERC20.json"), "utf8"));
    const WETH = await ethers.getContractAt(WETHAbi, WETHAddress);
    const approveTx = await WETH.approve(swapRouterAddress, amountInWei);
    await approveTx.wait();

    const params = {
        tokenIn: WETHAddress,
        tokenOut: WTON_ADDRESS,
        fee: 3000,
        recipient: deployer.address,
        deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current Unix time
        amountIn: amountInWei,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0,
    };

    try {
        const tx = await swapRouter.exactInputSingle(params);
        await tx.wait();
    } catch (error) {
        console.error("Swap failed:", error);
    }
}

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("----------------------------------------------------------------------------------------")
    console.log("---------------------------------INITIAL BALANCE ---------------------------------------")
    console.log("----------------------------------------------------------------------------------------")

    // Check deployer balance
    const balance = await deployer.getBalance();
    console.log("user ETH balance:", ethers.utils.formatEther(balance));

    console.log("----------------------------------------------------------------------------------------")
    console.log("-------------------------ETH TO WETH USING UNISWAP ROUTER-------------------------------")
    console.log("----------------------------------------------------------------------------------------")

    // Wrap ETH into WETH
    await wrapEth(2000); // Wrap 2000 ETH into WETH
    console.log("WETH conversion successful");

    const firstNewBalance = await deployer.getBalance();
    console.log("user ETH balance:", ethers.utils.formatEther(firstNewBalance));

    // Get the WETH token contract
    const WETHAbi = JSON.parse(fs.readFileSync(path.join(__dirname, "../abis/WETH.json"), "utf8"));
    const WETH = await ethers.getContractAt(WETHAbi, "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");

    // Log the WETH balance
    const wethBalance = await WETH.balanceOf(deployer.address);
    console.log("user WETH balance:", ethers.utils.formatEther(wethBalance));

    console.log("----------------------------------------------------------------------------------------")
    console.log("-------------------------WETH TO WTON USING UNISWAP ROUTER------------------------------")
    console.log("----------------------------------------------------------------------------------------")

    // Convert WETH to WTON
    await convertWethToWton(2000); // Convert 2000 WETH to WTON
    console.log("Conversion successful");

    const secondNewBalance = await deployer.getBalance();
    console.log("user ETH balance:", ethers.utils.formatEther(secondNewBalance));

    // Get the WTON token contract
    const WTONAbi = JSON.parse(fs.readFileSync(path.join(__dirname, "../abis/IERC20.json"), "utf8"));
    const WTON = await ethers.getContractAt(WTONAbi, "0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2");

    // Log the WETH balance
    const newWethBalance = await WETH.balanceOf(deployer.address);
    console.log("user WETH balance:", ethers.utils.formatEther(newWethBalance));
    const WtonBalance = await WTON.balanceOf(deployer.address);
    console.log("user WTON balance:", ethers.utils.formatUnits(WtonBalance, 27));


    // Approve the DepositManager contract to spend WTON
    const depositManagerAddress = "0x0b58ca72b12f01fc05f8f252e226f3e2089bd00e";
    const amountToDeposit = ethers.utils.parseUnits("100000", 27); // 100000 WTON
    const approveTx = await WTON.approve(depositManagerAddress, amountToDeposit);
    await approveTx.wait();

    // Get the DepositManager contract
    const depositManagerAbi = JSON.parse(fs.readFileSync(path.join(__dirname, "../abis/DepositManager.json"), "utf8"));
    const depositManager = await ethers.getContractAt(depositManagerAbi, depositManagerAddress);

    // Check if the deposit function exists
    if (typeof depositManager["deposit(address,uint256)"] !== "function") {
        console.error("Deposit function not found in DepositManager contract");
        console.log("Available functions:", Object.keys(depositManager.functions));
        return;
    }

    // layer2address corresponds to the candidatesProxy
    const layer2Address = "0x06D34f65869Ec94B3BA8c0E08BCEb532f65005E2";

    // Call the deposit function
    const depositTx = await depositManager["deposit(address,uint256)"](layer2Address, amountToDeposit);
    await depositTx.wait();

    console.log("----------------------------------------------------------------------------------------")
    console.log("-----------------------USER'S NEW BALANCE AFTER DEPOSITING------------------------------")
    console.log("----------------------------------------------------------------------------------------")


    // Fetch the SeigManager contract address from the DepositManager contract
    const seigManagerAddress = "0x0b55a0f463b6defb81c6063973763951712d0e5f";
    const seigManagerAbi = JSON.parse(fs.readFileSync(path.join(__dirname, "../abis/SeigManager.json"), "utf8"));
    const seigManager = await ethers.getContractAt(seigManagerAbi, seigManagerAddress);

    // Fetch the coinage contract address for the layer2 address
    const coinageAddress = await seigManager.coinages(layer2Address);
    console.log("coinage address:", coinageAddress);
    if (coinageAddress === ethers.constants.AddressZero) {
        console.error("Coinage for the selected Layer2 address has not been deployed.");
        return;
    }

    // Get the coinage contract
    const coinageAbi = JSON.parse(fs.readFileSync(path.join(__dirname, "../abis/RefactorCoinageSnapshotI.json"), "utf8"));
    const coinage = await ethers.getContractAt(coinageAbi, coinageAddress);

    // Fetch and log the balance of the deployer in the coinage contract
    const coinageBalance = await coinage.balanceOf(deployer.address);
    console.log("user sWTON balance:", ethers.utils.formatUnits(coinageBalance, 27));
    const newWtonBalance = await WTON.balanceOf(deployer.address);
    console.log("user WTON balance:", ethers.utils.formatUnits(newWtonBalance, 27));

    console.log("Deposit successful");


    console.log("----------------------------------------------------------------------------------------")
    console.log("--------------UPDATE SEIGNIORAGE AFTER A LARGE AMOUNT OF BLOCKS ------------------------")
    console.log("----------------------------------------------------------------------------------------")

    // Mine a large amount of blocks (around 150 days)
    await ethers.provider.send("hardhat_mine", ["0xf4240"]); // 0xf4240 is the hexadecimal representation of 1.000.000

    // Set the balance of the Layer2 address to cover gas fees
    const ethToSet = ethers.utils.parseEther("10.0"); // 10 ETH
    await ethers.provider.send("hardhat_setBalance", [
        layer2Address,
        ethToSet.toHexString()
    ]);

    // Impersonate the Layer2 address
    await ethers.provider.send("hardhat_impersonateAccount", [layer2Address]);
    const layer2Signer = await ethers.getSigner(layer2Address);

    // Call the updateSeigniorage function from the Layer2 address
    const updateSeigniorageTx = await seigManager.connect(layer2Signer).updateSeigniorage();
    await updateSeigniorageTx.wait();
    console.log("Seigniorage updated successfully");

    // Fetch and log the user's sWTON balance after the updateSeigniorage process
    const updatedCoinageBalance = await coinage.balanceOf(deployer.address);
    console.log("user sWTON balance after updateSeigniorage:", ethers.utils.formatUnits(updatedCoinageBalance, 27));

    // Stop impersonating the Layer2 address
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [layer2Address]);

    console.log("----------------------------------------------------------------------------------------")
    console.log("---------------------------USER DIRECTLY BURNS HIS sWTON -------------------------------")
    console.log("----------------------------------------------------------------------------------------")

    const amountToBurn = updatedCoinageBalance;

    // Check the user's sWTON balance before burning
    const userBalanceBeforeBurn = await coinage.balanceOf(deployer.address);
    console.log("User sWTON balance before burning:", ethers.utils.formatUnits(userBalanceBeforeBurn, 27));

    const burnUserToken = await coinage.burn(amountToBurn);
    await burnUserToken.wait();


    // Fetch and log the user's sWTON balance after burning
    const updatedCoinageBalance2 = await coinage.balanceOf(deployer.address);
    console.log("user sWTON balance after burning:", ethers.utils.formatUnits(updatedCoinageBalance2, 27));
    const accStakedAccount = await depositManager.accStakedAccount(deployer.address);
    console.log("user _accStakedAccount balance after burning:", ethers.utils.formatUnits(accStakedAccount, 27));
    const userWtonBalance = await WTON.balanceOf(deployer.address);
    console.log("user WTON balance after burning:", ethers.utils.formatUnits(userWtonBalance, 27));

    console.log("----------------------------------------------------------------------------------------")
    console.log("------------------------USER REQUESTS 20000 WTON WITHDRAWAL ----------------------------")
    console.log("----------------------------------------------------------------------------------------")

    // Call the requestWithdrawal function
    const requestWithdrawalTx = await depositManager.requestWithdrawal(layer2Address, 20000);
    await requestWithdrawalTx.wait();
    console.log("Withdrawal requested successfully");


    // Mine a large amount of blocks to cover the DTD
    await ethers.provider.send("hardhat_mine", ["0xf4240"]); // 0xf4240 is the hexadecimal representation of 1.000.000


    const requestProcessTx = await depositManager.processRequest(layer2Address, false);
    await requestProcessTx.wait();
    console.log("Withdrawal processed successfully");

    // Fetch and log the user's WTON balance after processing the withdrawal
    const finalWtonBalance = await WTON.balanceOf(deployer.address);
    console.log("user WTON balance after processing withdrawal:", ethers.utils.formatUnits(finalWtonBalance, 27));


    console.log("----------------------------------------------------------------------------------------")
    console.log("-----------------------------------END OF SCRIPT--------------------------------------")
    console.log("----------------------------------------------------------------------------------------")


}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

