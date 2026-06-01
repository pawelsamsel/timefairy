mod config;
mod credentials;

use anyhow::{anyhow, Context, Result};
use serde::{Deserialize, Serialize};

pub use config::{normalize_api_url, resolve_api_url, Config, DEFAULT_API_URL};
pub use credentials::{clear_tokens, credentials_path, load_tokens, save_tokens};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthTokens {
    pub access_token: String,
    pub refresh_token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthUser {
    pub id: String,
    pub email: String,
    pub name: String,
    pub role: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthResponse {
    #[serde(rename = "accessToken")]
    pub access_token: String,
    #[serde(rename = "refreshToken")]
    pub refresh_token: String,
    pub user: AuthUser,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub client: Option<ClientRef>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientRef {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub title: String,
    #[serde(rename = "projectId")]
    pub project_id: String,
}

#[derive(Debug, Clone, Default)]
pub struct CreateTimeEntryRequest {
    pub project_id: Option<String>,
    pub task_id: Option<String>,
    pub start_at: Option<String>,
    pub end_at: Option<String>,
    pub duration_minutes: Option<i32>,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeEntry {
    pub id: String,
    #[serde(rename = "durationMinutes")]
    pub duration_minutes: Option<i32>,
    pub note: Option<String>,
    #[serde(rename = "startAt")]
    pub start_at: Option<String>,
    #[serde(rename = "endAt")]
    pub end_at: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    pub project: Option<ProjectRef>,
    pub task: Option<TaskRef>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectRef {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskRef {
    pub id: String,
    pub title: String,
}

pub struct ApiClient {
    base_url: String,
    access_token: Option<String>,
}

impl ApiClient {
    pub fn new(base_url: impl Into<String>) -> Self {
        Self {
            base_url: base_url.into().trim_end_matches('/').to_string(),
            access_token: None,
        }
    }

    pub fn set_access_token(&mut self, token: String) {
        self.access_token = Some(token);
    }

    async fn request<T: for<'de> Deserialize<'de>>(
        &self,
        method: reqwest::Method,
        path: &str,
        body: Option<serde_json::Value>,
    ) -> Result<T> {
        let url = format!("{}{}", self.base_url, path);
        let mut req = reqwest::Client::new().request(method, &url);
        if let Some(token) = &self.access_token {
            req = req.bearer_auth(token);
        }
        if let Some(body) = body {
            req = req.json(&body);
        }
        let res = req.send().await.context("request failed")?;
        if !res.status().is_success() {
            let text = res.text().await.unwrap_or_default();
            return Err(anyhow!("API error: {text}"));
        }
        Ok(res.json().await?)
    }

    pub async fn login(&mut self, email: &str, password: &str) -> Result<AuthResponse> {
        let res: AuthResponse = self
            .request(
                reqwest::Method::POST,
                "/api/auth/login",
                Some(serde_json::json!({ "email": email, "password": password })),
            )
            .await?;
        self.access_token = Some(res.access_token.clone());
        Ok(res)
    }

    pub async fn list_projects(&self) -> Result<Vec<Project>> {
        self.request(reqwest::Method::GET, "/api/projects", None).await
    }

    pub async fn list_tasks(&self, project_id: Option<&str>) -> Result<Vec<Task>> {
        let path = match project_id {
            Some(id) => format!("/api/tasks?projectId={id}"),
            None => "/api/tasks".to_string(),
        };
        self.request(reqwest::Method::GET, &path, None).await
    }

    pub async fn create_time_entry(&self, req: CreateTimeEntryRequest) -> Result<TimeEntry> {
        let mut body = serde_json::json!({ "source": "CLI" });
        if let Some(v) = &req.project_id {
            body["projectId"] = serde_json::json!(v);
        }
        if let Some(v) = &req.task_id {
            body["taskId"] = serde_json::json!(v);
        }
        if let Some(v) = &req.start_at {
            body["startAt"] = serde_json::json!(v);
        }
        if let Some(v) = &req.end_at {
            body["endAt"] = serde_json::json!(v);
        }
        if let Some(v) = req.duration_minutes {
            body["durationMinutes"] = serde_json::json!(v);
        }
        if let Some(v) = &req.note {
            body["note"] = serde_json::json!(v);
        }
        self.request(reqwest::Method::POST, "/api/time-entries", Some(body))
            .await
    }

    pub async fn list_time_entries(&self) -> Result<Vec<TimeEntry>> {
        self.request(reqwest::Method::GET, "/api/time-entries", None)
            .await
    }
}
