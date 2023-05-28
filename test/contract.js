const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');

const {
    getSignature,
    getNonce,
    getTestWLData,
    generateRandomHex,
    verifyTotalSupply,
    verifyAccountBalance
} = require('./utilities');

describe('Contracts', function () {
    beforeEach(async function () {
        this.accounts = await ethers.getSigners();
        const [owner] = await ethers.getSigners();
        this.ownerAddress = owner.address;
        this.provider = ethers.provider;
    
        const garage = await ethers.getContractFactory('IOGarage');
        this.garageContract = await garage.deploy('IOGarage', 'IOGarage');
        await this.garageContract.deployed();

        const rides = await ethers.getContractFactory('contracts/IORides.sol:IORides');
        this.ridesContract = await rides.deploy('IORides','IORides');
        await this.ridesContract.deployed();

        const spheres = await ethers.getContractFactory("contracts/IOSpheres.sol:IOSpheres");
        this.spheresContract = await upgrades.deployProxy(spheres,['IOSpheres','IOSpheres'],{ kind: "uups" });
        await this.spheresContract.deployed();

        // Test accounts
        this.account0 = getTestWLData(this.accounts[0].address);
        this.account1 = getTestWLData(this.accounts[1].address);
        this.account2 = getTestWLData(this.accounts[2].address);
        this.account3 = getTestWLData(this.accounts[3].address);
    })

    describe('IOGarage:setBaseURI', function(){
        it('should set base uri', async function(){
            const baseURI = 'https://someLink.com/';
            this.garageContract.setBaseURI(baseURI);
            let baseURIAfter = await this.garageContract.baseURI();
            expect(baseURIAfter).to.equal(baseURI);
        })
    })
 
    describe('IOGarage:toggleFreeMint', function(){
        it('should return isFreeMintOpened to be false', async function(){
            expect(await this.garageContract.isFreeMintOpened()).to.be.false;
        })
        it('should toggle isFreeMintOpened to be true', async function(){
            await this.garageContract.toggleFreeMint();
            expect(await this.garageContract.isFreeMintOpened()).to.be.true;
        })
    })

    describe('IOGarage:togglePublicMint', function(){
        it('should return isPublicMintOpened to be false', async function(){
            expect(await this.garageContract.isPublicMintOpened()).to.be.false;
        })
        it('should toggle isPublicMintOpened to be true', async function(){
            await this.garageContract.togglePublicMint();
            expect(await this.garageContract.isPublicMintOpened()).to.be.true;
        })
    })

    describe('IOGarage:setIORidesContract', function(){
        it('should set IORidesContract correctly', async function(){
            await expect(this.garageContract.setIORidesContract(this.ridesContract.address)).not.to.be.reverted;
        })
    })
    
    describe('IOGarage:setIOSpheresContract', function(){
        it('should set IOSpheresContract correctly', async function(){
            await expect(this.garageContract.setIOSpheresContract(this.spheresContract.address)).not.to.be.reverted;
        })
    })

    describe('IOGarage:setMarkleRoot', function(){
        it('Should set merkleRoot correctly', async function () {
            let newMerkleRoot = '0x' + generateRandomHex(64);
            await this.garageContract.setMerkleRoot(newMerkleRoot);
            let merkleRootAfter = await this.garageContract.merkleRoot();
            expect(merkleRootAfter).to.equal(newMerkleRoot);
        })
    })

    describe('IOGarage:toggleAllowedOpenGarage', function(){
        it('Should not allow toggleAllowedOpenGarage when IORidesContract doesnt set', async function () {
            await expect(this.garageContract.toggleAllowedOpenGarage()).to.be.revertedWith(
                'ioRidesIsNotOpen()'
            );
        })
        it('Should not allow toggleAllowedOpenGarage when IOSpheresContract doesnt set', async function () {
            await this.garageContract.setIORidesContract(this.ridesContract.address);
            await expect(this.garageContract.toggleAllowedOpenGarage()).to.be.revertedWith(
                'ioSphereIsNotOpen()'
            );
        })
        it('Should allow set isRevealAllowed ', async function () {
            await this.garageContract.setIORidesContract(this.ridesContract.address);
            await this.garageContract.setIOSpheresContract(this.spheresContract.address);
            let isRevealAllowed = await this.garageContract.isRevealAllowed();
            expect(isRevealAllowed).to.be.false;
            await this.garageContract.toggleAllowedOpenGarage();
            isRevealAllowed = await this.garageContract.isRevealAllowed();
            expect(isRevealAllowed).to.be.true;
        })
    })

    describe('IOGarage:setSignerAddress', function(){
        it('Should set signerAddress correctly', async function () {
            let SignerAddress = '0x3DF0B8878FCE2973d98f9BE9f64b46aF979Bb658';
            await expect(this.garageContract.setSignerAddress(SignerAddress)).not.to.be.reverted;
        })
    })

    describe('IOGarage:freeMint', function(){
        it('Should not allow free mint if mintAmount = 0', async function () {
            await expect(this.garageContract.connect(this.accounts[0]).freeMint(0, this.account0.allowedQuantity, this.account0.merkleProof,{})).to.be.revertedWith(
                'invalidMintAmount()'
            );
        })
        it('Should not allow free mint if mintAmount exceed MAX_SUPPLY', async function () {
            let maxSupply = await this.garageContract.MAX_SUPPLY();
            await expect(this.garageContract.connect(this.accounts[0]).freeMint(parseInt(maxSupply) + 1, this.account0.allowedQuantity, this.account0.merkleProof,{})).to.be.revertedWith(
                'maxSupplyExceeded()'
            );
        })
        it('Should not allow free mint if isFreeMintOpened is not opened', async function () {
            await expect(this.garageContract.connect(this.accounts[0]).freeMint(this.account0.allowedQuantity, this.account0.allowedQuantity, this.account0.merkleProof,{})).to.be.revertedWith(
                'freeMintIsNotOpened()'
            );
        })
        it('Should not allow free mint if mintAmount exceed allowedMintAmount', async function () {
            await this.garageContract.toggleFreeMint();
            await expect(this.garageContract.connect(this.accounts[0]).freeMint(this.account0.allowedQuantity + 1, this.account0.allowedQuantity, this.account0.merkleProof,{})).to.be.revertedWith(
                'maxClaimExceeded()'
            );
        })
        it('Should not allow free mint if mintAmount exceed freeMintSupply', async function () {
            await this.garageContract.toggleFreeMint();
            const freeMintSupply = await this.garageContract.freeMintSupply();
            await expect(this.garageContract.connect(this.accounts[0]).freeMint(parseInt(freeMintSupply) + 1, parseInt(freeMintSupply) + 1, this.account0.merkleProof,{})).to.be.revertedWith(
                'exceedFreeMintAllowance()'
            );
        })
        it('Should not allow free mint if account is not eligible', async function () {
            await this.garageContract.toggleFreeMint();
            await this.garageContract.setMerkleRoot(
                '0xf13a391f6d2671c1790bb6c75c2d0f112183d1ede45f85b773ea203222a44974'
            );
            await expect(this.garageContract.connect(this.accounts[0]).freeMint(this.account0.allowedQuantity, this.account0.allowedQuantity, this.account1.merkleProof,{})).to.be.revertedWith(
                'ineligibleForFreeMint()'
            );
        })
        it('Should allow freeMint', async function () {
            await this.garageContract.toggleFreeMint();
            await this.garageContract.setMerkleRoot(
                '0xf13a391f6d2671c1790bb6c75c2d0f112183d1ede45f85b773ea203222a44974'
            );
            await this.garageContract.connect(this.accounts[1]).freeMint(this.account1.allowedQuantity, this.account1.allowedQuantity, this.account1.merkleProof,{});
            await verifyTotalSupply(this.garageContract, this.account1.allowedQuantity);
            await verifyAccountBalance(this.garageContract, this.account1.address, this.account1.allowedQuantity);
            let totalFreeMint = await this.garageContract.freeMintAmount();
            expect(totalFreeMint).to.equal(this.account1.allowedQuantity);
            let freeMintClaimed = await this.garageContract.freeMintClaimed(this.account1.address);
            expect(freeMintClaimed).to.equal(this.account1.allowedQuantity);
        })
    })

    describe('IOGarage:publicMint', function(){
        beforeEach(async function () {
            //mint auction first
            this.mintPrice = await this.garageContract.publicMintPrice();
            await this.garageContract.setSignerAddress('0x3DF0B8878FCE2973d98f9BE9f64b46aF979Bb658');
        });
        it('Should not allow public mint if mintAmount = 0', async function () {
            await expect(this.garageContract.connect(this.accounts[0]).publicMint(getSignature(0), getNonce(0), 0,{
                value: String(this.mintPrice * 2)
            })).to.be.revertedWith(
                'invalidMintAmount()'
            );
        })
        it('Should not allow public mint if mintAmount exceed MAX_SUPPLY', async function () {
            let maxSupply = await this.garageContract.MAX_SUPPLY();
            await expect(this.garageContract.connect(this.accounts[0]).publicMint(getSignature(0), getNonce(0), maxSupply + 1,{
                value: String(this.mintPrice * 2)
            })).to.be.revertedWith(
                'maxSupplyExceeded()'
            );
        })
        it('Should not allow public mint if isPublicMintOpened is not opened', async function () {
            await expect(this.garageContract.connect(this.accounts[0]).publicMint(getSignature(0), getNonce(0), 2,{
                value: String(this.mintPrice * 2)
            })).to.be.revertedWith(
                'publicMintIsNotOpened()'
            );
        })
        it('Should not allow public mint if nonce has been used', async function () {
            await this.garageContract.togglePublicMint();
            await this.garageContract.connect(this.accounts[0]).publicMint(getSignature(0), getNonce(0), 2,{
                value: String(this.mintPrice * 2)
            })
            await expect(this.garageContract.connect(this.accounts[1]).publicMint(getSignature(0), getNonce(0), 2,{
                value: String(this.mintPrice * 2)
            })).to.be.revertedWith(
                'NonceHasBeenUsed()'
            );
        })
        it('Should not allow public mint if mintAmount exceed publicMintSupply', async function () {
            await this.garageContract.togglePublicMint();
            const publicMintSupply = await this.garageContract.publicMintSupply()
            await expect(this.garageContract.connect(this.accounts[0]).publicMint(getSignature(0), getNonce(0), parseInt(publicMintSupply) + 1,{
                value: String(this.mintPrice * (parseInt(publicMintSupply) + 1))
            })).to.be.revertedWith(
                'exceedPublicMintAllowance()'
            );
        })
        it('Should not allow public mint if mintAmount exceed maxPublicMintPerWallet', async function () {
            await this.garageContract.togglePublicMint();
            await expect(this.garageContract.connect(this.accounts[0]).publicMint(getSignature(0), getNonce(0), 3,{
                value: String(this.mintPrice * 3)
            })).to.be.revertedWith(
                'exceedmaxPublicMintPerWallet()'
            );
        })
        it('Should not allow public mint if direct access from bot not allowed', async function () {
            await this.garageContract.togglePublicMint();
            await expect(this.garageContract.connect(this.accounts[1]).publicMint(getSignature(0), getNonce(0), 2,{
                value: String(this.mintPrice * 2)
            })).to.be.revertedWith(
                'DirectAccessFromBotNotAllowed()'
            );
        })
        it('Should not allow public mint if user has insufficient ETH', async function () {
            await this.garageContract.togglePublicMint();
            await expect(this.garageContract.connect(this.accounts[0]).publicMint(getSignature(0), getNonce(0), 2,{
                value: String(this.mintPrice * 1)
            })).to.be.revertedWith(
                'InsufficientETHSent()'
            );
        })
        it('Should allow public mint', async function () {
            await this.garageContract.togglePublicMint();
            await this.garageContract.connect(this.accounts[0]).publicMint(getSignature(0), getNonce(0), 2,{
                value: String(this.mintPrice * 2)
            });
            await verifyTotalSupply(this.garageContract, 2);
            await verifyAccountBalance(this.garageContract, this.account0.address, 2);
            let totalPublicMint = await this.garageContract.publicMintAmount();
            expect(totalPublicMint).to.equal(2);
            let publicMintClaimed = await this.garageContract.publicMinted(this.account0.address);
            expect(publicMintClaimed).to.equal(2);
        })
    })

    describe('IORides:setBaseURI', function(){
        it('should set base uri', async function(){
            const baseURI = 'https://someLink.com/';
            await this.ridesContract.setBaseURI(baseURI);
            let baseURIAfter = await this.ridesContract.baseURI();
            expect(baseURIAfter).to.equal(baseURI);
        })
    })

    describe('IORides:setIOGarageContract', function(){
        it('should set IOGarageContract correctly', async function(){
            await this.ridesContract.setIOGarageContract(this.garageContract.address);
            let newGarageContract = await this.ridesContract.IOGarageContract();
            expect(newGarageContract).to.equal(this.garageContract.address);
        })
    })


    describe('IORides:mintIORide', function(){
        it('should not allow mintIORide if IOGarageContract is not set', async function(){
            await expect(this.ridesContract.connect(this.accounts[0]).mintIORide(this.account0.address, 1)).to.be.revertedWith(
                'IOGarageContractIsNotDefined()'
            );
        })
        it('should not allow mintIORide if it is not called from garage contract', async function(){
            await this.ridesContract.setIOGarageContract(this.garageContract.address);
            await expect(this.ridesContract.connect(this.accounts[0]).mintIORide(this.account0.address, 1)).to.be.revertedWith(
                'notCalledUponRevealGarage()'
            );
        })
        it('should allow mintIORide', async function(){
            await this.ridesContract.setIOGarageContract(this.accounts[0].address);
            let totalSupply = await this.ridesContract.totalSupply();
            expect(totalSupply).to.equal(0);
            await this.ridesContract.connect(this.accounts[0]).mintIORide(this.account1.address, 1);
            totalSupply = await this.ridesContract.totalSupply();
            expect(totalSupply).to.equal(1);
            await verifyTotalSupply(this.ridesContract, 1);
            await verifyAccountBalance(this.ridesContract, this.account1.address, 1);
        })
    })

    describe('IORides:OwnerTokens', function(){
        it('should retrieve tokens of owner', async function(){
            await this.ridesContract.setIOGarageContract(this.accounts[0].address);
            await this.ridesContract.connect(this.accounts[0]).mintIORide(this.account1.address, 1);
            await this.ridesContract.connect(this.accounts[0]).mintIORide(this.account1.address, 2);
            let OwnerTokens = await this.ridesContract.OwnerTokens(this.account1.address);
            expect(OwnerTokens).to.have.lengthOf(2);
        })
    })

    describe('IOSpheres:setIOGarageContract', function(){
        it('should set IOGarageContract correctly', async function(){
            await this.spheresContract.setIOGarageContract(this.garageContract.address);
            let newGarageContract = await this.spheresContract.IOGarageContract();
            expect(newGarageContract).to.equal(this.garageContract.address);
        })
    })

    describe('IOSpheres:setBaseURI', function(){
        it('should set base uri', async function(){
            const baseURI = 'https://someLink.com/';
            await this.spheresContract.setBaseURI(baseURI);
            let baseURIAfter = await this.spheresContract.BaseUri();
            expect(baseURIAfter).to.equal(baseURI);
        })
    })

    describe('IOSpheres:createSphere', function(){
        it('should not create sphere if initSupply > maxSupply', async function(){
            await expect(this.spheresContract.createSphere(10000, 10001, 2, [])).to.be.revertedWith(
                'initSupplyMustBeLessThanMaxSupply()'
            )
        })
        it('should create sphere and assign initSupply = 2', async function(){
            let tokenIdTracker = await this.spheresContract.tokenIdTracker();
            expect(tokenIdTracker).to.equal(1);
            let AllTokens = await this.spheresContract.AllTokens(2);
            expect(AllTokens.maxSupply).to.equal(0);

            await this.spheresContract.createSphere(10000, 2, 2, []);
            AllTokens = await this.spheresContract.AllTokens(2);
            tokenIdTracker = await this.spheresContract.tokenIdTracker();
            expect(tokenIdTracker).to.equal(2);
            expect(AllTokens.maxSupply).to.equal(10000);
            expect(AllTokens.totalSupply).to.equal(2);
            await verifyAccountBalance(this.spheresContract, this.ownerAddress, 2, 2);
        })
        it('should create sphere and assign initSupply = 0', async function(){
            let tokenIdTracker = await this.spheresContract.tokenIdTracker();
            expect(tokenIdTracker).to.equal(1);
            let AllTokens = await this.spheresContract.AllTokens(2);
            expect(AllTokens.maxSupply).to.equal(0);

            await this.spheresContract.createSphere(10000, 0, 2, []);
            AllTokens = await this.spheresContract.AllTokens(2);
            tokenIdTracker = await this.spheresContract.tokenIdTracker();
            expect(tokenIdTracker).to.equal(2);
            expect(AllTokens.maxSupply).to.equal(10000);
            expect(AllTokens.totalSupply).to.equal(0);
            await verifyAccountBalance(this.spheresContract, this.ownerAddress, 0, 2);
        })
    })

    describe('IOSpheres:mintIOSphere', function(){
        it('should not allow mint IO Spheres if tokenId is not created', async function(){
            await expect(this.spheresContract.connect(this.accounts[0]).mintIOSphere(this.account1.address, 4,2)).to.be.revertedWith(
                'nonExistentTokenId()'
            ); //token id 2 hasnt been created  
        })
        it('should not allow mint IO Spheres if IOGarageContract is not set', async function(){
            await expect(this.spheresContract.connect(this.accounts[0]).mintIOSphere(this.account1.address, 4,1)).to.be.revertedWith(
                'IOGarageContractIsNotDefined()'
            ); 
        })
        it('should not allow mint IO Spheres if mint isnt called from IO Garage Contract', async function(){
            await this.spheresContract.setIOGarageContract(this.account0.address);
            await expect(this.spheresContract.connect(this.accounts[1]).mintIOSphere(this.account1.address, 4,1)).to.be.revertedWith(
                'notCalledUponRevealGarage()'
            ); 
        })
        it('should not allow mint IO Spheres if mint exceed max minting per tx', async function(){
            await this.spheresContract.setIOGarageContract(this.account0.address);
            await expect(this.spheresContract.connect(this.accounts[0]).mintIOSphere(this.account1.address, 6,1)).to.be.revertedWith(
                'exceedMaxMinting()'
            ); 
        })
        it('should not allow mint IO Spheres if mint exceed token Max Supply', async function(){
            await this.spheresContract.setIOGarageContract(this.account0.address);
            await this.spheresContract.createSphere(5, 0, 0, []);
            await expect(this.spheresContract.connect(this.accounts[0]).mintIOSphere(this.account1.address,6,2)).to.be.revertedWith(
                'mintExceededMaxSupply()'
            ); 
        })
        it('should allow mintIOSpheres', async function(){
            await this.spheresContract.setIOGarageContract(this.account0.address);
            await this.spheresContract.connect(this.accounts[0]).mintIOSphere(this.account1.address,5,1);
            let AllTokens = await this.spheresContract.AllTokens(1);
            expect(AllTokens.totalSupply).to.equal(5);
            await verifyAccountBalance(this.spheresContract, this.account1.address, 5, 1);
        })
    })

    describe('IOSpheres:uri', function(){
        beforeEach(async function() {
            const baseURI = 'https://someLink.com/';
            await this.spheresContract.setBaseURI(baseURI);
        })
        it('should not allow retrieve uri if tokenId doesnt exist', async function(){
            await expect(this.spheresContract.uri(2)).to.be.revertedWith(
                'nonExistentTokenId()'
            );
        })
        it('should retrieve uri', async function(){
            await this.spheresContract.setIOGarageContract(this.account0.address);
            await this.spheresContract.connect(this.accounts[0]).mintIOSphere(this.account1.address,5,1);
            let uri = await this.spheresContract.uri(1);
            expect(uri).to.equal('https://someLink.com/1');
        })
    })

    describe('IOGarage:revealGarage', function(){
        beforeEach(async function() {
            await this.garageContract.toggleFreeMint();
            await this.garageContract.setMerkleRoot(
                '0xf13a391f6d2671c1790bb6c75c2d0f112183d1ede45f85b773ea203222a44974'
            );
            await this.garageContract.connect(this.accounts[0]).freeMint(this.account0.allowedQuantity, this.account0.allowedQuantity, this.account0.merkleProof,{});
            await this.garageContract.setSignerAddress('0x3DF0B8878FCE2973d98f9BE9f64b46aF979Bb658');
            await this.ridesContract.setIOGarageContract(this.garageContract.address);
            await this.spheresContract.setIOGarageContract(this.garageContract.address);
        })
        it('should not allow reveal garage if reveal is not allowed', async function(){
            await expect(this.garageContract.connect(this.accounts[0]).revealGarage(getSignature(0), getNonce(0),1,2,1)).to.be.revertedWith(
                'revealIsNotAllowed()'
            );
        })
        it('should not allow reveal garage if nonce has been used', async function(){
            await this.garageContract.setIORidesContract(this.ridesContract.address);
            await this.garageContract.setIOSpheresContract(this.spheresContract.address);
            await this.garageContract.toggleAllowedOpenGarage();
            await this.garageContract.connect(this.accounts[0]).revealGarage(getSignature(0), getNonce(0),1,2,1);
            await expect(this.garageContract.connect(this.accounts[0]).revealGarage(getSignature(0), getNonce(0),2,2,1)).to.be.revertedWith(
                'NonceHasBeenUsed()'
            );
        })
        it('should not allow reveal garage if IORidesContract is address 0', async function(){
            await this.garageContract.setIORidesContract(this.ridesContract.address);
            await this.garageContract.setIOSpheresContract(this.spheresContract.address);
            await this.garageContract.toggleAllowedOpenGarage();
            await this.garageContract.setIORidesContract('0x0000000000000000000000000000000000000000');
            await expect(this.garageContract.connect(this.accounts[0]).revealGarage(getSignature(0), getNonce(0),1,2,1)).to.be.revertedWith(
                'ioRidesIsNotOpen()'
            );
        })
        it('should not allow reveal garage if IOSpheresContract is address 0', async function(){
            await this.garageContract.setIORidesContract(this.ridesContract.address);
            await this.garageContract.setIOSpheresContract(this.spheresContract.address);
            await this.garageContract.toggleAllowedOpenGarage();
            await this.garageContract.setIOSpheresContract('0x0000000000000000000000000000000000000000');
            await expect(this.garageContract.connect(this.accounts[0]).revealGarage(getSignature(0), getNonce(0),1,2,1)).to.be.revertedWith(
                'ioSphereIsNotOpen()'
            );
        })
        it('should not allow reveal garage if sender is not the token owner', async function(){
            await this.garageContract.setIORidesContract(this.ridesContract.address);
            await this.garageContract.setIOSpheresContract(this.spheresContract.address);
            await this.garageContract.toggleAllowedOpenGarage();
            await expect(this.garageContract.connect(this.accounts[1]).revealGarage(getSignature(3), getNonce(3),1,2,1)).to.be.revertedWith(
                'userIsNotTokenOwner()'
            );
        })
        it('should not allow reveal garage if signer is wrong', async function(){
            await this.garageContract.setIORidesContract(this.ridesContract.address);
            await this.garageContract.setIOSpheresContract(this.spheresContract.address);
            await this.garageContract.toggleAllowedOpenGarage();
            await expect(this.garageContract.connect(this.accounts[0]).revealGarage(getSignature(3), getNonce(3),1,2,1)).to.be.revertedWith(
                'DirectAccessFromBotNotAllowed()'
            );
        })
        it('should allow reveal garage', async function(){
            await this.garageContract.setIORidesContract(this.ridesContract.address);
            await this.garageContract.setIOSpheresContract(this.spheresContract.address);
            await this.garageContract.toggleAllowedOpenGarage();
            await this.garageContract.connect(this.accounts[0]).revealGarage(getSignature(0), getNonce(0),1,2,1);
            let tokenReveledAmount = await this.garageContract.tokenRevealedAmount();
            expect(tokenReveledAmount).to.equal(1);
            await verifyTotalSupply(this.garageContract,14);
            await verifyAccountBalance(this.garageContract, this.account0.address, 14);
            await verifyTotalSupply(this.ridesContract,1);
            await verifyAccountBalance(this.ridesContract, this.account0.address, 1);
            let AllTokens = await this.spheresContract.AllTokens(1);
            expect(AllTokens.totalSupply).to.equal(2);
            await verifyAccountBalance(this.spheresContract, this.account0.address, 2, 1);
        })
        
    })

    describe('IOGarage:getOwnerRevealedTokens', function(){
        it('should not retrieve ownerRevealedTokens if it is empty', async function(){
            await expect(this.garageContract.getOwnerRevealedTokens()).to.be.revertedWith(
                'addressDoesntRevealAnyToken()'
            );
        })
        it('should retrieve ownerRevealedTokens', async function(){
            await this.garageContract.toggleFreeMint();
            await this.garageContract.setMerkleRoot(
                '0xf13a391f6d2671c1790bb6c75c2d0f112183d1ede45f85b773ea203222a44974'
            );
            await this.garageContract.connect(this.accounts[0]).freeMint(this.account0.allowedQuantity, this.account0.allowedQuantity, this.account0.merkleProof,{});
            await this.garageContract.setSignerAddress('0x3DF0B8878FCE2973d98f9BE9f64b46aF979Bb658');
            await this.ridesContract.setIOGarageContract(this.garageContract.address);
            await this.spheresContract.setIOGarageContract(this.garageContract.address);
            await this.garageContract.setIORidesContract(this.ridesContract.address);
            await this.garageContract.setIOSpheresContract(this.spheresContract.address);
            await this.garageContract.toggleAllowedOpenGarage();
            await this.garageContract.connect(this.accounts[0]).revealGarage(getSignature(0), getNonce(0),1,2,1);
            let revealedTokens = await this.garageContract.getOwnerRevealedTokens();
            expect(revealedTokens).to.have.lengthOf(1);
        })
    })
})