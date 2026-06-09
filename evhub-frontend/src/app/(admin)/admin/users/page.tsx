"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api";
import type { BaseResponse, PageResponse } from "@/types/api";

interface UserItem {
  id: string;
  username: string;
  nickname: string | null;
  email: string;
  avatar: string | null;
  status: number;
  role: string;
  created_at: string;
  last_login_at: string | null;
}

interface RoleItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
  user_count: number;
  permission_count: number;
}

interface PermissionItem {
  id: string;
  name: string;
  code: string;
  resource: string | null;
  action: string | null;
}

export default function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState<"users" | "roles">("users");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [confirmAction, setConfirmAction] = useState<{
    type: string;
    userId: string;
    label: string;
  } | null>(null);
  const queryClient = useQueryClient();

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["admin", "users", page, search],
    queryFn: async () => {
      const { data } = await apiClient.get<BaseResponse<{ data: UserItem[]; meta: PageMeta }>>(
        "/admin/users",
        { params: { page, page_size: 20, search: search || undefined } }
      );
      return data.data;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: number }) => {
      await apiClient.put(`/admin/users/${userId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setConfirmAction(null);
    },
  });

  const roleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      await apiClient.put(`/admin/users/${userId}/role`, { role_id: roleId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">用户管理</h1>

      <div className="mb-4 flex border-b border-border">
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "users"
              ? "border-b-2 border-primary text-primary"
              : "text-muted hover:text-foreground"
          }`}
          onClick={() => setActiveTab("users")}
        >
          用户列表
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "roles"
              ? "border-b-2 border-primary text-primary"
              : "text-muted hover:text-foreground"
          }`}
          onClick={() => setActiveTab("roles")}
        >
          角色管理
        </button>
      </div>

      {activeTab === "users" ? (
        <UsersTab
          search={search}
          setSearch={setSearch}
          page={page}
          setPage={setPage}
          usersData={usersData}
          isLoading={isLoading}
          confirmAction={confirmAction}
          setConfirmAction={setConfirmAction}
          statusMutation={statusMutation}
          roleMutation={roleMutation}
        />
      ) : (
        <RolesTab />
      )}
    </div>
  );
}

interface PageMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

function UsersTab({
  search,
  setSearch,
  page,
  setPage,
  usersData,
  isLoading,
  confirmAction,
  setConfirmAction,
  statusMutation,
  roleMutation,
}: {
  search: string;
  setSearch: (v: string) => void;
  page: number;
  setPage: (v: number) => void;
  usersData: { data: UserItem[]; meta: PageMeta } | null | undefined;
  isLoading: boolean;
  confirmAction: { type: string; userId: string; label: string } | null;
  setConfirmAction: (v: { type: string; userId: string; label: string } | null) => void;
  statusMutation: { mutate: (v: { userId: string; status: number }) => void; isPending: boolean };
  roleMutation: { mutate: (v: { userId: string; roleId: string }) => void; isPending: boolean };
}) {
  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="搜索用户名或邮箱..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full max-w-xs rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background">
            <tr>
              <th className="px-4 py-3 text-left font-medium">用户</th>
              <th className="px-4 py-3 text-left font-medium">邮箱</th>
              <th className="px-4 py-3 text-left font-medium">角色</th>
              <th className="px-4 py-3 text-left font-medium">状态</th>
              <th className="px-4 py-3 text-left font-medium">注册时间</th>
              <th className="px-4 py-3 text-left font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  加载中...
                </td>
              </tr>
            ) : !usersData?.data?.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  暂无数据
                </td>
              </tr>
            ) : (
              usersData.data.map((user) => (
                <tr key={user.id} className="border-b border-border hover:bg-background">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                        {user.nickname?.[0] || user.username[0]}
                      </div>
                      <div>
                        <div className="font-medium">{user.nickname || user.username}</div>
                        <div className="text-xs text-muted">@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{user.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={(e) =>
                        roleMutation.mutate({ userId: user.id, roleId: e.target.value })
                      }
                      className="rounded border border-border px-2 py-1 text-xs focus:border-primary focus:outline-none"
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                      <option value="editor">editor</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.status === 1
                          ? "bg-success/10 text-success"
                          : "bg-danger/10 text-danger"
                      }`}
                    >
                      {user.status === 1 ? "正常" : "封禁"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString("zh-CN") : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() =>
                        setConfirmAction({
                          type: user.status === 1 ? "ban" : "unban",
                          userId: user.id,
                          label: user.username,
                        })
                      }
                      disabled={statusMutation.isPending}
                      className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                        user.status === 1
                          ? "bg-danger/10 text-danger hover:bg-danger/20"
                          : "bg-success/10 text-success hover:bg-success/20"
                      }`}
                    >
                      {user.status === 1 ? "封禁" : "解封"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {usersData?.meta && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted">
          <span>
            共 {usersData.meta.total} 条，第 {usersData.meta.page} / {usersData.meta.total_pages} 页
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="rounded border border-border px-3 py-1 transition-colors hover:bg-background disabled:opacity-50"
            >
              上一页
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= usersData.meta.total_pages}
              className="rounded border border-border px-3 py-1 transition-colors hover:bg-background disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-surface p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold">确认操作</h3>
            <p className="mb-4 text-sm text-muted">
              确定要{confirmAction.type === "ban" ? "封禁" : "解封"}用户 "{confirmAction.label}" 吗？
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-background"
              >
                取消
              </button>
              <button
                onClick={() =>
                  statusMutation.mutate({
                    userId: confirmAction.userId,
                    status: confirmAction.type === "ban" ? 0 : 1,
                  })
                }
                disabled={statusMutation.isPending}
                className={`rounded-lg px-4 py-2 text-sm text-white transition-colors ${
                  confirmAction.type === "ban"
                    ? "bg-danger hover:bg-danger/90"
                    : "bg-success hover:bg-success/90"
                }`}
              >
                {statusMutation.isPending ? "处理中..." : "确认"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RolesTab() {
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showPermissions, setShowPermissions] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: roles, isLoading } = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: async () => {
      const { data } = await apiClient.get<BaseResponse<RoleItem[]>>("/admin/roles");
      return data.data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (roleId: string) => {
      await apiClient.delete(`/admin/roles/${roleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
    },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">角色列表</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm text-white transition-colors hover:bg-primary-light"
        >
          新增角色
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background">
            <tr>
              <th className="px-4 py-3 text-left font-medium">角色名</th>
              <th className="px-4 py-3 text-left font-medium">代码</th>
              <th className="px-4 py-3 text-left font-medium">描述</th>
              <th className="px-4 py-3 text-left font-medium">用户数</th>
              <th className="px-4 py-3 text-left font-medium">权限数</th>
              <th className="px-4 py-3 text-left font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  加载中...
                </td>
              </tr>
            ) : !roles?.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  暂无角色
                </td>
              </tr>
            ) : (
              roles.map((role) => (
                <tr key={role.id} className="border-b border-border hover:bg-background">
                  <td className="px-4 py-3 font-medium">{role.name}</td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-background px-1.5 py-0.5 text-xs">{role.code}</code>
                  </td>
                  <td className="px-4 py-3 text-muted">{role.description || "-"}</td>
                  <td className="px-4 py-3">{role.user_count}</td>
                  <td className="px-4 py-3">{role.permission_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingRole(role)}
                        className="rounded px-2 py-1 text-xs text-primary transition-colors hover:bg-primary/10"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => setShowPermissions(role.id)}
                        className="rounded px-2 py-1 text-xs text-secondary transition-colors hover:bg-secondary/10"
                      >
                        权限
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("确定要删除此角色吗？")) {
                            deleteMutation.mutate(role.id);
                          }
                        }}
                        className="rounded px-2 py-1 text-xs text-danger transition-colors hover:bg-danger/10"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <RoleFormModal
          role={null}
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
          }}
        />
      )}

      {editingRole && (
        <RoleFormModal
          role={editingRole}
          onClose={() => setEditingRole(null)}
          onSuccess={() => {
            setEditingRole(null);
            queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
          }}
        />
      )}

      {showPermissions && (
        <PermissionsModal
          roleId={showPermissions}
          onClose={() => setShowPermissions(null)}
          onSuccess={() => {
            setShowPermissions(null);
            queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
          }}
        />
      )}
    </div>
  );
}

