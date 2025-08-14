import { ActorSubclass } from '@dfinity/agent';
import { expect, it, Test } from 'azle/_internal/test';

import { _SERVICE } from '../declarations/signing_full/signing_full.did';

export function getTests(signingCanister: ActorSubclass<_SERVICE>): Test {
    return () => {
        // Test initialization
        it('checks if canister is not initialized initially', async () => {
            const isInit = await signingCanister.isInitialized();
            expect(isInit).toBe(false);
        });

        it('initializes salt successfully as owner', async () => {
            const result = await signingCanister.initializeSalt();
            expect(result).toBe('Salt initialized successfully with secure randomness');
        });

        it('confirms canister is initialized after salt setup', async () => {
            const isInit = await signingCanister.isInitialized();
            expect(isInit).toBe(true);
        });

        it('rejects duplicate salt initialization', async () => {
            try {
                await signingCanister.initializeSalt();
                throw new Error('Should have thrown error');
            } catch (error: any) {
                expect(error.message).toContain('Salt has already been initialized');
            }
        });

        // Test public key operations
        it('gets Ed25519 public key', async () => {
            const publicKey = await signingCanister.getPublicKey();
            expect(publicKey).toBeInstanceOf(Uint8Array);
            expect(publicKey.length).toBe(32); // Ed25519 public key is 32 bytes
        });

        it('returns same public key on subsequent calls (cached)', async () => {
            const publicKey1 = await signingCanister.getPublicKey();
            const publicKey2 = await signingCanister.getPublicKey();
            expect(publicKey1).toEqual(publicKey2);
        });

        it('gets address data with network prefix', async () => {
            const polkadotPrefix = 0;
            const addressData = await signingCanister.getAddressData(polkadotPrefix);
            
            expect(addressData.public_key).toBeInstanceOf(Uint8Array);
            expect(addressData.public_key.length).toBe(32);
            expect(addressData.network_prefix).toBe(polkadotPrefix);
        });

        it('rejects invalid network prefix', async () => {
            try {
                await signingCanister.getAddressData(256); // Out of range
                throw new Error('Should have thrown error');
            } catch (error: any) {
                expect(error.message).toContain('Network prefix must be between 0 and 255');
            }
        });

        it('gets address data for different networks', async () => {
            const networks = [
                { name: 'Polkadot', prefix: 0 },
                { name: 'Kusama', prefix: 2 },
                { name: 'Crust', prefix: 66 },
                { name: 'CrustTestnet', prefix: 42 }
            ];

            for (const network of networks) {
                const addressData = await signingCanister.getAddressData(network.prefix);
                expect(addressData.network_prefix).toBe(network.prefix);
                expect(addressData.public_key).toBeInstanceOf(Uint8Array);
            }
        });

        // Test signing operations
        const testMessage = new TextEncoder().encode('Test message for signing');

        it('signs a message and returns 64-byte signature', async () => {
            const signature = await signingCanister.sign(testMessage);
            expect(signature).toBeInstanceOf(Uint8Array);
            expect(signature.length).toBe(64); // Ed25519 signature is 64 bytes
        });

        it('rejects empty message', async () => {
            try {
                await signingCanister.sign(new Uint8Array(0));
                throw new Error('Should have thrown error');
            } catch (error: any) {
                expect(error.message).toContain('Message must be at least 1 byte(s)');
            }
        });

        it('rejects oversized message', async () => {
            const oversizedMessage = new Uint8Array(1024 * 1024 + 1); // 1MB + 1 byte
            try {
                await signingCanister.sign(oversizedMessage);
                throw new Error('Should have thrown error');
            } catch (error: any) {
                expect(error.message).toContain('Message exceeds maximum size');
            }
        });

        it('signs with public key returned', async () => {
            const result = await signingCanister.signWithPublicKey(testMessage);
            
            expect(result.signature).toBeInstanceOf(Uint8Array);
            expect(result.signature.length).toBe(64);
            expect(result.public_key).toBeInstanceOf(Uint8Array);
            expect(result.public_key.length).toBe(32);
        });

        it('signs with hex format', async () => {
            const result = await signingCanister.signWithHex(testMessage);
            
            expect(result.signature).toBeInstanceOf(Uint8Array);
            expect(result.signature.length).toBe(64);
            expect(result.signature_hex).toMatch(/^0x[0-9a-f]{128}$/); // 64 bytes = 128 hex chars
            
            expect(result.public_key).toBeInstanceOf(Uint8Array);
            expect(result.public_key.length).toBe(32);
            expect(result.public_key_hex).toMatch(/^0x[0-9a-f]{64}$/); // 32 bytes = 64 hex chars
        });

        it('produces deterministic signatures for same message', async () => {
            const sig1 = await signingCanister.sign(testMessage);
            const sig2 = await signingCanister.sign(testMessage);
            
            // Ed25519 is deterministic, so same message should produce same signature
            expect(sig1).toEqual(sig2);
        });

        it('produces different signatures for different messages', async () => {
            const message1 = new TextEncoder().encode('Message 1');
            const message2 = new TextEncoder().encode('Message 2');
            
            const sig1 = await signingCanister.sign(message1);
            const sig2 = await signingCanister.sign(message2);
            
            expect(sig1).not.toEqual(sig2);
        });

        // Test cache management
        it('clears public key cache as owner', async () => {
            // First ensure we have something in cache
            await signingCanister.getPublicKey();
            
            // Clear cache
            const result = await signingCanister.clearPublicKeyCache();
            expect(result).toBe(true);
        });

        it('returns same public key after cache clear (re-cached)', async () => {
            const publicKeyBefore = await signingCanister.getPublicKey();
            await signingCanister.clearPublicKeyCache();
            const publicKeyAfter = await signingCanister.getPublicKey();
            
            expect(publicKeyBefore).toEqual(publicKeyAfter);
        });

        // Test message validation edge cases
        it('accepts minimum size message (1 byte)', async () => {
            const minMessage = new Uint8Array([1]);
            const signature = await signingCanister.sign(minMessage);
            expect(signature.length).toBe(64);
        });

        it('accepts maximum size message (1MB)', async () => {
            const maxMessage = new Uint8Array(1024 * 1024); // Exactly 1MB
            maxMessage.fill(42); // Fill with some data
            
            const signature = await signingCanister.sign(maxMessage);
            expect(signature.length).toBe(64);
        });

        it('handles various message sizes', async () => {
            const sizes = [1, 10, 100, 1000, 10000, 100000];
            
            for (const size of sizes) {
                const message = new Uint8Array(size);
                message.fill(size % 256);
                
                const signature = await signingCanister.sign(message);
                expect(signature.length).toBe(64);
            }
        });

        // Test consistency across methods
        it('returns same signature across different signing methods', async () => {
            const consistencyMessage = new TextEncoder().encode('Consistency test');
            const sig1 = await signingCanister.sign(consistencyMessage);
            const sig2 = (await signingCanister.signWithPublicKey(consistencyMessage)).signature;
            const sig3 = (await signingCanister.signWithHex(consistencyMessage)).signature;
            
            expect(sig1).toEqual(sig2);
            expect(sig1).toEqual(sig3);
        });

        it('returns same public key across different methods', async () => {
            const consistencyMessage = new TextEncoder().encode('PK consistency test');
            const pk1 = await signingCanister.getPublicKey();
            const pk2 = (await signingCanister.getAddressData(0)).public_key;
            const pk3 = (await signingCanister.signWithPublicKey(consistencyMessage)).public_key;
            const pk4 = (await signingCanister.signWithHex(consistencyMessage)).public_key;
            
            expect(pk1).toEqual(pk2);
            expect(pk1).toEqual(pk3);
            expect(pk1).toEqual(pk4);
        });

        it('properly converts to hex format', async () => {
            const hexTestMessage = new TextEncoder().encode('Hex test');
            const result = await signingCanister.signWithHex(hexTestMessage);
            
            // Convert hex back to bytes and compare
            const sigFromHex = new Uint8Array(
                result.signature_hex.slice(2).match(/.{2}/g)!.map((byte: string) => parseInt(byte, 16))
            );
            const pkFromHex = new Uint8Array(
                result.public_key_hex.slice(2).match(/.{2}/g)!.map((byte: string) => parseInt(byte, 16))
            );
            
            expect(sigFromHex).toEqual(result.signature);
            expect(pkFromHex).toEqual(result.public_key);
        });
    };
}