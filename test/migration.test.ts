import hre from "hardhat";
import { assert } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { deployMigrator, deployOldToken, deployNewToken, deployAffiliate, deployMembership } from "./fixtures";


describe("PoXMigration deploy", function () {
  it("should deploy the contract with the proper owner", async function () {
    // Load the contract instance using the fixture function
    const { myMigration } = await loadFixture(deployMigrator);

    const [deployerWallet] = await hre.viem.getWalletClients();

    // validate the owner
    const owner = await myMigration.read.owner();
    assert.equal(owner.toLowerCase(), deployerWallet.account.address.toLowerCase());
  });
  it("should be initialized with the proper values", async function () {
  //load the fixtures for the token, the membership and the affiliates
  const { myMigration } = await loadFixture(deployMigrator);
  })
  it("should not be started", async function () {
    // Load the contract instance using the fixture function
    const { myMigration } = await loadFixture(deployMigrator);

    //check that the migration is not started
    const started = await myMigration.read.isMigrationActive();
    assert.isFalse(started);
  });

  it("should be able to start", async function () {
    // Load the contract instance using the fixture function
    const { myMigration } = await loadFixture(deployMigrator);
    const [deployerWallet, depositerWallet] = await hre.viem.getWalletClients();

    // the owner should be able to start the migration
    await myMigration.write.startMigration();

    // check that the migration is started
    const started = await myMigration.read.isMigrationActive();
    assert.isTrue(started);
  })

  it("shouldn't be able to start if not owner", async function () {
    // Load the contract instance using the fixture function
    const { myMigration } = await loadFixture(deployMigrator);
    const [deployerWallet, depositerWallet] = await hre.viem.getWalletClients();

    // import the contract with the depositerWallet
    const myMigrationDepositer = await hre.viem.getContractAt("PoXMigration", myMigration.address, { walletClient: depositerWallet});

    // Attempt to start the migration in the myMigrationDepositers contract, and capture the rpc error that is thrown to validate Ownable
    let error: any;
    try {
      await myMigrationDepositer.write.startMigration();
    } catch (err) {
      // assert that the error is OwnableUnauthorizedAccount with the proper address
      error = err;
    }
    assert.isTrue(error.message.includes("OwnableUnauthorizedAccount"));
  })
});

