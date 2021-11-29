const EIP712 = require("./EIP712");

function AssetType(assetClass, data) {
	return { assetClass, data }
}

function Asset(assetClass, assetData, value) {
	return { assetType: AssetType(assetClass, assetData), value };
}

function Order(maker, makeAsset, taker, takeAsset, salt, start, end, dataType, data) {
	return { maker, makeAsset, taker, takeAsset, salt, start, end, dataType, data };
}

const Types = {
	AssetType: [
		{name: 'assetClass', type: 'bytes4'},
		{name: 'data', type: 'bytes'}
	],
	Asset: [
		{name: 'assetType', type: 'AssetType'},
		{name: 'value', type: 'uint256'}
	],
	Order: [
		{name: 'maker', type: 'address'},
		{name: 'makeAsset', type: 'Asset'},
		{name: 'taker', type: 'address'},
		{name: 'takeAsset', type: 'Asset'},
		{name: 'salt', type: 'uint256'},
		{name: 'start', type: 'uint256'},
		{name: 'end', type: 'uint256'},
		{name: 'dataType', type: 'bytes4'},
		{name: 'data', type: 'bytes'},
	]
};

const DOMAIN_TYPE = [
  {
    type: "string",
    name: "name"
  },
	{
		type: "string",
		name: "version"
	},
  {
    type: "uint256",
    name: "chainId"
  },
  {
    type: "address",
    name: "verifyingContract"
  }
];

async function sign(order, account, verifyingContract) {
	const name = "Exchange";
	const version = "2";
	console.log({ order, verifyingContract });
	const rawSignature = await account._signTypedData(
	  {
		chainId: parseInt(await network.provider.send("eth_chainId")),
		name,
		version,
		verifyingContract,
	  },
	  {
		  Order: [
			  {name: 'maker', type: 'address'},
			  {name: 'makeAsset', type: 'Asset'},
			  {name: 'taker', type: 'address'},
			  {name: 'takeAsset', type: 'Asset'},
			  {name: 'salt', type: 'uint256'},
			  {name: 'start', type: 'uint256'},
			  {name: 'end', type: 'uint256'},
			  {name: 'dataType', type: 'bytes4'},
			  {name: 'data', type: 'bytes'},
		  ],
		  AssetType: [
			  {name: 'assetClass', type: 'bytes4'},
			  {name: 'data', type: 'bytes'}
		  ],
		  Asset: [
			  {name: 'assetType', type: 'AssetType'},
			  {name: 'value', type: 'uint256'}
		  ],
	  },
	  order
	);
	// const { v, r, s } = ethers.utils.splitSignature(rawSignature);
	console.log({ rawSignature });
	return rawSignature;
}

  
async function sign(order, account, verifyingContract) {
  const name = "Exchange";
  const version = "2";
  console.log({ order, verifyingContract });
  const rawSignature = await account._signTypedData(
    {
      chainId: parseInt(await network.provider.send("eth_chainId")),
      name,
      version,
      verifyingContract,
    },
    {
		Order: [
			{name: 'maker', type: 'address'},
			{name: 'makeAsset', type: 'Asset'},
			{name: 'taker', type: 'address'},
			{name: 'takeAsset', type: 'Asset'},
			{name: 'salt', type: 'uint256'},
			{name: 'start', type: 'uint256'},
			{name: 'end', type: 'uint256'},
			{name: 'dataType', type: 'bytes4'},
			{name: 'data', type: 'bytes'},
		],
		AssetType: [
			{name: 'assetClass', type: 'bytes4'},
			{name: 'data', type: 'bytes'}
		],
		Asset: [
			{name: 'assetType', type: 'AssetType'},
			{name: 'value', type: 'uint256'}
		],
    },
    order
  );
  // const { v, r, s } = ethers.utils.splitSignature(rawSignature);
  console.log({ rawSignature });
  return rawSignature;
}
/*
async function sign(order, account, verifyingContract) {
	const chainId = Number(await web3.eth.getChainId());
	const data = EIP712.createTypeData({
		name: "Exchange",
		version: "2",
		chainId,
		verifyingContract
	}, 'Order', order, Types);
	return (await EIP712.signTypedData(web3, account, data)).sig;
}
*/
module.exports = { AssetType, Asset, Order, sign }
