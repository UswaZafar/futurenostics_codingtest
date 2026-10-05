import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { highestRole, type Scope, type Task, type TaskListResponse, type TaskPriority, type TaskStatus } from "../types";

const statuses: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];
const priorities: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"];

const scopeOptions: { value: Scope; label: string; roles: Array<"USER" | "MANAGER" | "ADMIN"> }[] = [
  { value: "mine", label: "My Tasks", roles: ["USER", "MANAGER", "ADMIN"] },
  { value: "org", label: "Org Tasks", roles: ["MANAGER", "ADMIN"] },
  { value: "all", label: "All Tasks", roles: ["ADMIN"] },
];

type Draft = {
  id?: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string;
  dueDate: string;
};

const emptyDraft: Draft = {
  title: "",
  status: "TODO",
  priority: "MEDIUM",
  tags: "",
  dueDate: "",
};

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === "DONE") return false;
  return new Date(task.dueDate).getTime() < Date.now();
}

function formatDueDate(value: string | null): string {
  if (!value) return "—";
  const due = new Date(value);
  return Number.isNaN(due.getTime()) ? "—" : due.toLocaleDateString();
}

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function pageError(error: unknown): string {
  if (!axios.isAxiosError(error)) return "Could not load tasks.";
  const status = error.response?.status;
  if (status === 401) return "Your session has expired.";
  if (status === 403) return "You do not have access to these tasks.";
  const message = error.response?.data?.error;
  return typeof message === "string" ? message : "Could not load tasks.";
}

