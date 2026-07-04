import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useI18n } from "../lib/i18n";
import type { Guild, Role } from "../types";
import Modal from "./Modal";
import { PlusIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon, SearchIcon } from "./Icons";

declare const __APP_VERSION__: string;

const TOGGLES: { bit: bigint; key: string }[] = [
  { bit: 1n << 3n, key: "roles.perm.administrator" },
  { bit: 1n << 4n, key: "roles.perm.manageChannels" },
  { bit: 1n << 28n, key: "roles.perm.manageRoles" },
  { bit: 1n << 30n, key: "roles.perm.manageEmojis" },
];

const SWATCHES = [
  "#99aab5", "#1abc9c", "#2ecc71", "#3498db", "#9b59b6",
  "#e91e63", "#f1c40f", "#e67e22", "#e74c3c", "#95a5a6",
];

export default function RolesModal({ guildId, onClose }: { guildId: string; onClose: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: guild } = useQuery<Guild>({
    queryKey: ["guild", guildId],
    queryFn: () => api<Guild>(`/api/guilds/${guildId}`),
    staleTime: 30_000,
  });

  const roles = useMemo(
    () => [...(guild?.roles ?? [])].sort((a, b) => b.position - a.position),
    [guild?.roles],
  );

  const filtered = useMemo(
    () => (search ? roles.filter((r) => r.name.toLowerCase().includes(search.toLowerCase())) : roles),
    [roles, search],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = filtered.find((r) => r.id === selectedId) ?? filtered[0] ?? null;

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["guild", guildId] });
  }

  async function createRole() {
    const role = await api<Role>(`/api/guilds/${guildId}/roles`, {
      method: "POST",
      body: JSON.stringify({ name: t("roles.newRole") }),
    });
    invalidate();
    setSelectedId(role.id);
    setSearch("");
  }

  async function patchRole(roleId: string, patch: Partial<{ name: string; color: string; permissions: string }>) {
    await api(`/api/guilds/${guildId}/roles/${roleId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }).catch(() => {});
    invalidate();
  }

  async function deleteRole(roleId: string) {
    await api(`/api/guilds/${guildId}/roles/${roleId}`, { method: "DELETE" }).catch(() => {});
    setSelectedId(null);
    invalidate();
  }

  async function moveRole(roleId: string, direction: "up" | "down") {
    await api(`/api/guilds/${guildId}/roles/${roleId}/move`, {
      method: "POST",
      body: JSON.stringify({ direction }),
    }).catch(() => {});
    invalidate();
  }

  function togglePerm(role: Role, bit: bigint) {
    const cur = BigInt(role.permissions || "0");
    const next = cur & bit ? cur & ~bit : cur | bit;
    patchRole(role.id, { permissions: next.toString() });
  }

  const guildName = guild?.name ?? "…";

  return (
    <Modal
      title={`🛡 ${t("roles.title")} — ${guildName}  v${__APP_VERSION__}`}
      onClose={onClose}
      className="max-w-[min(1100px,95vw)] rounded-[14px]"
      backdropClass="bg-black/45"
      noScroll
    >
      <div className="flex flex-col" style={{ height: "80vh", maxHeight: "900px" }}>
        {/* ── Body: sidebar + editor ── */}
        <div className="flex flex-1 min-h-0">
          {/* ── Left sidebar ── */}
          <div className="flex w-[280px] shrink-0 flex-col bg-discord-sidebar">
            {/* Search */}
            <div className="relative p-3 pb-2">
              <SearchIcon size={14} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-discord-faint" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск ролей…"
                className="h-8 w-full rounded-md bg-discord-deep pl-7 pr-2.5 text-xs text-discord-text placeholder:text-discord-faint outline-none transition focus:ring-1 focus:ring-discord-accent"
              />
            </div>

            {/* Role list — scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto px-1.5 pb-1">
              {filtered.length === 0 ? (
                <div className="px-2 py-4 text-center text-xs text-discord-faint">
                  {search ? "Ничего не найдено" : "Нет ролей"}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filtered.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition ${
                        selected?.id === r.id
                          ? "bg-discord-active/80 text-white"
                          : "text-discord-muted hover:bg-discord-hover hover:text-discord-text"
                      }`}
                    >
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: r.color || "#99aab5" }}
                      />
                      <span className="truncate">{r.name}</span>
                      {r.isDefault && (
                        <span className="ml-auto shrink-0 text-[10px] text-discord-faint">@everyone</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Create button */}
            <div className="border-t border-black/20 p-2">
              <button
                onClick={createRole}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-discord-muted transition hover:bg-discord-hover hover:text-white"
              >
                <PlusIcon size={14} />
                {t("roles.create")}
              </button>
            </div>
          </div>

          {/* ── Right editor panel ── */}
          <div className="flex flex-1 min-w-0 flex-col">
            {selected ? (
              <>
                {/* Fixed top: name + color */}
                <div className="shrink-0 space-y-5 p-6 pb-3">
                  {/* Name */}
                  <div>
                    <Label>НАЗВАНИЕ РОЛИ</Label>
                    <div className="flex items-center gap-1.5">
                      <input
                        value={selected.name}
                        disabled={selected.isDefault}
                        onChange={(e) => patchRole(selected.id, { name: e.target.value })}
                        placeholder={t("roles.newRole")}
                        className="h-10 min-w-0 flex-1 rounded-lg bg-discord-deep px-3 text-sm text-discord-text placeholder:text-discord-faint outline-none transition focus:ring-2 focus:ring-discord-accent disabled:opacity-50"
                      />
                      <IconBtn onClick={() => moveRole(selected.id, "up")} title={t("roles.moveUp")}>
                        <ArrowUpIcon size={16} />
                      </IconBtn>
                      <IconBtn onClick={() => moveRole(selected.id, "down")} title={t("roles.moveDown")}>
                        <ArrowDownIcon size={16} />
                      </IconBtn>
                      {!selected.isDefault && (
                        <IconBtn onClick={() => deleteRole(selected.id)} title={t("roles.delete")} danger>
                          <TrashIcon size={16} />
                        </IconBtn>
                      )}
                    </div>
                  </div>

                  {/* Color */}
                  <div>
                    <Label>{t("roles.color")}</Label>
                    <div className="flex flex-wrap gap-2">
                      {SWATCHES.map((c) => (
                        <button
                          key={c}
                          onClick={() => patchRole(selected.id, { color: c })}
                          title={c}
                          className={`h-8 w-8 cursor-pointer rounded-full ring-2 ring-offset-2 ring-offset-discord-bg transition hover:scale-110 ${
                            selected.color === c ? "ring-white" : "ring-transparent hover:ring-white/30"
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Scrollable: permissions */}
                <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
                  <Label>{t("roles.permissions")}</Label>
                  <div className="space-y-1 mt-1.5">
                    {TOGGLES.map(({ bit, key }) => {
                      const on = (BigInt(selected.permissions || "0") & bit) === bit;
                      return (
                        <button
                          key={key}
                          onClick={() => togglePerm(selected, bit)}
                          className="flex w-full items-center justify-between gap-3 rounded-lg bg-discord-card px-3.5 py-3 text-sm text-discord-text transition hover:bg-discord-hover"
                        >
                          <span className="select-none">{t(key as never)}</span>
                          <span
                            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                              on ? "bg-discord-accent" : "bg-discord-deep"
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                                on ? "left-[calc(100%-1.375rem)]" : "left-0.5"
                              }`}
                            />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-discord-muted">
                Выберите роль слева
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-black/20 bg-discord-sidebar px-6 py-3">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm text-discord-muted transition hover:text-white hover:underline"
          >
            Отмена
          </button>
          <button
            onClick={onClose}
            className="rounded-md bg-discord-accent px-6 py-2 text-sm font-medium text-white transition hover:brightness-110"
          >
            Готово
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Reusable sub-components ── */

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-discord-muted">
      {children}
    </label>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
        danger
          ? "text-discord-muted hover:bg-discord-danger hover:text-white"
          : "text-discord-muted hover:bg-discord-hover hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
