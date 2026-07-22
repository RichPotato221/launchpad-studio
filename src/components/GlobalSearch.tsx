import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

type SearchRow = {
  result_type: string;
  id: string;
  title: string;
  subtitle: string | null;
  path: string;
  rank: number;
};

export function GlobalSearch() {
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const results = useQuery({
    queryKey: ["global-search", term],
    enabled: term.trim().length >= 2,
    queryFn: async (): Promise<SearchRow[]> => {
      const { data, error } = await supabase.rpc("global_search", { _term: term.trim() });
      if (error) throw error;
      return (data ?? []) as SearchRow[];
    },
  });

  const groups = useMemo(() => {
    const map = new Map<string, SearchRow[]>();
    for (const row of results.data ?? []) {
      if (!map.has(row.result_type)) map.set(row.result_type, []);
      map.get(row.result_type)!.push(row);
    }
    return Array.from(map.entries());
  }, [results.data]);

  const hasResults = groups.length > 0;

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search members, tasks, departments..."
          className="h-11 pl-10 pr-4 text-sm"
        />
      </div>

      {open && term.trim().length >= 2 && (
        <div className="absolute z-50 mt-2 w-full max-h-[28rem] overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg">
          {results.isLoading && (
            <p className="px-4 py-3 text-sm text-muted-foreground">Searching…</p>
          )}
          {!results.isLoading && !hasResults && (
            <p className="px-4 py-3 text-sm text-muted-foreground">No results for "{term}".</p>
          )}
          {groups.map(([label, items]) => (
            <div key={label} className="py-2 first:pt-1 last:pb-1">
              <p className="px-4 pb-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {label}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onMouseDown={() => {
                      window.location.href = item.path;
                      setOpen(false);
                      setTerm("");
                    }}
                    className="flex w-full flex-col items-start gap-1 rounded-md px-4 py-2.5 text-left hover:bg-accent"
                  >
                    <span className="text-sm font-medium leading-tight">{item.title}</span>
                    {item.subtitle && (
                      <span className="text-xs leading-tight text-muted-foreground">{item.subtitle}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
