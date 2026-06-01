import type {
  AuthTokens,
  AuthUser,
  Client,
  CreateClientInput,
  UpdateClientInput,
  CreateProjectInput,
  CreateTaskInput,
  CreateLaneInput,
  CreateTimeEntryInput,
  ChangeOwnPasswordInput,
  ChangeUserPasswordInput,
  UpdateTimeEntryInput,
  UserDataExport,
  UserDataImportResult,
  CreateUserInput,
  PaginatedUsers,
  UpdateUserInput,
  UserListQuery,
  Lane,
  TimeEntryListQuery,
  TimeEntryWithRelations,
  UpdateLaneInput,
  LoginInput,
  Project,
  RegisterInput,
  SystemSettings,
  TaskDetail,
  TaskWithRelations,
  UpdateProjectInput,
  UpdateTaskInput,
  TimeEntry,
  TimeEntrySummary,
  UpdateSystemSettingsInput,
  User,
} from "@timefairy/shared-types";

export type AuthResponse = AuthTokens & { user: AuthUser };

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export function parseApiErrorMessage(body: string, fallback = "Request failed"): string {
  if (!body) return fallback;
  try {
    const json = JSON.parse(body) as { message?: string | string[] };
    if (Array.isArray(json.message)) return json.message.join(", ");
    if (typeof json.message === "string") return json.message;
  } catch {
    /* plain text */
  }
  return body.length > 200 ? fallback : body;
}

