use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use anyhow::Result;
use base64::{engine::general_purpose, Engine as _};
use rand::RngCore;
use std::env;

fn is_dev_mode() -> bool {
    matches!(
        env::var("NETWEAVE_ENV").as_deref(),
        Ok("dev") | Ok("development")
    ) || env::var("ENCRYPTION_KEY").as_deref() == Ok("dev")
}

/// Validates the encryption key at startup.
/// Panics if key is missing/invalid unless ENCRYPTION_KEY=dev or NETWEAVE_ENV=dev.
pub fn validate_encryption_key() {
    match env::var("ENCRYPTION_KEY") {
        Ok(k) if k == "dev" => {
            tracing::warn!(
                "Using insecure development key (ENCRYPTION_KEY=dev). \
                 Set ENCRYPTION_KEY to a 64-char hex string for production."
            );
        }
        Ok(k) if k.len() == 64 => {
            hex::decode(&k).unwrap_or_else(|e| {
                panic!("ENCRYPTION_KEY contains invalid hex: {e}");
            });
            tracing::info!("Encryption key validated successfully.");
        }
        Ok(k) => {
            panic!(
                "ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). Got {} characters.",
                k.len()
            );
        }
        Err(_) if is_dev_mode() => {
            tracing::warn!(
                "ENCRYPTION_KEY not set — using insecure dev key (NETWEAVE_ENV=dev). \
                 Set ENCRYPTION_KEY for production."
            );
        }
        Err(_) => {
            panic!(
                "ENCRYPTION_KEY is required. Set a 64-char hex string, or set \
                 ENCRYPTION_KEY=dev or NETWEAVE_ENV=dev to use an insecure development key."
            );
        }
    }
}

/// Encrypts a string using AES-256-GCM.
/// Returns base64(nonce ++ ciphertext).
pub fn encrypt(plaintext: &str) -> Result<String> {
    let key_bytes = get_encryption_key()?;
    let cipher = Aes256Gcm::new_from_slice(&key_bytes)
        .map_err(|e| anyhow::anyhow!("Invalid encryption key length: {e}"))?;

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

/// Decrypts a base64-encoded string (nonce ++ ciphertext).
pub fn decrypt(encrypted_base64: &str) -> Result<String> {
    let key_bytes = get_encryption_key()?;
    let cipher = Aes256Gcm::new_from_slice(&key_bytes)
        .map_err(|e| anyhow::anyhow!("Invalid encryption key length: {e}"))?;

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

fn get_encryption_key() -> Result<Vec<u8>> {
    match env::var("ENCRYPTION_KEY") {
        Ok(k) if k == "dev" => Ok(dev_key()),
        Ok(k) if k.len() == 64 => hex::decode(&k)
            .map_err(|e| anyhow::anyhow!("Invalid hex in ENCRYPTION_KEY: {e}")),
        Ok(_) => Err(anyhow::anyhow!("ENCRYPTION_KEY has invalid length")),
        Err(_) if is_dev_mode() => Ok(dev_key()),
        Err(_) => Err(anyhow::anyhow!("ENCRYPTION_KEY is not set")),
    }
}

fn dev_key() -> Vec<u8> {
    vec![
        0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D,
        0x0E, 0x0F, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x1B,
        0x1C, 0x1D, 0x1E, 0x1F,
    ]
}
