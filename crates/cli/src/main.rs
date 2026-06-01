mod entry;
mod reference;

use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use entry::{run_add_entry, AddEntryArgs};
use timefairy_core::{
    clear_tokens, load_tokens, save_tokens, ApiClient, AuthTokens, Config, DEFAULT_API_URL,
    resolve_api_url,
};

#[derive(Parser)]
#[command(
    name = "timefairy",
    version,
    about = "Timefairy time-tracking CLI",
    long_about = "Configure API URL, authenticate, list projects, and log time against a Timefairy instance.",
    after_help = "Full guide: timefairy reference  (alias: timefairy docs)"
)]
struct Cli {
    #[arg(
        long,
        global = true,
        help = "API base URL (saved to ~/.timefairy/config.json when set)"
    )]
    api_url: Option<String>,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Print full command reference (for humans and AI agents)
    #[command(visible_alias = "docs", display_order = 1)]
    Reference,

    /// Initial setup / configure API URL
    #[command(display_order = 2)]
    Setup {
        #[arg(long, help = "API base URL (skips interactive menu)")]
        api_url: Option<String>,
    },

    /// Manage ~/.timefairy/config.json
    #[command(display_order = 3)]
    Config {
        #[command(subcommand)]
        action: Option<ConfigAction>,
    },

    /// Log in (interactive email/password prompts)
    #[command(display_order = 4)]
    Login {
        #[arg(long, help = "Email (prompted if omitted)")]
        email: Option<String>,
        #[arg(
            long,
            hide = true,
            help = "Discouraged: visible in shell history; use interactive login"
        )]
        password: Option<String>,
    },

    /// Clear stored session
    #[command(display_order = 5)]
    Logout,

    /// Project commands
    #[command(display_order = 6)]
    Projects {
        #[command(subcommand)]
        action: ProjectsAction,
    },

    /// Add a time entry (alias: add-entry)
    #[command(name = "add-time", visible_alias = "add-entry", display_order = 7)]
    AddTime(#[command(flatten)] AddEntryArgs),

    /// Time entry commands
    #[command(display_order = 8)]
    Entries {
        #[command(subcommand)]
        action: EntriesAction,
    },
}

#[derive(Subcommand)]
enum ConfigAction {
    /// Show config path and apiUrl
    Get,
    /// Print config file path only
    Path,
    /// Set a config value (non-interactive)
    Set {
        #[command(subcommand)]
        key: ConfigSetKey,
    },
}

#[derive(Subcommand)]
enum ConfigSetKey {
    #[command(
        name = "api-url",
        about = "Set API base URL in config.json"
    )]
    ApiUrl {
        #[arg(help = "e.g. http://localhost:3000 or https://app.example.com")]
        url: String,
    },
}

#[derive(Subcommand)]
enum ProjectsAction {
    /// List all projects
    List,
}

