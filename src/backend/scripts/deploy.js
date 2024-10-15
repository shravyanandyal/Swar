const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const NFT = await ethers.getContractFactory("NFT");
  const Marketplace = await ethers.getContractFactory("Marketplace");

  // Adjust gas limit and gas price as needed
  const gasLimit = 3000000; // Adjusted gas limit
  const gasPrice = ethers.utils.parseUnits('25', 'gwei'); // Adjusted gas price

  try {
    const swarMusicAccount = "0x84e5E368522f4E35a933C51A4f7FA801344f6F9a"; // Replace with the actual SWAR Music account
    const marketplace = await Marketplace.deploy(1, swarMusicAccount, { gasLimit, gasPrice });
    
    await marketplace.deployed();

    // Deploy NFT contract
    const nft = await NFT.deploy({ gasLimit, gasPrice });
    await nft.deployed();

    console.log("Marketplace address:", marketplace.address);
    console.log("NFT address:", nft.address);

    // Check and log the balance of the marketplace contract
    const marketplaceBalance = await ethers.provider.getBalance(marketplace.address);
    console.log("Marketplace contract balance:", ethers.utils.formatEther(marketplaceBalance), "ETH");

    saveFrontendFiles(marketplace, "Marketplace");
    saveFrontendFiles(nft, "NFT");
  } catch (error) {
    console.error("Deployment failed:", error);
  }
}

function saveFrontendFiles(contract, name) {
  const fs = require("fs");
  const contractsDir = __dirname + "/../../frontend/contractsData";

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    contractsDir + `/${name}-address.json`,
    JSON.stringify({ address: contract.address }, undefined, 2)
  );

  const contractArtifact = artifacts.readArtifactSync(name);

  fs.writeFileSync(
    contractsDir + `/${name}.json`,
    JSON.stringify(contractArtifact, null, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
