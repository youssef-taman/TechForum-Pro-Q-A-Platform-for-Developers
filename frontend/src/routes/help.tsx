import {createFileRoute, Link} from "@tanstack/react-router";

export const Route = createFileRoute("/help")({
  head: () => ({meta: [{title: "Help Center — TechForum Pro"}]}),
  component: HelpPage,
});

function HelpPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="font-code text-3xl font-bold">Help Center</h1>

      <p className="font-code text-sm text-muted-foreground">
        Quick answers about asking, answering, moderation, and accounts.
      </p>

      <section className="rounded-xl border border-border/60 bg-card p-4">
        <h2 className="font-code text-base font-semibold">Asking good questions</h2>
        <ul className="mt-2 space-y-2 list-inside list-disc text-sm text-muted-foreground">
          <li>Search before you ask — your question may already exist.</li>
          <li>Use a clear, specific title and include code or error messages.</li>
          <li>Share what you tried and the expected vs actual behavior.</li>
          <li>Select relevant tags to help experts find your question.</li>
        </ul>
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-4">
        <h2 className="font-code text-base font-semibold">Answering</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Provide concise, working solutions and explain why they work. Use
          code blocks and references for clarity. Vote on helpful answers to
          reward authors.
        </p>
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-4">
        <h2 className="font-code text-base font-semibold">Moderation & flags</h2>
        <ul className="mt-2 space-y-2 list-inside list-disc text-sm text-muted-foreground">
          <li>Flag spam, abusive content, or off-topic posts for moderator review.</li>
          <li>Edit to improve clarity, fix formatting, or add tags.</li>
          <li>Users with sufficient reputation can review and help curate content.</li>
        </ul>
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-4">
        <h2 className="font-code text-base font-semibold">Reputation & privileges</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Reputation reflects community trust. Earn reputation by asking,
          answering, and contributing. Higher reputation unlocks moderation and
          editing privileges.
        </p>
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-4">
        <h2 className="font-code text-base font-semibold">Account & settings</h2>
        <ul className="mt-2 space-y-2 list-inside list-disc text-sm text-muted-foreground">
          <li>Sign in with your account to ask, answer, and vote.</li>
          <li>Manage email, notifications, and profile settings from your profile page.</li>
          <li>Use bookmarks to save threads and follow-ups.</li>
        </ul>
      </section>

      <div className="flex items-center justify-between">
        <div />
        <Link to="/tour" className="rounded bg-neon/90 px-4 py-2 font-code text-sm font-semibold text-black hover:bg-neon">
          Take the product tour
        </Link>
      </div>
      
      <section className="rounded-xl border border-border/60 bg-card p-4 mt-4">
        <h2 className="font-code text-base font-semibold">Quick FAQ</h2>
        <div className="mt-2 space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Q:</strong> How do I format code?
            <br />
            <strong>A:</strong> Surround code blocks with triple backticks and include the language for highlighting.
          </p>

          <p>
            <strong>Q:</strong> What makes a question off-topic?
            <br />
            <strong>A:</strong> Questions that are primarily opinion-based, requests for tools/resources, or lack a clear technical problem are off-topic.
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-4 mt-4">
        <h2 className="font-code text-base font-semibold">Example: Good question template</h2>
        <div className="mt-2 text-sm text-muted-foreground">
          <pre className="rounded bg-background p-3 text-xs">{
`Title: TypeError when calling parse() on JSON\n\nWhat I tried:\n- Called JSON.parse on response body\n- Verified payload is string\n\nCode:\nconst res = await fetch('/api');\nconst body = await res.text();\nconst parsed = JSON.parse(body);\n\nExpected: parsed to be object\nActual: TypeError: Unexpected token < in JSON at position 0\n\nNotes: response contains HTML due to server error`}
          </pre>
          <p className="mt-2">Use this format: concise title, what you tried, code, expected vs actual, and any extra notes.</p>
        </div>
      </section>
    </div>
  );
}
