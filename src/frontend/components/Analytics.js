import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

const Analytics = ({ songData }) => {
  console.log("The data being received", songData);
  const weekKeys = Object.keys(songData);
  const labels = weekKeys.map((week) => ` ${week}`);

  const likesData = [];
  const listensData = [];
  const nftsData=[];
  const royaltyData = [];

  weekKeys.forEach((week) => {
    const days = songData[week] || {};
    let totalLikes = 0;
    let totalListens = 0;
    let totalNfts=0
    let totalRoyalty = 0;

    // Iterate through each day's data to accumulate likes and listens
    Object.keys(days).forEach((dayKey) => {
      const dayData = days[dayKey] || {};

      // Iterate through each nested day (e.g., day1, day2)
      Object.keys(dayData).forEach((nestedDayKey) => {
        const nestedDayData = dayData[nestedDayKey];

        // Check if nestedDayData exists and has likes/listens
        if (
          nestedDayData &&
          typeof nestedDayData.likes === 'number' &&
          typeof nestedDayData.listens === 'number' && typeof nestedDayData.nft === 'number'
        ) {
          totalLikes += nestedDayData.likes;
          totalListens += nestedDayData.listens;
          totalNfts+=nestedDayData.nft;
        }
      });
    });

    // Now include the royalty for this week
    if (songData[week]?.royalty && typeof songData[week]?.royalty === 'number') {
      totalRoyalty = songData[week].royalty; // Get royalty for this week
    }

    likesData.push(totalLikes);
    listensData.push(totalListens);
    nftsData.push(totalNfts);
    // Push the royalty value with precision
    royaltyData.push(parseFloat(totalRoyalty.toFixed(5)));
  });

  const data = {
    labels: labels,
    datasets: [
      {
        label: 'Likes',
        data: likesData,
        borderColor: 'green',
        backgroundColor: 'rgba(0, 128, 0, 0.2)',
        fill: true,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
      {
        label: 'Listens',
        data: listensData,
        borderColor: 'blue',
        backgroundColor: 'rgba(0, 0, 255, 0.2)',
        fill: true,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
      {
        label: 'NFTs',
        data: nftsData,
        borderColor: 'yellow',
        backgroundColor: 'rgba(0, 0, 150, 0.2)',
        fill: true,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
      {
        label: 'Royalty Earned',
        data: royaltyData,
        borderColor: 'orange',
        backgroundColor: 'rgba(255, 165, 0, 0.2)',
        fill: true,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: 'white',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || '';
            if (label) {
              // Display royalty with at least 3 decimals for clarity
              const value = context.parsed.y;
              const formattedValue = value.toFixed(3);
              label += `: ${formattedValue}`;
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'white',
        },
      },
      y: {
        min: 0,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'white',
          callback: function (value) {
            return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
          },
        },
      },
    },
  };

  return (
    <div>
      <h2 style={{ color: 'white' }}>Analytics</h2>
      <Line data={data} options={options} />
    </div>
  );
};

export default Analytics;
