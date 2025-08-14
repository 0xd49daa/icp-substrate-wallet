# ICP Substrate Wallet Canister - Polkadot/Kusama/Crust Integration

**A groundbreaking Internet Computer Protocol (ICP) canister that serves as a non-custodial Substrate wallet owner**, enabling Internet Identity users to control unique Substrate-based blockchain addresses without ever exposing private keys.

## 🔐 Revolutionary Key Management

This canister leverages ICP's threshold cryptography to provide **true non-custodial wallet ownership** for Polkadot, Kusama, Crust, and all Substrate-based chains. **Private keys never exist** - they are computed through ICP's secure multi-party computation only when signing transactions.

### Key Features:
- **One Internet Identity = One Unique Substrate Address**: Each ICP Principal deterministically maps to a unique Ed25519 key pair
- **Private Keys Never Exposed**: Keys are generated through ICP's threshold Schnorr signatures - private keys literally never exist in memory
- **Full Substrate Ecosystem Support**: Compatible with Polkadot, Kusama, Crust, and any Substrate-based blockchain
- **Non-Custodial by Design**: Users maintain complete control through their Internet Identity
- **Cross-Chain Interoperability**: Bridge ICP identity to the entire Substrate ecosystem

## 🌐 ICP + Polkadot Integration

This canister enables seamless integration between Internet Computer and Substrate networks:
- **Internet Identity as Wallet Owner**: Use your ICP identity to control Substrate addresses
- **Sign Polkadot/Kusama Transactions**: Sign extrinsics and messages for any Substrate chain
- **Crust Network Storage**: Sign data for decentralized storage on Crust
- **Cross-Chain DeFi**: Participate in Polkadot parachains using ICP authentication

### Keywords: ICP, Internet Computer, Polkadot, Kusama, Substrate, Web3, Blockchain, Wallet, Non-Custodial, Threshold Signatures, Internet Identity, Cross-Chain, DeFi, Crust Network, Parachain

## Technical Implementation

- **Ed25519 Signatures**: Threshold Schnorr signatures via ICP's management canister
- **Network Agnostic**: Supports all Substrate chains through SS58 network prefixes
- **Enterprise-Grade Security**:
  - No anonymous access - requires authenticated Internet Identity
  - Comprehensive input validation and sanitization
  - Secure response validation from ICP management canister
  - Zero private key exposure architecture
- **Performance Optimized**: Efficient public key caching per ICP Principal
- **Administrative Controls**: Owner-only salt initialization and cache management

## How It Works

Each Internet Identity on ICP gets a unique, deterministic Substrate address. The canister acts as the wallet owner, managing keys through ICP's threshold cryptography:

```
   Frontend   <--->  icp_substrate_wallet  <--->  IC Management   
 (Polkadot             Canister                      Canister     
    SDK)                                          (Threshold Sig) 
```

## Installation

**⚠️ IMPORTANT: You must run `npm install` in the root folder before deploying the canister.**

```bash
# First, install dependencies
npm install

# Then deploy the canister
dfx deploy icp_substrate_wallet

# Initialize the salt (owner only, one-time operation)
dfx canister call icp_substrate_wallet initializeSalt
```

**⚠️ PRODUCTION DEPLOYMENT**: Before deploying to production, ensure that `KEY_ID_NAME` in the code is changed to `key_1` for proper key management.

## API Methods

### Initialization

#### `initializeSalt(): Promise<string>`
Initialize the canister's cryptographic salt (owner-only, one-time operation).

```javascript
const result = await actor.initializeSalt();
// Returns: "Salt initialized successfully with secure randomness"
```

#### `isInitialized(): Promise<boolean>`
Check if the canister is initialized and ready to use.

```javascript
const ready = await actor.isInitialized();
// Returns: true or false
```

### Key Operations

#### `getPublicKey(): Promise<Uint8Array>`
Get the Ed25519 public key for the calling Principal.

```javascript
const publicKey = await actor.getPublicKey();
// Returns: 32-byte Uint8Array
```

#### `getAddressData(networkPrefix: number): Promise<AddressResult>`
Get public key with network prefix for address generation.

