// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/IERC1155MetadataURIUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import "closedsea/src/OperatorFilterer.sol";
import {IERC2981Upgradeable,ERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/token/common/ERC2981Upgradeable.sol";

error notCalledUponRevealGarage();
error IOGarageContractIsNotDefined();
error mintExceededMaxSupply();
error addressIsNotCreator();
error nonExistentTokenId();
error exceedMaxMinting();
error initSupplyMustBeLessThanMaxSupply();

contract tokenInitialData is OwnableUpgradeable, ERC1155Upgradeable {

    using StringsUpgradeable for uint256; 

    uint256 public tokenIdTracker;
    mapping(uint256 => tokenData) public AllTokens;

    struct tokenData {
        uint256 maxSupply;
        uint256 maxMintingPerTx;
        uint256 totalSupply;
    }

    function createSphere(
        uint256 maxSupply,
        uint256 initSupply,
        uint256 maxMintingPerTx,
        bytes memory data
    ) public onlyOwner returns (uint256 tokenId) {
        if (initSupply > maxSupply) revert initSupplyMustBeLessThanMaxSupply();

        tokenIdTracker += 1;

        tokenId = tokenIdTracker;

        AllTokens[tokenId] = tokenData({
            maxSupply: maxSupply,
            maxMintingPerTx: maxMintingPerTx,
            totalSupply: initSupply > 0 ? initSupply : 0
        });

        if (initSupply > 0) _mint(_msgSender(), tokenId, initSupply, data);
    }
}

contract IOSpheres is
    Initializable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable,
    OperatorFilterer,
    tokenInitialData,
    ERC2981Upgradeable
{
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    using StringsUpgradeable for uint256; 

    address public IOGarageContract;
    string public name; //contract name
    string public symbol; //contract symbol
    string public BaseUri;

    bool public operatorFilteringEnabled;

    function initialize(string memory _name, string memory _symbol)
        public
        initializer
    {
        __ERC1155_init("");
        __Ownable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __ERC2981_init();
        name = _name;
        symbol = _symbol;

        _registerForOperatorFiltering();
        operatorFilteringEnabled = true;
        _setDefaultRoyalty(_msgSender(), 1000);

        //initial token ID 1
        createSphere(50000, 0, 5, new bytes(0));
    }

    function mintIOSphere(
        address to,
        uint256 qty,
        uint256 _id
    ) external virtual nonReentrant returns (uint256) {
        if (_id > tokenIdTracker) revert nonExistentTokenId();
        if (IOGarageContract == address(0))
            revert IOGarageContractIsNotDefined();
        if (_msgSender() != IOGarageContract)
            revert notCalledUponRevealGarage();
        if (
            (AllTokens[_id].maxMintingPerTx > 0 &&
                qty > AllTokens[_id].maxMintingPerTx) || qty <= 0
        ) revert exceedMaxMinting();
        if (AllTokens[_id].totalSupply + qty > AllTokens[_id].maxSupply)
            revert mintExceededMaxSupply();

        unchecked {
            AllTokens[_id].totalSupply += qty;
        }
        _mint(to, _id, qty, new bytes(0));
        return _id;
    }

    // ===== Admin =====

    function setBaseURI(string memory newuri) public onlyOwner {
        BaseUri = newuri;
    }

    function uri(uint256 _tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
         if (_tokenId > tokenIdTracker) revert nonExistentTokenId();
          return
            bytes(BaseUri).length > 0
                ? string(abi.encodePacked(BaseUri,_tokenId.toString()))
                : BaseUri;
    }

    function setIOGarageContract(address _contract) external onlyOwner {
        IOGarageContract = _contract;
    }


    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}

    // ===== ovverride =====

    function setApprovalForAll(address operator, bool approved)
        public
        override
        onlyAllowedOperatorApproval(operator)
    {
        super.setApprovalForAll(operator, approved);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        bytes memory data
    ) public override onlyAllowedOperator(from) {
        super.safeTransferFrom(from, to, tokenId, amount, data);
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public override onlyAllowedOperator(from) {
        super.safeBatchTransferFrom(from, to, ids, amounts, data);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override (ERC1155Upgradeable, ERC2981Upgradeable)
        returns (bool)
    {
        // Supports the following `interfaceId`s:
        // - IERC165: 0x01ffc9a7
        // - IERC1155: 0xd9b67a26
        // - IERC1155MetadataURI: 0x0e89341c
        // - IERC2981: 0x2a55205a
        return ERC1155Upgradeable.supportsInterface(interfaceId)
            || ERC2981Upgradeable.supportsInterface(interfaceId);
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