export class TimefairyClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private onTokensRefreshed: ((tokens: AuthTokens) => void) | null = null;
  private onSessionExpired: (() => void) | null = null;

  constructor(private baseUrl: string) {}

  setSessionCallbacks(handlers: {
    onTokensRefreshed?: (tokens: AuthTokens) => void;
    onSessionExpired?: () => void;
  }) {
    this.onTokensRefreshed = handlers.onTokensRefreshed ?? null;
    this.onSessionExpired = handlers.onSessionExpired ?? null;
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
  }

  getTokens(): AuthTokens | null {
    if (!this.accessToken || !this.refreshToken) return null;
    return { accessToken: this.accessToken, refreshToken: this.refreshToken };
  }

  async tryRefreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;
    try {
      const res = await fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });
      if (!res.ok) return false;
      const tokens = (await res.json()) as AuthTokens;
      this.accessToken = tokens.accessToken;
      this.refreshToken = tokens.refreshToken;
      this.onTokensRefreshed?.(tokens);
      return true;
    } catch {
      return false;
    }
  }

  private async request<T>(path: string, init: RequestInit = {}, allowRefresh = true): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string>),
    };
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, { ...init, headers });

    if (
      res.status === 401 &&
      allowRefresh &&
      this.refreshToken &&
      !path.startsWith("/api/auth/login") &&
      !path.startsWith("/api/auth/register") &&
      path !== "/api/auth/refresh"
    ) {
      const refreshed = await this.tryRefreshAccessToken();
      if (refreshed) {
        return this.request<T>(path, init, false);
      }
      this.clearTokens();
      this.onSessionExpired?.();
    }

    if (!res.ok) {
      const body = await res.text();
      throw new ApiError(parseApiErrorMessage(body, res.statusText), res.status);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  login(input: LoginInput) {
    return this.request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  register(input: RegisterInput) {
    return this.request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  me() {
    return this.request<AuthUser>("/api/auth/me");
  }

  changeOwnPassword(input: ChangeOwnPasswordInput) {
    return this.request<{ ok: boolean }>("/api/auth/me/password", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  exportUserData() {
    return this.request<UserDataExport>("/api/user-data/export");
  }

  importUserData(data: UserDataExport) {
    return this.request<UserDataImportResult>("/api/user-data/import", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  getSettings() {
    return this.request<SystemSettings>("/api/settings");
  }

  updateSettings(input: UpdateSystemSettingsInput) {
    return this.request<SystemSettings>("/api/settings", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  listUsers(query: UserListQuery = {}) {
    const params = new URLSearchParams();
    if (query.page != null) params.set("page", String(query.page));
    if (query.pageSize != null) params.set("pageSize", String(query.pageSize));
    if (query.search) params.set("search", query.search);
    if (query.status) params.set("status", query.status);
    const qs = params.toString();
    return this.request<PaginatedUsers>(`/api/admin/users${qs ? `?${qs}` : ""}`);
  }

  getUser(id: string) {
    return this.request<User>(`/api/admin/users/${id}`);
  }

  createUser(input: CreateUserInput) {
    return this.request<User>("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  updateUser(id: string, input: UpdateUserInput) {
    return this.request<User>(`/api/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  changeUserPassword(id: string, input: ChangeUserPasswordInput) {
    return this.request<User>(`/api/admin/users/${id}/password`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  softDeleteUser(id: string) {
    return this.request<User>(`/api/admin/users/${id}/soft-delete`, { method: "POST" });
  }

  restoreUser(id: string) {
    return this.request<User>(`/api/admin/users/${id}/restore`, { method: "POST" });
  }

  hardDeleteUser(id: string) {
    return this.request<{ deleted: boolean }>(`/api/admin/users/${id}`, { method: "DELETE" });
  }

  listClients() {
    return this.request<Client[]>("/api/clients");
  }

  createClient(input: CreateClientInput) {
    return this.request<Client>("/api/clients", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  updateClient(id: string, input: UpdateClientInput) {
    return this.request<Client>(`/api/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  deleteClient(id: string) {
    return this.request<{ ok: boolean }>(`/api/clients/${id}`, { method: "DELETE" });
  }

  listProjects() {
    return this.request<
      (Project & {
        client: { id: string; name: string };
        _count?: { tasks: number; timeEntries: number };
      })[]
    >("/api/projects");
  }

  getProject(id: string) {
    return this.request<
      Project & {
        client: { id: string; name: string };
        tasks: TaskWithRelations[];
        _count: { tasks: number; timeEntries: number };
      }
    >(`/api/projects/${id}`);
  }

  createProject(input: CreateProjectInput) {
    return this.request<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  updateProject(id: string, input: UpdateProjectInput) {
    return this.request<Project>(`/api/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  deleteProject(id: string) {
    return this.request<{ ok: boolean }>(`/api/projects/${id}`, { method: "DELETE" });
  }

  listTasks(params?: { projectId?: string; clientId?: string }) {
    const qs = new URLSearchParams();
    if (params?.projectId) qs.set("projectId", params.projectId);
    if (params?.clientId) qs.set("clientId", params.clientId);
    const q = qs.toString();
    return this.request<TaskWithRelations[]>(`/api/tasks${q ? `?${q}` : ""}`);
  }

  getTask(id: string) {
    return this.request<TaskDetail>(`/api/tasks/${id}`);
  }

  createTask(input: CreateTaskInput) {
    return this.request<TaskWithRelations>("/api/tasks", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  updateTask(id: string, input: UpdateTaskInput) {
    return this.request<TaskWithRelations>(`/api/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  deleteTask(id: string) {
    return this.request<{ ok: boolean }>(`/api/tasks/${id}`, { method: "DELETE" });
  }

  listLanes() {
    return this.request<Lane[]>("/api/lanes");
  }

  createLane(input: CreateLaneInput) {
    return this.request<Lane>("/api/lanes", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  updateLane(id: string, input: UpdateLaneInput) {
    return this.request<Lane>(`/api/lanes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  deleteLane(id: string) {
    return this.request<{ ok: boolean }>(`/api/lanes/${id}`, { method: "DELETE" });
  }

  listTimeEntries(params: TimeEntryListQuery = {}) {
    const qs = new URLSearchParams();
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
    if (params.laneId) qs.set("laneId", params.laneId);
    if (params.clientId) qs.set("clientId", params.clientId);
    if (params.projectId) qs.set("projectId", params.projectId);
    const q = qs.toString();
    return this.request<TimeEntryWithRelations[]>(`/api/time-entries${q ? `?${q}` : ""}`);
  }

  createTimeEntry(input: CreateTimeEntryInput) {
    return this.request<TimeEntry>("/api/time-entries", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  updateTimeEntry(id: string, input: UpdateTimeEntryInput) {
    return this.request<TimeEntryWithRelations>(`/api/time-entries/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  deleteTimeEntry(id: string) {
    return this.request<{ ok: boolean }>(`/api/time-entries/${id}`, { method: "DELETE" });
  }

  timeEntrySummary(params: { from?: string; to?: string; clientId?: string; projectId?: string }) {
    const qs = new URLSearchParams();
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
    if (params.clientId) qs.set("clientId", params.clientId);
    if (params.projectId) qs.set("projectId", params.projectId);
    const q = qs.toString();
    return this.request<TimeEntrySummary[]>(`/api/time-entries/summary${q ? `?${q}` : ""}`);
  }
}

export * from "@timefairy/shared-types";