```javascript
// Polkadot (prefix 0)
const polkadotData = await actor.getAddressData(0);
// Returns: { public_key: Uint8Array, network_prefix: 0 }

// Kusama (prefix 2)
const kusamaData = await actor.getAddressData(2);

// Crust (prefix 66)
const crustData = await actor.getAddressData(66);
```

### Signing Operations

#### `sign(message: Uint8Array): Promise<Uint8Array>`
Sign a message with the caller's derived private key.

```javascript
const message = new TextEncoder().encode("Hello Polkadot!");
const signature = await actor.sign(message);
// Returns: 64-byte Ed25519 signature
```

#### `signWithPublicKey(message: Uint8Array): Promise<SignatureResult>`
Sign a message and return both signature and public key.

```javascript
const result = await actor.signWithPublicKey(message);
// Returns: { 
//   signature: Uint8Array(64), 
//   public_key: Uint8Array(32) 
// }
```

#### `signWithHex(message: Uint8Array): Promise<HexSignatureResult>`
Sign a message and return results in both binary and hex formats.

```javascript
const result = await actor.signWithHex(message);
// Returns: {
//   signature: Uint8Array(64),
//   signature_hex: "0x...",
//   public_key: Uint8Array(32),
//   public_key_hex: "0x..."
// }
```

### Management

#### `clearPublicKeyCache(): Promise<boolean>`
Clear the public key cache (owner-only).

```javascript
const cleared = await actor.clearPublicKeyCache();
// Returns: true if successful
```

## Real-World Use Cases

### 🔹 DeFi on Polkadot Parachains
Use your Internet Identity to interact with Acala, Moonbeam, or Astar without managing seed phrases.

### 🔹 Decentralized Storage on Crust
Sign and store data on Crust Network using your ICP identity as the owner.

### 🔹 Cross-Chain Governance
Participate in Polkadot/Kusama governance with your Internet Computer identity.

### 🔹 NFT Ownership
Own and trade NFTs on Substrate chains while keys remain secured by ICP.

## Usage Examples

### Basic Usage with @dfinity/agent

```javascript
import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory } from './declarations/icp_substrate_wallet';

// Create actor
const agent = new HttpAgent();
const actor = Actor.createActor(idlFactory, {
  agent,
  canisterId: 'your-canister-id'
});

// Get public key
const publicKey = await actor.getPublicKey();
console.log('Public Key:', publicKey);

// Sign a message
const message = new TextEncoder().encode('Sign this message');
const signature = await actor.sign(message);
console.log('Signature:', signature);
```

### Integration with Polkadot SDK

```javascript
import { encodeAddress } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';

// Get address data from canister
const addressData = await actor.getAddressData(0); // Polkadot

// Format address using Polkadot SDK
const address = encodeAddress(
  addressData.public_key, 
  addressData.network_prefix
);
console.log('Polkadot Address:', address);

// Sign and format for Polkadot
const message = new TextEncoder().encode('Transaction data');
const { signature, public_key } = await actor.signWithPublicKey(message);

// Convert to hex for Polkadot transactions
const signatureHex = u8aToHex(signature);
const publicKeyHex = u8aToHex(public_key);
```

### Multi-Network Support

```javascript
// Network prefixes for common Substrate chains
const NETWORKS = {
  POLKADOT: 0,
  KUSAMA: 2,
  CRUST: 66,
  CRUST_TESTNET: 42,
  SUBSTRATE_GENERIC: 42
};

// Generate addresses for multiple networks
async function getMultiNetworkAddresses(actor) {
  const addresses = {};
  
  for (const [network, prefix] of Object.entries(NETWORKS)) {
    const data = await actor.getAddressData(prefix);
    const address = encodeAddress(data.public_key, prefix);
    addresses[network] = address;
  }
  
  return addresses;
}

const addresses = await getMultiNetworkAddresses(actor);
console.log('Addresses:', addresses);
// {
//   POLKADOT: "1...",
//   KUSAMA: "D...",
//   CRUST: "cT...",
//   ...
// }
```

### Error Handling

```javascript
try {
  // Message validation
  const emptyMessage = new Uint8Array(0);
  await actor.sign(emptyMessage); // Will throw error
} catch (error) {
  console.error('Error:', error.message);
  // "Message must be at least 1 byte(s)"
}

try {
  // Network prefix validation
  await actor.getAddressData(256); // Out of range
} catch (error) {
  console.error('Error:', error.message);
  // "Network prefix must be between 0 and 255"
}
```

