use crate::AuthTokens;
use anyhow::{Context, Result};
use std::path::{Path, PathBuf};

const KEYRING_SERVICE: &str = "timefairy";
const KEYRING_USER: &str = "default";

pub fn credentials_path() -> Result<PathBuf> {
    let home = std::env::var("HOME").context("HOME is not set")?;
    Ok(PathBuf::from(home).join(".timefairy").join("credentials.json"))
}

pub fn save_tokens(tokens: &AuthTokens) -> Result<()> {
    let path = credentials_path()?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let raw = serde_json::to_string_pretty(tokens)? + "\n";
    std::fs::write(&path, &raw).with_context(|| format!("write {}", path.display()))?;
    restrict_permissions(&path)?;
    Ok(())
}

pub fn load_tokens() -> Result<Option<AuthTokens>> {
    let path = credentials_path()?;
    if path.exists() {
        let raw = std::fs::read_to_string(&path)
            .with_context(|| format!("read {}", path.display()))?;
        let tokens: AuthTokens = serde_json::from_str(&raw)
            .with_context(|| format!("parse {}", path.display()))?;
        return Ok(Some(tokens));
    }

    if let Some(tokens) = load_tokens_keyring()? {
        save_tokens(&tokens)?;
        return Ok(Some(tokens));
    }

    Ok(None)
}

pub fn clear_tokens() -> Result<()> {
    let path = credentials_path()?;
    if path.exists() {
        std::fs::remove_file(&path).ok();
    }
    let entry = keyring::Entry::new(KEYRING_SERVICE, KEYRING_USER)?;
    let _ = entry.delete_credential();
    Ok(())
}

fn load_tokens_keyring() -> Result<Option<AuthTokens>> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, KEYRING_USER)?;
    match entry.get_password() {
        Ok(raw) => Ok(Some(serde_json::from_str(&raw)?)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

fn restrict_permissions(path: &Path) -> Result<()> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o600))?;
    }
    Ok(())
}
