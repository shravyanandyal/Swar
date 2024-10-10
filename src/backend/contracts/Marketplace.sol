// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Marketplace is ReentrancyGuard, Ownable {
    using SafeMath for uint;

    address payable public feeAccount; // Account that receives fees
    uint public feePercent; // Fee percentage for marketplace transactions
    uint public itemCount;

    struct Item {
        uint itemId;
        IERC721 nft;
        uint tokenId;
        uint price;
        address payable seller;
        uint accessDuration; // Access duration in seconds
        uint dynamicPrice; // Add this to store the dynamic price
         uint _originalPurchasePrice;
        mapping(address => uint) purchaseTimestamp; // Tracks each user's purchase timestamp
    }

    mapping(uint => Item) public items;

    event Offered(uint itemId, address indexed nft, uint tokenId, uint price, address indexed seller);
    event Bought(uint itemId, address indexed nft, uint tokenId, uint price, address indexed seller, address indexed buyer);
    event FeeTransferred(address indexed feeAccount, uint amount);
    event SellerPaid(address indexed seller, uint amount);

    constructor(uint _feePercent) {
        feeAccount = payable(msg.sender);
        feePercent = _feePercent;
    }

    function makeItem(IERC721 _nft, uint _tokenId, uint _price, uint _accessDuration) external nonReentrant {
        require(_price > 0, "Price must be greater than zero");
        require(_accessDuration > 0, "Access duration must be greater than zero");

        itemCount++;
        _nft.transferFrom(msg.sender, address(this), _tokenId);

        Item storage item = items[itemCount];
        item.itemId = itemCount;
        item.nft = _nft;
        item.tokenId = _tokenId;
        item.price = _price;
        item.seller = payable(msg.sender);
        item.accessDuration = _accessDuration;

        emit Offered(itemCount, address(_nft), _tokenId, _price, msg.sender);
    }

    function purchaseItem(uint _itemId) external payable nonReentrant {
    Item storage item = items[_itemId];

    // Ensure enough ether is sent to cover dynamic price
    require(msg.value >= item.price, "Not enough ether to cover item price");

    // Calculate the marketplace fee (based on the sent value, which is dynamic)
    uint fee = msg.value.mul(feePercent).div(100);

    // Calculate the seller's payment (deduct the marketplace fee from the dynamic price)
    uint sellerAmount = msg.value.sub(fee);

    // Pay the seller the dynamically adjusted price minus the marketplace fee
    (bool sellerPaid, ) = item.seller.call{value: sellerAmount}("");
    require(sellerPaid, "Seller payment failed");

    emit SellerPaid(item.seller, sellerAmount);

    // Pay the marketplace fee
    (bool feePaid, ) = feeAccount.call{value: fee}("");
    require(feePaid, "Fee payment failed");

    emit FeeTransferred(feeAccount, fee);

    // Record the purchase timestamp for this user
    item.purchaseTimestamp[msg.sender] = block.timestamp;

    emit Bought(_itemId, address(item.nft), item.tokenId, msg.value, item.seller, msg.sender);
}


    function hasAccess(uint _itemId, address _user) public view returns (bool) {
        Item storage item = items[_itemId];
        uint purchaseTime = item.purchaseTimestamp[_user];
        return block.timestamp <= purchaseTime + item.accessDuration;
    }

   function renewAccess(uint _itemId, uint _renewalPrice) external payable nonReentrant {
    Item storage item = items[_itemId];

    // Check if msg.value is at least the renewal price passed from the frontend
    require(msg.value >= _renewalPrice, "Not enough ether to renew access");

    // Update purchase timestamp for the user
    item.purchaseTimestamp[msg.sender] = block.timestamp;

    // Pay the seller the renewal price
    (bool sellerPaid, ) = item.seller.call{value: _renewalPrice}("");
    require(sellerPaid, "Seller payment failed");

    emit SellerPaid(item.seller, _renewalPrice);

    // Pay the marketplace fee (if any) on the total amount paid
    uint fee = msg.value.sub(_renewalPrice);
    (bool feePaid, ) = feeAccount.call{value: fee}("");
    require(feePaid, "Fee payment failed");

    emit FeeTransferred(feeAccount, fee);
}




    function getTotalPrice(uint _itemId) public view returns (uint) {
        return items[_itemId].price.mul(100 + feePercent).div(100);
    }

    function setFeeAccount(address payable _newFeeAccount) external onlyOwner {
        feeAccount = _newFeeAccount;
    }

    function setFeePercent(uint _newFeePercent) external onlyOwner {
        feePercent = _newFeePercent;
    }

    // New helper function to get purchase info
    function getPurchaseInfo(uint _itemId, address _buyer) external view returns (uint purchaseTime, uint accessDuration) {
        Item storage item = items[_itemId];
        purchaseTime = item.purchaseTimestamp[_buyer];
        accessDuration = item.accessDuration;
    }
}