describe("PoXMigration process", function () {
  it("should be able to deposit if the value is 4000 tokens", async function () {
    // Load the contract instance using the fixture function
    const { myMigration } = await loadFixture(deployMigrator);
    const { myOldToken } = await loadFixture(deployOldToken)
    const { myNewToken } = await loadFixture(deployNewToken)
    const { myMembership } = await loadFixture(deployMembership)
    const { myAffiliate } = await loadFixture(deployAffiliate)
    const [deployerWallet] = await hre.viem.getWalletClients();

    // set the myOldToken as the Euler Token in the migration contract
    await myMigration.write.initialize([myOldToken.address, myNewToken.address, myMembership.address, myAffiliate.address]);

    // create a bigint for 4000 tokens with 18 decimals
    const amount = BigInt(4000) * BigInt(10 ** 18);

    // the owner should be able to start the migration
    await myMigration.write.startMigration();

    // check that the migration is started
    const started = await myMigration.read.isMigrationActive();
    assert.isTrue(started);

    // exclude the migration contract from the transfer fee
    await myOldToken.write.excludeAccount([myMigration.address]);

    // approve the migration to spend the tokens
    await myOldToken.write.approve([myMigration.address, amount]);

    // deposit the tokens in the migration contract
    await myMigration.write.deposit([amount]);

    // check the token balance of the migration contract
    const balance = await myOldToken.read.balanceOf([myMigration.address]);

    assert.equal(balance, amount);

    // check the balance of the user in the migration contract
    const userBalance = await myMigration.read.getUserInfo([deployerWallet.account.address]);
    assert.equal(userBalance.deposited, amount);
  })
  it("should not be able to deposit if the value is less than 4000 tokens", async function () {
    // Load the contract instance using the fixture function
    const { myMigration } = await loadFixture(deployMigrator);
    const { myOldToken } = await loadFixture(deployOldToken)
    const { myNewToken } = await loadFixture(deployNewToken)
    const { myMembership } = await loadFixture(deployMembership)
    const { myAffiliate } = await loadFixture(deployAffiliate)
    const [deployerWallet] = await hre.viem.getWalletClients();

    // set the myOldToken as the Euler Token in the migration contract
    await myMigration.write.initialize([myOldToken.address, myNewToken.address, myMembership.address, myAffiliate.address]);

    // create a bigint for 4000 tokens with 18 decimals
    const amount = BigInt(1000) * BigInt(10 ** 18);

    // the owner should be able to start the migration
    await myMigration.write.startMigration();

    // check that the migration is started
    const started = await myMigration.read.isMigrationActive();
    assert.isTrue(started);

    // exclude the migration contract from the transfer fee
    await myOldToken.write.excludeAccount([myMigration.address]);

    // approve the migration to spend the tokens
    await myOldToken.write.approve([myMigration.address, amount]);

    // deposit the tokens in the migration contract
    try {
      await myMigration.write.deposit([amount]);
    } catch (err: any) {
      assert.isTrue(err.message.includes("The minimum deposit amount is 4000 tokens!"));
    }
  })
  it("should be able to redeposit to get additional rewards", async function () {
    // Load the contract instance using the fixture function
    const { myMigration } = await loadFixture(deployMigrator);
    const { myOldToken } = await loadFixture(deployOldToken)
    const { myNewToken } = await loadFixture(deployNewToken)
    const { myMembership } = await loadFixture(deployMembership)
    const { myAffiliate } = await loadFixture(deployAffiliate)
    const [deployerWallet] = await hre.viem.getWalletClients();

    // set the myOldToken as the Euler Token in the migration contract
    await myMigration.write.initialize([myOldToken.address, myNewToken.address, myMembership.address, myAffiliate.address]);

    // create a bigint for 4000 tokens with 18 decimals
    const amount = BigInt(4000) * BigInt(10 ** 18);

    // the owner should be able to start the migration
    await myMigration.write.startMigration();

    // check that the migration is started
    const started = await myMigration.read.isMigrationActive();
    assert.isTrue(started);

    // exclude the migration contract from the transfer fee
    await myOldToken.write.excludeAccount([myMigration.address]);

    // approve the migration to spend the tokens
    await myOldToken.write.approve([myMigration.address, amount]);

    // deposit the tokens in the migration contract
    await myMigration.write.deposit([amount]);

    // deposit 1000 more tokens
    const amount2 = BigInt(1000) * BigInt(10 ** 18);
    await myOldToken.write.approve([myMigration.address, amount2]);
    await myMigration.write.deposit([amount2]);

    // check the token balance of the migration contract
    const balance = await myOldToken.read.balanceOf([myMigration.address]);

    assert.equal(balance, amount + amount2);

    // check the balance of the user in the migration contract
    const userBalance = await myMigration.read.getUserInfo([deployerWallet.account.address]);
    assert.equal(userBalance.deposited, amount + amount2);
  })
  it("should be able to receive the new token when claimed", async function () {
    // Load the contract instance using the fixture function
    const { myMigration } = await loadFixture(deployMigrator);
    const { myOldToken } = await loadFixture(deployOldToken)
    const { myNewToken } = await loadFixture(deployNewToken)
    const { myMembership } = await loadFixture(deployMembership)
    const { myAffiliate } = await loadFixture(deployAffiliate)
    const [deployerWallet] = await hre.viem.getWalletClients();

    // set the myOldToken as the Euler Token in the migration contract
    await myMigration.write.initialize([myOldToken.address, myNewToken.address, myMembership.address, myAffiliate.address]);

    // authorize the myMigration contract to mint and transfer from the new token
    await myNewToken.write.grantRole([await myNewToken.read.MINTER_ROLE(), myMigration.address]);

    // create a bigint for 4000 tokens with 18 decimals
    const amount = BigInt(4000) * BigInt(10 ** 18);

    // the owner should be able to start the migration
    await myMigration.write.startMigration();

    // check that the migration is started
    const started = await myMigration.read.isMigrationActive();
    assert.isTrue(started);

    // exclude the migration contract from the transfer fee
    await myOldToken.write.excludeAccount([myMigration.address]);

    // approve the migration to spend the tokens
    await myOldToken.write.approve([myMigration.address, amount]);

    // deposit the tokens in the migration contract
    await myMigration.write.deposit([amount]);

    // check the token balance of the migration contract
    const balance = await myOldToken.read.balanceOf([myMigration.address]);

    assert.equal(balance, amount);

    // check the balance of the user in the migration contract
    const userBalance = await myMigration.read.getUserInfo([deployerWallet.account.address]);
    assert.equal(userBalance.deposited, amount);

    // mine 256 blocks
    await hre.network.provider.send("hardhat_mine", ["0x100"]);

    // claim the new tokens for the user
    await myMigration.write.claimTokens();

    // get the balance of the new token
    const newTokenBalance = await myNewToken.read.balanceOf([deployerWallet.account.address]);
    assert.equal(newTokenBalance, amount);
  })
  it("should be able to receive the memberships when claimed", async function () {
    // Load the contract instance using the fixture function
    const { myMigration } = await loadFixture(deployMigrator);
    const { myOldToken } = await loadFixture(deployOldToken)
    const { myNewToken } = await loadFixture(deployNewToken)
    const { myMembership } = await loadFixture(deployMembership)
    const { myAffiliate } = await loadFixture(deployAffiliate)
    const [deployerWallet] = await hre.viem.getWalletClients();

    // set the myOldToken as the Euler Token in the migration contract
    await myMigration.write.initialize([myOldToken.address, myNewToken.address, myMembership.address, myAffiliate.address]);

    // Send all the memberships to the migration contract
    await myMembership.write.safeBatchTransferFrom([deployerWallet.account.address, myMigration.address, [BigInt(0)], [BigInt(1)], "0x"]);

    // authorize the myMigration contract to mint and transfer from the new token
    await myNewToken.write.grantRole([await myNewToken.read.MINTER_ROLE(), myMigration.address]);
    await myMembership.write.grantRole([await myMembership.read.DEFAULT_ADMIN_ROLE(), myMigration.address]);
    await myMembership.write.grantRole([await myMembership.read.MINTER_ROLE(), myMigration.address]);

    // create a bigint for 4000 tokens with 18 decimals
    const amount = BigInt(4000) * BigInt(10 ** 18);

    // the owner should be able to start the migration
    await myMigration.write.startMigration();
    await myMigration.write.initializeMemberships();

    // check that the migration is started
    const started = await myMigration.read.isMigrationActive();
    assert.isTrue(started);

    // exclude the migration contract from the transfer fee
    await myOldToken.write.excludeAccount([myMigration.address]);

    // approve the migration to spend the tokens
    await myOldToken.write.approve([myMigration.address, amount]);

    // deposit the tokens in the migration contract
    await myMigration.write.deposit([amount]);

    // check the token balance of the migration contract
    const balance = await myOldToken.read.balanceOf([myMigration.address]);

    assert.equal(balance, amount);

    // check the balance of the user in the migration contract
    const userBalance = await myMigration.read.getUserInfo([deployerWallet.account.address]);
    assert.equal(userBalance.deposited, amount);

    // approve the migration to spend the memberships
    await myMembership.write.setApprovalForAll([myMigration.address, true]);
    await myMembership.write.setApprovalForAll([deployerWallet.account.address, true]);

    // mine 256 blocks
    await hre.network.provider.send("hardhat_mine", ["0x100"]);

    // check the balance of nfts in the migration contract
    const nftBalance = await myMembership.read.balanceOf([myMigration.address, BigInt(0)]);
    console.log(nftBalance.toString())

    // claim the new tokens for the user
    await myMigration.write.claimMemberships();

    // get the balance of the new token
    const membershipsBalance = await myMembership.read.balanceOf([deployerWallet.account.address, BigInt(0)]);
    // convert the membershipbalance to number
    const membershipsBalanceNumber = Number(membershipsBalance.toString());
    assert.equal(1, membershipsBalanceNumber);
  })
});