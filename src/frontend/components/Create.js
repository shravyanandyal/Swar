import axios from 'axios';
import { useState } from 'react';
import { ethers } from "ethers";
import { Form, Button, Alert } from 'react-bootstrap';
import './Create.css';  // Ensure to create this CSS file in your project
import { useParams } from 'react-router';

const Create = ({ marketplace, nft, account, songs }) => {
  const { songId } = useParams(); // Fetching songId from URL params
  const [name, setName] = useState("");
  const [artist, setArtist] = useState("");
  const [desc, setDescription] = useState("");
  const [duration, setDuration] = useState(7); // Default duration in days
  const [price, setPrice] = useState("0.001");
  const [loading, setLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);

  const calculateMaxPrice = (song) => {
    const maxPricePerListen = 0.001; // 0.001 ETH per listen
    if(song.listenCount==0) return maxPricePerListen
    return song.listenCount * maxPricePerListen;
  };

  const sendFilesToIPFS = async (e) => {
    e.preventDefault();
    if (!name || !artist || !desc  || !duration) {
      setAlertMessage("Please fill all fields!");
      return;
    }

    const selectedSong = songs.find(song => song.id === parseInt(name));
    if (!selectedSong) {
      setAlertMessage("Selected song not found in your uploaded songs.");
      return;
    }

    if (artist !== selectedSong.artistName) {
      setAlertMessage("Artist name does not match!");
      return;
    }

    if (selectedSong.songName.toLowerCase() !== desc.toLowerCase()) {
      setAlertMessage("Song name does not match!");
      return;
    }

    if (parseInt(songId) !== selectedSong.id) {
      setAlertMessage("The selected song does not match the chosen song.");
      return;
    }

    const maxPrice = calculateMaxPrice(selectedSong);
    if (parseFloat(price) > maxPrice) {
      setAlertMessage(`Price exceeds the maximum allowed (${maxPrice.toFixed(3)} ETH). Please set a lower price.`);
      return;
    }

    setLoading(true);
    try {
      // No need to upload an image, use the song's thumbnail directly
      const imgHash = selectedSong.thumbnail;  // Already stored thumbnail URL
      await sendJSONtoIPFS(imgHash, selectedSong);
    } catch (error) {
      console.error("Files to IPFS: ", error);
      setAlertMessage("Error uploading metadata. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const sendJSONtoIPFS = async (imgHash, selectedSong) => {
    try {
      const resJSON = await axios.post("https://api.pinata.cloud/pinning/pinJsonToIPFS", {
        name: selectedSong.songName,
        description: selectedSong.artistName,
        image: imgHash,  // Use the song's thumbnail URL here
        audio: selectedSong.audio,
        songId: selectedSong.id  // Add this line to include the song ID
      }, {
        headers: {
          'pinata_api_key': process.env.REACT_APP_PINATA_API_KEY,
          'pinata_secret_api_key': process.env.REACT_APP_PINATA_SECRET_API_KEY,
        },
      });

      const tokenURI = `https://gateway.pinata.cloud/ipfs/${resJSON.data.IpfsHash}`;
      await mintThenList(tokenURI, selectedSong);
    } catch (error) {
      console.error("JSON to IPFS: ", error);
      setAlertMessage("Error uploading JSON. Please try again.");
    }
  };

  const mintThenList = async (uri, selectedSong) => {
    try {
      if (account !== selectedSong.artistId) {
        setAlertMessage("You can only create NFTs for your own songs.");
        return;
      }

      await (await nft.mint(uri)).wait();
      const id = await nft.tokenCount();
      await (await nft.setApprovalForAll(marketplace.address, true)).wait();
      const listingPrice = ethers.utils.parseEther(price.toString());
      const accessDuration = duration*24*60*60 ; // Convert days to seconds
      await (await marketplace.makeItem(nft.address, id, listingPrice, accessDuration)).wait();
    } catch (error) {
      console.error("Mint then List: ", error);
      setAlertMessage("Error minting NFT. Please try again.");
    }
  };

  return (
    <div className="create-container">
      <div className="form-container">
        <Form.Control onChange={(e) => setName(e.target.value)} type="text" placeholder="Song ID" />
        <Form.Control onChange={(e) => setArtist(e.target.value)} type="text" placeholder="Artist Name" />
        <Form.Control onChange={(e) => setDescription(e.target.value)} type="text" placeholder="Song Name" />
        
        {alertMessage && <Alert variant="danger" onClose={() => setAlertMessage(null)} dismissible>{alertMessage}</Alert>}
        <Button onClick={sendFilesToIPFS} variant="primary" disabled={loading}>
          {loading ? 'Processing...' : 'Create & List NFT!'}
        </Button>
      </div>
    </div>
  );
};

export default Create;
