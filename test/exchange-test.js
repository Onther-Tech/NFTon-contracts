const { ethers, upgrades } = require("hardhat");
const { Order, Asset, sign } = require("./utils/order");
const { ERC20, enc, ETH } = require("./utils/assets");

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

	before(async () => {
		const TransferProxyContract = await ethers.getContractFactory("TransferProxyTest");
		const erc20TransferProxyContract = await ethers.getContractFactory("ERC20TransferProxyTest");
		const TestRoyaltiesRegistryContract = await ethers.getContractFactory("TestRoyaltiesRegistry");

		const ExchangeContract = await ethers.getContractFactory("Exchange");
		const erc20Test = await ethers.getContractFactory("TestERC20");
		[admin, user1, user2, community, protocol] = await ethers.getSigners();	
		transferProxy = await TransferProxyContract.deploy();
		await transferProxy.deployed();

		erc20TransferProxy = await erc20TransferProxyContract.deploy();
		await erc20TransferProxy.deployed();

		royaltiesRegistry = await TestRoyaltiesRegistryContract.deploy();
		await royaltiesRegistry.deployed();
		exchange = await upgrades.deployProxy(ExchangeContract, [transferProxy.address, erc20TransferProxy.address, 300, community.address, royaltiesRegistry.address], { initializer: "__ExchangeV2_init" });
		await exchange.deployed();
		t1 = await erc20Test.deploy("T1", "S1");
		await t1.deployed();

		t2 = await erc20Test.deploy("T2", "S2");
		await t2.deployed();

    	/*ETH*/
    	await exchange.setFeeReceiver(eth, protocol.address);
    	await exchange.setFeeReceiver(t1.address, protocol.address);
	});

	async function getSignature(order, signer) {
		return sign(order, signer, exchange.address);
	}

	it("eth to erc20", async () => {
		await t1.connect(admin).mint(user1.address, 100);
		await t1.connect(user1).approve(erc20TransferProxy.address, 10000000);
		const right = Order(user1.address, Asset(ERC20, enc(t1.address), 100), ZERO, Asset(ETH, "0x", 200), 1, 0, 0, "0xffffffff", "0x");
    	const left = Order(user2.address, Asset(ETH, "0x", 200), ZERO, Asset(ERC20, enc(t1.address), 100), 1, 0, 0, "0xffffffff", "0x");
    	const tx = await exchange
			.connect(user2)
			.matchOrders(left, "0x", right, await getSignature(right, user1), { value: 300 })
		await tx.wait();
	});
});
