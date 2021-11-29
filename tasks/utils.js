const findAccount = async (address) => {
    const accounts = await ethers.getSigners();
    for (const account of accounts) {
      if (account.address === address) {
        return account;
      }
    }
    throw Error("Address not found in Signers");
};

module.exports = {
    findAccount
}