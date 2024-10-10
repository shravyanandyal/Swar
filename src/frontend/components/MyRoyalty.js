import React, { useEffect, useState } from 'react';

const Royalty = ({ songs }) => {
  const [dailyData, setDailyData] = useState({});
  const [weeklyData, setWeeklyData] = useState({});
  const [royaltyInfo, setRoyaltyInfo] = useState([]);
  const [currentAccount, setCurrentAccount] = useState('');

  useEffect(() => {
    async function fetchAccount() {
      if (window.ethereum) {
        try {
          console.log("Requesting accounts...");
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          console.log("Accounts received:", accounts);
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
    window.ethereum.on('accountsChanged', (accounts) => {
      console.log("Accounts changed:", accounts);
      setCurrentAccount(accounts[0]);
    });
  }, []);
  


  useEffect(() => {
    // Load daily and weekly data from local storage
    const storedDailyData = localStorage.getItem('dailyData');
    const storedWeeklyData = localStorage.getItem('weeklyData');

    if (storedDailyData) {
      setDailyData(JSON.parse(storedDailyData));
    }

    if (storedWeeklyData) {
      setWeeklyData(JSON.parse(storedWeeklyData));
    }
  console.log("artist is",currentAccount);
    console.log("songs are",songs)
  }, [currentAccount]);

  useEffect(() => {
    // Calculate royalties for the artist's songs
    const calculateRoyalties = () => {
      const royalties = songs.filter(song => song.artistId.toLowerCase() === currentAccount.toLowerCase()).map(song => {
        const songId = song.id;
    
        // Calculate likes and listens for the week and overall
        const weeklyLikes = Object.values(weeklyData[songId] || {}).reduce((acc, week) => acc + Object.values(week).reduce((total, day) => total + (day.likes || 0), 0), 0);
        const weeklyListens = Object.values(weeklyData[songId] || {}).reduce((acc, week) => acc + Object.values(week).reduce((total, day) => total + (day.listens || 0), 0), 0);
        console.log("weekly likes and listens are ",weeklyLikes , weeklyListens);
        const totalLikes = song.likesCount || 0; // from song metadata
        const totalListens = song.listenCount || 0; // from song metadata
        console.log("total likes and listens are",totalLikes,totalListens);
        // Multiplier factor (adjust this as needed)
        const multiplierFactor = 1.5; 
    
        // Calculate multiplier
        const multiplier = 1 + ((weeklyLikes + weeklyListens) / (totalLikes + totalListens || 1)) * multiplierFactor;
        console.log("multiplier is ",multiplier);
        // Base royalty rate
        const baseRoyaltyRate = 0.1; 
    
        // Calculate weekly royalty
        const weeklyRoyalty = baseRoyaltyRate * multiplier;

        console.log("weekly royalty is ",weeklyRoyalty);
        const totalRoyalty = (royaltyInfo.totalEarned || 0) + weeklyRoyalty;
    
        return {
          songName: song.songName,
          weeklyRoyalty: weeklyRoyalty,
          totalEarned: totalRoyalty// Store total earned in your song data
        };
      });
    
      setRoyaltyInfo(royalties);
    };
    

    calculateRoyalties();
  }, [currentAccount]);

  return (
    <div>
      <h2>My Songs</h2>
      {royaltyInfo.map(({ songName, weeklyRoyalty, totalEarned }, index) => (
        <div key={index}>
          <p>{songName}: Weekly Royalty Earned: {weeklyRoyalty.toFixed(2)} | Total Earned: {totalEarned.toFixed(2)}</p>
        </div>
      ))}
    </div>
  );
};

export default Royalty;
