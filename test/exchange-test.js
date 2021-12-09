const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { Order, Asset, sign } = require("./exchange/utils/order");
const { ERC20, enc, ETH, ERC721, COLLECTION } = require("./exchange/utils/assets");

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

	async function getSignature(order, signer) {
		return sign(order, signer, exchange.address);
	}

	before(async () => {
		const TransferProxyContract = await ethers.getContractFactory("TransferProxyTest");
		const erc20TransferProxyContract = await ethers.getContractFactory("ERC20TransferProxyTest");
		const TestRoyaltiesRegistryContract = await ethers.getContractFactory("TestRoyaltiesRegistry");
		const AssetMatcherCollectionTestContract = await ethers.getContractFactory("AssetMatcherCollectionTest");

		const ExchangeContract = await ethers.getContractFactory("Exchange");
		const ERC721TestContract = await ethers.getContractFactory("TestERC721");

		const ERC20TestContract = await ethers.getContractFactory("TestERC20");
		[admin, user1, user2, community, protocol] = await ethers.getSigners();	
		console.log({
			admin: admin.address,
			user1: user1.address,
			user2: user2.address,
			community: community.address,
			protocol: protocol.address,
		})
		transferProxy = await TransferProxyContract.deploy();
		await transferProxy.deployed();

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

	it("should match eth to erc20", async () => {
		await t1.connect(admin).mint(user1.address, 100);
		await t1.connect(user1).approve(erc20TransferProxy.address, 10000000);
		const right = Order(user1.address, Asset(ERC20, enc(t1.address), 100), ZERO, Asset(ETH, "0x", 200), 1, 0, 0, "0xffffffff", "0x");
    	const left = Order(user2.address, Asset(ETH, "0x", 200), ZERO, Asset(ERC20, enc(t1.address), 100), 1, 0, 0, "0xffffffff", "0x");
		const tx = await exchange
			.connect(user2)
			.matchOrders(left, "0x", right, await getSignature(right, user1), { value: 300 })
		await tx.wait();
		expect(await t1.balanceOf(user1.address)).to.be.eq(0);
		expect(await t1.balanceOf(user2.address)).to.be.eq(100);
	});

	it("should match eth to erc721", async () => {
		const erc721TokenId1 = 53;
		await erc721.connect(admin).mint(user1.address, erc721TokenId1);
		await erc721.connect(user1).setApprovalForAll(transferProxy.address, true);

		const left = Order(user1.address, Asset(ERC721, enc(erc721.address, erc721TokenId1), 1), ZERO, Asset(ETH, "0x", 200), 1, 0, 0, "0xffffffff", "0x");
		const right = Order(user2.address, Asset(ETH, "0x", 200), ZERO, Asset(COLLECTION, enc(erc721.address), 1), 1, 0, 0, "0xffffffff", "0x");

		await matcher.__AssetMatcherCollection_init();
		await matcher.addOperator(exchange.address);

		await exchange.setAssetMatcher(COLLECTION, matcher.address);

		const tx = await exchange
			.connect(user2)
			.matchOrders(left, await getSignature(left, user1), right, await getSignature(right, user2), {value: 300});
		await tx.wait();

		expect(await erc721.balanceOf(user1.address)).to.be.eq(0);
		expect(await erc721.balanceOf(user2.address)).to.be.eq(1);
	});

	it("should match erc20 to erc721", async() => {
		const erc721TokenId = 2;
		const erc20Amount = 100;
		const feeAmount = 3;

		await erc721.mint(user1.address, erc721TokenId);
		await t2.mint(user2.address, 2 * erc20Amount);

		await erc721
			.connect(user1)
			.setApprovalForAll(transferProxy.address, true);

		await t2
			.connect(user2)
			.approve(erc20TransferProxy.address, feeAmount + erc20Amount);
	
		const left = Order(
			user1.address,
			Asset(ERC721, enc(erc721.address, erc721TokenId), 1),
			ZERO, 
			Asset(ERC20, enc(t2.address), 100),
			1,
			0,
			0,
			"0xffffffff",
			"0x"
		);

		const right = Order(
			user2.address,
			Asset(ERC20, enc(t2.address), 100),
			ZERO,
			Asset(ERC721, enc(erc721.address, erc721TokenId), 1),
			1,
			0,
			0,
			"0xffffffff",
			"0x"
		);
		const tx = await exchange
			.connect(user2)
			.matchOrders(left, await getSignature(left, user1), right, await getSignature(right, user2));
		await tx.wait();
	});


	it("should match erc20 to erc20", async() => {
		const t1Amount = 100;
		const t2Amount = 200;
		const feeAmount = 5;
		await t1.mint(user1.address, t1Amount + feeAmount);
		await t2.mint(user2.address, t2Amount);
		await t1.connect(user1).approve(erc20TransferProxy.address, 10000000);
		await t2.connect(user2).approve(erc20TransferProxy.address, 10000000);
		// const addrOriginLeft =[[accounts[3], makeAmount]];
		// const addrOriginRight = [[accounts[4], takeAmount]];
		// const encDataLeft = await encDataV1([ [[accounts[1], 10000]], addrOriginLeft ]);
		// const encDataRight = await encDataV1([ [[accounts[2], 10000]], addrOriginRight ]);
		const left = Order(
			user1.address,
			Asset(ERC20, enc(t1.address),t1Amount),
			ZERO,
			Asset(ERC20, enc(t2.address), t2Amount),
			1,
			0,
			0,
			"0xffffffff",
			"0x"
		);
		const right = Order(
			user2.address,
			Asset(ERC20, enc(t2.address), t2Amount),
			ZERO,
			Asset(ERC20, enc(t1.address), t1Amount),
			1,
			0,
			0,
			"0xffffffff",
			"0x"
		);
		const tx = await exchange
			.connect(user2)
			.matchOrders(left, await getSignature(left, user1), right, await getSignature(right, user2));
		await tx.wait();
	});
});
