import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { retrievalApi, kbApi, type RetrievalHitData, type KnowledgeBaseData } from "@/lib/api";
import { Search, SlidersHorizontal, FileText, Database, Loader2, AlertCircle, ChevronDown } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [selectedKbs, setSelectedKbs] = useState<string[]>([]);
  const [strategy, setStrategy] = useState<"hybrid" | "vector" | "keyword">("hybrid");
  const [topK, setTopK] = useState(8);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string | null>(searchParams.get("q"));
  const [searchKbs, setSearchKbs] = useState<string[]>([]);

  // Fetch available KBs
  const { data: knowledgeBases = [] } = useQuery({
    queryKey: ["all-knowledge-bases"],
    queryFn: () => kbApi.list(),
  });

  // Retrieval query
  const { data: result, isLoading, error } = useQuery({
    queryKey: ["retrieval", searchQuery, searchKbs, strategy, topK],
    queryFn: () =>
      retrievalApi.query({
        query: searchQuery!,
        kb_ids: searchKbs.length > 0 ? searchKbs : undefined,
        top_k: topK,
        retrieval_strategy: strategy,
      }),
    enabled: !!searchQuery,
  });

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setQuery(q);
      setSearchQuery(q);
    }
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchQuery(query.trim());
    setSearchKbs([...selectedKbs]);
  };

  const maxScore = result?.hits?.length ? Math.max(...result.hits.map(h => h.score)) : 1;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto w-full">
        <h1 className="text-xl font-semibold text-foreground mb-1">检索</h1>
        <p className="text-sm text-muted-foreground mb-6">在知识库中搜索相关内容</p>

        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="输入检索查询，例如：OAuth2.0 认证流程"
              className="w-full h-12 rounded-lg border border-input bg-card pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 shadow-xs transition-shadow"
            />
          </div>

          {/* KB filter */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">范围：</span>
            {knowledgeBases.map((kb: KnowledgeBaseData) => (
              <button
                key={kb.id}
                type="button"
                onClick={() =>
                  setSelectedKbs(prev =>
                    prev.includes(kb.id) ? prev.filter(id => id !== kb.id) : [...prev, kb.id],
                  )
                }
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                  selectedKbs.includes(kb.id)
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                {kb.name}
              </button>
            ))}
          </div>

          {/* Advanced */}
          <button
            type="button"
            onClick={() => setShowAdvanced(v => !v)}
            className="flex items-center gap-1 mt-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            高级选项
            <ChevronDown className={`h-3 w-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
          </button>
          {showAdvanced && (
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              <label className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                策略
                <select
                  value={strategy}
                  onChange={e => setStrategy(e.target.value as typeof strategy)}
                  className="text-[11px] bg-card border border-input rounded px-1.5 py-0.5 text-foreground"
                >
                  <option value="hybrid">混合</option>
                  <option value="vector">向量</option>
                  <option value="keyword">关键词</option>
                </select>
              </label>
              <label className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                Top K
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={topK}
                  onChange={e => setTopK(Number(e.target.value))}
                  className="w-14 text-[11px] bg-card border border-input rounded px-1.5 py-0.5 text-foreground"
                />
              </label>
            </div>
          )}
        </form>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-2">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
            <span className="text-sm text-muted-foreground">检索中...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-16 gap-2">
            <AlertCircle className="h-8 w-8 text-destructive/60" />
            <p className="text-sm text-destructive">{(error as Error).message}</p>
          </div>
        ) : result ? (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap">
              <span>
                找到 <span className="font-medium text-foreground">{result.hits.length}</span> 条结果
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                {result.retrieval_strategy} · {result.latency_ms}ms
              </span>
              {result.rerank_applied && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">重排已应用</span>
              )}
            </div>
            {result.hits.length === 0 && (
              <div className="bg-card rounded-lg border border-warning/30 p-4">
                <div className="text-sm font-medium text-foreground">未命中结果</div>
                <div className="text-[12px] text-muted-foreground mt-1">
                  可先检查：1) 文档是否已完成入库并为就绪状态；2) 查询词是否过短；3) 尝试切换策略为“关键词”或放宽检索范围。
                </div>
              </div>
            )}
            {result.hits.map((r: RetrievalHitData) => (
              <div
                key={r.chunk_id}
                className="bg-card rounded-lg border border-border p-4 shadow-xs hover:shadow-card-hover transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-medium text-foreground">
                        {r.title_path || `切片 #${r.chunk_no}`}
                      </h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">
                        {r.match_type}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{r.snippet}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[11px] text-muted-foreground">相关度</span>
                      <div className="flex-1 max-w-[120px] h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${maxScore > 0 ? (r.score / maxScore) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-primary font-medium">{r.score}</span>
                    </div>
                    {r.matched_terms.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {r.matched_terms.map((term, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary"
                          >
                            {term}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Database className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">输入关键词开始检索</p>
            <p className="text-[11px] text-muted-foreground/70 mt-1">
              支持自然语言查询，系统将在所选知识库中进行语义搜索
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default SearchPage;
