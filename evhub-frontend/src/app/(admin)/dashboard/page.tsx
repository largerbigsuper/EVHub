export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">仪表盘</h1>
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="总用户数" value="--" />
        <StatCard title="总文章数" value="--" />
        <StatCard title="总车型数" value="--" />
        <StatCard title="今日PV" value="--" />
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-sm text-muted">{title}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}