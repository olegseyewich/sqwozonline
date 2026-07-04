import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useI18n, type TKey } from "../lib/i18n";
import type { Guild, Role } from "../types";
import Modal from "./Modal";
import { PlusIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon } from "./Icons";

type PermToggle = { bit: bigint; key: TKey };

const PERMISSIONS: PermToggle[] = [
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

  const { data: guild } = useQuery<Guild>({
    queryKey: ["guild", guildId],
    enabled: false,
  });

  const roles = [...(guild?.roles ?? [])].sort((a, b) => b.position - a.position);
  const [selectedId, setSelectedId] = useState<string | null>(roles[0]?.id ?? null);
  const selected = roles.find((r) => r.id === selectedId) ?? roles[0] ?? null;

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

  return (
    <Modal title={`🛡 ${t("roles.title")}`} onClose={onClose} wider>
      <div className="flex gap-5">
        {/* ── Left sidebar: role list ── */}
        <div className="w-44 shrink-0">
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-discord-muted">
            {t("roles.title")}
          </div>
          <div className="space-y-0.5">
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition ${
                  selected?.id === r.id
                    ? "bg-discord-active text-white"
                    : "text-discord-muted hover:bg-discord-hover hover:text-discord-text"
                }`}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: r.color || "#99aab5" }}
                />
                <span className="truncate">{r.name}</span>
              </button>
            ))}
          </div>
          <button
            onClick={createRole}
            className="mt-1 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-discord-muted transition hover:bg-discord-hover hover:text-white"
          >
            <PlusIcon size={14} />
            {t("roles.create")}
          </button>
        </div>

        {/* ── Right panel: selected role editor ── */}
        {selected ? (
          <div className="min-w-0 flex-1 space-y-5">
            {/* Role name + actions */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-discord-muted">
                {t("roles.title")}
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  value={selected.name}
                  disabled={selected.isDefault}
                  onChange={(e) => patchRole(selected.id, { name: e.target.value })}
                  placeholder={t("roles.newRole")}
                  className="h-10 min-w-0 flex-1 rounded-lg bg-discord-deep px-3 text-sm text-discord-text placeholder:text-discord-faint outline-none transition focus:ring-2 focus:ring-discord-accent disabled:opacity-50"
                />
                <button
                  onClick={() => moveRole(selected.id, "up")}
                  title={t("roles.moveUp")}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-discord-muted transition hover:bg-discord-hover hover:text-white"
                >
                  <ArrowUpIcon size={16} />
                </button>
                <button
                  onClick={() => moveRole(selected.id, "down")}
                  title={t("roles.moveDown")}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-discord-muted transition hover:bg-discord-hover hover:text-white"
                >
                  <ArrowDownIcon size={16} />
                </button>
                {!selected.isDefault && (
                  <button
                    onClick={() => deleteRole(selected.id)}
                    title={t("roles.delete")}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-discord-muted transition hover:bg-discord-danger hover:text-white"
                  >
                    <TrashIcon size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Color swatches */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-discord-muted">
                {t("roles.color")}
              </label>
              <div className="flex flex-wrap gap-2">
                {SWATCHES.map((c) => (
                  <button
                    key={c}
                    onClick={() => patchRole(selected.id, { color: c })}
                    className={`h-8 w-8 cursor-pointer rounded-full ring-2 ring-offset-1 ring-offset-transparent transition hover:scale-110 ${
                      selected.color === c ? "ring-white" : "ring-transparent hover:ring-white/40"
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>

            {/* Permissions */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-discord-muted">
                {t("roles.permissions")}
              </label>
              <div className="space-y-1">
                {PERMISSIONS.map(({ bit, key }) => {
                  const on = (BigInt(selected.permissions || "0") & bit) === bit;
                  return (
                    <button
                      key={key}
                      onClick={() => togglePerm(selected, bit)}
                      className="flex w-full cursor-pointer items-center justify-between rounded-md bg-discord-card px-3 py-2.5 text-sm text-discord-text transition hover:bg-discord-hover"
                    >
                      <span className="select-none">
                        {t(key)}
                      </span>
                      <span
                        className={`ml-3 h-5 w-9 shrink-0 rounded-full transition ${
                          on ? "bg-discord-accent" : "bg-discord-deep"
                        }`}
                      >
                        <span
                          className={`block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
                            on ? "translate-x-4" : "translate-x-0.5"
                          }`}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-discord-muted">
            {t("roles.none")}
          </div>
        )}
      </div>
    </Modal>
  );
}
