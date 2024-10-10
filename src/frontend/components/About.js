import React from 'react';
import './About.css';
import swar from './swar.jpg';
import swar1 from './how-music-works.jpg';
import swar2 from './artist.jpg';
import swar3 from './listeners.jpg';
import { Link } from 'react-router-dom'; 

const About = () => {
  return (
    <div className="about-container">
      {/* Introduction Section */}
      <section className="about-intro flex-section">
        <h1>Welcome to SWAR</h1>
        <p>
        SWAR is a decentralized music platform, using
 blockchain and machine learning to change music industry
 fundamentals, where artists and users will reap the most ben
efits. Unlike other platforms, Swar offers transparent royalty
 payment system which is based on streaming data and has
 dynamic adjustments, thus, contributors are assured of fair
 remunerations. Through its DApp solution, Swar provides the
 artists with an opportunity to upload songs, get the allocated
 royalties using smart contracts, and store the content in the
 IPFS securely. ML-Model of the platform forecasts streaming
 numbers and notify artists about NFT creation with regard to
 the expected popularity and distributes royalties that helps artists
 make decisions on their work with confidence . On the top of that
 Swar comes up with Timebound NFTs, that empowers artists
 to provide special content and experiences to the fans which
 can be sold on the dedicated marketplace. Intuitive personalized
 song recommendation system also offers user tailored suggestions
 including the songs they like the most. Swar aspires to have a
 music ecosystem which is seen as transparent, fair and engaging
 to both artists and listeners.
        </p>
        <img src={swar} alt="Music Technology" className="intro-image" />
      </section>

      {/* Why Choose SWAR Section */}
      <section className="about-why flex-section">
        <h2>Why Choose SWAR?</h2>
        <ul>
          <li>
            <img src="https://cdn-icons-png.flaticon.com/512/847/847710.png" alt="Royalty Icon" className="icon" />
            Transparent, real-time royalty payments
          </li>
          <li>
            <img src="https://cdn-icons-png.flaticon.com/512/3649/3649463.png" alt="NFT Icon" className="icon" />
            Exclusive content through time-bound NFTs
          </li>
          <li>
            <img src="https://cdn-icons-png.flaticon.com/512/850/850960.png" alt="ML Icon" className="icon" />
            Data-driven insights for artists using machine learning
          </li>
          <li>
            <img src="https://cdn-icons-png.flaticon.com/512/3334/3334886.png" alt="Blockchain Icon" className="icon" />
            Decentralized and secure storage on the blockchain
          </li>
          <li>
            <img src="https://cdn-icons-png.flaticon.com/512/2920/2920277.png" alt="Music Icon" className="icon" />
            Personalized music recommendations for listeners
          </li>
        </ul>
      </section>

      {/* How SWAR Works Section - Side by Side */}
      <section className="about-how flex-section">
        <div>
          <h2>How SWAR Works</h2>
          <p>
            Artists upload their music, which is securely stored using blockchain. Machine learning 
            models analyze the song's performance to recommend NFT creation, while royalties are 
            automatically distributed based on streaming data.
          </p>
        </div>
        <img src={swar1} alt="How SWAR Works" />
      </section>

      {/* Advantages Section - Side by Side for Artists and Listeners */}
      <section className="about-advantages">
        <div className="advantage flex-section">
          <img src={swar2} alt="Artist Advantage" />
          <div>
            <h2>For Artists</h2>
            <ul>
              <li>
                <img src="https://cdn-icons-png.flaticon.com/512/190/190411.png" alt="Fair Royalty Icon" className="icon" />
                Fair royalty distribution
              </li>
              <li>
                <img src="https://cdn-icons-png.flaticon.com/512/3566/3566340.png" alt="NFT Sales Icon" className="icon" />
                Exclusive NFT sales
              </li>
              <li>
                <img src="https://cdn-icons-png.flaticon.com/512/850/850960.png" alt="Data Insights Icon" className="icon" />
                Data insights on song performance
              </li>
            </ul>
          </div>
        </div>
        <div className="advantage flex-section">
         
          <div>
            <h2>For Listeners</h2>
            <ul>
              <li>
                <img src="https://cdn-icons-png.flaticon.com/512/3334/3334886.png" alt="Exclusive Content Icon" className="icon" />
                Access to exclusive content
              </li>
              <li>
                <img src="https://cdn-icons-png.flaticon.com/512/1307/1307281.png" alt="Personalized Recommendations Icon" className="icon" />
                Personalized music recommendations
              </li>
              <li>
                <img src="https://cdn-icons-png.flaticon.com/512/3649/3649463.png" alt="Support Artists Icon" className="icon" />
                Support your favorite artists directly
              </li>
            </ul>
          </div>
          <img src={swar3} alt="Listener Advantage" />
        </div>
      </section>

      {/* Conclusion Section */}
      <section className="about-conclusion">
        <h2>Join the SWAR Revolution</h2>
        <p>
          Whether you're an artist or a listener, SWAR is reshaping the future of music. Join us and 
          experience a fairer, more transparent music ecosystem.
        </p>
        <div className="action-links">
          <Link to="/create" className="action-link">Send Us Your Tune</Link> {/* Link to Upload Song component */}
          <Link to="/" className="action-link">Go to Home</Link> {/* Link to Home component */}
        </div>
      </section>
    </div>
  );
};

export default About;
