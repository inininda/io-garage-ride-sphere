// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import {IERC721, ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IERC2981, ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import "closedsea/src/OperatorFilterer.sol";

error directMintFromContractNotAllowed();
error IOGarageContractIsNotDefined();
error notCalledUponRevealGarage();
error maxSupplyExceeded();

contract IORides is
    ERC721,
    ERC721Enumerable,
    ReentrancyGuard,
    Ownable,
    OperatorFilterer,
    ERC2981
{
    using ECDSA for bytes32;
    using Strings for uint256;

    uint256 public constant MAX_SUPPLY = 20_000;
    address public IOGarageContract;
    string public baseURI;

    bool public operatorFilteringEnabled;

    constructor(string memory _name, string memory _symbol)
        ERC721(_name, _symbol)
    {

         _registerForOperatorFiltering();
        operatorFilteringEnabled = true;
        _setDefaultRoyalty(msg.sender, 1000);
    }

    modifier callerIsUser() {
        if (tx.origin != msg.sender) revert directMintFromContractNotAllowed();
        _;
    }

    // ===== Transaction =====

    function mintIORide(address to, uint256 tokenId)
        external
        virtual
        nonReentrant
        returns (uint256)
    {
        if (IOGarageContract == address(0))
            revert IOGarageContractIsNotDefined();
        if (msg.sender != IOGarageContract) revert notCalledUponRevealGarage();
        if (totalSupply() + 1 > MAX_SUPPLY) revert maxSupplyExceeded();

        _safeMint(to, tokenId);
        return tokenId;
    }

    function OwnerTokens(address owner)
        external
        view
        returns (uint256[] memory)
    {
        uint256 tokenCount = balanceOf(owner);

        uint256[] memory tokenIds = new uint256[](tokenCount);
        for (uint256 i = 0; i < tokenCount; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, i);
        }

        return tokenIds;
    }


    // ====== ADMIN ======

    function setBaseURI(string calldata _uri) external onlyOwner {
        baseURI = _uri;
    }

    function setIOGarageContract(address _contract) external onlyOwner {
        IOGarageContract = _contract;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    // ==== override =====

    function setApprovalForAll(address operator, bool approved)
        public
        override(ERC721, IERC721)
        onlyAllowedOperatorApproval(operator)
    {
        super.setApprovalForAll(operator, approved);
    }

    function approve(address operator, uint256 tokenId)
        public
        override(ERC721, IERC721)
        onlyAllowedOperatorApproval(operator)
    {
        super.approve(operator, tokenId);
    }

    function transferFrom(address from, address to, uint256 tokenId)
        public
        override(ERC721, IERC721)
        onlyAllowedOperator(from)
    {
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId)
        public
        override(ERC721, IERC721)
        onlyAllowedOperator(from)
    {
        super.safeTransferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data)
        public
        override(ERC721, IERC721)
        onlyAllowedOperator(from)
    {
        super.safeTransferFrom(from, to, tokenId, data);
    }

     function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

      function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override (ERC721, ERC2981, ERC721Enumerable)
        returns (bool)
    {
        // Supports the following `interfaceId`s:
        // - IERC165: 0x01ffc9a7
        // - IERC721: 0x80ac58cd
        // - IERC721Metadata: 0x5b5e139f
        // - IERC2981: 0x2a55205a
        return ERC721.supportsInterface(interfaceId) || ERC2981.supportsInterface(interfaceId) || ERC721Enumerable.supportsInterface(interfaceId);
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
