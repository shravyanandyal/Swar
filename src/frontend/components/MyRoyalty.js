import React, { useEffect, useState } from "react";

const Royalty = ({ songs }) => {
  const [dailyData, setDailyData] = useState({});
  const [weeklyData, setWeeklyData] = useState({});
  const [royaltyInfo, setRoyaltyInfo] = useState([]);
  const [currentAccount, setCurrentAccount] = useState("");

  useEffect(() => {
    async function fetchAccount() {
      if (window.ethereum) {
        try {
          console.log("Requesting accounts...");
          const accounts = await window.ethereum.request({
            method: "eth_requestAccounts",
          });
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
    window.ethereum.on("accountsChanged", (accounts) => {
      console.log("Accounts changed:", accounts);
      setCurrentAccount(accounts[0]);
    });
  }, []);

  useEffect(() => {
    // Load daily and weekly data from local storage
    const storedDailyData = localStorage.getItem("dailyData");
    const storedWeeklyData = localStorage.getItem("weeklyData");

    if (storedDailyData) {
      setDailyData(JSON.parse(storedDailyData));
    }

    if (storedWeeklyData) {
      setWeeklyData(JSON.parse(storedWeeklyData));
    }
    console.log("artist is", currentAccount);
    console.log("songs are", songs);
  }, [currentAccount]);

  useEffect(() => {
    // Calculate royalties for the artist's songs
    const calculateRoyalties = () => {
      const alpha = 0.1; // Weight for likes
      const beta = 1; // Weight for listens
      const royalties = songs
        .filter(
          (song) => song.artistId.toLowerCase() === currentAccount.toLowerCase()
        )
        .map((song) => {
          const songId = song.id;

          // Calculate weekly likes and listens
          const weeklyLikes = Object.values(weeklyData[songId] || {}).reduce(
            (acc, week) =>
              acc +
              Object.values(week).reduce(
                (total, day) => total + (day.likes || 0),
                0
              ),
            0
          );
          const weeklyListens = Object.values(weeklyData[songId] || {}).reduce(
            (acc, week) =>
              acc +
              Object.values(week).reduce(
                (total, day) => total + (day.listens || 0),
                0
              ),
            0
          );

          // Get total likes and listens from the song metadata
          const totalLikes = song.likesCount || 0;
          const totalListens = song.listenCount || 0;

          // Prevent division by zero
          const totalLikesAdjusted = totalLikes > 0 ? totalLikes : 1;
          const totalListensAdjusted = totalListens > 0 ? totalListens : 1;

          // Calculate contribution of weekly likes and listens to the total
          const weeklyLikesContribution =
            (weeklyLikes / totalLikesAdjusted) * 100; // as a percentage
          const weeklyListensContribution =
            (weeklyListens / totalListensAdjusted) * 100; // as a percentage

          console.log(`Weekly Likes Contribution: ${weeklyLikesContribution}%`);
          console.log(
            `Weekly Listens Contribution: ${weeklyListensContribution}%`
          );

          // Apply weightage to the weekly contribution ratios
          const weightedContribution =
            alpha * (weeklyLikes / totalLikesAdjusted) +
            beta * (weeklyListens / totalListensAdjusted);

          // Base royalty rate
          const baseRoyaltyRate = 0.1;

          // Calculate royalty based on weighted contribution
          const weeklyRoyalty = baseRoyaltyRate * (1 + weightedContribution);

          // Total royalty earned (accumulating previous earnings)
          const totalRoyalty = (royaltyInfo.totalEarned || 0) + weeklyRoyalty;

          return {
            songName: song.songName,
            weeklyRoyalty: weeklyRoyalty,
            totalEarned: totalRoyalty,
            weeklyLikesContribution: weeklyLikesContribution.toFixed(2), // showing as percentage
            weeklyListensContribution: weeklyListensContribution.toFixed(2), // showing as percentage
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
          <p>
            {songName}: Weekly Royalty Earned: {weeklyRoyalty.toFixed(2)} |
            Total Earned: {totalEarned.toFixed(2)}
          </p>
        </div>
      ))}
    </div>
  );
};

export default Royalty;
