// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "./erc721a/contracts/extensions/ERC721AQueryable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {IERC2981, ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {IERC721A, ERC721A} from "./erc721a/contracts/ERC721A.sol";
import "closedsea/src/OperatorFilterer.sol";

error ioRidesIsNotOpen();
error ioSphereIsNotOpen();
error maxSupplyExceeded();
error freeMintIsNotOpened();
error publicMintIsNotOpened();
error maxClaimExceeded();
error ineligibleForFreeMint();
error directMintFromContractNotAllowed();
error revealIsNotAllowed();
error userIsNotTokenOwner();
error invalidMintAmount();
error addressDoesntRevealAnyToken();
error exceedmaxPublicMintPerWallet();
error DirectAccessFromBotNotAllowed();
error exceedPublicMintAllowance();
error exceedFreeMintAllowance();
error InsufficientETHSent();
error NonceHasBeenUsed();

abstract contract IORides {
    function mintIORide(address to, uint256 tokenId)
        external
        virtual
        returns (uint256);
}

abstract contract IOSpheres {
    function mintIOSphere(
        address to,
        uint256 qty,
        uint256 tokenId
    ) external virtual returns (uint256);
}

contract IOGarage is
    ERC721AQueryable,
    ReentrancyGuard,
    Ownable,
    OperatorFilterer,
    ERC2981
{
    using ECDSA for bytes32;
    using Strings for uint256;

    address public signerAddress;

    uint256 public constant MAX_SUPPLY = 20_000;
    address payable public constant GNOSIS_SAFE =
        payable(0xfF3a0a8b9B38FCFe22E738b4639a6E978bf3B080);

    uint256 public publicMintPrice = 0.01 ether;
    string public baseURI;
    bytes32 public merkleRoot;

    bool public isRevealAllowed;
    bool public isFreeMintOpened;
    bool public isPublicMintOpened;

    address public IORidesContract;
    address public IOSpheresContract;

    mapping(address => uint256) public publicMinted;
    mapping(address => uint256) public freeMintClaimed;
    mapping(address => uint256[]) public ownerRevealedTokens;
    mapping(string => bool) public usedNonces;

    uint256 public publicMintSupply = 10_000; //dummy data
    uint256 public freeMintSupply = 10_000; //dummy data
    uint256 public maxPublicMintPerWallet = 2; // dummy data

    uint256 public tokenRevealedAmount;
    uint256 public publicMintAmount;
    uint256 public freeMintAmount;

    bool public operatorFilteringEnabled;

    event IORidesMinted(uint256 tokenId);
    event IOSpheresMinted(uint256 tokenId, uint256 qty);

    constructor(string memory _name, string memory _symbol)
        ERC721A(_name, _symbol)
    {

        _registerForOperatorFiltering();
        operatorFilteringEnabled = true;
        _setDefaultRoyalty(msg.sender, 1000);
    }

    modifier callerIsUser() {
        if (tx.origin != msg.sender) revert directMintFromContractNotAllowed();
        _;
    }

    modifier mintCompliance(uint256 _mintAmount) {
        if (_mintAmount <= 0) revert invalidMintAmount();
        if (_totalMinted() + _mintAmount > MAX_SUPPLY)
            revert maxSupplyExceeded();
        _;
    }

    // ====== Transaction ======

    function freeMint(
        uint256 _mintAmount,
        uint256 _allowedMintAmount,
        bytes32[] memory _merkleproof
    ) public mintCompliance(_mintAmount) nonReentrant callerIsUser {
        if (!isFreeMintOpened) revert freeMintIsNotOpened();
        if (freeMintClaimed[msg.sender] + _mintAmount > _allowedMintAmount)
            revert maxClaimExceeded();
        if (
            freeMintSupply > 0 &&
            (freeMintAmount + _mintAmount) > freeMintSupply
        ) revert exceedFreeMintAllowance();

        bytes32 leaf = keccak256(
            abi.encodePacked(msg.sender, _allowedMintAmount)
        );
        if (!MerkleProof.verify(_merkleproof, merkleRoot, leaf))
            revert ineligibleForFreeMint();

        unchecked {
            freeMintClaimed[msg.sender] += _mintAmount;
            freeMintAmount += _mintAmount;
        }

        _safeMint(msg.sender, _mintAmount);
    }

    function publicMint(
        bytes calldata signature,
        string calldata nonce,
        uint256 _mintAmount
    ) public payable mintCompliance(_mintAmount) nonReentrant callerIsUser {
        if (!isPublicMintOpened) revert publicMintIsNotOpened();
        if (usedNonces[nonce]) revert NonceHasBeenUsed();
        if (
            publicMintSupply > 0 &&
            (publicMintAmount + _mintAmount) > publicMintSupply
        ) revert exceedPublicMintAllowance();
        if (
            maxPublicMintPerWallet > 0 &&
            (publicMinted[msg.sender] + _mintAmount) > maxPublicMintPerWallet
        ) revert exceedmaxPublicMintPerWallet();
        if (
            !matchAddresSigner(
                hashTransaction(msg.sender, _mintAmount, nonce),
                signature
            )
        ) revert DirectAccessFromBotNotAllowed();
        if (msg.value < _mintAmount * publicMintPrice)
            revert InsufficientETHSent();

        usedNonces[nonce] = true;
        GNOSIS_SAFE.transfer(msg.value);

        unchecked {
            publicMinted[msg.sender] += _mintAmount;
            publicMintAmount += _mintAmount;
        }

        _safeMint(msg.sender, _mintAmount);
    }

    function matchAddresSigner(bytes32 hash, bytes memory signature)
        private
        view
        returns (bool)
    {
        return signerAddress == hash.recover(signature);
    }

    function hashTransaction(
        address sender,
        uint256 _mintAmount,
        string memory nonce
    ) private pure returns (bytes32) {
        bytes32 hash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked(sender, _mintAmount, nonce))
            )
        );
        return hash;
    }

    function revealGarage(
        bytes calldata signature,
        string calldata nonce,
        uint256 tokenId,
        uint256 sphereQty,
        uint256 sphereId
    ) public nonReentrant callerIsUser {
        if (!isRevealAllowed) revert revealIsNotAllowed();
        if (usedNonces[nonce]) revert NonceHasBeenUsed();
        if (IORidesContract == address(0)) revert ioRidesIsNotOpen();
        if (IOSpheresContract == address(0)) revert ioSphereIsNotOpen();
        if (ownerOf(tokenId) != msg.sender) revert userIsNotTokenOwner();
        if (
            !matchAddresSigner(
                hashTransaction(msg.sender, sphereQty, nonce),
                signature
            )
        ) revert DirectAccessFromBotNotAllowed();

        usedNonces[nonce] = true;

        IORides ioride = IORides(IORidesContract);
        IOSpheres iospheres = IOSpheres(IOSpheresContract);

        _burn(tokenId, true);

        unchecked {
            tokenRevealedAmount += 1;
        }
        ownerRevealedTokens[msg.sender].push(tokenId);

        uint256 ioRidesToken = ioride.mintIORide(msg.sender, tokenId);
        uint256 ioSphereToken = iospheres.mintIOSphere(
            msg.sender,
            sphereQty,
            sphereId
        );

        emit IORidesMinted(ioRidesToken);
        emit IOSpheresMinted(ioSphereToken, sphereQty);
    }

    function getOwnerRevealedTokens() external view returns (uint256[] memory) {
        if (ownerRevealedTokens[msg.sender].length == 0)
            revert addressDoesntRevealAnyToken();

        unchecked {
            uint256[] memory tokens = new uint256[](
                ownerRevealedTokens[msg.sender].length
            );
            for (
                uint256 i = 0;
                i < ownerRevealedTokens[msg.sender].length;
                ++i
            ) {
                tokens[i] = ownerRevealedTokens[msg.sender][i];
            }
            return tokens;
        }
    }

    // ====== ADMIN ======

    function setBaseURI(string calldata _uri) external onlyOwner {
        baseURI = _uri;
    }

    function toggleFreeMint() external onlyOwner {
        isFreeMintOpened = !isFreeMintOpened;
    }

    function togglePublicMint() external onlyOwner {
        isPublicMintOpened = !isPublicMintOpened;
    }

    function toggleAllowedOpenGarage() external onlyOwner {
        if (IORidesContract == address(0)) revert ioRidesIsNotOpen();
        if (IOSpheresContract == address(0)) revert ioSphereIsNotOpen();
        isRevealAllowed = !isRevealAllowed;
    }

    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        merkleRoot = _merkleRoot;
    }

    function setIORidesContract(address _contract) external onlyOwner {
        IORidesContract = _contract;
    }

    function setIOSpheresContract(address _contract) external onlyOwner {
        IOSpheresContract = _contract;
    }

    function setSignerAddress(address _signerAddress) external onlyOwner {
        signerAddress = _signerAddress;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    function _startTokenId() internal view virtual override returns (uint256) {
        return 1;
    }

    // ====== override ======
     function setApprovalForAll(address operator, bool approved)
        public
        override (IERC721A, ERC721A)
        onlyAllowedOperatorApproval(operator)
    {
        super.setApprovalForAll(operator, approved);
    }

    function approve(address operator, uint256 tokenId)
        public
        payable
        override (IERC721A, ERC721A)
        onlyAllowedOperatorApproval(operator)
    {
        super.approve(operator, tokenId);
    }

    function transferFrom(address from, address to, uint256 tokenId)
        public
        payable
        override (IERC721A, ERC721A)
        onlyAllowedOperator(from)
    {
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId)
        public
        payable
        override (IERC721A, ERC721A)
        onlyAllowedOperator(from)
    {
        super.safeTransferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data)
        public
        payable
        override (IERC721A, ERC721A)
        onlyAllowedOperator(from)
    {
        super.safeTransferFrom(from, to, tokenId, data);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override (IERC721A, ERC721A, ERC2981)
        returns (bool)
    {
        // Supports the following `interfaceId`s:
        // - IERC165: 0x01ffc9a7
        // - IERC721: 0x80ac58cd
        // - IERC721Metadata: 0x5b5e139f
        // - IERC2981: 0x2a55205a
        return ERC721A.supportsInterface(interfaceId) || ERC2981.supportsInterface(interfaceId);
    }

    function setDefaultRoyalty(address receiver, uint96 feeNumerator) public onlyOwner {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    function setOperatorFilteringEnabled(bool value) public onlyOwner {
        operatorFilteringEnabled = value;
    }

    function _operatorFilteringEnabled() internal view override returns (bool) {
        return operatorFilteringEnabled;
    }

    function _isPriorityOperator(address operator) internal pure override returns (bool) {
        // OpenSea Seaport Conduit:
        // https://etherscan.io/address/0x1E0049783F008A0085193E00003D00cd54003c71
        // https://goerli.etherscan.io/address/0x1E0049783F008A0085193E00003D00cd54003c71
        return operator == address(0x1E0049783F008A0085193E00003D00cd54003c71);
    }

}