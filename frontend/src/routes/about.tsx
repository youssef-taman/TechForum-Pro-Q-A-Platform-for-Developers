import {createFileRoute, Link} from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({meta: [{title: "About Us — TechForum Pro"}]}),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="font-code text-3xl font-bold">About TechForum Pro</h1>

      <p className="font-code text-sm text-muted-foreground">
        TechForum Pro is a focused Q&amp;A community built for professional
        developers. Our mission is to surface practical, high-quality
        technical answers quickly so engineers can get back to building.
      </p>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <h2 className="font-code text-base font-semibold">What we do</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We help developers ask clear questions, find concise answers,
            and collaborate on solutions. Content is organized by tags,
            searchable, and curated by the community and moderators.
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4">
          <h2 className="font-code text-base font-semibold">Who it's for</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Engineers, architects, and technical decision-makers looking for
            reliable, actionable answers — from quick code fixes to
            architecture guidance.
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-4">
        <h2 className="font-code text-base font-semibold">Community principles</h2>
        <ul className="mt-2 space-y-2 list-inside list-disc text-sm text-muted-foreground">
          <li>Be concise and show what you've tried.</li>
          <li>Respect others and focus on technical content.</li>
          <li>Provide reproducible examples when possible.</li>
          <li>Use tags and clear titles to make content discoverable.</li>
        </ul>
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-4">
        <h2 className="font-code text-base font-semibold">Get involved</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Start by <Link to="/ask" className="text-neon">asking a question</Link> or
          answering others. Earn reputation for helpful contributions and use
          it to access moderation tools.
        </p>
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-4">
        <h2 className="font-code text-base font-semibold">FAQ & Contact</h2>
        <div className="mt-2 space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Q:</strong> Who can join?
            <br />
            <strong>A:</strong> Anyone with a developer account — read-only browsing
            is available to all, but posting requires an account.
          </p>

          <p>
            <strong>Q:</strong> How do I report abuse?
            <br />
            <strong>A:</strong> Flag the post using the flag menu and moderators will
            review it.
          </p>

          <p>
            <strong>Contact:</strong> For technical issues or partnership inquiries,
            open an issue on the project repository on GitHub.
          </p>
        </div>
      </section>

      <section className="text-sm text-muted-foreground">
        <h3 className="font-code text-sm font-semibold">Values & Accessibility</h3>
        <p className="mt-2">
          We prioritize clarity, inclusiveness, and accessibility. If you encounter
          accessibility issues, please report them so we can improve the experience.
        </p>
      </section>
    </div>
  );
}
