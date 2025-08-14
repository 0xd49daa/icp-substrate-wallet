import { IDL, update, msgCaller, init, StableBTreeMap, Principal, query } from 'azle';
import { serialize } from 'azle/experimental';

// Security constants
const ANONYMOUS_PRINCIPAL_TEXT = '2vxsx-fae';
const KEY_ID_NAME = 'dfx_test_key'; // TODO: Change for production
const SIGN_CYCLES = 30_000_000_000n;
const MAX_MESSAGE_BYTES = 1024 * 1024; // 1MB limit
const MIN_MESSAGE_BYTES = 1; // Reject empty messages

// Storage
let canisterSalt = new StableBTreeMap<string, Uint8Array>(0);
let canisterOwner = new StableBTreeMap<string, Principal>(1);
let publicKeyCache = new StableBTreeMap<string, Uint8Array>(2);

// Result type for address response - returns data for UI to format with Polkadot SDK
const AddressResult = IDL.Record({
    public_key: IDL.Vec(IDL.Nat8),
    network_prefix: IDL.Nat8
});

// Result type for signature response
const SignatureResult = IDL.Record({
    signature: IDL.Vec(IDL.Nat8),
    public_key: IDL.Vec(IDL.Nat8)
});

// Helper to convert bytes to hex string
function bytesToHex(bytes: Uint8Array): string {
    return '0x' + Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Security helper: Get authenticated caller (reject anonymous)
function getAuthenticatedCaller(): Principal {
    const caller = msgCaller();
    if (caller.toText() === ANONYMOUS_PRINCIPAL_TEXT) {
        throw new Error('Anonymous callers are not allowed');
    }
    return caller;
}

// Validate message input
function validateMessage(message: Uint8Array): void {
    if (!message || !(message instanceof Uint8Array)) {
        throw new Error('Message must be a Uint8Array');
    }
    if (message.length < MIN_MESSAGE_BYTES) {
        throw new Error(`Message must be at least ${MIN_MESSAGE_BYTES} byte(s)`);
    }
    if (message.length > MAX_MESSAGE_BYTES) {
        throw new Error(`Message exceeds maximum size of ${MAX_MESSAGE_BYTES} bytes`);
    }
}


export default class {
    @init([])
    init(): void {
        // Store the deployer as the owner during canister initialization
        const owner = msgCaller();
        canisterOwner.insert('owner', owner);
    }

    @update([], IDL.Text)
    async initializeSalt(): Promise<string> {
        const caller = getAuthenticatedCaller();
        const owner = canisterOwner.get('owner');
        
        // Check if caller is the owner
        if (!owner || !caller.compareTo(owner)) {
            throw new Error('Only the canister owner can initialize the salt');
        }
        
        // Check if salt is already set
        const existingSalt = canisterSalt.get('salt');
        if (existingSalt) {
            throw new Error('Salt has already been initialized');
        }
        
        // Get secure randomness from IC management canister
        const response = await fetch(`icp://aaaaa-aa/raw_rand`, {
            body: serialize({
                args: []
            })
        });
        
        // Validate response
        if (!response.ok) {
            throw new Error(`Failed to get randomness: ${response.statusText}`);
        }
        
        const responseJson = await response.json();
        
        // Validate the random data
        if (!responseJson || !Array.isArray(responseJson) || responseJson.length < 32) {
            throw new Error('Invalid randomness received from management canister');
        }
        
        const randomBytes = new Uint8Array(responseJson);
        
        // Store the salt
        canisterSalt.insert('salt', randomBytes);
        
        return 'Salt initialized successfully with secure randomness';
    }

    // Internal helper to get or fetch public key
    private async getPublicKeyForCaller(): Promise<Uint8Array> {
        const callerPrincipal = getAuthenticatedCaller();
        const callerKey = callerPrincipal.toText();
        
        // Check cache first
        const cached = publicKeyCache.get(callerKey);
        if (cached) {
            return cached;
        }
        
        const salt = canisterSalt.get('salt');
        if (!salt) {
            throw new Error('Canister salt not initialized. Owner must call initializeSalt() first.');
        }
        
        const derivationPath = [Array.from(salt), Array.from(callerPrincipal.toUint8Array())];
        
        const request = {
            canister_id: [],
            derivation_path: derivationPath,
            key_id: {
                algorithm: { ed25519: null },
                name: KEY_ID_NAME
            }
        };

        const response = await fetch(`icp://aaaaa-aa/schnorr_public_key`, {
            body: serialize({
                args: [request]
            })
        });
        
        // Validate response
        if (!response.ok) {
            throw new Error(`Failed to get public key: ${response.statusText}`);
        }
        
        const responseJson = await response.json();
        
        // Validate public key format
        if (!responseJson || !responseJson.public_key || !Array.isArray(responseJson.public_key)) {
            throw new Error('Invalid public key response from management canister');
        }
        
        if (responseJson.public_key.length !== 32) {
            throw new Error(`Invalid public key length: expected 32 bytes, got ${responseJson.public_key.length}`);
        }
        
        const publicKey = new Uint8Array(responseJson.public_key);
        
        // Cache the public key
        publicKeyCache.insert(callerKey, publicKey);
        
        return publicKey;
    }

    @update([], IDL.Vec(IDL.Nat8))
    async getPublicKey(): Promise<Uint8Array> {
        return await this.getPublicKeyForCaller();
    }

    @update([IDL.Nat8], AddressResult)
    async getAddressData(networkPrefix: number): Promise<{ 
        public_key: Uint8Array;
        network_prefix: number;
    }> {
        const publicKey = await this.getPublicKeyForCaller();
        
        // Validate network prefix is reasonable (0-255 for single byte prefix)
        if (networkPrefix < 0 || networkPrefix > 255) {
            throw new Error('Network prefix must be between 0 and 255');
        }
        
        // Return the raw data for the UI to format with Polkadot SDK
        return {
            public_key: publicKey,
            network_prefix: networkPrefix
        };
    }

    @update([IDL.Vec(IDL.Nat8)], IDL.Vec(IDL.Nat8))
    async sign(message: Uint8Array): Promise<Uint8Array> {
        const callerPrincipal = getAuthenticatedCaller();
        
        // Validate message
        validateMessage(message);
        
        const salt = canisterSalt.get('salt');
        if (!salt) {
            throw new Error('Canister salt not initialized. Owner must call initializeSalt() first.');
        }
        
        const derivationPath = [Array.from(salt), Array.from(callerPrincipal.toUint8Array())];
        
        const request = {
            message: Array.from(message),
            derivation_path: derivationPath,
            key_id: {
                algorithm: { ed25519: null },
                name: KEY_ID_NAME
            },
            aux: []
        };

        const response = await fetch(`icp://aaaaa-aa/sign_with_schnorr`, {
            body: serialize({
                args: [request],
                cycles: SIGN_CYCLES
            })
        });
        
        // Validate response
        if (!response.ok) {
            throw new Error(`Failed to sign message: ${response.statusText}`);
        }
        
        const responseJson = await response.json();
        
        // Validate signature format
        if (!responseJson || !responseJson.signature || !Array.isArray(responseJson.signature)) {
            throw new Error('Invalid signature response from management canister');
        }
        
        if (responseJson.signature.length !== 64) {
            throw new Error(`Invalid signature length: expected 64 bytes, got ${responseJson.signature.length}`);
        }
        
        return new Uint8Array(responseJson.signature);
    }

    @update([IDL.Vec(IDL.Nat8)], SignatureResult)
    async signWithPublicKey(message: Uint8Array): Promise<{ 
        signature: Uint8Array; 
        public_key: Uint8Array;
    }> {
        // Sign the message (includes validation)
        const signature = await this.sign(message);
        
        // Get the public key
        const publicKey = await this.getPublicKeyForCaller();
        
        // Return both for convenience
        return {
            signature: signature,
            public_key: publicKey
        };
    }

    @update([IDL.Vec(IDL.Nat8)], IDL.Record({
        signature: IDL.Vec(IDL.Nat8),
        signature_hex: IDL.Text,
        public_key: IDL.Vec(IDL.Nat8),
        public_key_hex: IDL.Text
    }))
    async signWithHex(message: Uint8Array): Promise<{
        signature: Uint8Array;
        signature_hex: string;
        public_key: Uint8Array;
        public_key_hex: string;
    }> {
        // Sign the message (includes validation)
        const signature = await this.sign(message);
        const publicKey = await this.getPublicKeyForCaller();
        
        return {
            signature: signature,
            signature_hex: bytesToHex(signature),
            public_key: publicKey,
            public_key_hex: bytesToHex(publicKey)
        };
    }

    @query([], IDL.Bool)
    async isInitialized(): Promise<boolean> {
        const salt = canisterSalt.get('salt');
        return !!salt;
    }

    @update([], IDL.Bool)
    async clearPublicKeyCache(): Promise<boolean> {
        const caller = getAuthenticatedCaller();
        const owner = canisterOwner.get('owner');
        
        // Only owner can clear cache
        if (!owner || !caller.compareTo(owner)) {
            return false;
        }
        
        // Clear all cached public keys
        const keys = publicKeyCache.keys();
        for (const key of keys) {
            publicKeyCache.remove(key);
        }
        
        return true;
    }

}