const { expect } = require("chai");

const signatures = [
    "0xda66a0ae162f9253d7fbde5665c8bfdf7b635224ded5a0e35ad9415262ad84f57988c7cb0edd26377a2d621f1fe0fb81dd5873cae1c27f7c50a1d08ab0e0ff7a1c",
    "0x33429fb2e81f6173ff1a4081f5c1236b3d4fbd4f132913e863fc1293fadffd7c6629b1439d891046b503d2ce01fdd6b67b6f6245714e6021335c1774789afdce1c",
    "0x85b2221df0a3e219c106da4f6fc21a608c533d2689ee4e49a3abc69cd285e725243be037a5d5cfb16b6bc1cbf0f0a16b6db4364d2006ce4817b1bea9c89df29d1c",
    "0x83ce632bec057dbd58acdf25c28d45309b91e079d766b37c5ca5aae71d7ba8d1676e9c80640f35f8c9a67739e55fd4a3bf970888807dc56be5df974797215c821b",
    "0x528c35a736cfb5b8632b4e1f2a69c86acc5a598742067d71ffd8e93c6cdebd0c70b671e00ede76ff9654af3af2fb7cd83dedf12926fe51a230306a145c0b6bbc1c",
    "0x7a2944890292a67c199309089629a5fb89d0e0acc40ed9a86f483128c51add7c0c03d5e2568772986dc28edeeda67ced003d932dc9bcb402900fe710ef27f3d11b",
    "0x427b39397a4b9123f57b85181c515e7db4a05acce0af16afcb88330e229afb7d09308ab303f6a08634d22e1c9720105e68de8f19c9f60f5fae585836215a23fa1c",
    "0xe24dd56b47e3c1c11339f899b8b3f138bf2e6694048eec635cd2063eae805bc66323d1753b485f41266a375a540235a92eb128910750e74ac5707df1a695520b1b"
];

const nonce = [
    "G4kXueVXsMVG",
    "wOrLNI4MrlSj",
    "T+wfR511y+8j",
    "RC4HtkgoklfX",
    "/ovJZN+Zs1q6",
    "ttuRe7nYLadI",
    "K0j7oL2N2QM4",
    "k2WLzI3JFwDr"
];

const getSignature = (index) => {
    return signatures[index];
};

const getNonce = (index) => {
    return nonce[index];
  };


const getTestWLData = (address) => {
    const wlAddresses = [
        {
        address:"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        allowedQuantity: 15,
        merkleProof: [
            "0x3f68e79174daf15b50e15833babc8eb7743e730bb9606f922c48e95314c3905c",
            "0x31403139b3e90fd160d993560f6de598174a3c5cbb1dd8614454219f590c1d57",
        ],
        },
        {
        address:"0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        allowedQuantity: 1,
        merkleProof: [
            "0xca0c263ef03fe9a684ef0aa61b1e13332d2e9aa088769eb794d5b463a634bebe",
            "0x31403139b3e90fd160d993560f6de598174a3c5cbb1dd8614454219f590c1d57",
        ],
        },
        {
        address:"0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        allowedQuantity: 2,
        merkleProof: [
            "0x8d1187a2c5d69d9d0f6e6c8baf49c9549b9573585daef9b8634509e0cb8d99ae",
            "0x03b1d6e746d6f0c003c976be01df72a711c9a8494865ad74e561e551c21b22a1",
        ],
        },
        {
        address:"0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        allowedQuantity: 3,
        merkleProof: [
            "0xd0583fe73ce94e513e73539afcb4db4c1ed1834a418c3f0ef2d5cff7c8bb1dee",
            "0x03b1d6e746d6f0c003c976be01df72a711c9a8494865ad74e561e551c21b22a1",
        ],
        },
    ];

    return wlAddresses.find((wlAddress) => wlAddress.address === address);
};

const generateRandomHex = (size) =>
  [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join("");


const verifyTotalSupply = async (contract, expectedSupply, tokenId = 0) =>{
    // test remaining supply
    if(tokenId == 0){
        const totalSupply = await contract.totalSupply()
        console.log("Total Supply: ", totalSupply.toNumber());
        expect(totalSupply.toNumber()).to.equal(expectedSupply);
    } else {
        const totalSupply = await contract.totalSupply(tokenId)
        console.log("Total Supply: ", totalSupply.toNumber());
        expect(totalSupply.toNumber()).to.equal(expectedSupply);
    }
};

const verifyAccountBalance = async (
    contract,
    account,
    expectedBalance,
    tokenId = 0
) => {
    if(tokenId == 0){
        const balance = await contract.balanceOf(account);
        console.log("Account Balance ", account,' : ', balance.toNumber());
        expect(parseInt(balance)).to.equal(expectedBalance);
    } else {
        const balance = await contract.balanceOf(account, tokenId);
        console.log("Account Balance ", account,' : ', balance.toNumber());
        expect(parseInt(balance)).to.equal(expectedBalance);
    }
   
}

module.exports = {
    getSignature,
    getNonce,
    getTestWLData,
    generateRandomHex,
    verifyTotalSupply,
    verifyAccountBalance
};