function RoleFormModal({
  role,
  onClose,
  onSuccess,
}: {
  role: RoleItem | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(role?.name || "");
  const [code, setCode] = useState(role?.code || "");
  const [description, setDescription] = useState(role?.description || "");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = { name, code, description: description || null };
      if (role) {
        await apiClient.put(`/admin/roles/${role.id}`, payload);
      } else {
        await apiClient.post("/admin/roles", payload);
      }
    },
    onSuccess,
    onError: (err: any) => {
      setError(err.response?.data?.message || "操作失败");
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold">
          {role ? "编辑角色" : "新增角色"}
        </h3>
        {error && (
          <div className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">角色名</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">代码</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={!!role}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-background"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">描述</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-background"
          >
            取消
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !name || !code}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-white transition-colors hover:bg-primary-light disabled:opacity-50"
          >
            {mutation.isPending ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PermissionsModal({
  roleId,
  onClose,
  onSuccess,
}: {
  roleId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: allPermissions, isLoading } = useQuery({
    queryKey: ["admin", "permissions"],
    queryFn: async () => {
      const { data } = await apiClient.get<BaseResponse<PermissionItem[]>>("/admin/permissions");
      return data.data || [];
    },
  });

  const { data: roleDetail } = useQuery({
    queryKey: ["admin", "roles", roleId],
    queryFn: async () => {
      const { data } = await apiClient.get<BaseResponse<{ permissions: { id: string }[] }>>(
        `/admin/roles/${roleId}`
      );
      return data.data;
    },
    enabled: !!roleId,
  });

  useState(() => {
    if (roleDetail?.permissions) {
      setSelectedIds(new Set(roleDetail.permissions.map((p) => p.id)));
    }
  });

  const mutation = useMutation({
    mutationFn: async () => {
      await apiClient.put(`/admin/roles/${roleId}/permissions`, {
        permission_ids: Array.from(selectedIds),
      });
    },
    onSuccess,
  });

  const grouped = (allPermissions || []).reduce(
    (acc, p) => {
      const res = p.resource || "other";
      if (!acc[res]) acc[res] = [];
      acc[res].push(p);
      return acc;
    },
    {} as Record<string, PermissionItem[]>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-surface p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold">权限设置</h3>
        {isLoading ? (
          <p className="text-sm text-muted">加载中...</p>
        ) : (
          <div className="max-h-96 space-y-4 overflow-y-auto">
            {Object.entries(grouped).map(([resource, perms]) => (
              <div key={resource}>
                <h4 className="mb-2 text-sm font-medium capitalize">{resource}</h4>
                <div className="space-y-1">
                  {perms.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-background"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.id)}
                        onChange={(e) => {
                          const next = new Set(selectedIds);
                          e.target.checked ? next.add(p.id) : next.delete(p.id);
                          setSelectedIds(next);
                        }}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span>{p.name}</span>
                      <code className="text-xs text-muted">{p.code}</code>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-background"
          >
            取消
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-white transition-colors hover:bg-primary-light disabled:opacity-50"
          >
            {mutation.isPending ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}