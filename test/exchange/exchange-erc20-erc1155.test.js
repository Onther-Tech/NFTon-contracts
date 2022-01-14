const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { Order, Asset, sign } = require("./utils/order");
const { ERC20, enc, ETH, ERC721, COLLECTION, ERC1155, ORDER_DATA_V2 } = require("./utils/assets");

describe("Exchange", () => {
	const eth = "0x0000000000000000000000000000000000000000";
	const ZERO = "0x0000000000000000000000000000000000000000";
	let exchange;
	let t1;
	let t2;
	let admin;
	let user1;
	let user2;
	let erc20TransferProxy;
	let transferProxy;
	let community;
	let protocol;
	let erc721;
	let erc1155;
	let originReceiver1;
	let originReceiver2;
	let payoutsReceiver1;
	let payoutsReceiver2;
	let nonUsed;
	let transferManager;

	async function getSignature(order, signer) {
		return sign(order, signer, exchange.address);
	}

	async function encodeDataV2(data) {
        return transferManager.encodeV2(data);
    }

	before(async () => {
		const TransferProxyContract = await ethers.getContractFactory("TransferProxyTest");
		const erc20TransferProxyContract = await ethers.getContractFactory("ERC20TransferProxyTest");
		const TestRoyaltiesRegistryContract = await ethers.getContractFactory("TestRoyaltiesRegistry");
		const AssetMatcherCollectionTestContract = await ethers.getContractFactory("AssetMatcherCollectionTest");
		const TestERC1155 = await ethers.getContractFactory("TestERC1155WithRoyaltiesV2");
		const transferManagerTestContract = await ethers.getContractFactory("TransferManagerTest");

		const ExchangeContract = await ethers.getContractFactory("Exchange");
		const ERC721TestContract = await ethers.getContractFactory("TestERC721");

		const ERC20TestContract = await ethers.getContractFactory("TestERC20");
		[admin, user1, user2, community, protocol,
		    originReceiver1,
            originReceiver2,
            payoutsReceiver1,
            payoutsReceiver2,
			nonUsed
		] = await ethers.getSigners();	
		console.log({
			admin: admin.address,
			user1: user1.address,
			user2: user2.address,
			community: community.address,
			protocol: protocol.address,
		})
		transferProxy = await TransferProxyContract.deploy();
		await transferProxy.deployed();

		transferManager = await transferManagerTestContract.deploy();
		await transferManager.deployed();

		erc1155 = await TestERC1155.deploy();
		await erc1155.deployed();
		await erc1155.initialize();

		erc20TransferProxy = await erc20TransferProxyContract.deploy();
		await erc20TransferProxy.deployed();

		royaltiesRegistry = await TestRoyaltiesRegistryContract.deploy();
		await royaltiesRegistry.deployed();

		exchange = await upgrades.deployProxy(ExchangeContract, [transferProxy.address, erc20TransferProxy.address, 300, community.address, royaltiesRegistry.address], { initializer: "__ExchangeV2_init" });
		await exchange.deployed();

		t1 = await ERC20TestContract.deploy("T1", "S1");
		await t1.deployed();

		t2 = await ERC20TestContract.deploy("T2", "S2");
		await t2.deployed();
		
		erc721 = await ERC721TestContract.deploy();
		await erc721.deployed();

		matcher = await AssetMatcherCollectionTestContract.deploy();
		await matcher.deployed();

    	/*ETH*/
    	await exchange.setFeeReceiver(eth, protocol.address);
    	await exchange.setFeeReceiver(t1.address, protocol.address);
	});

	it("should match erc20 to erc1155", async() => {
		const erc1155TokenId1 = 2;
		const erc1155Amount = 10;
		const erc20Amount = 100;
		const feeAmount = 3;
		const fee1 = feeAmount;
		const fee2 = feeAmount;
		const origin1 = 1;
		const origin2 = 2;
		const originFees = origin1 + origin2;
		const t1Amount = erc20Amount + fee1 + origin1; 

		await t1.connect(admin).mint(user1.address, t1Amount);
		await t1.connect(user1).approve(erc20TransferProxy.address, t1Amount);


		await erc1155.connect(admin).mint(user2.address, erc1155TokenId1, [], erc1155Amount);
		await erc1155.connect(user2).setApprovalForAll(transferProxy.address, true);

		const originsLeft = [
			[originReceiver1.address, origin1 * 100],
		];
		const originsRight = [
			[originReceiver2.address, origin2 * 100]
		];

		const payoutsLeft = [
			[payoutsReceiver1.address, 10000],
		];
		const payoutsRight = [
			[payoutsReceiver2.address, 10000]
		];

		const encDataLeft = await encodeDataV2(
			[payoutsLeft, originsLeft, true]
		);
		const encDataRight = await encodeDataV2(
			[payoutsRight, originsRight, true]
		);

	
		const left = Order(
			user1.address,
			Asset(ERC20, enc(t1.address), erc20Amount),
			ZERO, 
			Asset(ERC1155, enc(erc1155.address, erc1155TokenId1), erc1155Amount),
			1,
			0,
			0,
			ORDER_DATA_V2,
			encDataLeft,
		);

		const right = Order(
			user2.address,
			Asset(ERC1155, enc(erc1155.address, erc1155TokenId1), erc1155Amount),
			ZERO,
			Asset(ERC20, enc(t1.address), erc20Amount),
			1,
			0,
			0,
			ORDER_DATA_V2,
			encDataRight,
		);

		const tx = await exchange
			.connect(user2)
			.matchOrders(left, await getSignature(left, user1), right, await getSignature(right, user2));
		await tx.wait();

		expect(await t1.balanceOf(user1.address)).to.be.eq(0);
		expect(await t1.balanceOf(payoutsReceiver2.address)).to.be.eq(erc20Amount - fee2 - origin2);

		expect(await erc1155.balanceOf(user2.address, erc1155TokenId1)).to.be.eq(0);
		expect(await erc1155.balanceOf(payoutsReceiver1.address, erc1155TokenId1)).to.be.eq(erc1155Amount);
	});
});
