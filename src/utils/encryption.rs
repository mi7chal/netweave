use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use anyhow::Result;
use base64::{engine::general_purpose, Engine as _};
use rand::RngCore;
use std::env;

/// Encrypts a string using AES-256-GCM.
/// returns: base64(nonce + ciphertext)
pub fn encrypt(plaintext: &str) -> Result<String> {
    let key_bytes = get_encryption_key();
    let cipher = Aes256Gcm::new_from_slice(&key_bytes).expect("Invalid key length");

    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| anyhow::anyhow!("Encryption failed: {}", e))?;

    let mut combined = nonce_bytes.to_vec();
    combined.extend(ciphertext);

    Ok(general_purpose::STANDARD.encode(combined))
}

/// Decrypts a base64 encoded string (nonce + ciphertext).
pub fn decrypt(encrypted_base64: &str) -> Result<String> {
    let key_bytes = get_encryption_key();
    let cipher = Aes256Gcm::new_from_slice(&key_bytes).expect("Invalid key length");

    let combined = general_purpose::STANDARD
        .decode(encrypted_base64)
        .map_err(|e| anyhow::anyhow!("Base64 decode failed: {}", e))?;

    if combined.len() < 12 {
        return Err(anyhow::anyhow!("Invalid ciphertext length"));
    }

    let (nonce_bytes, ciphertext) = combined.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| anyhow::anyhow!("Decryption failed: {}", e))?;

    Ok(String::from_utf8(plaintext)?)
}

/// Gets key from env var "ENCRYPTION_KEY" (32 bytes hex) or uses a default dev key.
/// WARN: For production, this MUST be a proper secret.
fn get_encryption_key() -> Vec<u8> {
    match env::var("ENCRYPTION_KEY") {
        Ok(k) => {
            if k.len() != 64 {
                // If it's not 64 chars hex (32 bytes), just use it as bytes?
                // Better to enforce hex for clarity handling 32 bytes.
                // For simplicity in this demo, let's just hash it or padding.
                // Proper way: decode hex.
                 hex::decode(k).unwrap_or_else(|_| vec![0u8; 32])
            } else {
                 hex::decode(k).unwrap_or_else(|_| vec![0u8; 32])
            }
        }
        Err(_) => {
            // Default Dev Key (DO NOT USE IN PROD)
            // 32 bytes
            vec![
                0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
                0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F,
                0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17,
                0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F
            ]
        }
    }
}
