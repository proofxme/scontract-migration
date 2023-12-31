import hre from "hardhat";
import { assert } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { deployAffiliate, deployMembership, deployMigrator, deployNewToken, deployOldToken } from "./fixtures";


describe("PoXMigration Affiliate Program", function () {
  it("should be able to receive the affiliates when claimed", async function () {
    // Load the contract instance using the fixture function
    const {myMigration} = await loadFixture(deployMigrator);
    const {myOldToken} = await loadFixture(deployOldToken)
    const {myNewToken} = await loadFixture(deployNewToken)
    const {myMembership} = await loadFixture(deployMembership)
    const {myAffiliate} = await loadFixture(deployAffiliate)
    const [deployerWallet] = await hre.viem.getWalletClients();

    // set the myOldToken as the Euler Token in the migration contract
    await myMigration.write.initialize([myOldToken.address, myNewToken.address, myMembership.address, myAffiliate.address]);

    // authorize the myMigration contract to mint and transfer from the new token
    await myNewToken.write.grantRole([await myNewToken.read.MINTER_ROLE(), myMigration.address]);

    await myMembership.write.grantRole([await myMembership.read.DEFAULT_ADMIN_ROLE(), myMigration.address]);
    await myMembership.write.grantRole([await myMembership.read.MINTER_ROLE(), myMigration.address]);

    await myAffiliate.write.grantRole([await myAffiliate.read.DEFAULT_ADMIN_ROLE(), myMigration.address]);
    await myAffiliate.write.grantRole([await myAffiliate.read.MINTER_ROLE(), myMigration.address]);

    // calculate 8 memberships to be claimed each one costing 4000
    const affiliatesToClaim = 2;
    const membershipsCost = 40000

    // create a bigint for 4000 tokens with 18 decimals
    const amount = BigInt(affiliatesToClaim * membershipsCost) * BigInt(10 ** 18);

    // the owner should be able to start the migration
    await myMigration.write.startMigration();
    await myMigration.write.startAffiliateMigration();

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
    await myMigration.write.claimAffiliates();
    const userInfo2 = await myMigration.read.getUserInfo([deployerWallet.account.address]);

    // check the balance of the affiliates for the user in the migration contract userinfo
    const userBalance2 = await myMigration.read.getUserInfo([deployerWallet.account.address]);
    assert.equal(userBalance2.mintedAffiliates, BigInt(1));
  })
  it("should be able to deposit additional tokens to get another affiliate", async function () {
    // Load the contract instance using the fixture function
    const {myMigration} = await loadFixture(deployMigrator);
    const {myOldToken} = await loadFixture(deployOldToken)
    const {myNewToken} = await loadFixture(deployNewToken)
    const {myMembership} = await loadFixture(deployMembership)
    const {myAffiliate} = await loadFixture(deployAffiliate)
    const [deployerWallet] = await hre.viem.getWalletClients();

    // set the myOldToken as the Euler Token in the migration contract
    await myMigration.write.initialize([myOldToken.address, myNewToken.address, myMembership.address, myAffiliate.address]);

    // authorize the myMigration contract to mint and transfer from the new token
    await myNewToken.write.grantRole([await myNewToken.read.MINTER_ROLE(), myMigration.address]);

    await myMembership.write.grantRole([await myMembership.read.DEFAULT_ADMIN_ROLE(), myMigration.address]);
    await myMembership.write.grantRole([await myMembership.read.MINTER_ROLE(), myMigration.address]);

    await myAffiliate.write.grantRole([await myAffiliate.read.DEFAULT_ADMIN_ROLE(), myMigration.address]);
    await myAffiliate.write.grantRole([await myAffiliate.read.MINTER_ROLE(), myMigration.address]);

    // calculate 8 memberships to be claimed each one costing 4000
    const affiliatesToClaim = 1;
    const membershipsCost = 40000

    // create a bigint for 4000 tokens with 18 decimals
    const amount = BigInt(affiliatesToClaim * membershipsCost) * BigInt(10 ** 18);

    // the owner should be able to start the migration
    await myMigration.write.startMigration();
    await myMigration.write.startAffiliateMigration();

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
    await myMigration.write.claimAffiliates();
    const userInfo2 = await myMigration.read.getUserInfo([deployerWallet.account.address]);

    // check the balance of the affiliates for the user in the migration contract userinfo
    const userBalance2 = await myMigration.read.getUserInfo([deployerWallet.account.address]);
    assert.equal(userBalance2.mintedAffiliates, BigInt(1));

    // deposit additional 40000 tokens to get another affiliate
    await myOldToken.write.approve([myMigration.address, amount]);
    await myMigration.write.deposit([amount]);
    //wait 100 blocks
    await hre.network.provider.send("hardhat_mine", ["0x100"]);

    // claim the new affiliate
    await myMigration.write.claimAffiliates();

    const userInfo3 = await myMigration.read.getUserInfo([deployerWallet.account.address]);
    assert.equal(userInfo3.mintedAffiliates, BigInt(affiliatesToClaim + 1));
  })
  it("should have the proper uri", async function () {
    // Load the contract instance using the fixture function
    const {myMigration} = await loadFixture(deployMigrator);
    const {myOldToken} = await loadFixture(deployOldToken)
    const {myNewToken} = await loadFixture(deployNewToken)
    const {myMembership} = await loadFixture(deployMembership)
    const {myAffiliate} = await loadFixture(deployAffiliate)
    const [deployerWallet] = await hre.viem.getWalletClients();

    // set the myOldToken as the Euler Token in the migration contract
    await myMigration.write.initialize([myOldToken.address, myNewToken.address, myMembership.address, myAffiliate.address]);

    // authorize the myMigration contract to mint and transfer from the new token
    await myNewToken.write.grantRole([await myNewToken.read.MINTER_ROLE(), myMigration.address]);

    await myMembership.write.grantRole([await myMembership.read.DEFAULT_ADMIN_ROLE(), myMigration.address]);
    await myMembership.write.grantRole([await myMembership.read.MINTER_ROLE(), myMigration.address]);

    await myAffiliate.write.grantRole([await myAffiliate.read.DEFAULT_ADMIN_ROLE(), myMigration.address]);
    await myAffiliate.write.grantRole([await myAffiliate.read.MINTER_ROLE(), myMigration.address]);

    // calculate 8 memberships to be claimed each one costing 4000
    const affiliatesToClaim = 1;
    const membershipsCost = 40000

    // create a bigint for 4000 tokens with 18 decimals
    const amount = BigInt(affiliatesToClaim * membershipsCost) * BigInt(10 ** 18);

    // the owner should be able to start the migration
    await myMigration.write.startMigration();
    await myMigration.write.startAffiliateMigration();

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
    await myMigration.write.claimAffiliates();

    // check the balance of the affiliates for the user in the migration contract userinfo
    const userBalance2 = await myMigration.read.getUserInfo([deployerWallet.account.address]);
    assert.equal(userBalance2.mintedAffiliates, BigInt(1));

    // check that the token has the proper uri
    const uri = await myAffiliate.read.tokenURI([BigInt(0)]);
    assert.equal(uri, "https://api.pox.me/affiliates/0", "The uri is not correct");
  })
});
