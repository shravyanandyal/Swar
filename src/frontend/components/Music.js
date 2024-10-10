import { useState, useEffect } from 'react';
import { ethers } from "ethers";
import { Row, Col, Card, Button } from 'react-bootstrap';
import axios from 'axios';
import './Music.css';  

const Main = ({ marketplace, nft, account, likedSongsByAccount }) => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

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

  const loadMarketplaceItems = async () => {
    const itemCount = await marketplace.itemCount();
    let items = [];
  
    // Fetch songs from Pinata
    const songsMetadata = await fetchSongsFromPinata();
    console.log("Songs Metadata:", songsMetadata); // Debug log
  
    for (let i = 1; i <= itemCount; i++) {
      const item = await marketplace.items(i);
      const uri = await nft.tokenURI(item.tokenId);
      const response = await fetch(uri);
      const metadata = await response.json();
    
      const songData = songsMetadata.find(song => song.songName.toLowerCase() === metadata.name.toLowerCase());
    
      if (!songData) {
        console.warn(`No song data found for tokenId: ${item.tokenId}`);
        continue;
      }
    
      // Log the item price for debugging
      console.log(`Item Price: ${item.price}`);
    
      const priceToString = ethers.utils.formatEther(item.price);
      const formattedPrice = parseFloat(priceToString);
    
      if (isNaN(formattedPrice) || formattedPrice <= 0) {
        console.error("Invalid price detected:", item.price);
        continue; // Skip this item if the price is invalid
      }
    
     // Dynamic pricing formula using logarithm
     const alpha = 0.1; // Adjust based on engagement data
     const beta = 1; // Adjust based on engagement data
     const likesFactor = Math.log1p(songData.likesCount); // log(likesCount + 1)
     const listensFactor = Math.log1p(songData.listenCount); // log(listenCount + 1)

     const popularityFactor = (1 + alpha * likesFactor + beta * listensFactor);
     const dynamicPrice = ethers.utils.parseEther((formattedPrice * popularityFactor).toFixed(5));
    
      items.push({
        dynamicPrice: dynamicPrice,
        itemId: item.itemId,
        seller: item.seller,
        name: metadata.name,
        description: metadata.description,
        image: metadata.image,
        audio: metadata.audio,
        sold: item.sold,
      });
    }
    
    console.log("item is ",items)
  
    setLoading(false);
    setItems(items);
  };
  const buyMarketItem = async (item) => {
    try {
      const dynamicPrice = item.dynamicPrice; // This is the adjusted dynamic price
  
      // Estimate gas for the purchase transaction
      const gasLimit = await marketplace.estimateGas.purchaseItem(item.itemId, { value: dynamicPrice });
      
      // Execute the purchase with the dynamic price as the value
      await (await marketplace.purchaseItem(item.itemId, { value: dynamicPrice, gasLimit })).wait();
  
      // Reload marketplace items after purchase
      loadMarketplaceItems();
    } catch (error) {
      console.error("Error purchasing item:", error);
    }
  };
  

  

  useEffect(() => {
    loadMarketplaceItems();
  }, []);

  if (loading) return <div className="loading-container">Loading...</div>;

  return (
    <div className="marketplace-container">
      {items.length > 0 ? (
        <Row xs={1} md={2} lg={3} className="g-4">
          {items.map((item, idx) => (
            <Col key={idx}>
              <Card className="nft-card">
                <Card.Img variant="top" src={item.image} className="nft-image" />
                <Card.Body style={{backgroundColor:"black"}}>
                  <Card.Title>{item.name}</Card.Title>
                  <Card.Text>{item.description}</Card.Text>
                  {item.sold ? (
                    <Button variant="custom" style={{backgroundColor:"gray"}} disabled>
                      Sold
                    </Button>
                  ) : (
                    <Button variant="custom" style={{backgroundColor:"green"}} onClick={() => buyMarketItem(item)}>
                      Buy for {ethers.utils.formatEther(item.dynamicPrice)} ETH
                    </Button>
                  )}
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <div className="no-assets"></div>
      )}
    </div>
  );
};

export default Main;
