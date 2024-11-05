import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Row, Col, Card, Button } from "react-bootstrap";
import styles from "./MyListedItems.module.css";
import axios from "axios";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom"; // Import useHistory



export default function MyListedItems({ marketplace, nft, account }) {
  const [loading, setLoading] = useState(true);
  const [listedItems, setListedItems] = useState([]);
  const [songs, setSongs] = useState([]);
  const [soldNFTs, setSoldNFTs] = useState([]);
  const pinataApiKey = process.env.REACT_APP_PINATA_API_KEY;
  const pinataSecretApiKey = process.env.REACT_APP_PINATA_SECRET_API_KEY;
  const ORIGINAL_PRICE = ethers.utils.parseEther("0.001"); // Original price is 0.001 ETH



  const history = useNavigate(); // Initialize history
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

  const loadListedItems = async () => {
    setLoading(true);
    try {
      const itemCount = await marketplace.itemCount();
      let _listedItems = [];
      const songsMetadata = await fetchSongsFromPinata();
      for (let indx = 1; indx <= itemCount; indx++) {
        const i = await marketplace.items(indx);
        if (i.seller.toLowerCase() === account.toLowerCase()) {
          const uri = await nft.tokenURI(i.tokenId);
          const response = await fetch(uri);
          const metadata = await response.json();
          const totalPrice = await marketplace.getTotalPrice(i.itemId);
          const songData = songsMetadata.find(
            (song) =>
              song.songName.toLowerCase() === metadata.name.toLowerCase()
          );

          if (!songData) {
            console.warn(`No song data found for tokenId: ${item.tokenId}`);
            continue;
          }
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

          let item = {
            totalPrice,
            dynamicPrice: dynamicPrice,
            price: i.price,
            itemId: i.itemId,
            name: metadata.name,
            description: metadata.description,
            image: metadata.image,
            artist: metadata.artistName,
          };

          _listedItems.push(item);
        }
      }
      setListedItems(_listedItems);
    } catch (error) {
      console.error("Error loading listed items:", error);
    }
    setLoading(false);
  };

  const fetchSongs = async () => {
    const existingIpfsHash = localStorage.getItem("songsIpfsHash");
    if (!existingIpfsHash || !account) {
      console.log("No existing IPFS hash found or no account connected.");
      return;
    }

    try {
      const response = await axios.get(
        `https://gateway.pinata.cloud/ipfs/${existingIpfsHash}`
      );
      if (response.data) {
        // Filter songs based on artistId matching the current MetaMask account
        const userSongs = response.data.filter((song) => {
          if (song.artistId) {
            return song.artistId.toLowerCase() === account.toLowerCase();
          }
          return false;
        });
        setSongs(userSongs);
      }
    } catch (error) {
      console.error("Error fetching songs:", error);
    }
  };

  const loadSoldNFTs = async () => {
    setLoading(true);
    try {
      const itemCount = await marketplace.itemCount();
      let _soldNFTs = [];

      for (let indx = 1; indx <= itemCount; indx++) {
        const i = await marketplace.items(indx);
        console.log("Item:", i);
        if (
          i.buyer &&
          account &&
          i.buyer.toLowerCase() === account.toLowerCase()
        ) {
          const uri = await nft.tokenURI(i.tokenId);
          const response = await fetch(uri);
          const metadata = await response.json();
          const totalPrice = await marketplace.getTotalPrice(i.itemId);

          let nftItem = {
            totalPrice,
            price: i.price,
            itemId: i.itemId,
            name: metadata.name,
            description: metadata.description,
            image: metadata.image,
            artist: metadata.artistName,
          };

          _soldNFTs.push(nftItem);
        }
      }
      setSoldNFTs(_soldNFTs);
    } catch (error) {
      console.error("Error loading sold NFTs:", error);
    }
    setLoading(false);
  };

  const toggleFreeStatus = async (songId) => {
    // Ask the user for confirmation before changing the song status
    const userConfirmed = window.confirm(
      "Do you want to change the song's status?"
    );

    // If the user clicked "Cancel", exit the function
    if (!userConfirmed) {
      return;
    }

    try {
      const songsIpfsHash = localStorage.getItem("songsIpfsHash");
      const metadataResponse = await axios.get(
        `https://gateway.pinata.cloud/ipfs/${songsIpfsHash}`
      );

      let metadata = metadataResponse.data;

      // Find the specific song
      const songToUpdate = metadata.find((song) => song.id === songId);

      if (!songToUpdate) {
        console.error("Song not found!");
        return;
      }
      // Check if the current status is free
      const isCurrentlyFree = songToUpdate.isFree;
      // Find and toggle the isFree status for the specific song
      metadata = metadata.map((song) => {
        if (song.id === songId) {
          return { ...song, isFree: !isCurrentlyFree }; // Toggle the isFree status
        }
        return song; // Return the song unchanged
      });

      console.log("Updated metadata:", metadata);

      // Re-upload the updated metadata to IPFS
      const updatedMetadataResponse = await axios.post(
        `https://api.pinata.cloud/pinning/pinJSONToIPFS`,
        metadata,
        {
          headers: {
            "Content-Type": "application/json",
            pinata_api_key: pinataApiKey,
            pinata_secret_api_key: pinataSecretApiKey,
          },
        }
      );

      console.log("Updated metadata on IPFS:", updatedMetadataResponse.data);

      // Store the new IPFS hash in local storage
      localStorage.setItem(
        "songsIpfsHash",
        updatedMetadataResponse.data.IpfsHash
      );

      // Redirect to Create NFT if changing from free to not free
      if (isCurrentlyFree) {
        // Redirect to the create NFT component
        history(`/create-nft/${songId}`);
      } else {
        fetchSongs();
        alert(
          `Song status changed to: ${!isCurrentlyFree ? "Free" : "Not Free"}`
        );
      }
    } catch (error) {
      console.error("Error toggling song status on IPFS:", error);
    }
  };

  useEffect(() => {
    loadListedItems();
    fetchSongs();
    loadSoldNFTs();
  }, [account]);

  if (loading)
    return (
      <main style={{ padding: "1rem 0" }}>
        <h2>Loading...</h2>
      </main>
    );

    return (
      <div className={styles.container}>
        {listedItems.length > 0 ? (
          <div>
            <h2 className={styles.title}>Listed NFTs</h2>
            <Row xs={1} md={2} lg={4} className="g-4 py-3">
              {listedItems.map((item, idx) => (
                <Col key={idx} className={`overflow-hidden ${styles.col}`}>
                  <Card className={styles.card}>
                    <Card.Img variant="top" src={item.image} />
                    <Card.Footer className={styles.footer}>
                      <div>{ethers.utils.formatEther(item.dynamicPrice)} ETH</div>
                      <div>{item.name}</div>
                      <div>{item.artist}</div>
                    </Card.Footer>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        ) : (
          <main style={{ padding: "1rem 0" }}>
            <h2>No listed NFTs</h2>
          </main>
        )}
        
        {songs.length > 0 ? (
          <div>
            <hr />
            <h2 className={styles.title}>Uploaded Songs</h2>
            <Row xs={1} md={2} lg={4} className="g-4 py-3">
              {songs.map((song, idx) => (
                <Col key={idx} className={`overflow-hidden ${styles.col}`}>
                  <Card className={styles.card}>
                    <Card.Img variant="top" src={song.thumbnail} />
                    <Card.Body>
                      <Card.Title>Song ID: {song.id}</Card.Title>
                      <Card.Text>Song Name: {song.songName}</Card.Text>
                      <Card.Text>Artist: {song.artistName}</Card.Text>
                      <Card.Text>Listen Count: {song.listenCount}</Card.Text>
                      <Card.Text className={styles.alert}>
                        Status: {song.isFree ? "Free" : "Not Free"}
                      </Card.Text>
                      <Button
                        variant={song.isFree ? "danger" : "success"}
                        className={styles.button}
                        onClick={() => toggleFreeStatus(song.id)}
                      >
                        {song.isFree ? "Not Free" : "Free"}
                      </Button>
                      <Link to={`/create-nft/${song.id}`}>
                        <Button variant="primary" className={styles.button}>
                          Create NFT
                        </Button>
                      </Link>
                    </Card.Body>
                    <Card.Footer>
                      <audio controls src={song.audio} />
                    </Card.Footer>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        ) : (
          <main style={{ padding: "1rem 0" }}>
            <h2>No uploaded songs</h2>
          </main>
        )}
      </div>
    );
    
}
