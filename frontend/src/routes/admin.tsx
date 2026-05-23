import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Users, MessageSquare, CheckCircle2, Sparkles, ArrowRight } from "lucide-react";
import { ApiPlaceholder } from "@/components/ApiPlaceholder";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — TechForum Pro" },
      { name: "description", content: "Platform KPIs and admin controls." },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const navigate = useNavigate();
  const totalUsers = "API";
  const open = "API";
  const solved = "API";
  const aiSuccess = "API";

  const kpis = [
    { icon: Users, label: "Total Users", value: totalUsers.toLocaleString() },
    { icon: MessageSquare, label: "Open Questions", value: open },
    { icon: CheckCircle2, label: "Solved Questions", value: solved },
    { icon: Sparkles, label: "AI Tagging Success", value: `${aiSuccess}%` },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-code text-2xl font-bold">
          <span className="text-muted-foreground">~/</span>admin-ui
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Platform health will be surfaced from Spring Boot admin endpoints.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-5">
            <Icon className="h-5 w-5 text-neon" />
            <p className="mt-3 font-code text-2xl font-bold">{value}</p>
            <p className="font-code text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/admin/users" className="group flex items-center justify-between rounded-xl border border-border bg-card p-5 hover:border-neon">
          <div>
            <p className="font-code text-sm font-semibold">User Directory</p>
            <p className="mt-1 font-code text-xs text-muted-foreground">Manage roles, suspend or reinstate users.</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-neon" />
        </Link>
        <Link to="/moderator/queue" className="group flex items-center justify-between rounded-xl border border-border bg-card p-5 hover:border-neon">
          <div>
            <p className="font-code text-sm font-semibold">Moderator Queue</p>
            <p className="mt-1 font-code text-xs text-muted-foreground">Review flagged and duplicate questions.</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-neon" />
        </Link>
      </div>

      <ApiPlaceholder
        title="Admin endpoints"
        endpoint="GET /api/admin/metrics"
        description="This dashboard is a React shell for future platform KPIs and management actions."
        actions={[
          { label: "Metrics", endpoint: "GET /api/admin/metrics" },
          { label: "Users", endpoint: "GET /api/admin/users" },
          { label: "Moderation", endpoint: "GET /api/moderation/queue" },
        ]}
      />
    </div>
  );
}
