const { ethers } = require("hardhat");

async function main() {
    // Connect to the forked network
    const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");

    // Use a funded account from the forked network
    const [signer] = await ethers.getSigners();

    // Address of the WTON and DepositManager contract on mainnet
    const wtonAddress = "0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2";
    const depositManagerAddress = "0x76c01207959df1242c2824b4445cde48eb55d2f1";
    const layer2Address = "0x47e264ea9b229368aa90c331D3f4CBe0b4c0f01d"; // sWTON address

    // Your account address
    const accountAddress = signer.address;

    // Amount of WTON to set (in RAY, 27 decimals)
    const amount = ethers.utils.parseUnits("1000.0", 27); // 1000 WTON
    const amountToDeposit = ethers.utils.parseUnits("10.0", 27); // 10 WTON

    // Slot index for the balance mapping (usually 0 for ERC20 contracts)
    const balanceMappingSlot = 0;

    // Calculate the storage slot for the balance mapping
    const balanceSlot = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
            ["uint256", "uint256"],
            [accountAddress, balanceMappingSlot]
        )
    );

    // Set the storage slot to the desired balance
    await provider.send("hardhat_setStorageAt", [
        wtonAddress,
        balanceSlot,
        ethers.utils.hexZeroPad(amount.toHexString(), 32)
    ]);

    // Verify the storage value
    const storageValue = await provider.getStorageAt(wtonAddress, balanceSlot);

    // ABI for WTON contract
    const wtonABI = [
        "function balanceOf(address account) external view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) external view returns (uint256)"
    ];

    // ABI for DepositManager contract
    const depositManagerABI = [
        "function deposit(address layer2, uint256 amount) external returns (bool)"
    ];

    // Create contract instances
    const wton = new ethers.Contract(wtonAddress, wtonABI, signer);
    const depositManager = new ethers.Contract(depositManagerAddress, depositManagerABI, signer);

    const balance = await wton.balanceOf(accountAddress);
    console.log("WTON balance:", ethers.utils.formatUnits(balance, 27));

    const allowance = await wton.allowance(accountAddress, depositManagerAddress);
    console.log("WTON allowance:", ethers.utils.formatUnits(allowance, 27));

    // Approve the DepositManager contract to spend my WTON
    const approveTx = await wton.approve(depositManagerAddress, amountToDeposit, {
        gasLimit: 1000000, // Set a high gas limit
        maxFeePerGas: ethers.utils.parseUnits('50', 'gwei'), // Adjust this value as needed
        maxPriorityFeePerGas: ethers.utils.parseUnits('2', 'gwei') // Adjust this value as needed
    });
    await approveTx.wait();
    console.log("Approved DepositManager to spend WTON");



}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
