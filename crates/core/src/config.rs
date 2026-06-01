use anyhow::{bail, Context, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

pub const DEFAULT_API_URL: &str = "http://localhost:3000";

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Config {
    #[serde(rename = "apiUrl", skip_serializing_if = "Option::is_none")]
    pub api_url: Option<String>,
}

impl Config {
    pub fn config_dir() -> Result<PathBuf> {
        let home = std::env::var("HOME").context("HOME is not set")?;
        Ok(PathBuf::from(home).join(".timefairy"))
    }

    pub fn config_path() -> Result<PathBuf> {
        Ok(Self::config_dir()?.join("config.json"))
    }

    pub fn load() -> Result<Self> {
        let path = Self::config_path()?;
        if !path.exists() {
            return Ok(Self::default());
        }
        let raw = std::fs::read_to_string(&path).with_context(|| format!("read {}", path.display()))?;
        serde_json::from_str(&raw).with_context(|| format!("parse {}", path.display()))
    }

    pub fn save(&self) -> Result<()> {
        let dir = Self::config_dir()?;
        std::fs::create_dir_all(&dir)?;
        let path = Self::config_path()?;
        let raw = serde_json::to_string_pretty(self)? + "\n";
        std::fs::write(&path, raw).with_context(|| format!("write {}", path.display()))?;
        Ok(())
    }

    pub fn set_api_url(url: &str) -> Result<PathBuf> {
        let mut config = Self::load()?;
        config.api_url = Some(normalize_api_url(url)?);
        config.save()?;
        Self::config_path()
    }

    pub fn persist_api_url_if_changed(url: &str) -> Result<Option<PathBuf>> {
        let normalized = normalize_api_url(url)?;
        let current = Self::load()?.api_url;
        if current.as_ref() == Some(&normalized) {
            return Ok(None);
        }
        Ok(Some(Self::set_api_url(&normalized)?))
    }
}

pub fn normalize_api_url(url: &str) -> Result<String> {
    let s = url.trim().trim_end_matches('/');
    if s.is_empty() {
        bail!("API URL cannot be empty");
    }
    if !s.starts_with("http://") && !s.starts_with("https://") {
        bail!("API URL must start with http:// or https://");
    }
    Ok(s.to_string())
}

pub fn resolve_api_url(cli_flag: Option<String>) -> Result<String> {
    if let Some(url) = cli_flag {
        let trimmed = url.trim();
        if !trimmed.is_empty() {
            return normalize_api_url(trimmed);
        }
    }
    if let Ok(url) = std::env::var("TIMEFAIRY_API_URL") {
        let trimmed = url.trim();
        if !trimmed.is_empty() {
            return normalize_api_url(trimmed);
        }
    }
    if let Ok(config) = Config::load() {
        if let Some(url) = config.api_url {
            return Ok(url);
        }
    }
    Ok(DEFAULT_API_URL.to_string())
}
