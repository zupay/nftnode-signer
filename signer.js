import fetch from 'node-fetch';
import axios from 'axios';
import dotenv from 'dotenv';
import {ethers} from 'ethers';

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const BASE_URL = process.env.NFTNODE_HOST || 'https://nftnode.io';
const USERNAME = process.env.NFTNODE_USERNAME;
const PASSWORD = process.env.NFTNODE_PASSWORD;
const MAX_BID = process.env.MAX_BID;
const EXPECTED_CONSIDERATION_ADDRESSES = process.env.CONSIDERATION_ADDRESSES
    ? process.env.CONSIDERATION_ADDRESSES
    .split(',')
    .map(addr => addr.trim().toLowerCase())
    : null;

if (!PRIVATE_KEY || !USERNAME || !PASSWORD || !MAX_BID) {
  console.error('Missing environment variable parameter in .env');
  process.exit(1);
}

const SEAPORT_ADDRESSES = [
  '0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC',  // SeaPort 1.5
  '0x0000000000000068F116a894984e2DB1123eB395',  // SeaPort 1.6
].map(addr => addr.toLowerCase());
const wallet = new ethers.Wallet(PRIVATE_KEY);

/**
 * Connects to the event stream and listens for sign requests.
 * @returns {Promise<void>}
 */
async function connectToEventStream() {
  const streamUrl = `${BASE_URL}/node/signer/stream`;
  console.log(`Connecting to ${streamUrl} as ${USERNAME}...`);
  try {
    const authString = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');
    fetch(streamUrl, { headers: { 'Authorization': `Basic ${authString}` } })
    .then(response => response.body)
    .then(res => {
      let buffer = '';
      res.on('data', async (chunk) => {
        buffer += chunk.toString();

        let lines = buffer.split('\n');
        buffer = lines.pop(); // Keep the last partial line

        for (let line of lines) {
          const text = line.trim();
          if (text && text !== 'data:') {
            const cleanText = text.startsWith('data:') ? text.slice(5).trim() : text;
            try {
              await handleSignRequest(cleanText);
            } catch (e) {
              console.error('Error handling sign request:', e);
            }
          }
        }
      });
    })
    .catch(err => console.log(err));

    console.log('Connected');
  } catch (err) {
    console.error('Connection error:', err);
    console.log('Attempting to reconnect in 5 seconds...');
    setTimeout(connectToEventStream, 5000);
  }
}
/**
 * Validates the sign request.
 * This includes checking the contract address, consideration items, and total consideration amount.
 * @param request
 * @returns {boolean}
 */
function validate(request) {
  try {
    const { domain, value } = request;

    // Validate contract is SeaPort
    if (!domain || !domain.verifyingContract) {
      console.error('Missing domain or verifying contract');
      return false;
    }

    const contractAddress = domain.verifyingContract.toLowerCase();
    if (!SEAPORT_ADDRESSES.includes(contractAddress)) {
      console.error(`Contract address ${contractAddress} is not a recognized SeaPort contract`);
      return false;
    }

    // Validate consideration address and amount
    if (!value || !value.consideration || !Array.isArray(value.consideration) || value.consideration.length === 0) {
      console.error('Missing or invalid consideration array');
      return false;
    }

    // Check for the expected consideration token address
    const hasExpectedTokenAddress = EXPECTED_CONSIDERATION_ADDRESSES === null
        ? true
        : value.consideration.some(item =>
            item.token && EXPECTED_CONSIDERATION_ADDRESSES.includes(item.token.toLowerCase())
        );

    if (!hasExpectedTokenAddress) {
      console.error(`No consideration item with valid token. Expected one of: ${EXPECTED_CONSIDERATION_ADDRESSES.join(', ')}`);
      return false;
    }

    // Check if total consideration amount is at most MAX_BID (0.5 ETH by default)
    const maxBidWei = ethers.parseEther(MAX_BID);
    let totalConsiderationWei = 0n;

    for (const item of value.offer) {
      if (item.itemType === 1) { // ERC20
        if (item.startAmount) {
          totalConsiderationWei += BigInt(item.startAmount);
        }
      }
    }

    if (totalConsiderationWei > maxBidWei) {
      console.error(`Total consideration amount ${ethers.formatEther(totalConsiderationWei)} ETH exceeds maximum ${MAX_BID} ETH`);
      return false;
    }

    console.log(`Validation passed: SeaPort contract, correct consideration recipient, amount: ${ethers.formatEther(totalConsiderationWei)} ETH`);
    return true;

  } catch (error) {
    console.error('Validation error:', error);
    return false;
  }
}

/**
 * Handles the sign request.
 * Signs the request using the wallet and sends the response back to the server.
 *
 * @param chunk
 * @returns {Promise<void>}
 */
async function handleSignRequest(chunk) {
  try {
    const request = JSON.parse(chunk.toString());

    if (!request || !request.domain || !request.types || !request.value) {
      return;
    }

    if (!validate(request)) {
      console.error('Validation failed for request:', request);
      return;
    }

    const {requestId, domain, types, value} = request;
    const signature = await wallet.signTypedData(
        domain,
        types,
        value
    );
    const authString = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');
    const responseBody = {
      requestId,
      signature,
    };

    await axios.post(`${BASE_URL}/node/signer/response`, responseBody, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${authString}`
      }
    });
    console.log('Signed requestId:', requestId);
  } catch (err) {
    console.error('Error handling sign request:', chunk, err);
  }
}

await connectToEventStream();