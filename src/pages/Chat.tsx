import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import {
  chatApi,
  feedbackApi,
  kbApi,
  type ConversationData,
  type ConversationMessageData,
  type KnowledgeBaseData,
  type ChatCompletionResult,
} from "@/lib/api";
import {
  MessageSquare,
  Send,
  Plus,
  FileText,
  ChevronDown,
  ThumbsUp,
  ThumbsDown,
  BookOpen,
  Database,
  Loader2,
  Menu,
  Trash2,
  Pencil,
} from "lucide-react";
import { FormDialog, FormField, DialogButton, FormInput } from "@/components/FormDialog";
import ReactMarkdown from "react-markdown";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const Chat = () => {
  const qc = useQueryClient();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessageData[]>([]);
  const [input, setInput] = useState("");
  const [showCitations, setShowCitations] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [currentStreamingMsgId, setCurrentStreamingMsgId] = useState<string | null>(null);
  const [showNewConv, setShowNewConv] = useState(false);
  const [selectedKbs, setSelectedKbs] = useState<string[]>([]);
  const [showMobileList, setShowMobileList] = useState(false);
  const [showRenameConv, setShowRenameConv] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamText]);

  // ─── Data fetching ──────────────────────────────────────────────
  const { data: conversations = [], isLoading: convsLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => chatApi.listConversations(),
  });

  const { data: knowledgeBases = [] } = useQuery({
    queryKey: ["all-knowledge-bases"],
    queryFn: () => kbApi.list(),
  });

  // Load conversation detail
  const { data: convDetail, refetch: refetchConvDetail } = useQuery({
    queryKey: ["conv-detail", selectedConvId],
    queryFn: () => chatApi.getConversation(selectedConvId!),
    enabled: !!selectedConvId,
  });

  // Load messages when conversation selected
  const { data: convMessages, isLoading: msgsLoading } = useQuery({
    queryKey: ["conv-messages", selectedConvId],
    queryFn: () => chatApi.listMessages(selectedConvId!, 100, 0),
    enabled: !!selectedConvId,
  });

  useEffect(() => {
    if (convMessages && Array.isArray(convMessages) && !isStreaming) {
      setMessages(convMessages);
    }
  }, [convMessages, isStreaming]);

  // Auto-select first conversation
  useEffect(() => {
    if (!selectedConvId && Array.isArray(conversations) && conversations.length > 0) {
      setSelectedConvId(conversations[0]?.id);
    }
  }, [conversations, selectedConvId]);

  const selectedConv = conversations.find((c) => c.id === selectedConvId);
  const selectedConvView = convDetail || selectedConv;

  // ─── Mutations ─────────────────────────────────────────────────
  const deleteConvMutation = useMutation({
    mutationFn: (id: string) => chatApi.deleteConversation(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      if (selectedConvId === id) {
        setSelectedConvId(null);
        setMessages([]);
      }
      toast.success("会话已删除");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renameConvMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      chatApi.updateConversation(id, title),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["conversations"] });
      await refetchConvDetail();
      toast.success("会话标题已更新");
      setShowRenameConv(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const feedbackMutation = useMutation({
    mutationFn: (payload: { feedback_type: "thumbs_up" | "thumbs_down"; message_id: string }) =>
      feedbackApi.create({
        feedback_type: payload.feedback_type,
        conversation_id: selectedConvId || undefined,
        message_id: payload.message_id,
      }),
    onSuccess: (_, vars) => {
      toast.success(vars.feedback_type === "thumbs_up" ? "已提交好评" : "已提交差评");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createConvMutation = useMutation({
    mutationFn: (kb_ids: string[]) => chatApi.createConversation({ kb_ids }),
    onSuccess: (newConv) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      setSelectedConvId(newConv.id);
      setMessages([]);
      setShowNewConv(false);
      setShowMobileList(false);
      toast.success("会话已创建");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ─── Send message ──────────────────────────────────────────────
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userContent = input.trim();
    const streamingMsgId = `streaming-${Date.now()}`;

    setInput("");
    setIsStreaming(true);
    setStreamText("");
    setCurrentStreamingMsgId(streamingMsgId);

    // Optimistic user message
    const userMsg: ConversationMessageData = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userContent,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      // Build messages payload: history + new
      const historyMsgs = messages.map((m) => ({ role: m.role, content: m.content }));
      historyMsgs.push({ role: "user", content: userContent });

      const result: ChatCompletionResult = await chatApi.completions({
        conversation_id: selectedConvId || undefined,
        messages: historyMsgs,
        kb_ids: selectedConvId ? undefined : selectedKbs.length > 0 ? selectedKbs : undefined,
      });

      // If this was a new conversation, update the selected conv ID
      if (!selectedConvId && result.conversation_id) {
        setSelectedConvId(result.conversation_id);
        qc.invalidateQueries({ queryKey: ["conversations"] });
      }

      const assistantMsg: ConversationMessageData = {
        id: result.message_id,
        role: "assistant",
        content: result.answer,
        citations: result.citations,
        created_at: new Date().toISOString(),
      };
      // Use functional update to avoid race condition
      setMessages((prev) => {
        // Only add if this is still the current streaming message
        if (currentStreamingMsgId === streamingMsgId) {
          return [...prev, assistantMsg];
        }
        return prev;
      });

      // Refresh conversation list/detail (message_count etc)
      qc.invalidateQueries({ queryKey: ["conversations"] });
      refetchConvDetail();
    } catch (err) {
      toast.error((err as Error).message || "发送失败");
    } finally {
      setIsStreaming(false);
      setStreamText("");
      setCurrentStreamingMsgId(null);
    }
  };

  // ─── New conversation ──────────────────────────────────────────
  const handleNewConversation = () => {
    if (selectedKbs.length === 0) {
      toast.error("请至少选择一个知识库");
      return;
    }
    // Create conversation immediately on server
    createConvMutation.mutate(selectedKbs);
  };

  // ─── Conversation list component ──────────────────────────────
  const ConversationList = () => (
    <>
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">对话</h2>
        <button
          onClick={() => setShowNewConv(true)}
          className="p-1.5 rounded-md hover:bg-secondary transition-colors"
          title="新建对话"
        >
          <Plus className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {convsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 text-[11px] text-muted-foreground">暂无会话</div>
        ) : (
          conversations.map((conv: ConversationData) => (
            <div
              key={conv.id}
              className={`group w-full text-left px-3 py-3 border-b border-border transition-colors flex items-center gap-2 cursor-pointer ${
                selectedConvId === conv.id ? "bg-primary/5" : "hover:bg-secondary/50"
              }`}
              onClick={() => {
                setSelectedConvId(conv.id);
                setShowMobileList(false);
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{conv.title}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {conv.message_count} 条消息 · {new Date(conv.updated_at).toLocaleDateString("zh-CN")}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setRenameTitle(conv.title);
                  setSelectedConvId(conv.id);
                  setShowRenameConv(true);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-secondary transition-all"
                title="重命名"
              >
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConvMutation.mutate(conv.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-all"
                title="删除"
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-3.25rem)]">
        {/* Desktop conversation list */}
        <div className="w-72 border-r border-border bg-card flex-col shrink-0 hidden md:flex">
          <ConversationList />
        </div>

        {/* Mobile conversation drawer */}
        {showMobileList && (
          <>
            <div
              className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm md:hidden"
              onClick={() => setShowMobileList(false)}
            />
            <div className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-card border-r border-border flex flex-col md:hidden animate-in slide-in-from-left duration-200">
              <ConversationList />
            </div>
          </>
        )}

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-12 px-4 border-b border-border flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMobileList(true)}
                className="p-1.5 rounded-md hover:bg-secondary transition-colors md:hidden"
              >
                <Menu className="h-4 w-4 text-muted-foreground" />
              </button>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {selectedConvView?.title || "新对话"}
                </h3>
                <div className="text-[11px] text-muted-foreground">
                  {selectedConvView
                    ? `${selectedConvView.message_count} 条消息`
                    : selectedKbs.length > 0
                      ? `已选 ${selectedKbs.length} 个知识库`
                      : "选择知识库开始对话"}
                </div>
              </div>
            </div>
            {selectedConvId && (
              <button
                onClick={() => {
                  setRenameTitle(selectedConvView?.title || "");
                  setShowRenameConv(true);
                }}
                className="text-[12px] px-2.5 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                重命名
              </button>
            )}
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            {msgsLoading && selectedConvId ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              </div>
            ) : messages.length === 0 && !isStreaming ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">开始新的对话</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  输入您的问题，AI 将在关联知识库中检索并回答
                </p>
              </div>
            ) : null}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] md:max-w-[75%] ${msg.role === "user" ? "order-1" : ""}`}>
                  <div
                    className={`rounded-lg px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border shadow-xs"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-primary prose-code:bg-secondary prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-secondary prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-li:text-foreground">
                        <ReactMarkdown
                          components={{
                            html: () => null,
                          }}
                          disallowedElements={['script', 'iframe', 'object', 'embed', 'style']}
                          unwrapDisallowed={true}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}
                  </div>

                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-2">
                      <button
                        onClick={() => setShowCitations(showCitations === msg.id ? null : msg.id)}
                        className="flex items-center gap-1 text-[11px] text-primary font-medium hover:underline"
                      >
                        <BookOpen className="h-3 w-3" />
                        {msg.citations.length} 个引用来源
                        <ChevronDown
                          className={`h-3 w-3 transition-transform ${showCitations === msg.id ? "rotate-180" : ""}`}
                        />
                      </button>
                      {showCitations === msg.id && (
                        <div className="mt-2 space-y-2">
                          {msg.citations.map((c: any, i: number) => (
                            <div key={i} className="bg-secondary/50 rounded-md p-2.5 border border-border">
                              <div className="flex items-center gap-1.5 mb-1">
                                <FileText className="h-3 w-3 text-primary" />
                                <span className="text-[11px] font-medium text-foreground">
                                  {c.doc_title || c.title_path || `来源 ${i + 1}`}
                                </span>
                                {c.score != null && (
                                  <span className="text-[10px] font-mono text-primary ml-auto">{c.score}</span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground line-clamp-2">
                                {c.chunk_text || c.snippet || ""}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <button
                        onClick={() => feedbackMutation.mutate({ feedback_type: "thumbs_up", message_id: msg.id })}
                        className="p-1 rounded hover:bg-secondary transition-colors"
                        title="好评"
                      >
                        <ThumbsUp className="h-3 w-3 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => feedbackMutation.mutate({ feedback_type: "thumbs_down", message_id: msg.id })}
                        className="p-1 rounded hover:bg-secondary transition-colors"
                        title="差评"
                      >
                        <ThumbsDown className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </div>
                  )}

                  <div className="text-[10px] text-muted-foreground mt-1 px-1">
                    {new Date(msg.created_at).toLocaleTimeString("zh-CN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}

            {isStreaming && (
              <div className="flex justify-start">
                <div className="rounded-lg px-4 py-3 bg-card border border-border shadow-xs flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  <span className="text-sm text-muted-foreground">正在思考...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-border">
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="输入问题..."
                disabled={isStreaming}
                className="flex-1 h-10 rounded-lg border border-input bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 transition-shadow disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isStreaming || !input.trim()}
                className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors shrink-0 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      <FormDialog
        open={showNewConv}
        onClose={() => setShowNewConv(false)}
        title="新建对话"
        description="选择要关联的知识库"
        footer={
          <>
            <DialogButton onClick={() => setShowNewConv(false)}>取消</DialogButton>
            <DialogButton
              variant="primary"
              disabled={selectedKbs.length === 0}
              onClick={handleNewConversation}
            >
              创建
            </DialogButton>
          </>
        }
      >
        <FormField label="选择知识库" required hint="至少选择一个知识库作为 AI 回答的数据来源">
          <div className="space-y-2">
            {knowledgeBases.map((kb: KnowledgeBaseData) => (
              <label
                key={kb.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedKbs.includes(kb.id)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedKbs.includes(kb.id)}
                  onChange={() =>
                    setSelectedKbs((prev) =>
                      prev.includes(kb.id) ? prev.filter((id) => id !== kb.id) : [...prev, kb.id],
                    )
                  }
                  className="rounded border-input"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{kb.name}</div>
                  <div className="text-[11px] text-muted-foreground">{kb.description || "无描述"}</div>
                </div>
                <Database className="h-4 w-4 text-muted-foreground shrink-0" />
              </label>
            ))}
          </div>
        </FormField>
      </FormDialog>

      <FormDialog
        open={showRenameConv}
        onClose={() => setShowRenameConv(false)}
        title="重命名会话"
        footer={
          <>
            <DialogButton onClick={() => setShowRenameConv(false)}>取消</DialogButton>
            <DialogButton
              variant="primary"
              disabled={!selectedConvId || !renameTitle.trim() || renameConvMutation.isPending}
              onClick={() => {
                if (!selectedConvId) return;
                renameConvMutation.mutate({ id: selectedConvId, title: renameTitle.trim() });
              }}
            >
              {renameConvMutation.isPending ? "保存中..." : "保存"}
            </DialogButton>
          </>
        }
      >
        <FormField label="会话标题" required>
          <FormInput value={renameTitle} onChange={setRenameTitle} placeholder="输入会话标题" />
        </FormField>
      </FormDialog>
    </AppLayout>
  );
};

export default Chat;
