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

    // Check deployer balance
    const balance = await deployer.getBalance();
    console.log("Deployer balance:", ethers.utils.formatEther(balance));

    // Wrap ETH into WETH
    await wrapEth(10); // Wrap 10 ETH into WETH
    console.log("WETH conversion successful");

    // Convert WETH to WTON
    await convertWethToWton(10); // Convert 10 WETH to WTON
    console.log("Conversion successful");

    // Get the WTON token contract
    const WTONAbi = JSON.parse(fs.readFileSync(path.join(__dirname, "../abis/IERC20.json"), "utf8"));
    const WTON = await ethers.getContractAt(WTONAbi, "0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2");

    // Log the WTON balance
    const wtonBalance = await WTON.balanceOf(deployer.address);
    console.log("WTON balance:", ethers.utils.formatUnits(wtonBalance, 27));

    // Approve the DepositManager contract to spend WTON
    const depositManagerAddress = "0x0b58ca72b12f01fc05f8f252e226f3e2089bd00e";
    const amountToDeposit = ethers.utils.parseUnits("10000", 27); // 10000 WTON
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
    console.log("Deposit transaction hash:", depositTx.hash);
    await depositTx.wait();

    // Fetch the SeigManager contract address from the DepositManager contract
    const seigManagerAddress = "0x0b55a0f463b6defb81c6063973763951712d0e5f";
    const seigManagerAbi = JSON.parse(fs.readFileSync(path.join(__dirname, "../abis/SeigManager.json"), "utf8"));
    const seigManager = await ethers.getContractAt(seigManagerAbi, seigManagerAddress);

    // Fetch the coinage contract address for the layer2 address
    const coinageAddress = await seigManager.coinages(layer2Address);
    if (coinageAddress === ethers.constants.AddressZero) {
        console.error("Coinage for the selected Layer2 address has not been deployed.");
        return;
    }

    // Get the coinage contract
    const coinageAbi = JSON.parse(fs.readFileSync(path.join(__dirname, "../abis/RefactorCoinageSnapshotI.json"), "utf8"));
    const coinage = await ethers.getContractAt(coinageAbi, coinageAddress);

    // Fetch and log the balance of the deployer in the coinage contract
    const coinageBalance = await coinage.balanceOf(deployer.address);
    console.log("Coinage balance of user:", ethers.utils.formatUnits(coinageBalance, 27));

    console.log("Deposit and mint successful for Layer2 address:", layer2Address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
