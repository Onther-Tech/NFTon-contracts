const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { Order, Asset, sign } = require("./utils/order");
const { ERC20, enc, ETH, ERC721, COLLECTION, ORDER_DATA_V1, ORDER_DATA_V2 } = require("./utils/assets");

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
	let transferManager;
	let originReceiver1;
	let originReceiver2;
	let payoutsReceiver1;
	let payoutsReceiver2;
	let nonUsed;

    async function encodeData(data) {
        return transferManager.encode(data);
    }

	async function encodeDataV2(data) {
        return transferManager.encodeV2(data);
    }

	async function getSignature(order, signer) {
		return sign(order, signer, exchange.address);
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
			originReceiver1: originReceiver1.address,
            originReceiver2: originReceiver2.address,
            payoutsReceiver1: payoutsReceiver1.address,
            payoutsReceiver2: payoutsReceiver2.address,
		})
		transferManager = await transferManagerTestContract.deploy();
		await transferManager.deployed();

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

	it("should match erc721 to erc721", async() => {
		const user1ERC721TokenId = 2;
		const user2ERC721TokenId = 5;

		await erc721.mint(user1.address, user1ERC721TokenId);
		await erc721.mint(user2.address, user2ERC721TokenId);

		await erc721
			.connect(user1)
			.setApprovalForAll(transferProxy.address, true);

		await erc721
			.connect(user2)
			.setApprovalForAll(transferProxy.address, true);
	
		const left = Order(
			user1.address,
			Asset(ERC721, enc(erc721.address, user1ERC721TokenId), 1),
			ZERO, 
			Asset(ERC721, enc(erc721.address, user2ERC721TokenId), 1),
			1,
			0,
			0,
			"0xffffffff",
			"0x"
		);

		const right = Order(
			user2.address,
			Asset(ERC721, enc(erc721.address, user2ERC721TokenId), 1),
			ZERO,
			Asset(ERC721, enc(erc721.address, user1ERC721TokenId), 1),
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

		expect(await erc721.ownerOf(user2ERC721TokenId)).to.be.eq(user1.address);
		expect(await erc721.ownerOf(user1ERC721TokenId)).to.be.eq(user2.address);
	});

	it("should match erc721 to erc721 with fees", async () => {
		const user1ERC721TokenId = 7;
		const user2ERC721TokenId = 8;

		await erc721.mint(user1.address, user1ERC721TokenId);
		await erc721.mint(user2.address, user2ERC721TokenId);

		await erc721
			.connect(user1)
			.setApprovalForAll(transferProxy.address, true);

		await erc721
			.connect(user2)
			.setApprovalForAll(transferProxy.address, true);

		const originsLeft = [
             [originReceiver1.address, 100],
        ];
        const originsRight = [
             [originReceiver2.address, 200]
        ];

        const payoutsLeft = [
        	[user1.address, 10000],
        ];
        const payoutsRight = [
        	[user2.address, 10000]
        ];

        const encDataLeft = await encodeDataV2(
            [payoutsLeft, originsLeft, true]
        );
        const encDataRight = await encodeDataV2(
            [payoutsRight, originsRight, true]
        );
        
		const left = Order(
			user1.address,
			Asset(ERC721, enc(erc721.address, user1ERC721TokenId), 1),
			ZERO, 
			Asset(ERC721, enc(erc721.address, user2ERC721TokenId), 1),
			1,
			0,
			0,
			ORDER_DATA_V2,
			encDataLeft,
		);

		const right = Order(
			user2.address,
			Asset(ERC721, enc(erc721.address, user2ERC721TokenId), 1),
			ZERO,
			Asset(ERC721, enc(erc721.address, user1ERC721TokenId), 1),
			1,
			0,
			0,
			ORDER_DATA_V2,
			encDataRight,
		);

		const tx = await exchange
			.connect(user1)
			.matchOrders(left, "0x", right, await getSignature(right, user2))
		await tx.wait();
		const owner1 = await erc721.ownerOf(user1ERC721TokenId);
		console.log({ owner1 });

		const owner2 = await erc721.ownerOf(user2ERC721TokenId);
		console.log({ owner2 });
		expect(await erc721.ownerOf(user2ERC721TokenId)).to.be.eq(user1.address);
		expect(await erc721.ownerOf(user1ERC721TokenId)).to.be.eq(user2.address);
	});


});
