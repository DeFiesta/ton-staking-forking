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
    const [deployer, addr1] = await ethers.getSigners();

    console.log("----------------------------------------------------------------------------------------")
    console.log("---------------------------     INITIAL BALANCE     -----------------------------------")
    console.log("----------------------------------------------------------------------------------------")

    // Check deployer balance
    const balance = await deployer.getBalance();
    console.log("user ETH balance:", ethers.utils.formatEther(balance));

    console.log("----------------------------------------------------------------------------------------")
    console.log("--------------------     ETH TO WETH USING UNISWAP ROUTER     --------------------------")
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
    console.log("--------------------     WETH TO WTON USING UNISWAP ROUTER     -------------------------")
    console.log("----------------------------------------------------------------------------------------")

    // Convert WETH to WTON
    await convertWethToWton(2000); // Convert 2000 WETH to WTON
    console.log("Conversion successful");

    const secondNewBalance = await deployer.getBalance();
    console.log("user ETH balance:", ethers.utils.formatEther(secondNewBalance));

    // Get the WTON token contract
    const WTONAbi = JSON.parse(fs.readFileSync(path.join(__dirname, "../abis/WTON.json"), "utf8"));
    const WTON = await ethers.getContractAt(WTONAbi, "0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2");

    // Log the WETH balance
    const newWethBalance = await WETH.balanceOf(deployer.address);
    console.log("user WETH balance:", ethers.utils.formatEther(newWethBalance));
    const WtonBalance = await WTON.balanceOf(deployer.address);
    console.log("user WTON balance:", ethers.utils.formatUnits(WtonBalance, 27));

    console.log("----------------------------------------------------------------------------------------")
    console.log("---------------------------     SWAP FROM WTON TO TON     ------------------------------")
    console.log("----------------------------------------------------------------------------------------")

    // Get the WTON token contract
    const TONAbi = JSON.parse(fs.readFileSync(path.join(__dirname, "../abis/TON.json"), "utf8"));
    const TON = await ethers.getContractAt(TONAbi, "0x2be5e8c109e2197D077D13A82dAead6a9b3433C5");
    const TonBalanceBefore = await TON.balanceOf(deployer.address);
    console.log("user TON balance before swap:", ethers.utils.formatUnits(TonBalanceBefore, 18));

    // Swap from WTON to TON
    const swapToTon = await WTON.swapToTON(WtonBalance); // Ensure to use the correct function name
    await swapToTon.wait();
    const TonBalanceAfter = await TON.balanceOf(deployer.address);
    console.log("user TON balance after swap:", ethers.utils.formatUnits(TonBalanceAfter, 18));

    console.log("----------------------------------------------------------------------------------------")
    console.log("---------------------     TRANSFER TON TOKEN TO NEW USER     ---------------------------")
    console.log("----------------------------------------------------------------------------------------")

    // Approve the TON contract to spend the tokens
    const approveTx = await TON.approve(addr1.address, TonBalanceAfter);
    await approveTx.wait();

    // Transfer TON tokens from deployer to addr1
    const transferTx = await TON.transferFrom(deployer.address, addr1.address, TonBalanceAfter);
    await transferTx.wait();

    const DeployerTonBalance = await TON.balanceOf(deployer.address);
    console.log("user TON balance after transfer:", ethers.utils.formatUnits(DeployerTonBalance, 18));

    const Addr1TonBalance = await TON.balanceOf(addr1.address);
    console.log("New user TON balance after transfer:", ethers.utils.formatUnits(Addr1TonBalance, 18));

    console.log("----------------------------------------------------------------------------------------")
    console.log("------------------------------     END OF SCRIPT     -----------------------------------")
    console.log("----------------------------------------------------------------------------------------")
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
