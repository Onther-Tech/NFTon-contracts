const hre = require("hardhat");
const { findAccount } = require("../tasks/utils");

const { ERC20, enc, ETH, ERC721, COLLECTION } = require("../test/utils/assets");
const { Order, Asset, sign } = require("../test/utils/order");
const erc20Abi = require("./erc20-abi.json");

async function main() {
    const eth = "0x0000000000000000000000000000000000000000";
	const ZERO = "0x0000000000000000000000000000000000000000";

    const { RINKEBY_ACCOUNT1: user1Address,  RINKEBY_ACCOUNT2: user2Address} = process.env;
    const user1 = await findAccount(user1Address);
    const user2 = await findAccount(user2Address);
    const exchangeAddres = "0x6745e12Db1128c603750fE3Cc23EF02131a1b51E";
    const exchange = await hre.ethers.getContractAt("Exchange", exchangeAddres);

    const tonAddress = "0x44d4f5d89e9296337b8c48a332b3b2fb2c190cd0";
    // const ton = new ethers.Contract(tonAddress, erc20Abi, ethers.provider);
    // const erc20TransferProxyAddress = "0xBDb8E474a3261c72F132DcAd151853FB676CA5c5";
    // const tx = await ton.connect(user1).approve(erc20TransferProxyAddress, 100000);
    // await tx.wait();

	async function getSignature(order, signer) {
		return sign(order, signer, exchange.address);
	}

    const right = Order(
        user1.address, 
        Asset(ERC20, enc(tonAddress), 100),
        ZERO,
        Asset(ETH, "0x", 200), 
        1,
        0,
        0,
        "0xffffffff",
        "0x"
    );
    const left = Order(
        user2.address,
        Asset(ETH, "0x", 200),
        ZERO,
        Asset(ERC20, enc(tonAddress), 100),
        1,
        0,
        0,
        "0xffffffff",
        "0x"
    );
    const tx = await exchange
        .connect(user2)
        .matchOrders(left, "0x", right, await getSignature(right, user1), { value: 300 })
    await tx.wait();
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
