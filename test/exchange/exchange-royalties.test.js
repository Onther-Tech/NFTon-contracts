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
    let royaltiesReceiver;
	let nonUsed;

	async function getSignature(order, signer) {
		return sign(order, signer, exchange.address);
	}

	async function encodeData(data) {
        return transferManager.encode(data);
    }

	async function encodeDataV2(data) {
        return transferManager.encodeV2(data);
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
            user3,
            community,
            protocol,
            originReceiver1,
            originReceiver2,
            payoutsReceiver1,
            payoutsReceiver2,
            nonUsed,
			royaltiesReceiver
        ] = await ethers.getSigners();	

		console.log({
			admin: admin.address,
			user1: user1.address,
			user2: user2.address,
			community: community.address,
			protocol: protocol.address,
            royaltiesReceiver: royaltiesReceiver.address
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

    const convertToBp = (p) => p * 100;

	beforeEach(async() => {
		await emptyBalance(user1, t1);
		await emptyBalance(user1, t2);
		await emptyBalance(user2, t1);
		await emptyBalance(user2, t2);
	});

    const erc721TokenId = 3;

	it("should match make a first order tx for erc721", async () => {
		const erc20Amount = 100;
		const fee1 = 3; // 3% protocol fee
		const fee2 = 3; // 3% protocol fee
        const origin1 = 3; // 3%
        const origin2 = 4; // 4%
        const t2Amount = erc20Amount + fee2 + origin2;
        const royaltiesFee = 5;

		await erc721.mint(user1.address, erc721TokenId);
		await t2.mint(user2.address, t2Amount);

		await erc721
			.connect(user1)
			.setApprovalForAll(transferProxy.address, true);

		await t2
			.connect(user2)
			.approve(erc20TransferProxy.address,  t2Amount);

		const originsLeft = [
			[originReceiver1.address, convertToBp(origin1)],
		];
		const originsRight = [
			[originReceiver2.address, convertToBp(origin2)]
		];

		const payoutsLeft = [];
		const payoutsRight = [];

		const encDataLeft = await encodeDataV2(
			[payoutsLeft, originsLeft, true]
		);
		const encDataRight = await encodeDataV2(
			[payoutsRight, originsRight, true]
		);
	
		const left = Order(
			user1.address,
			Asset(ERC721, enc(erc721.address, erc721TokenId), 1),
			ZERO, 
			Asset(ERC20, enc(t2.address), erc20Amount),
			1,
			0,
			0,
			ORDER_DATA_V2,
			encDataLeft
		);

		const right = Order(
			user2.address,
			Asset(ERC20, enc(t2.address), erc20Amount),
			ZERO,
			Asset(ERC721, enc(erc721.address, erc721TokenId), 1),
			1,
			0,
			0,
			ORDER_DATA_V2,
			encDataRight
		);

        await royaltiesRegistry.setRoyaltiesByTokenAndTokenId(
            erc721.address, erc721TokenId, [[royaltiesReceiver.address, convertToBp(royaltiesFee)]]
        );

		const tx = await exchange
			.connect(user2)
			.matchOrders(left, await getSignature(left, user1), right, "0x");
		await tx.wait();

        expect(await t2.balanceOf(user1.address)).to.be.eq(erc20Amount - fee1 - origin1 - royaltiesFee);
        expect(await t2.balanceOf(user2.address)).to.be.eq(0);

		expect(await erc721.ownerOf(erc721TokenId)).to.be.eq(user2.address);
	});

    it("should match make a second order tx for erc721", async () => {
		const erc20Amount = 100;
        const feeLeft = 3;
        const feeRight = 3;
        const t2Amount = erc20Amount + feeLeft;
        const royaltiesFee = 5;


		await erc721
			.connect(user2)
			.setApprovalForAll(transferProxy.address, true);

		await t2.mint(user3.address, t2Amount);
		await t2
			.connect(user3)
			.approve(erc20TransferProxy.address,  t2Amount);

		const left = Order(
			user2.address,
			Asset(ERC721, enc(erc721.address, erc721TokenId), 1),
			ZERO, 
			Asset(ERC20, enc(t2.address), erc20Amount),
			1,
			0,
			0,
			"0xffffffff",
			"0x"
		);

		const right = Order(
			user3.address,
			Asset(ERC20, enc(t2.address), erc20Amount),
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
			.matchOrders(left, "0x", right, await getSignature(right, user3));
		await tx.wait();

        expect(await t2.balanceOf(user2.address)).to.be.eq(erc20Amount - feeRight - royaltiesFee);
        expect(await t2.balanceOf(user3.address)).to.be.eq(0);

		expect(await erc721.ownerOf(erc721TokenId)).to.be.eq(user3.address);
	});
});
