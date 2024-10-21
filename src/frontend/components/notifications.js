import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import "./notification.css";
import { SimulatedDayContext } from "./SimulatedDayContext";

const Notification = ({ songs, userAddress }) => {
  const { notifications, loading, error ,clearNotifications} =
    useContext(SimulatedDayContext);
  const getSongDetails = (songId) => {
    const song = songs.find((s) => s.id === songId);
    return song
      ? {
          name: song.songName,
          artist: song.artistName,
          thumbnail: song.thumbnail,
          audio: song.audio,
        }
      : null;
  };

  const generateNotificationMessage = (note, songName) => {
    if (note.toLowerCase().includes("song has nfts")) {
      return `${songName} is trending! Don't miss the chance to get its NFT while prices are low.`;
    } else if (note.toLowerCase().includes("likes")) {
      return `${songName} is receiving a lot of likes lately. It might be the next big thing!`;
    } else if (note.toLowerCase().includes("listens")) {
      return `People can't stop listening to ${songName}. Join the wave!`;
    } else {
      return `${songName} is getting popular! Check it out now.`;
    }
  };

 

  const displayedSongs = new Set();

  return (
    <div className="notification-container">
      <h2>Here's What's New for You!</h2>
      {loading ? (
        <p>Loading notifications...</p>
      ) : error ? (
        <p>{error}</p>
      ) : notifications.length > 0 ? (
        <ul className="notification-list">
          {notifications.map((note, index) => {
            const noteString =
              typeof note === "string" ? note : JSON.stringify(note.message); // Ensure note is a string

            // Check if it's a royalty notification
            if (
              noteString.toLowerCase().includes("royalty") ||
              noteString.toLowerCase().includes("royalties")
            ) {
              return (
                <li key={index} className="notification-item">
                  <div className="notification-info">
                    <p className="notification-message">{noteString}</p>
                    <p className="notification-date">{note.date}</p>
                  </div>
                </li>
              );
            }

            // Otherwise, it's an ML notification that might be song-related
            const match = noteString.match(/(\d+)/);
            const songId = match ? parseInt(match[1]) : null;
            const songDetails = songId ? getSongDetails(songId) : null;

            if (songDetails && !displayedSongs.has(songDetails.name)) {
              displayedSongs.add(songDetails.name);
              return (
                <li key={index} className="notification-item">
                  <img
                    className="notification-thumbnail"
                    src={songDetails.thumbnail}
                    alt={`${songDetails.name} thumbnail`}
                  />
                  <div className="notification-info">
                    <h3 className="notification-title">{songDetails.name}</h3>
                    <p className="notification-artist">{songDetails.artist}</p>
                    <p className="notification-message">
                      {generateNotificationMessage(
                        noteString,
                        songDetails.name
                      )}
                    </p>
                  </div>
                </li>
              );
            }

            return null;
          })}
        </ul>
      ) : (
        <p>No new notifications</p>
      )}
      {notifications.length > 0 && (
        <div className="clear-button">
          <button
            onClick={clearNotifications}
            className="clear-notifications-button"
          >
            Clear Notifications
          </button>
        </div>
      )}
    </div>
  );
};

export default Notification;
