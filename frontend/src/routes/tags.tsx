import {createFileRoute, Link} from "@tanstack/react-router";
import {useEffect, useMemo, useState} from "react";
import {Loader2, Tags} from "lucide-react";
import {toast} from "sonner";
import {apiFetch, API_ENDPOINTS} from "@/lib/api";

export const Route = createFileRoute("/tags")({
    head: () => ({meta: [{title: "Tags — TechForum Pro"}]}),
    component: TagsExplorer,
});

interface TagDTO {
    name: string;
}

function TagsExplorer() {
    const [tags, setTags] = useState<TagDTO[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                setTags(await apiFetch<TagDTO[]>(API_ENDPOINTS.tags));
            } catch {
                toast.error("Failed to load tags");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const sortedTags = useMemo(
        () => [...tags].sort((a, b) => a.name.localeCompare(b.name)),
        [tags],
    );

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Tags className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h1 className="font-code text-xl font-bold">
                        <span className="text-muted-foreground">~/</span>tags
                    </h1>
                    <p className="font-code text-xs text-muted-foreground">
                        Explore all forum tags
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-neon" />
                </div>
            ) : sortedTags.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center font-code text-sm text-muted-foreground">
                    No tags available yet.
                </div>
            ) : (
                <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-5 shadow-sm">
                    {sortedTags.map((tag) => (
                        <Link
                            key={tag.name}
                            to="/tags/$tag"
                            params={{tag: tag.name}}
                            className="rounded-full border border-border bg-surface px-3 py-1.5 font-code text-xs text-muted-foreground transition-colors hover:border-neon hover:text-neon"
                        >
                            #{tag.name}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
