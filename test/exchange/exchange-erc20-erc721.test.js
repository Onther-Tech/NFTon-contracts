const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { Order, Asset, sign } = require("./utils/order");
const { ERC20, enc, ETH, ERC721, COLLECTION, ORDER_DATA_V2 } = require("./utils/assets");

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
	let originReceiver1;
	let originReceiver2;
	let payoutsReceiver1;
	let payoutsReceiver2;
	let nonUsed;

	async function getSignature(order, signer) {
		return sign(order, signer, exchange.address);
	}

	async function encodeData(data) {
        return transferManager.encode(data);
    }

	before(async () => {
		const TransferProxyContract = await ethers.getContractFactory("TransferProxyTest");
		const erc20TransferProxyContract = await ethers.getContractFactory("ERC20TransferProxyTest");
		const TestRoyaltiesRegistryContract = await ethers.getContractFactory("TestRoyaltiesRegistry");
		const AssetMatcherCollectionTestContract = await ethers.getContractFactory("AssetMatcherCollectionTest");
		const transferManagerTestContract = await ethers.getContractFactory("TransferManagerTest");
		const ExchangeContract = await ethers.getContractFactory("Exchange");
		const ERC721TestContract = await ethers.getContractFactory("TestERC721");

		const ERC20TestContract = await ethers.getContractFactory("TestERC20");
		[
            admin,
            user1,
            user2,
            community,
            protocol,
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

	const emptyBalance = async (user, token) => {
		const balance = parseInt(await token.balanceOf(user.address));
		await (await token.connect(user).transfer(nonUsed.address, balance)).wait();
	}

	const mintAndApprove = async (user, token, amount, approveAddress) => {
		await (await token.connect(admin).mint(user.address, amount)).wait();
		await (await token.connect(user).approve(approveAddress, amount)).wait();
	}

	beforeEach(async() => {
		await emptyBalance(user1, t1);
		await emptyBalance(user1, t2);
		await emptyBalance(user2, t1);
		await emptyBalance(user2, t2);
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

	it("should match erc20 to erc721 with fees", async () => {
		const erc721TokenId = 3;
		const erc20Amount = 100;
		const feeAmount = 3;

		await erc721.mint(user1.address, erc721TokenId);
		await t2.mint(user2.address, 4 * feeAmount + erc20Amount);

		await erc721
			.connect(user1)
			.setApprovalForAll(transferProxy.address, true);

		await t2
			.connect(user2)
			.approve(erc20TransferProxy.address, 2 * feeAmount + erc20Amount);

		const originsLeft = [
			[originReceiver1.address, 100],
		];
		const originsRight = [
			[originReceiver2.address, 200]
		];

		const payoutsLeft = [
			[payoutsReceiver1.address, 10000],
		];
		const payoutsRight = [
			// [payoutsReceiver1.address, 10000]
		];

		const encDataLeft = await encodeData(
			[payoutsLeft, originsLeft]
		);
		const encDataRight = await encodeData(
			[payoutsRight, originsRight]
		);
	
		const left = Order(
			user1.address,
			Asset(ERC721, enc(erc721.address, erc721TokenId), 1),
			ZERO, 
			Asset(ERC20, enc(t2.address), 100),
			1,
			0,
			0,
			ORDER_DATA_V2,
			encDataLeft
		);

		const right = Order(
			user2.address,
			Asset(ERC20, enc(t2.address), 100),
			ZERO,
			Asset(ERC721, enc(erc721.address, erc721TokenId), 1),
			1,
			0,
			0,
			ORDER_DATA_V2,
			encDataRight
		);

		const tx = await exchange
			.connect(user2)
			.matchOrders(left, await getSignature(left, user1), right, "0x");
		await tx.wait();

		const user1Balance = parseInt(await t2.balanceOf(user1.address));
		console.log({ user1Balance });
		const user2Balance = parseInt(await t2.balanceOf(user2.address));
		console.log({ user2Balance });
		//expect(await t1.balanceOf(user1.address)).to.be.eq(0);
		//expect(await t1.balanceOf(user2.address)).to.be.eq(100);
	});
});
