import React, { useEffect, useState, useContext } from "react";
import { SimulatedDayContext } from "./SimulatedDayContext";
import "./Royalty.css"; // Importing CSS file
import { ethers } from "ethers";
import Analytics from "./Analytics"; // Import the Analytics component

const Royalty = ({ songs, marketplace }) => {
 
  const [royaltyInfo, setRoyaltyInfo] = useState([]);
  const [currentAccount, setCurrentAccount] = useState("");
  const [selectedSongData, setSelectedSongData] = useState(null);
  const [selectedSongId, setSelectedSongId] = useState(null); // State to store the selected song ID

  useEffect(() => {
    async function fetchAccount() {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_requestAccounts",
          });
          if (accounts.length > 0) {
            setCurrentAccount(accounts[0]);
          } else {
            console.error("No accounts found.");
          }
        } catch (error) {
          console.error("Error fetching MetaMask account:", error);
        }
      } else {
        console.error("MetaMask not detected.");
      }
    }

    fetchAccount();

    // Listen for account changes
    window.ethereum.on("accountsChanged", (accounts) => {
      setCurrentAccount(accounts[0]);
    });
  }, []);

  useEffect(() => {
    // Load data from local storage for the current account
    const storedRoyaltyData = JSON.parse(localStorage.getItem("royaltyData")) || {};
    setRoyaltyInfo(storedRoyaltyData[currentAccount] || []);
  }, [currentAccount,localStorage.getItem("royaltyData")]);

  const hasSongs = songs.some(
    (song) => song.artistId.toLowerCase() === currentAccount.toLowerCase()
  );
  const artistSongs = songs.filter(
    (song) => song.artistId.toLowerCase() === currentAccount.toLowerCase()
  );


  const handleViewAnalytics = (songId) => {
    const weeklyData = JSON.parse(localStorage.getItem("archivedWeeklyData")) || [];
  
    // Aggregate data across all weeks for the selected song
    const aggregatedData = {};
  
    // Iterate through each week's data
    weeklyData.forEach((week) => {
      const songWeekData = week.data[songId] || { day1: {}, day2: {}, day3: {}, day4: {}, day5: {}, day6: {}, day7: {} }; // Extract the song's data for that week
      const royaltiesForSong = week.royalties && week.royalties[songId];
      if ( week.startDate) { // Ensure startDate exists
        const { startDate } = week; // Extract startDate from the week object
  
        // Aggregate data based on the week's start date
        aggregatedData[startDate] = { ...songWeekData ,royalty: royaltiesForSong };
      }
    });
  
    // Check if we have any aggregated data for the song
    if (Object.keys(aggregatedData).length > 0) {
      console.log("Aggregated data for the song:", aggregatedData);
      setSelectedSongData(aggregatedData); // Pass the aggregated data for that song
      setSelectedSongId(songId);
    } else {
      console.warn(`No data found for songId: ${songId}`);
    }
  };
  
  
  

  const handleWithdrawRoyalties = async () => {
    const artistTotalEarnings = royaltyInfo.reduce(
      (acc, song) => acc + song.totalEarned,
      0
    );

    if (artistTotalEarnings > 0) {
      const amountToWithdraw = ethers.utils.parseEther(
        (artistTotalEarnings * 0.8).toString()
      );

      try {
        console.log(`Withdrawing: ${amountToWithdraw.toString()}`); // Log the amount for debugging

        // await marketplace.withdrawRoyalties(amountToWithdraw, { from: currentAccount });
        alert(
          `You have successfully withdrawn ${amountToWithdraw.toString()} ETH.`
        );

        // Reset royalty info after withdrawal
        const updatedRoyaltyInfo = royaltyInfo.map((song) => ({
          ...song,
          totalEarned: 0,
        }));

        // Update local storage with new royalty data after withdrawal
        const allRoyaltyData =
          JSON.parse(localStorage.getItem("royaltyData")) || {};
        allRoyaltyData[currentAccount] = updatedRoyaltyInfo;
        localStorage.setItem("royaltyData", JSON.stringify(allRoyaltyData));

        setRoyaltyInfo(updatedRoyaltyInfo);
      } catch (error) {
        console.error("Error withdrawing royalties:", error);
        alert("Failed to withdraw royalties. Please try again.");
      }
    } else {
      alert("No royalties to withdraw.");
    }
  };

  return (
    <div className="royalty-container">
      <h2>Royalty Earnings Overview</h2>
      {hasSongs ? (
        <>
          <table className="royalty-table">
            <thead>
              <tr>
                <th>Song Name</th>
                <th>Weekly Royalty</th>
                <th>Total Earned</th>
                <th>Status</th>
                <th>View Analytics</th> {/* New header for analytics */}
              </tr>
            </thead>
            <tbody>
              {royaltyInfo.length > 0
                ? royaltyInfo.map(
                    (
                      { songId,songName, weeklyRoyalty, totalEarned, inactive },
                      index
                    ) => (
                      <tr key={index}>
                        <td>{songName}</td>
                        <td>{weeklyRoyalty.toFixed(5)}</td>
                        <td>{totalEarned.toFixed(5)}</td>
                        <td>{inactive ? "Royalty Paused" : "Active"}</td>
                        <td>
                          <button onClick={() => handleViewAnalytics(songId)}>
                            View Analytics
                          </button>{" "}
                          {/* View Analytics button */}
                        </td>
                      </tr>
                    )
                  )
                : artistSongs.map((song, index) => (
                    <tr key={index}>
                      <td>{song.songName}</td>
                      <td>0.00</td>
                      <td>0.00</td>
                      <td>Active</td>
                      <td>
                        <button
                          onClick={() => handleViewAnalytics(song.id)}
                        >
                          View Analytics
                        </button>{" "}
                        {/* View Analytics button */}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
          <button className="withdraw-button" onClick={handleWithdrawRoyalties}>
            Withdraw Royalties
          </button>
          {selectedSongData && <Analytics songData={selectedSongData}  />}{" "}
          {/* Render Analytics if a song is selected */}
        </>
      ) : (
        <p>No songs available for this artist.</p>
      )}
    </div>
  );
};

export default Royalty;
