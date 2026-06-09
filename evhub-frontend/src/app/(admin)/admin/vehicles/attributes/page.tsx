"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import apiClient from "@/lib/api";
import type { BaseResponse, AttributeGroupDetail, AttributeDefinitionItem } from "@/types/api";

export default function AdminAttributesPage() {
  const [groups, setGroups] = useState<AttributeGroupDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    const res = await apiClient.get<BaseResponse<AttributeGroupDetail[]>>("/admin/attributes/groups");
    setGroups(res.data.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const handleGroupSave = async (group: AttributeGroupDetail | null, name: string, code: string, sortOrder: number) => {
    try {
      if (group) {
        await apiClient.put(`/admin/attributes/groups/${group.id}`, { name, code, sort_order: sortOrder });
      } else {
        await apiClient.post("/admin/attributes/groups", { name, code, sort_order: sortOrder });
      }
      await fetchGroups();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "保存失败");
    }
  };

  const handleGroupDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除属性组「${name}」及其下所有属性定义？`)) return;
    try {
      await apiClient.delete(`/admin/attributes/groups/${id}`);
      await fetchGroups();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "删除失败");
    }
  };

  const handleDefSave = async (groupId: string, def: AttributeDefinitionItem | null, data: {
    name: string; code: string; value_type: string; unit: string;
    is_key_spec: boolean; is_filterable: boolean; is_comparable: boolean; sort_order: number;
  }) => {
    try {
      if (def) {
        await apiClient.put(`/admin/attributes/definitions/${def.id}`, data);
      } else {
        await apiClient.post(`/admin/attributes/definitions`, { ...data, group_id: groupId });
      }
      await fetchGroups();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "保存失败");
    }
  };

  const handleDefDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除属性「${name}」？`)) return;
    try {
      await apiClient.delete(`/admin/attributes/definitions/${id}`);
      await fetchGroups();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "删除失败");
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">属性定义管理</h1>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="mb-3 h-20 animate-pulse rounded-lg bg-surface" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">属性定义管理</h1>
          <Link href="/admin/vehicles" className="text-sm text-primary hover:underline">← 返回车型数据</Link>
        </div>
        <AddGroupButton onSave={handleGroupSave} />
      </div>

      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.id} className="rounded-lg border border-border bg-surface">
            <button onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium hover:bg-background">
              <span>{group.name} <span className="ml-2 text-xs text-muted">{group.code}</span></span>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <span className="text-xs text-muted">{group.definitions?.length || 0} 个属性</span>
                <span className="text-muted">{expandedGroup === group.id ? "▲" : "▼"}</span>
              </div>
            </button>
            {expandedGroup === group.id && (
              <div className="border-t border-border px-4 py-3">
                <div className="mb-3 flex items-center gap-2">
                  <EditGroupButton group={group} onSave={handleGroupSave} />
                  <button onClick={() => handleGroupDelete(group.id, group.name)}
                    className="rounded border border-border px-2 py-1 text-xs text-danger hover:bg-danger/10">删除组</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-left text-muted">
                        <th className="px-2 py-1.5">名称</th>
                        <th className="px-2 py-1.5">编码</th>
                        <th className="px-2 py-1.5">类型</th>
                        <th className="px-2 py-1.5">单位</th>
                        <th className="px-2 py-1.5">关键参数</th>
                        <th className="px-2 py-1.5">可筛选</th>
                        <th className="px-2 py-1.5">可对比</th>
                        <th className="px-2 py-1.5">排序</th>
                        <th className="px-2 py-1.5 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(group.definitions || []).map((def) => (
                        <tr key={def.id} className="border-b border-border hover:bg-background">
                          <td className="px-2 py-1.5">{def.name}</td>
                          <td className="px-2 py-1.5 font-mono text-muted">{def.code}</td>
                          <td className="px-2 py-1.5">
                            <TypeBadge type={def.value_type} />
                          </td>
                          <td className="px-2 py-1.5 text-muted">{def.unit || "-"}</td>
                          <td className="px-2 py-1.5">{def.is_key_spec ? "✓" : ""}</td>
                          <td className="px-2 py-1.5">{def.is_filterable ? "✓" : ""}</td>
                          <td className="px-2 py-1.5">{def.is_comparable ? "✓" : ""}</td>
                          <td className="px-2 py-1.5">{def.sort_order}</td>
                          <td className="px-2 py-1.5 text-right">
                            <EditDefButton groupId={group.id} def={def} onSave={handleDefSave} />
                            <button onClick={() => handleDefDelete(def.id, def.name)}
                              className="ml-1 text-danger hover:underline">删除</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3">
                  <AddDefButton groupId={group.id} onSave={handleDefSave} />
                </div>
              </div>
            )}
          </div>
        ))}
        {groups.length === 0 && (
          <div className="rounded-lg border border-border p-8 text-center text-muted">
            暂无属性组，请点击上方按钮添加
          </div>
        )}
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    text: "bg-blue-50 text-blue-700",
    number: "bg-green-50 text-green-700",
    boolean: "bg-purple-50 text-purple-700",
  };
  const labels: Record<string, string> = {
    text: "文本",
    number: "数字",
    boolean: "布尔",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${colors[type] || "bg-gray-50 text-gray-700"}`}>
      {labels[type] || type}
    </span>
  );
}

function AddGroupButton({ onSave }: {
  onSave: (group: null, name: string, code: string, sortOrder: number) => Promise<void>;
}) {
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name || !code) return;
    setSaving(true);
    await onSave(null, name, code, sortOrder);
    setSaving(false);
    setShow(false);
    setName("");
    setCode("");
    setSortOrder(0);
  };

  if (!show) {
    return (
      <button onClick={() => setShow(true)} className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark">
        添加属性组
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShow(false)}>
      <div className="w-full max-w-sm rounded-xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-bold">添加属性组</h3>
        <div className="space-y-3">
          <input placeholder="名称" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
          <input placeholder="编码(code)" value={code} onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
          <input type="number" placeholder="排序" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setShow(false)} className="rounded-lg border border-border px-4 py-2 text-sm">取消</button>
          <button onClick={handleSubmit} disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:opacity-50">
            {saving ? "..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditGroupButton({ group, onSave }: {
  group: AttributeGroupDetail;
  onSave: (group: AttributeGroupDetail, name: string, code: string, sortOrder: number) => Promise<void>;
}) {
  const [show, setShow] = useState(false);
  const [name, setName] = useState(group.name);
  const [code, setCode] = useState(group.code);
  const [sortOrder, setSortOrder] = useState(group.sort_order);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    await onSave(group, name, code, sortOrder);
    setSaving(false);
    setShow(false);
  };

  return (
    <>
      <button onClick={() => { setName(group.name); setCode(group.code); setSortOrder(group.sort_order); setShow(true); }}
        className="rounded border border-border px-2 py-1 text-xs hover:bg-background">编辑组</button>
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShow(false)}>
          <div className="w-full max-w-sm rounded-xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-bold">编辑属性组</h3>
            <div className="space-y-3">
              <input placeholder="名称" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
              <input placeholder="编码" value={code} onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
              <input type="number" placeholder="排序" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShow(false)} className="rounded-lg border border-border px-4 py-2 text-sm">取消</button>
              <button onClick={handleSubmit} disabled={saving}
                className="rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:opacity-50">
                {saving ? "..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AddDefButton({ groupId, onSave }: {
  groupId: string;
  onSave: (groupId: string, def: null, data: {
    name: string; code: string; value_type: string; unit: string;
    is_key_spec: boolean; is_filterable: boolean; is_comparable: boolean; sort_order: number;
  }) => Promise<void>;
}) {
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [valueType, setValueType] = useState("text");
  const [unit, setUnit] = useState("");
  const [isKeySpec, setIsKeySpec] = useState(false);
  const [isFilterable, setIsFilterable] = useState(false);
  const [isComparable, setIsComparable] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name || !code) return;
    setSaving(true);
    await onSave(groupId, null, { name, code, value_type: valueType, unit, is_key_spec: isKeySpec, is_filterable: isFilterable, is_comparable: isComparable, sort_order: sortOrder });
    setSaving(false);
    setShow(false);
    setName(""); setCode(""); setValueType("text"); setUnit(""); setIsKeySpec(false); setIsFilterable(false); setIsComparable(false); setSortOrder(0);
  };

  return (
    <>
      <button onClick={() => setShow(true)}
        className="rounded border border-dashed border-border px-2 py-1 text-xs text-muted hover:border-primary hover:text-primary">
        + 添加属性
      </button>
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShow(false)}>
          <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-bold">添加属性定义</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted">名称</label>
                <input value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full rounded border border-border px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">编码</label>
                <input value={code} onChange={(e) => setCode(e.target.value)}
                  className="w-full rounded border border-border px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">值类型</label>
                <select value={valueType} onChange={(e) => setValueType(e.target.value)}
                  className="w-full rounded border border-border px-2 py-1.5 text-sm">
                  <option value="text">文本</option>
                  <option value="number">数字</option>
                  <option value="boolean">布尔</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">单位</label>
                <input value={unit} onChange={(e) => setUnit(e.target.value)}
                  className="w-full rounded border border-border px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">排序</label>
                <input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                  className="w-full rounded border border-border px-2 py-1.5 text-sm" />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              <label className="flex items-center gap-1"><input type="checkbox" checked={isKeySpec} onChange={(e) => setIsKeySpec(e.target.checked)} />关键参数</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={isFilterable} onChange={(e) => setIsFilterable(e.target.checked)} />可筛选</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={isComparable} onChange={(e) => setIsComparable(e.target.checked)} />可对比</label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShow(false)} className="rounded-lg border border-border px-4 py-2 text-sm">取消</button>
              <button onClick={handleSubmit} disabled={saving}
                className="rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:opacity-50">
                {saving ? "..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function EditDefButton({ groupId, def, onSave }: {
  groupId: string;
  def: AttributeDefinitionItem;
  onSave: (groupId: string, def: AttributeDefinitionItem, data: {
    name: string; code: string; value_type: string; unit: string;
    is_key_spec: boolean; is_filterable: boolean; is_comparable: boolean; sort_order: number;
  }) => Promise<void>;
}) {
  const [show, setShow] = useState(false);
  const [name, setName] = useState(def.name);
  const [code, setCode] = useState(def.code);
  const [valueType, setValueType] = useState(def.value_type);
  const [unit, setUnit] = useState(def.unit || "");
  const [isKeySpec, setIsKeySpec] = useState(def.is_key_spec);
  const [isFilterable, setIsFilterable] = useState(def.is_filterable);
  const [isComparable, setIsComparable] = useState(def.is_comparable);
  const [sortOrder, setSortOrder] = useState(def.sort_order);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    await onSave(groupId, def, { name, code, value_type: valueType, unit, is_key_spec: isKeySpec, is_filterable: isFilterable, is_comparable: isComparable, sort_order: sortOrder });
    setSaving(false);
    setShow(false);
  };

  return (
    <>
      <button onClick={() => { setName(def.name); setCode(def.code); setValueType(def.value_type); setUnit(def.unit || ""); setIsKeySpec(def.is_key_spec); setIsFilterable(def.is_filterable); setIsComparable(def.is_comparable); setSortOrder(def.sort_order); setShow(true); }}
        className="text-primary hover:underline">编辑</button>
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShow(false)}>
          <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-bold">编辑属性定义</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted">名称</label>
                <input value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full rounded border border-border px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">编码</label>
                <input value={code} onChange={(e) => setCode(e.target.value)}
                  className="w-full rounded border border-border px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">值类型</label>
                <select value={valueType} onChange={(e) => setValueType(e.target.value)}
                  className="w-full rounded border border-border px-2 py-1.5 text-sm">
                  <option value="text">文本</option>
                  <option value="number">数字</option>
                  <option value="boolean">布尔</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">单位</label>
                <input value={unit} onChange={(e) => setUnit(e.target.value)}
                  className="w-full rounded border border-border px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">排序</label>
                <input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                  className="w-full rounded border border-border px-2 py-1.5 text-sm" />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              <label className="flex items-center gap-1"><input type="checkbox" checked={isKeySpec} onChange={(e) => setIsKeySpec(e.target.checked)} />关键参数</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={isFilterable} onChange={(e) => setIsFilterable(e.target.checked)} />可筛选</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={isComparable} onChange={(e) => setIsComparable(e.target.checked)} />可对比</label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShow(false)} className="rounded-lg border border-border px-4 py-2 text-sm">取消</button>
              <button onClick={handleSubmit} disabled={saving}
                className="rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:opacity-50">
                {saving ? "..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}