export function TasksPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [bulkStatus, setBulkStatus] = useState<TaskStatus | "">("");
  const [bulkPriority, setBulkPriority] = useState<TaskPriority | "">("");
  const [qInput, setQInput] = useState(() => searchParams.get("q") ?? "");
  const [reload, setReload] = useState(0);

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const tags = searchParams.get("tags") ?? "";
  const cursor = searchParams.get("cursor") ?? "";
  const allowedScopes = scopeOptions.filter((option) => option.roles.some((role) => user?.roles.includes(role)));
  const rawScope = searchParams.get("scope");
  const scope = allowedScopes.some((option) => option.value === rawScope) ? (rawScope as Scope) : "mine";

  function setParams(updates: Record<string, string>, resetCursor = true) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(updates)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        if (resetCursor) next.delete("cursor");
        return next;
      },
      { replace: true },
    );
    if (resetCursor) setCursorStack([]);
  }

  useEffect(() => {
    setQInput(q);
  }, [q]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (qInput !== q) setParams({ q: qInput });
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [qInput, q]);

  useEffect(() => {
    if (rawScope && rawScope !== scope) setParams({ scope });
  }, [rawScope, scope]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const params: Record<string, string> = { scope, limit: "20" };
    if (status) params.status = status;
    if (priority) params.priority = priority;
    if (q) params.q = q;
    if (tags) params.tags = tags;
    if (cursor) params.cursor = cursor;

    api
      .get<TaskListResponse>("/tasks", { params, signal: controller.signal })
      .then((response) => {
        setTasks(response.data.items ?? []);
        setNextCursor(response.data.nextCursor);
        setHasMore(response.data.hasMore);
        setSelected([]);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (axios.isAxiosError(err) && err.code === "ERR_CANCELED") return;
        setTasks([]);
        setNextCursor(null);
        setHasMore(false);
        setError(pageError(err));
        setLoading(false);
      });

    return () => controller.abort();
  }, [scope, status, priority, q, tags, cursor, reload]);

  async function saveDraft() {
    if (!draft || !draft.title.trim()) return;
    const body = {
      title: draft.title.trim(),
      status: draft.status,
      priority: draft.priority,
      tags: parseTags(draft.tags),
      dueDate: draft.dueDate || null,
    };
    try {
      if (draft.id) await api.patch(`/tasks/${draft.id}`, body);
      else await api.post("/tasks", body);
      setDraft(null);
      setReload((value) => value + 1);
    } catch (err) {
      setError(pageError(err));
    }
  }

  async function removeTask(id: string) {
    try {
      await api.delete(`/tasks/${id}`);
      setReload((value) => value + 1);
    } catch (err) {
      setError(pageError(err));
    }
  }

  async function applyBulk() {
    if (!bulkStatus && !bulkPriority) return;
    try {
      await api.patch("/tasks/bulk", {
        ids: selected,
        set: {
          status: bulkStatus || undefined,
          priority: bulkPriority || undefined,
        },
      });
      setSelected([]);
      setBulkStatus("");
      setBulkPriority("");
      setReload((value) => value + 1);
    } catch (err) {
      setError(pageError(err));
    }
  }

  if (!user) return null;

  const pageIds = tasks.map((task) => task.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));

  return (
    <main className="page">
      <header className="topbar">
        <strong>TaskHub Pro</strong>
        <span>
          {user.email} <span className="role">[{highestRole(user.roles)}]</span>
        </span>
        <button
          className="secondary"
          type="button"
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
        >
          Logout
        </button>
      </header>

      <div className="scopes">
        {allowedScopes.map((option) => (
          <button
            key={option.value}
            type="button"
            className={option.value === scope ? "tab active" : "tab"}
            onClick={() => setParams({ scope: option.value })}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="filters">
        <label>
          Search
          <input value={qInput} placeholder="Title" onChange={(event) => setQInput(event.target.value)} />
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => setParams({ status: event.target.value })}>
            <option value="">All</option>
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          Priority
          <select value={priority} onChange={(event) => setParams({ priority: event.target.value })}>
            <option value="">All</option>
            {priorities.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tags
          <input value={tags} placeholder="bug" onChange={(event) => setParams({ tags: event.target.value })} />
        </label>
        <button
          className="secondary"
          type="button"
          onClick={() => {
            setQInput("");
            setParams({ q: "", status: "", priority: "", tags: "" });
          }}
        >
          Clear Filters
        </button>
      </div>

      <button type="button" onClick={() => setDraft(emptyDraft)}>
        + Create Task
      </button>

      {draft ? (
        <form
          className="card draft"
          onSubmit={(event) => {
            event.preventDefault();
            void saveDraft();
          }}
        >
          <label>
            Title
            <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required />
          </label>
          <label>
            Status
            <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as TaskStatus })}>
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select
              value={draft.priority}
              onChange={(event) => setDraft({ ...draft, priority: event.target.value as TaskPriority })}
            >
              {priorities.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tags
            <input
              value={draft.tags}
              placeholder="bug, api"
              onChange={(event) => setDraft({ ...draft, tags: event.target.value })}
            />
          </label>
          <label>
            Due
            <input
              type="date"
              value={draft.dueDate}
              onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })}
            />
          </label>
          <div className="draft-actions">
            <button type="submit">{draft.id ? "Save" : "Create"}</button>
            <button className="secondary" type="button" onClick={() => setDraft(null)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {loading ? <p className="muted">Loading tasks...</p> : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && !error && tasks.length === 0 ? <p className="muted">No tasks found.</p> : null}

      {!loading && !error && tasks.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={(event) => {
                      setSelected(event.target.checked ? pageIds : []);
                    }}
                    aria-label="Select page"
                  />
                </th>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Tags</th>
                <th>Due</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className={isOverdue(task) ? "overdue" : undefined}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(task.id)}
                      onChange={(event) => {
                        setSelected((current) =>
                          event.target.checked ? [...current, task.id] : current.filter((id) => id !== task.id),
                        );
                      }}
                      aria-label={`Select ${task.title}`}
                    />
                  </td>
                  <td>{task.title}</td>
                  <td>{task.status}</td>
                  <td>{task.priority}</td>
                  <td>{task.tags.join(", ") || "—"}</td>
                  <td>{formatDueDate(task.dueDate)}</td>
                  <td className="actions">
                    <button
                      className="secondary"
                      type="button"
                      onClick={() =>
                        setDraft({
                          id: task.id,
                          title: task.title,
                          status: task.status,
                          priority: task.priority,
                          tags: task.tags.join(", "),
                          dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
                        })
                      }
                    >
                      Edit
                    </button>
                    <button className="danger" type="button" onClick={() => void removeTask(task.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {selected.length > 0 ? (
        <div className="bulk">
          <span>Selected: {selected.length}</span>
          <select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value as TaskStatus | "")}>
            <option value="">Status</option>
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select value={bulkPriority} onChange={(event) => setBulkPriority(event.target.value as TaskPriority | "")}>
            <option value="">Priority</option>
            {priorities.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => void applyBulk()}>
            Apply
          </button>
        </div>
      ) : null}

      <div className="pager">
        <button
          className="secondary"
          type="button"
          disabled={cursorStack.length === 0 && !cursor}
          onClick={() => {
            const previous = cursorStack[cursorStack.length - 1] ?? "";
            setCursorStack((stack) => stack.slice(0, -1));
            setParams({ cursor: previous }, false);
          }}
        >
          Previous
        </button>
        <button
          className="secondary"
          type="button"
          disabled={!hasMore || !nextCursor}
          onClick={() => {
            setCursorStack((stack) => [...stack, cursor]);
            setParams({ cursor: nextCursor ?? "" }, false);
          }}
        >
          Next
        </button>
      </div>
    </main>
  );
}
