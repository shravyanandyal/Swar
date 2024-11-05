import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Row, Col, Card, Button } from "react-bootstrap";
import axios from "axios"; // Ensure axios is imported for fetching metadata

export default function MyPurchases({ marketplace, nft, account }) {
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  // Original price constant (use the actual original price from your contract or listing)
  const ORIGINAL_PRICE = ethers.utils.parseEther("0.001"); // Original price is 0.001 ETH

  // Fetch songs metadata from Pinata
  const fetchSongsFromPinata = async () => {
    const songsIpfsHash = localStorage.getItem("songsIpfsHash");
    if (!songsIpfsHash) {
      console.error("No IPFS hash found in local storage.");
      return [];
    }

    console.log("Fetching songs using IPFS hash:", songsIpfsHash);

    try {
      const metadataResponse = await axios.get(
        `https://gateway.pinata.cloud/ipfs/${songsIpfsHash}`
      );
      const metadata = metadataResponse.data;

      console.log("Fetched songs metadata:", metadata);
      return metadata; // Return the fetched metadata
    } catch (error) {
      console.error("Error fetching songs from Pinata:", error);
      return []; // Return an empty array on error
    }
  };
  const loadPurchasedItems = async () => {
    try {
      const songsMetadata = await fetchSongsFromPinata();
      const filter = marketplace.filters.Bought(
        null,
        null,
        null,
        null,
        null,
        account
      );
      const results = await marketplace.queryFilter(filter);

      const purchases = await Promise.all(
        results.map(async (i) => {
          const { itemId, tokenId, price } = i.args;
          console.log("price passed", price.toNumber());
          const uri = await nft.tokenURI(tokenId);
          const response = await fetch(uri);
          const metadata = await response.json();
          const songData = songsMetadata.find(
            (song) =>
              song.songName.toLowerCase() === metadata.name.toLowerCase()
          );

          // Format purchase price
          const formattedPurchasePrice = ethers.utils.formatEther(price);
          const originalPriceInWei = price; // Store the original price in Wei

          const { purchaseTime, accessDuration } =
            await marketplace.getPurchaseInfo(itemId, account);

          const currentTime = Math.floor(Date.now() / 1000);
          const expiryTime = parseInt(purchaseTime) + parseInt(accessDuration);
          const timeLeftInSeconds = expiryTime - currentTime;

          const daysLeft = Math.max(
            0,
            Math.floor(timeLeftInSeconds / (60 * 60 * 24))
          );
          const hoursLeft = Math.max(
            0,
            Math.floor((timeLeftInSeconds % (60 * 60 * 24)) / (60 * 60))
          );
          const minutesLeft = Math.max(
            0,
            Math.floor((timeLeftInSeconds % (60 * 60)) / 60)
          );

          // Override hasAccess based on time left
          const hasAccess = timeLeftInSeconds > 0;

          // Calculate dynamic price
          const alpha = 0.1; // Adjust based on engagement data
          const beta = 1; // Adjust based on engagement data
          const likesFactor = Math.log1p(songData.likesCount); // log(likesCount + 1)
          const listensFactor = Math.log1p(songData.listenCount); // log(listenCount + 1)

          // Calculate the dynamic price based on popularity
          const popularityFactor =
            1 + alpha * likesFactor + beta * listensFactor;
          console.log("popularity factor", popularityFactor);
          const dynamicPrice = ethers.utils.parseEther(
            (
              parseFloat(ethers.utils.formatEther(ORIGINAL_PRICE)) *
              popularityFactor
            ).toFixed(5)
          );
          console.log("dynamic price here", dynamicPrice.toNumber());
          // Check if there's a renewed price in local storage
          const renewedPrice = localStorage.getItem(`renewedPrice-${itemId}`);
          return {
            dynamicPrice: dynamicPrice,
            originalPrice: originalPriceInWei, // Store the original price in Wei
            totalPrice: formattedPurchasePrice, 
            itemId,
            name: metadata.name,
            description: metadata.description,
            image: metadata.image,
            hasAccess, // Updated based on time left
            daysLeft,
            hoursLeft,
            minutesLeft,
          };
        })
      );

      setPurchases(purchases);
    } catch (error) { 
      console.error("Error loading purchased items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async (item) => {
    try {
      // Fetch the original price (price at which the NFT was bought)
      const originalPriceInWei = ethers.utils.parseUnits(item.totalPrice, 18); // Original price
  
      // Fetch the last renewal price from localStorage, if any
      const lastRenewalPriceInEther = localStorage.getItem(`lastRenewalPrice-${item.itemId}`);
      const lastRenewalPriceInWei = lastRenewalPriceInEther
        ? ethers.utils.parseUnits(lastRenewalPriceInEther, 18)
        : originalPriceInWei; // Fallback to original price if no previous renewals

        console.log("last renewal price",lastRenewalPriceInWei.toNumber());
  
      // Fetch the last dynamic price from localStorage, if any
      const lastDynamicPriceInEther = localStorage.getItem(`lastDynamicPrice-${item.itemId}`);
      const lastDynamicPriceInWei = lastDynamicPriceInEther
        ? ethers.utils.parseUnits(lastDynamicPriceInEther, 18)
        : originalPriceInWei; // Fallback to original price if no previous dynamic price
  

      console.log("last dynamic price",lastDynamicPriceInWei.toNumber())
      // Fetch the current dynamic price
      const currentDynamicPriceInWei = item.dynamicPrice;
     console.log("current dynamic price",currentDynamicPriceInWei.toNumber());
      let renewalPrice;
  
      // Case 1: Dynamic price hasn't changed, use the last renewal price
      if (currentDynamicPriceInWei.eq(lastDynamicPriceInWei)) {
        renewalPrice = lastRenewalPriceInWei;
      }
  
      // Case 2: Dynamic price has increased, apply 20% increase on the difference
      else if (currentDynamicPriceInWei.gt(lastDynamicPriceInWei)) {
        renewalPrice = lastRenewalPriceInWei.add(
          currentDynamicPriceInWei.sub(lastDynamicPriceInWei).mul(20).div(100)
        );
      }
  
      // Case 3: Dynamic price has decreased, use the lower of current dynamic or last renewal price
      else {
        renewalPrice = ethers.BigNumber.from(
          Math.min(
            currentDynamicPriceInWei.toNumber(),
            lastRenewalPriceInWei.toNumber()
          )
        );
      }
  
      // Log final renewal price for clarity
      console.log("Final Renewal Price in wei:", renewalPrice.toString());
  
      // Call the renewal function with the calculated renewal price
      const tx = await marketplace.renewAccess(
        item.itemId,
        renewalPrice, // Pass the current dynamic price
        {
          value: renewalPrice, // Set the renewal price
        }
      );
      await tx.wait();
  
      // Update local storage with the new dynamic price and renewal price
      localStorage.setItem(
        `lastDynamicPrice-${item.itemId}`,
        ethers.utils.formatEther(currentDynamicPriceInWei)
      );
      localStorage.setItem(
        `lastRenewalPrice-${item.itemId}`,
        ethers.utils.formatEther(renewalPrice)
      );
  
  
      loadPurchasedItems(); // Reload purchases after renewal
    } catch (error) {
      console.error("Error renewing access:", error);
    }
  };
  
  useEffect(() => {
    loadPurchasedItems();
  }, [account, marketplace, nft]);

  if (loading) {
    return (
      <main style={{ padding: "1rem 0" }}>
        <h2>Loading...</h2>
      </main>
    );
  }

  return (
    <div className="flex justify-center">
      {purchases.length > 0 ? (
        <div className="px-5 container">
          <Row xs={1} md={2} lg={4} className="g-4 py-5">
            {purchases.map((item, idx) => (
              <Col key={idx} className="overflow-hidden">
                <Card style={{ backgroundColor: "black" }}>
                  <Card.Img variant="top" src={item.image} />
                  <Card.Body>
                    <Card.Title style={{color:"grey"}}>{item.name}</Card.Title>
                    <Card.Text style={{color:"grey"}} >{item.description}</Card.Text>
                    <div style={{ color: item.hasAccess ? "green" : "red" }}>
                      {item.hasAccess ? "Access Granted" : "Access Expired"}
                    </div>
                    <div style={{color:"grey"}}>
                      {item.daysLeft > 0 ||
                      item.hoursLeft > 0 ||
                      item.minutesLeft > 0
                        ? `Time left: ${item.daysLeft} day(s), ${item.hoursLeft} hr(s), ${item.minutesLeft} min(s)`
                        : ""}
                    </div>
                  </Card.Body>
                  <Card.Footer style={{color:"grey"}}>
                    {localStorage.getItem(`lastRenewalPrice-${item.itemId}`)? localStorage.getItem(`lastRenewalPrice-${item.itemId}`):item.totalPrice } ETH
                    {/* Renew button only if access is expired */}
                    <br />
                    {!item.hasAccess && (
                      <Button
                        variant="success"
                        onClick={() => handleRenew(item)}
                        className="mt-2"
                      >
                        Renew Access
                      </Button>
                    )}
                  </Card.Footer>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      ) : (
        <main style={{ padding: "1rem 0" }}>
          <h2>No purchases</h2>
        </main>
      )}
    </div>
  );
}
