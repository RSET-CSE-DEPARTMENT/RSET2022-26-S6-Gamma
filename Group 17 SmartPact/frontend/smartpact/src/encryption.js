// encryption.js (browser-compatible version)
const ENCRYPTION_KEY = 'sreenandan pradeep kumar kizhakk'; // Must be 32 characters

async function encrypt(text) {
    try {
        const iv = crypto.getRandomValues(new Uint8Array(16));
        const encodedKey = new TextEncoder().encode(ENCRYPTION_KEY);
        const key = await crypto.subtle.importKey(
            'raw',
            encodedKey,
            { name: 'AES-CBC' },
            false,
            ['encrypt']
        );
        
        const encodedText = new TextEncoder().encode(text);
        const encrypted = await crypto.subtle.encrypt(
            {
                name: 'AES-CBC',
                iv: iv
            },
            key,
            encodedText
        );
        
        return Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('') + ':' + 
               Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (err) {
        console.error('Encryption error:', err);
        return text; // Fallback to plaintext
    }
}

async function decrypt(text) {
    try {
        const [ivHex, encryptedHex] = text.split(':');
        const iv = new Uint8Array(ivHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        const encrypted = new Uint8Array(encryptedHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        
        const encodedKey = new TextEncoder().encode(ENCRYPTION_KEY);
        const key = await crypto.subtle.importKey(
            'raw',
            encodedKey,
            { name: 'AES-CBC' },
            false,
            ['decrypt']
        );
        
        const decrypted = await crypto.subtle.decrypt(
            {
                name: 'AES-CBC',
                iv: iv
            },
            key,
            encrypted
        );
        
        return new TextDecoder().decode(decrypted);
    } catch (err) {
        console.error('Decryption error:', err);
        return text; // Fallback to ciphertext
    }
}

export { encrypt, decrypt };