### Complete Example: Crust Network Integration

```javascript
import { Actor, HttpAgent } from '@dfinity/agent';
import { encodeAddress, signatureVerify } from '@polkadot/util-crypto';
import { u8aToHex, hexToU8a } from '@polkadot/util';

async function crustIntegration() {
  // 1. Setup
  const agent = new HttpAgent();
  const actor = Actor.createActor(idlFactory, {
    agent,
    canisterId: 'your-canister-id'
  });

  // 2. Check initialization
  if (!await actor.isInitialized()) {
    throw new Error('Canister not initialized');
  }

  // 3. Get Crust address
  const CRUST_PREFIX = 66;
  const addressData = await actor.getAddressData(CRUST_PREFIX);
  const crustAddress = encodeAddress(
    addressData.public_key, 
    CRUST_PREFIX
  );
  console.log('Crust Address:', crustAddress);

  // 4. Sign a message for Crust
  const message = new TextEncoder().encode('Store this on Crust');
  const { signature_hex, public_key_hex } = await actor.signWithHex(message);
  
  console.log('Signature for Crust:', signature_hex);
  console.log('Public Key:', public_key_hex);

  // 5. Verify signature locally (optional)
  const verification = signatureVerify(
    message,
    hexToU8a(signature_hex),
    crustAddress
  );
  
  console.log('Signature valid:', verification.isValid);
  console.log('Crypto type:', verification.crypto); // 'ed25519'
  
  return {
    address: crustAddress,
    signature: signature_hex,
    publicKey: public_key_hex
  };
}
```

## Security Considerations

### Authentication
- **No Anonymous Access**: All signing and key operations reject anonymous principals
- **Principal-Based Derivation**: Each Principal gets unique, deterministic keys

### Input Validation
- **Message Size**: 1 byte minimum, 1MB maximum
- **Network Prefix**: Must be 0-255 (single byte)
- **Type Checking**: Strict validation of all inputs

### Operational Security
- **One-Time Salt**: Salt can only be initialized once by the owner
- **No Private Key Exposure**: Private keys never exist in canister memory
- **Minimal Information Leakage**: Only essential data exposed through APIs

### Best Practices
1. Always check `isInitialized()` before operations
2. Handle errors appropriately in production
3. Use the Polkadot SDK for proper address formatting
4. Verify signatures on the client side when needed
5. Monitor canister cycles for signing operations

## Testing

Run the comprehensive test suite:

```bash
cd icp_substrate_wallet
npm test
```

The test suite covers:
- Initialization and salt management
- Public key generation and caching
- Message signing with various sizes
- Network prefix validation
- Security features (anonymous rejection, input validation)
- Cross-method consistency

## Technical Details

### Why This Architecture is Revolutionary

1. **True Non-Custodial**: Unlike traditional wallets, private keys never exist - not even temporarily
2. **ICP Security Model**: Leverages Internet Computer's decentralized network of nodes
3. **One Identity, Many Chains**: Single Internet Identity controls addresses across all Substrate chains
4. **No Seed Phrases**: Users never need to manage or backup mnemonic phrases
5. **Threshold Cryptography**: Keys are computed across multiple nodes, eliminating single points of failure

### Key Derivation Path
```
derivation_path = [canister_salt, caller_principal_bytes]
```

This ensures each ICP Principal gets a unique, deterministic Substrate address that cannot be computed without the user's authentication.

### Signature Algorithm
- **Type**: Ed25519 (Schnorr signatures on Edwards curve)
- **Public Key Size**: 32 bytes
- **Signature Size**: 64 bytes
- **Deterministic**: Same message always produces same signature

### Resource Usage
- **Signing Cycles**: 30 billion per signature
- **Cache**: StableBTreeMap for persistent storage
- **Message Limit**: 1MB maximum

## Development

### Building
```bash
dfx build icp_substrate_wallet
```

### Deploying Locally
```bash
dfx start --clean
dfx deploy icp_substrate_wallet
dfx canister call icp_substrate_wallet initializeSalt
```

### Generating Declarations
```bash
dfx generate icp_substrate_wallet
```

## License

MIT License

Copyright (c) 2025 Ivan Selchenkov <me@0xd49.xyz>
