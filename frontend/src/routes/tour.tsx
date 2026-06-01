import {createFileRoute, Link} from "@tanstack/react-router";

export const Route = createFileRoute("/tour")({
  head: () => ({meta: [{title: "Tour — TechForum Pro"}]}),
  component: TourPage,
});

type StepProps = {
  num: number;
  title: string;
  children: React.ReactNode;
};

function Step({num, title, children}: StepProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="mb-2 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neon/10 font-code font-bold text-neon">{num}</div>
        <h3 className="font-code text-base font-semibold">{title}</h3>
      </div>
      <div className="text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

function TourPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="font-code text-3xl font-bold">Product Tour</h1>

      <p className="font-code text-sm text-muted-foreground">
        Quick walkthrough: how to get answers, help others, and use the site
        effectively.
      </p>

      <Step num={1} title="Search and discover">
        Use the search bar to look up questions, tags, or users. Try filters
        and sorting to narrow results. Tip: use exact error messages or
        relevant tags to find higher-quality matches.
      </Step>

      <Step num={2} title="Ask a clear question">
        Give a short descriptive title, explain the problem, show minimal
        reproducible code, and list what you tried. Add relevant tags so
        experts can find your question.
      </Step>

      <Step num={3} title="Answer and improve">
        Provide working solutions with explanations. Use code blocks and
        reference documentation. Edit to improve formatting or add clarifying
        details.
      </Step>

      <Step num={4} title="Vote, accept, and follow up">
        Upvote helpful answers and accept the one that solved your problem to
        mark the thread as resolved. Leave comments for clarifications.
      </Step>

      <Step num={5} title="Reputation and moderation">
        Earn reputation for positive contributions. With reputation you can
        edit, flag, and review content to keep the community healthy.
      </Step>

      <Step num={6} title="Sample Q&A">
        <div className="space-y-2 text-sm text-muted-foreground">
          <div>
            <strong>Q:</strong> Why does JSON.parse throw "Unexpected token &lt;"?
          </div>
          <div>
            <strong>A:</strong> That usually means the response body is HTML (an error page) instead of JSON. Inspect the network response, check server logs, and ensure the endpoint returns Content-Type: application/json.
          </div>
        </div>
      </Step>

      <section className="rounded-xl border border-border/60 bg-card p-4">
        <h2 className="font-code text-base font-semibold">Shortcuts & tips</h2>
        <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
          <li>Use tags to follow topics and get notifications.</li>
          <li>Bookmark threads you want to revisit.</li>
          <li>Search with exact phrases in quotes to narrow results.</li>
        </ul>
      </section>

      <div className="flex items-center justify-end">
        <Link to="/ask" className="rounded bg-neon/90 px-4 py-2 font-code text-sm font-semibold text-black hover:bg-neon">
          Ask your first question
        </Link>
      </div>
    </div>
  );
}
