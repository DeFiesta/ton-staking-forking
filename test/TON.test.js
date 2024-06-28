const { expect } = require("chai");
const { ethers } = require("hardhat");
const chai = require("chai");
const { solidity } = require("ethereum-waffle");

chai.use(solidity);
chai.use(require("chai-as-promised"));

describe("TON Contract", function () {
    let TON, ton, owner, addr1, addr2;

    beforeEach(async function () {
        // Get the ContractFactory and Signers here.
        TON = await ethers.getContractFactory("TON");
        [owner, addr1, addr2, _] = await ethers.getSigners();

        // Deploy the contract
        ton = await TON.deploy();
        await ton.deployed();

        // Mint some tokens to addr1
        await ton.mint(addr1.address, ethers.utils.parseEther("1000"));
    });

    it("should revert transferFrom if caller is not sender or recipient", async function () {
        await ton.connect(addr1).approve(addr2.address, ethers.utils.parseEther("100"));

        await expect(
            ton.connect(owner).transferFrom(addr1.address, addr2.address, ethers.utils.parseEther("100"))
        ).to.be.revertedWith("SeigToken: only sender or recipient can transfer");
    });

    it("should allow transferFrom if caller is sender", async function () {
        await ton.connect(addr1).approve(addr1.address, ethers.utils.parseEther("100"));

        await expect(
            ton.connect(addr1).transferFrom(addr1.address, addr2.address, ethers.utils.parseEther("100"))
        ).to.emit(ton, "Transfer").withArgs(addr1.address, addr2.address, ethers.utils.parseEther("100"));
    });

    it("should allow transferFrom if caller is recipient", async function () {
        await ton.connect(addr1).approve(addr2.address, ethers.utils.parseEther("100"));

        await expect(
            ton.connect(addr2).transferFrom(addr1.address, addr2.address, ethers.utils.parseEther("100"))
        ).to.emit(ton, "Transfer").withArgs(addr1.address, addr2.address, ethers.utils.parseEther("100"));
    });
});
