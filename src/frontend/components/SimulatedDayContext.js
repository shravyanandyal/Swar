// SimulatedDayContext.js
import React, { createContext, useState, useEffect } from "react";
import axios from "axios";

const pinataApiKey = process.env.REACT_APP_PINATA_API_KEY;
const pinataSecretApiKey = process.env.REACT_APP_PINATA_SECRET_API_KEY;

export const SimulatedDayContext = createContext();

export const SimulatedDayProvider = ({ children, songs }) => {
  const [simulatedDay, setSimulatedDay] = useState(() => {
    const storedDay = localStorage.getItem("simulatedDay");
    return storedDay ? parseInt(storedDay, 10) : 1; // Default to 1 if not found
  });

  // State for the simulated start date of the current week
  const [simulatedWeekStartDate, setSimulatedWeekStartDate] = useState(() => {
    const storedStartDate = localStorage.getItem("simulatedWeekStartDate");
    return storedStartDate ? new Date(storedStartDate) : new Date(); // Default to today if not found
  });

  // Track when to notify about royalties
  const [royaltyNotification, setRoyaltyNotification] = useState(false);
  const [withdrawalNotification, setWithdrawalNotification] = useState(false);

  const [dailyData, setDailyData] = useState({});
  const [weeklyData, setWeeklyData] = useState({});
  const [royaltyInfo, setRoyaltyInfo] = useState([]);
  const [consecutiveInactiveWeeks, setConsecutiveInactiveWeeks] = useState({});
  const [currentAccount, setCurrentAccount] = useState("");
  const [simulatedweeklyData, setSimulatedWeeklyData] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
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
    const storedDailyData = localStorage.getItem("dailyData");
    const storedWeeklyData = localStorage.getItem("weeklyData");
    const storedRoyaltyData = localStorage.getItem("royaltyData");
    const storedInactivity = localStorage.getItem("consecutiveInactiveWeeks");

    if (storedDailyData) {
      setDailyData(JSON.parse(storedDailyData));
    }

    if (storedWeeklyData) {
      setWeeklyData(JSON.parse(storedWeeklyData));
    }

    if (storedRoyaltyData) {
      const allRoyaltyData = JSON.parse(storedRoyaltyData);
      setRoyaltyInfo(allRoyaltyData[currentAccount] || []);
    } else {
      setRoyaltyInfo([]);
    }

    if (storedInactivity) {
      const allInactivityData = JSON.parse(storedInactivity);
      setConsecutiveInactiveWeeks(allInactivityData[currentAccount] || {});
    } else {
      setConsecutiveInactiveWeeks({});
    }
  }, [currentAccount]);

  const updateWeeklyData = (songId, type, simulatedDay) => {
    const weekKey = simulatedWeekStartDate.toISOString().split("T")[0]; // YYYY-MM-DD

    setSimulatedWeeklyData((prevData) => {
      const updatedData = { ...prevData };

      if (!updatedData[songId]) {
        updatedData[songId] = {};
      }

      if (!updatedData[songId][weekKey]) {
        updatedData[songId][weekKey] = {
          day1: { date: "", likes: 0, listens: 0, nft: 0 },
          day2: { date: "", likes: 0, listens: 0, nft: 0 },
          day3: { date: "", likes: 0, listens: 0, nft: 0 },
          day4: { date: "", likes: 0, listens: 0, nft: 0 },
          day5: { date: "", likes: 0, listens: 0, nft: 0 },
          day6: { date: "", likes: 0, listens: 0, nft: 0 },
          day7: { date: "", likes: 0, listens: 0, nft: 0 },
        };
      }

      const dayKey = `day${simulatedDay === 0 ? 7 : simulatedDay}`; // Adjust for simulated day

      if (type === "like") {
        updatedData[songId][weekKey][dayKey].likes += 1;
      } else if (type === "unlike") {
        updatedData[songId][weekKey][dayKey].likes = Math.max(
          0,
          updatedData[songId][weekKey][dayKey].likes - 1
        );
      } else if (type === "listen") {
        updatedData[songId][weekKey][dayKey].listens += 1;
      } else if (type === "nft") {
        // Handle NFT updates
        updatedData[songId][weekKey][dayKey].nft += 1; // Increment NFT count for the week
      }

      localStorage.setItem("weeklyData", JSON.stringify(updatedData)); // Save to local storage
      console.log("updated weekly data", localStorage.getItem("weeklyData"));
      return updatedData;
    });
  };

  const calculateRoyalties = () => {
    const alpha = 0.1;
    const beta = 1;
    const gama = 0.05;
    const inactivityThreshold = 3;

    // Get global inactivity data for all songs
    const allInactivityData =
      JSON.parse(localStorage.getItem("consecutiveInactiveWeeks")) || {};

    const updatedInactivity = { ...allInactivityData };

    // Track royalties for all accounts
    const allRoyaltyData =
      JSON.parse(localStorage.getItem("royaltyData")) || {};

    const royalties = songs.map((song) => {
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

      const weeklyNfts = Object.values(weeklyData[songId] || {}).reduce(
        (acc, week) =>
          acc +
          Object.values(week).reduce((total, day) => total + (day.nft || 0), 0),
        0
      );

      const totalLikes = song.likesCount || 0;
      const totalListens = song.listenCount || 0;
      const totalNFT = song.totalNft || 0;

      const hasActivity = weeklyLikes > 0 || weeklyListens > 0 || totalNFT > 0;

      // Update inactivity for the song
      if (!hasActivity) {
        updatedInactivity[songId] = (updatedInactivity[songId] || 0) + 1;
      } else {
        updatedInactivity[songId] = 0;
      }

      // Determine if the song is inactive
      const isInactive = updatedInactivity[songId] >= inactivityThreshold;

      // Calculate total royalty
      const previousTotalEarned =
        allRoyaltyData[song.artistId]?.find((r) => r.songName === song.songName)
          ?.totalEarned || 0;

      // Calculate weekly royalty if active
      let weeklyRoyalty = 0;
      if (!isInactive) {
        const totalLikesAdjusted = totalLikes > 0 ? totalLikes : 1;
        const totalListensAdjusted = totalListens > 0 ? totalListens : 1;
        const totalNFTadjusted = totalNFT > 0 ? totalNFT : 1;

        const weightedContribution =
          alpha * (weeklyLikes / totalLikesAdjusted) +
          beta * (weeklyListens / totalListensAdjusted) +
          gama * (weeklyNfts / totalNFTadjusted);

        const baseRoyaltyRate = 0.1;
        weeklyRoyalty = baseRoyaltyRate * (1 + weightedContribution);
      }

      const totalRoyalty = previousTotalEarned + weeklyRoyalty;

      return {
        songId: song.id,
        artistId: song.artistId,
        songName: song.songName,
        weeklyRoyalty,
        totalEarned: totalRoyalty,
        inactive: isInactive,
      };
    });

    // Update global inactivity data in local storage
    localStorage.setItem(
      "consecutiveInactiveWeeks",
      JSON.stringify(updatedInactivity)
    );

    setConsecutiveInactiveWeeks(updatedInactivity);

    return royalties;
  };

  useEffect(() => {
    // Update local storage whenever simulatedDay changes
    console.log("today is ", simulatedDay, " day");
    resetDailyDataForNewDay(simulatedDay);
    localStorage.setItem("simulatedDay", simulatedDay);

    if (simulatedDay === 1) {
      // When resetting to a new week, calculate the new simulated week start date
      const today = new Date(simulatedWeekStartDate);
      const newWeekStartDate = new Date(today);
      newWeekStartDate.setDate(today.getDate() + 7); // Move to the next week
      setSimulatedWeekStartDate(newWeekStartDate); // Set the new simulated start date
      localStorage.setItem(
        "simulatedWeekStartDate",
        newWeekStartDate.toISOString()
      ); // Store in local storage
    }

    if (simulatedDay === 7) {
      setRoyaltyNotification(true);
      /*
      const royalties = calculateRoyalties();
      console.log("royalties collected", royalties);

      // Get all royalty data from localStorage or initialize an empty object
      const allRoyaltyData =
        JSON.parse(localStorage.getItem("royaltyData")) || {};

      // Update allRoyaltyData for each song and artist
      royalties.forEach((royalty) => {
        const artistId = songs.find(
          (song) => song.songName === royalty.songName
        )?.artistId; // Get the artist ID for the song
        if (artistId) {
          if (!allRoyaltyData[artistId]) {
            allRoyaltyData[artistId] = []; // Ensure an array exists for this artist
          }

          // Check if the song already has an entry in the artist's data
          const songRoyaltyInfo = allRoyaltyData[artistId].find(
            (r) => r.songName === royalty.songName
          );

          if (songRoyaltyInfo) {
            // Update existing song entry
            songRoyaltyInfo.weeklyRoyalty = royalty.weeklyRoyalty;
            songRoyaltyInfo.totalEarned = royalty.totalEarned;
            songRoyaltyInfo.inactive = royalty.inactive;
          } else {
            // Add a new song entry if it doesn't exist
            allRoyaltyData[artistId].push({
              songId: royalty.songId,
              songName: royalty.songName,
              weeklyRoyalty: royalty.weeklyRoyalty,
              totalEarned: royalty.totalEarned,
              inactive: royalty.inactive,
            });
          }
        }
      });

      // Save the updated allRoyaltyData to local storage
      localStorage.setItem("royaltyData", JSON.stringify(allRoyaltyData));
      setRoyaltyInfo(royalties);

      // Archive weekly data and reset
      const currentWeeklyData = JSON.parse(localStorage.getItem("weeklyData")) || {};
        let archivedWeeklyData =JSON.parse(localStorage.getItem("archivedWeeklyData")) || [];
        const newWeekEntry = {
          startDate: simulatedWeekStartDate.toISOString().split("T")[0],
          data: currentWeeklyData,
          royalties: royalties.reduce((acc, song) => {
            acc[song.songId] = song.weeklyRoyalty;
            return acc;
          }, {}),
        };
        console.log("new week entry in royalty", newWeekEntry);
        archivedWeeklyData.push(newWeekEntry);
        localStorage.setItem(
          "archivedWeeklyData",
          JSON.stringify(archivedWeeklyData)
        );


           // Update the archived data on IPFS
         updateArchivedDataOnIPFS(archivedWeeklyData);
         console.log("resetting weekly data")
        localStorage.removeItem("weeklyData");
        setWeeklyData({});
        */
    } else if (simulatedDay % 2 === 0) {
      // Notify every 2 days
      console.log("setting notification here");
      setWithdrawalNotification(true);
    }
  }, [currentAccount, songs, simulatedDay]);

  // Function to store `archivedWeeklyData` on IPFS
  const updateArchivedDataOnIPFS = async (archivedWeeklyData) => {
    try {
      // Post `archivedWeeklyData` to Pinata to get IPFS hash
      const response = await axios.post(
        `https://api.pinata.cloud/pinning/pinJSONToIPFS`,
        archivedWeeklyData,
        {
          headers: {
            "Content-Type": "application/json",
            pinata_api_key: pinataApiKey,
            pinata_secret_api_key: pinataSecretApiKey,
          },
        }
      );

      console.log("Archived weekly data updated on IPFS:", response.data);

      // Store the IPFS hash in localStorage for reference
      localStorage.setItem(
        "archivedWeeklyDataIpfsHash",
        response.data.IpfsHash
      );

      return response.data.IpfsHash; // Return the IPFS hash if needed for further use
    } catch (error) {
      console.error("Error updating archived weekly data on IPFS:", error);
    }
  };

  /*

  useEffect(() => {
  
    const intervalId = setInterval(() => {
      setSimulatedDay((prevDay) => {
        const newDay = prevDay === 7 ? 1 : prevDay + 1; // Reset to 1 after day 7
        // You can add any additional logic needed here when reaching day 7
        return newDay;
      });
    }, 1 * 30 * 1000); // Each minute represents a day

    return () => clearInterval(intervalId); // Cleanup interval on component unmount
 
  }, []);
 */

  // Function to reset notifications (optional)
  const resetNotifications = () => {
    setRoyaltyNotification(false);
    setWithdrawalNotification(false);
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      const archivedData =
        JSON.parse(localStorage.getItem("archivedWeeklyData")) || [];
      const royaltyData = JSON.parse(localStorage.getItem("royaltyData")) || {};
      const userNotifications =
        JSON.parse(localStorage.getItem(`notifications_${currentAccount}`)) ||
        [];

      try {
        const response = await axios.post(
          "http://localhost:5000/notifications",
          archivedData
        );
        const fetchedNotifications = response.data;

        // Combine fetched notifications with user notifications, but place new ones at the beginning
        const newNotifications = [
          ...fetchedNotifications,
          ...userNotifications,
        ];
        console.log(
          "New notifications combined with ML notifications:",
          newNotifications
        );
        setNotifications(newNotifications);
      } catch (err) {
        setError("Failed to fetch notifications.");
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [currentAccount]);


  const clearNotifications = () => {
    localStorage.removeItem(`notifications_${currentAccount}`);
    setNotifications([]);
    console.log("Clearing notifications for user:", currentAccount);
    console.log("Notifications after clearing:", notifications);

  };


  useEffect(() => {
    const royaltyData = JSON.parse(localStorage.getItem("royaltyData"));

    // Check if royalty data exists
    if (royaltyData) {
      const notificationDate = new Date(
        new Date(simulatedWeekStartDate).getTime() +
          (simulatedDay - 1) * 24 * 60 * 60 * 1000
      ).toLocaleDateString();
      const currentUserNotifications = [];

      
      Object.keys(royaltyData).forEach((user) => {
        const newNotifications = [];
        const userRoyaltyInfo = royaltyData[user];

        // Calculate total earnings for the user
        const userTotalEarned = userRoyaltyInfo.reduce(
          (sum, song) => sum + (song.totalEarned || 0),
          0
        );

        // Add royalty day notification if applicable
        if (royaltyNotification && userTotalEarned > 0) {
          newNotifications.push({
            message: `Hey ${user}, it's royalty day! Check your earnings.`,
            date: notificationDate,
          });
        }

        // Add withdrawal reminder notification if applicable and total earnings are greater than zero
        if (withdrawalNotification && userTotalEarned > 0) {
          newNotifications.push({
            message: `Hey ${user}, don't forget to withdraw your royalties!`,
            date: notificationDate,
          });
        }

        // Update localStorage for the specific user with new notifications
        if (newNotifications.length > 0) {
          const existingNotifications =
            JSON.parse(localStorage.getItem(`notifications_${user}`)) || [];
          const updatedNotifications = [
            ...newNotifications,
            ...existingNotifications,
          ];
          localStorage.setItem(
            `notifications_${user}`,
            JSON.stringify(updatedNotifications)
          );

          if (user === currentAccount) {
            currentUserNotifications.push(...newNotifications);
          }
        }
      });

      // Reset notifications after processing
      

      if (currentUserNotifications.length > 0) {
        // Add new notifications to the top of the list
        setNotifications((prev) => [...currentUserNotifications, ...prev]);
        resetNotifications();
      }

      
    }
  }, [
    royaltyNotification,
    withdrawalNotification,
    resetNotifications,
    simulatedDay,
    simulatedWeekStartDate,
  ]);

  const resetDailyDataForNewDay = (simulatedDay) => {
    setDailyData((prevData) => {
      const today = `Simulated-Day-${simulatedDay}`;

      const updatedDailyData = {}; // Reset for a new day

      // Optionally, you can preserve old data or just start fresh each simulated day
      console.log(`Resetting daily data for: ${today}`);

      // Clear old daily data and return an empty object for the new day
      localStorage.setItem("dailyData", JSON.stringify(updatedDailyData));

      return updatedDailyData;
    });
  };

  return (
    <SimulatedDayContext.Provider
      value={{
        simulatedDay,
        setSimulatedDay,
        simulatedWeekStartDate,
        updateWeeklyData,
        royaltyNotification,
        withdrawalNotification,
        resetNotifications,
        notifications,
        setNotifications,
        loading,
        error,
        clearNotifications
      }}
    >
      {children}
    </SimulatedDayContext.Provider>
  );
};