#[derive(Subcommand)]
enum EntriesAction {
    /// Add a time entry (all fields optional)
    #[command(visible_alias = "add-entry")]
    Add(#[command(flatten)] AddEntryArgs),

    /// List entries created today (local date)
    Today,
}

fn resolve_login_credentials(
    email: Option<String>,
    password: Option<String>,
) -> Result<(String, String)> {
    use dialoguer::{Input, Password};

    if password.is_some() {
        eprintln!("Warning: --password is visible in shell history; prefer interactive login.");
    }

    let email = match email {
        Some(e) if !e.trim().is_empty() => e.trim().to_string(),
        _ => Input::new()
            .with_prompt("Email")
            .interact_text()
            .context("failed to read email")?,
    };

    let password = match password {
        Some(p) if !p.is_empty() => p,
        _ => Password::new()
            .with_prompt("Password")
            .allow_empty_password(false)
            .interact()
            .context("failed to read password")?,
    };

    Ok((email, password))
}

async fn client_with_auth(api_url: &str) -> Result<ApiClient> {
    let mut client = ApiClient::new(api_url);
    match load_tokens()? {
        Some(tokens) => client.set_access_token(tokens.access_token),
        None => anyhow::bail!("Not logged in. Run: timefairy login"),
    }
    Ok(client)
}

fn prompt_api_url(current: &str) -> Result<String> {
    use dialoguer::Input;

    Input::new()
        .with_prompt("API URL")
        .default(current.to_string())
        .show_default(true)
        .interact_text()
        .context("failed to read API URL")
}

fn save_api_url_and_confirm(url: &str) -> Result<()> {
    let path = Config::set_api_url(url)?;
    println!("Saved to {}", path.display());
    println!("apiUrl: {}", Config::load()?.api_url.unwrap());
    Ok(())
}

fn run_config_menu() -> Result<()> {
    use dialoguer::Select;

    println!("Config: {}", Config::config_path()?.display());

    loop {
        let config = Config::load()?;
        let api_display = config
            .api_url
            .as_deref()
            .unwrap_or(DEFAULT_API_URL);

        let selection = Select::new()
            .with_prompt("Timefairy config")
            .items(&[
                format!("API URL (current): {api_display}"),
                "Change API URL".to_string(),
                "Show config file path".to_string(),
                "Done".to_string(),
            ])
            .default(0)
            .interact()
            .context("config menu cancelled")?;

        match selection {
            1 => {
                let url = prompt_api_url(api_display)?;
                save_api_url_and_confirm(&url)?;
            }
            2 => println!("{}", Config::config_path()?.display()),
            3 => {
                println!("Run: timefairy login");
                break;
            }
            _ => {}
        }
    }

    Ok(())
}

fn run_setup(api_url_flag: Option<String>) -> Result<()> {
    if let Some(url) = api_url_flag {
        save_api_url_and_confirm(&url)?;
        println!("Run: timefairy login");
        return Ok(());
    }
    run_config_menu()
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    if let Some(ref url) = cli.api_url {
        if let Some(path) = Config::persist_api_url_if_changed(url)? {
            eprintln!("Saved apiUrl to {}", path.display());
        }
    }

    let api_url = resolve_api_url(cli.api_url)?;

    match cli.command {
        Commands::Reference => {
            print!("{}", reference::REFERENCE);
        }
        Commands::Setup { api_url: url } => run_setup(url)?,
        Commands::Config { action } => match action {
            None => run_config_menu()?,
            Some(ConfigAction::Get) => {
                let path = Config::config_path()?;
                let config = Config::load()?;
                println!("{}", path.display());
                match config.api_url {
                    Some(url) => println!("apiUrl: {url}"),
                    None => println!("apiUrl: (not set, using {DEFAULT_API_URL})"),
                }
            }
            Some(ConfigAction::Path) => {
                println!("{}", Config::config_path()?.display());
            }
            Some(ConfigAction::Set { key }) => match key {
                ConfigSetKey::ApiUrl { url } => {
                    let path = Config::set_api_url(&url)?;
                    println!("apiUrl: {}", Config::load()?.api_url.unwrap());
                    println!("Saved to {}", path.display());
                }
            },
        },
        Commands::Login { email, password } => {
            let (email, password) = resolve_login_credentials(email, password)?;
            let mut client = ApiClient::new(&api_url);
            let res = client.login(&email, &password).await?;
            save_tokens(&AuthTokens {
                access_token: res.access_token,
                refresh_token: res.refresh_token,
            })?;
            println!("Logged in as {}", res.user.email);
        }
        Commands::Logout => {
            clear_tokens()?;
            println!("Logged out");
        }
        Commands::Projects { action: ProjectsAction::List } => {
            let client = client_with_auth(&api_url).await?;
            let projects = client.list_projects().await?;
            for p in projects {
                let client_name = p.client.map(|c| c.name).unwrap_or_else(|| "-".into());
                println!("{} · {}", p.name, client_name);
            }
        }
        Commands::AddTime(args) => {
            let client = client_with_auth(&api_url).await?;
            run_add_entry(&client, args.into()).await?;
        }
        Commands::Entries { action } => match action {
            EntriesAction::Add(args) => {
                let client = client_with_auth(&api_url).await?;
                run_add_entry(&client, args.into()).await?;
            }
            EntriesAction::Today => {
                let client = client_with_auth(&api_url).await?;
                let entries = client.list_time_entries().await?;
                let today = chrono::Local::now().date_naive();
                for e in entries {
                    let created =
                        chrono::DateTime::parse_from_rfc3339(&e.created_at.replace('Z', "+00:00"))
                            .or_else(|_| chrono::DateTime::parse_from_str(&e.created_at, "%+"))
                            .ok();
                    if let Some(dt) = created {
                        if dt.date_naive() != today {
                            continue;
                        }
                    }
                    let mins = e.duration_minutes.unwrap_or(0);
                    println!("{:.2}h · {}", mins as f64 / 60.0, e.note.unwrap_or_default());
                }
            }
        },
    }

    Ok(())
}
