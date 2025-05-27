# 🔐 Signer

The **Signer** is a Node.js script that runs locally and connects to the server at [nftnode.io](https://nftnode.io). Its main purpose is to enhance security around wallet interactions. Most importantly, **the private key never leaves the local environment**.

The signer receives offer requests to sign from the server. It listens for incoming requests, validates them, and only signs if they meet all configured security criteria.

Each signature request is strictly validated:
- Only [Seaport](https://docs.opensea.io/docs/seaport) offers are accepted.
- The offer must match specific collections and price limits, which are configurable.

This repository is public so that anyone can review the code and verify that:
- The wallet is only loaded and accessed using [`ethers.js`](https://docs.ethers.org/).
- The script only signs verified and safe requests.
- The private key is never exposed or transmitted.

---

## ⚙️ Features

- Local signing for increased security
- Strict validation of signature requests
- Configurable limits (collections, price caps)
- Built with `ethers.js`
- No external dependencies for wallet operations

---

## 🛠️ Run

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/signer.git
cd signer
```

### 2. Set up environment variables

Copy the example environment file and update it with your own values:

```bash
cp .sample_env .env
```

### 3. Install dependencies

```bash
npm install
```

### 4. Start the signer

```bash
node signer.js
```

---

## 🧪 Configuration

The `.env` file contains the following parameters:

```env
PRIVATE_KEY=<your_private_key_here>         # wallet private key
CONSIDERATION_ADDRESSES=0xabc...,0xdef...   # comma-separated list of allowed contract addresses
MAX_BID=1.0                                 # max allowed offer amount in ETH
NFTNODE_USERNAME=<username>                 # nftnode.io account
NFTNODE_PASSWORD=<password>
```

**⚠️ Never commit your `.env` file or private key to version control.**

---

## 🔒 Security Notes

- The signer runs **only on your local machine** and never exposes your private key externally.
- It receives offer requests to sign from the server and validates each one locally.
- All incoming signature requests are checked against:
  - Offer type (`Seaport`)
  - Allowed collection addresses
  - Price thresholds
- You can inspect or modify the validation logic in `signer.js`.

---

## 🧩 Dependencies

- [Node.js](https://nodejs.org/)
- [ethers.js](https://docs.ethers.org/)
- [dotenv](https://www.npmjs.com/package/dotenv)

Install with:

```bash
npm install
```

---

## 🤝 Contributing

Pull requests and feedback are welcome!  
If you spot a bug or want to suggest improvements, feel free to open an issue.

---

## 📄 License

MIT License — see the [LICENSE](./LICENSE) file for details.

