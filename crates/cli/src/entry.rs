use anyhow::{bail, Context, Result};
use chrono::{Local, NaiveDate, NaiveDateTime, TimeZone};
use clap::Args;
use dialoguer::{Confirm, Input, Select};
use timefairy_core::{ApiClient, CreateTimeEntryRequest, TimeEntry};

#[derive(Args, Debug, Clone, Default)]
#[command(next_help_heading = "Entry options (all optional)")]
pub struct AddEntryArgs {
    #[arg(long, help = "Project name (case-insensitive)")]
    pub project: Option<String>,

    #[arg(long, help = "Task title or UUID")]
    pub task: Option<String>,

    #[arg(long, help = "Start time (ISO-8601 or YYYY-MM-DDTHH:MM local)")]
    pub start: Option<String>,

    #[arg(long, help = "End time (requires --start)")]
    pub end: Option<String>,

    #[arg(long, help = "Duration: 2h, 90m, or hours as number")]
    pub duration: Option<String>,

    #[arg(long, help = "Entry note / description")]
    pub note: Option<String>,

    #[arg(long, help = "Date (YYYY-MM-DD) when using duration-only with a default morning anchor")]
    pub date: Option<String>,

    #[arg(long, help = "Prompt for any missing fields")]
    pub interactive: bool,
}

impl From<AddEntryArgs> for AddEntryOptions {
    fn from(a: AddEntryArgs) -> Self {
        AddEntryOptions {
            project: a.project,
            task: a.task,
            start: a.start,
            end: a.end,
            duration: a.duration,
            note: a.note,
            date: a.date,
            interactive: a.interactive,
        }
    }
}

#[derive(Debug, Clone, Default)]
pub struct AddEntryOptions {
    pub project: Option<String>,
    pub task: Option<String>,
    pub start: Option<String>,
    pub end: Option<String>,
    pub duration: Option<String>,
    pub note: Option<String>,
    pub date: Option<String>,
    pub interactive: bool,
}

pub fn parse_duration(input: &str) -> Result<i32> {
    let s = input.trim().to_lowercase();
    if s.is_empty() {
        bail!("Duration cannot be empty");
    }
    if s.ends_with('h') {
        let hours: f64 = s.trim_end_matches('h').parse()?;
        return Ok((hours * 60.0).round() as i32);
    }
    if s.ends_with('m') {
        return Ok(s.trim_end_matches('m').parse()?);
    }
    Ok((s.parse::<f64>()? * 60.0).round() as i32)
}

pub fn parse_datetime(input: &str) -> Result<String> {
    let s = input.trim();
    if s.is_empty() {
        bail!("Datetime cannot be empty");
    }
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(s) {
        return Ok(dt.to_rfc3339());
    }
    if let Ok(dt) = chrono::DateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S%z") {
        return Ok(dt.to_rfc3339());
    }
    for fmt in ["%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S"] {
        if let Ok(naive) = NaiveDateTime::parse_from_str(s, fmt) {
            let local = Local
                .from_local_datetime(&naive)
                .single()
                .context("ambiguous local datetime")?;
            return Ok(local.to_rfc3339());
        }
    }
    bail!("Unrecognized datetime '{s}'. Use ISO-8601 or YYYY-MM-DDTHH:MM");
}

fn parse_date(input: &str) -> Result<NaiveDate> {
    NaiveDate::parse_from_str(input.trim(), "%Y-%m-%d")
        .with_context(|| format!("invalid date '{input}', use YYYY-MM-DD"))
}

fn is_uuid(s: &str) -> bool {
    let s = s.trim();
    s.len() == 36 && s.chars().filter(|c| *c == '-').count() == 4
}

async fn resolve_project_id(
    client: &ApiClient,
    name: Option<String>,
    interactive: bool,
) -> Result<Option<String>> {
    let projects = client.list_projects().await?;
    if projects.is_empty() {
        return Ok(None);
    }

    if let Some(name) = name {
        let id = projects
            .iter()
            .find(|p| p.name.eq_ignore_ascii_case(name.trim()))
            .map(|p| p.id.clone())
            .with_context(|| format!("Project not found: {name}"))?;
        return Ok(Some(id));
    }

    if !interactive {
        return Ok(None);
    }

    let mut items: Vec<String> = vec!["(none)".to_string()];
    items.extend(projects.iter().map(|p| p.name.clone()));
    let sel = Select::new()
        .with_prompt("Project")
        .items(&items)
        .default(0)
        .interact()
        .context("project selection cancelled")?;
    if sel == 0 {
        return Ok(None);
    }
    Ok(Some(projects[sel - 1].id.clone()))
}

async fn resolve_task_id(
    client: &ApiClient,
    project_id: &Option<String>,
    task: Option<String>,
    interactive: bool,
) -> Result<Option<String>> {
    let tasks = client.list_tasks(project_id.as_deref()).await?;
    if tasks.is_empty() {
        if task.is_some() {
            bail!("No tasks found for this project");
        }
        return Ok(None);
    }

    if let Some(ref t) = task {
        let trimmed = t.trim();
        if is_uuid(trimmed) {
            if tasks.iter().any(|x| x.id == trimmed) {
                return Ok(Some(trimmed.to_string()));
            }
            bail!("Task id not found: {trimmed}");
        }
        let id = tasks
            .iter()
            .find(|x| x.title.eq_ignore_ascii_case(trimmed))
            .map(|x| x.id.clone())
            .with_context(|| format!("Task not found: {trimmed}"))?;
        return Ok(Some(id));
    }

    if !interactive {
        return Ok(None);
    }

    let mut items: Vec<String> = vec!["(none)".to_string()];
    items.extend(tasks.iter().map(|t| t.title.clone()));
    let sel = Select::new()
        .with_prompt("Task")
        .items(&items)
        .default(0)
        .interact()
        .context("task selection cancelled")?;
    if sel == 0 {
        return Ok(None);
    }
    Ok(Some(tasks[sel - 1].id.clone()))
}

async fn resolve_time_fields(
    opts: &AddEntryOptions,
    interactive: bool,
) -> Result<(Option<String>, Option<String>, Option<i32>)> {
    let has_start = opts.start.as_ref().is_some_and(|s| !s.trim().is_empty());
    let has_end = opts.end.as_ref().is_some_and(|s| !s.trim().is_empty());
    let has_duration = opts
        .duration
        .as_ref()
        .is_some_and(|s| !s.trim().is_empty());

    if has_start || has_end || has_duration {
        let start_at = opts
            .start
            .as_ref()
            .filter(|s| !s.trim().is_empty())
            .map(|s| parse_datetime(s))
            .transpose()?;
        let end_at = opts
            .end
            .as_ref()
            .filter(|s| !s.trim().is_empty())
            .map(|s| parse_datetime(s))
            .transpose()?;
        if end_at.is_some() && start_at.is_none() {
            bail!("--end requires --start");
        }
        let duration_minutes = opts
            .duration
            .as_ref()
            .filter(|s| !s.trim().is_empty())
            .map(|s| parse_duration(s))
            .transpose()?;
        if start_at.is_none() && duration_minutes.is_none() {
            bail!("Provide --start, --duration, or both --start and --end");
        }
        return Ok((start_at, end_at, duration_minutes));
    }

    if !interactive {
        bail!("Provide --duration, --start (and optional --end), or use --interactive");
    }

    let mode = Select::new()
        .with_prompt("Time")
        .items(&[
            "Duration only (e.g. 2h)",
            "Start and end",
            "Start only",
        ])
        .default(0)
        .interact()
        .context("time mode cancelled")?;

    match mode {
        0 => {
            let dur: String = Input::new()
                .with_prompt("Duration (2h, 90m)")
                .interact_text()?;
            let minutes = parse_duration(&dur)?;
            let start_at = if let Some(ref d) = opts.date {
                let date = parse_date(d)?;
                let naive = date.and_hms_opt(9, 0, 0).unwrap();
                let local = Local.from_local_datetime(&naive).single().unwrap();
                Some(local.to_rfc3339())
            } else {
                None
            };
            Ok((start_at, None, Some(minutes)))
        }
        1 => {
            let start: String = Input::new()
                .with_prompt("Start (YYYY-MM-DDTHH:MM)")
                .interact_text()?;
            let end: String = Input::new()
                .with_prompt("End (YYYY-MM-DDTHH:MM)")
                .interact_text()?;
            Ok((
                Some(parse_datetime(&start)?),
                Some(parse_datetime(&end)?),
                None,
            ))
        }
        2 => {
            let start: String = Input::new()
                .with_prompt("Start (YYYY-MM-DDTHH:MM)")
                .interact_text()?;
            Ok((Some(parse_datetime(&start)?), None, None))
        }
        _ => unreachable!(),
    }
}

async fn resolve_note(note: Option<String>, interactive: bool) -> Result<Option<String>> {
    if let Some(n) = note {
        let t = n.trim();
        if t.is_empty() {
            return Ok(None);
        }
        return Ok(Some(t.to_string()));
    }
    if !interactive {
        return Ok(None);
    }
    if !Confirm::new()
        .with_prompt("Add a note?")
        .default(false)
        .interact()?
    {
        return Ok(None);
    }
    let n: String = Input::new().with_prompt("Note").interact_text()?;
    let t = n.trim();
    if t.is_empty() {
        Ok(None)
    } else {
        Ok(Some(t.to_string()))
    }
}

pub async fn run_add_entry(client: &ApiClient, opts: AddEntryOptions) -> Result<()> {
    let interactive = opts.interactive
        || opts.project.is_none()
        || opts.task.is_none()
        || (opts.start.is_none() && opts.end.is_none() && opts.duration.is_none());

    let project_id = resolve_project_id(client, opts.project.clone(), interactive).await?;
    let task_id = resolve_task_id(client, &project_id, opts.task.clone(), interactive).await?;
    let (start_at, end_at, duration_minutes) = resolve_time_fields(&opts, interactive).await?;
    let note = resolve_note(opts.note.clone(), interactive).await?;

    let entry = client
        .create_time_entry(CreateTimeEntryRequest {
            project_id,
            task_id,
            start_at,
            end_at,
            duration_minutes,
            note,
        })
        .await?;

    print_entry_summary(&entry);
    Ok(())
}

fn print_entry_summary(entry: &TimeEntry) {
    let mins = entry.duration_minutes.unwrap_or(0);
    let project = entry
        .project
        .as_ref()
        .map(|p| p.name.as_str())
        .unwrap_or("-");
    let task = entry
        .task
        .as_ref()
        .map(|t| t.title.as_str())
        .unwrap_or("-");
    let note = entry.note.as_deref().unwrap_or("");
    if mins > 0 {
        println!(
            "Entry {} · {:.2}h · {} · {} · {}",
            entry.id, mins as f64 / 60.0, project, task, note
        );
    } else {
        println!(
            "Entry {} · {} – {} · {} · {} · {}",
            entry.id,
            entry.start_at.as_deref().unwrap_or("?"),
            entry.end_at.as_deref().unwrap_or("?"),
            project,
            task,
            note
        );
    }
}
