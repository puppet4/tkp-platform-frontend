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
  Copy,
  RotateCw,
  ArrowDown,
  User,
  Sparkles,
} from "lucide-react";
import { FormDialog, FormField, DialogButton, FormInput } from "@/components/FormDialog";
import ReactMarkdown from "react-markdown";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DocumentPreviewSheet } from "@/components/DocumentPreviewSheet";

function formatMsgTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, []);

  useEffect(() => {
    if (!showScrollButton) {
      scrollToBottom();
    }
  }, [messages, streamText, showScrollButton]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

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
    if (convMessages && Array.isArray(convMessages)) {
      // Only update messages if not currently streaming
      // This prevents overwriting the optimistic updates during streaming
      if (!isStreaming) {
        setMessages(convMessages);
      }
    }
  }, [convMessages, selectedConvId]); // Remove isStreaming from deps to avoid re-triggering

  // Auto-select first conversation or create default one
  useEffect(() => {
    if (!convsLoading && Array.isArray(conversations)) {
      if (conversations.length === 0) {
        // No conversations exist, create a default one
        createConvMutation.mutate([]);
      } else if (!selectedConvId) {
        // Select the first conversation
        setSelectedConvId(conversations[0]?.id);
      }
    }
  }, [conversations, selectedConvId, convsLoading]);

  const selectedConv = conversations.find((c) => c.id === selectedConvId);
  const selectedConvView = convDetail || selectedConv;

  // ─── Mutations ─────────────────────────────────────────────────
  const deleteConvMutation = useMutation({
    mutationFn: (id: string) => chatApi.deleteConversation(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      if (selectedConvId === id) {
        // Select another conversation after deletion
        const remaining = conversations.filter(c => c.id !== id);
        setSelectedConvId(remaining.length > 0 ? remaining[0].id : null);
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
  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isStreaming) return;

    // Must have a selected conversation
    if (!selectedConvId) {
      toast.error("请先选择或创建会话");
      return;
    }

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

    // Add placeholder assistant message
    const assistantMsgId = `assistant-${Date.now()}`;
    const assistantMsg: ConversationMessageData = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      // Build messages payload: history + new
      const historyMsgs = messages.map((m) => ({ role: m.role, content: m.content }));
      historyMsgs.push({ role: "user", content: userContent });

      let fullAnswer = "";
      let citations: any[] = [];
      let finalMessageId = "";
      let finalConversationId = "";

      await chatApi.completionsStream(
        {
          conversation_id: selectedConvId,
          messages: historyMsgs,
        },
        (chunk) => {
          if (chunk.type === "citations") {
            citations = chunk.data;
          } else if (chunk.type === "content") {
            fullAnswer += chunk.data;
            // Update the assistant message with streaming content
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId ? { ...m, content: fullAnswer } : m
              )
            );
          } else if (chunk.type === "done") {
            finalMessageId = chunk.data.message_id;
            finalConversationId = chunk.data.conversation_id;
            // Update with final data - keep the content!
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, id: finalMessageId, citations }
                  : m
              )
            );
          } else if (chunk.type === "error") {
            toast.error(chunk.data);
          }
        }
      );

      // Refresh conversation list/detail (message_count etc)
      qc.invalidateQueries({ queryKey: ["conversations"] });
      // Delay refetch to allow backend to save the message
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["conv-messages", selectedConvId] });
      }, 500);
    } catch (err) {
      toast.error((err as Error).message || "发送失败");
      // Remove the placeholder assistant message on error
      setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
    } finally {
      setIsStreaming(false);
      setStreamText("");
      setCurrentStreamingMsgId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("已复制到剪贴板");
  };

  const handleRegenerate = async (messageId: string) => {
    // Find the user message before this assistant message
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex <= 0) return;

    const userMsg = messages[msgIndex - 1];
    if (userMsg.role !== "user") return;

    // Remove messages from this point
    setMessages(messages.slice(0, msgIndex));

    // Resend
    setInput(userMsg.content);
    setTimeout(() => handleSend(), 100);
  };

  // ─── New conversation ──────────────────────────────────────────
  const handleNewConversation = () => {
    // Create conversation with selected KBs (can be empty)
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
                  {new Date(conv.updated_at).toLocaleDateString("zh-CN")}
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
                  if (conversations.length <= 1) {
                    toast.error("至少需要保留一个会话");
                    return;
                  }
                  deleteConvMutation.mutate(conv.id);
                }}
                className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${
                  conversations.length <= 1
                    ? "cursor-not-allowed opacity-50"
                    : "hover:bg-destructive/10"
                }`}
                title={conversations.length <= 1 ? "至少需要保留一个会话" : "删除"}
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
                    ? new Date(selectedConvView.updated_at).toLocaleDateString("zh-CN")
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

          <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-border/40" ref={messagesContainerRef}>
            <div className="max-w-3xl mx-auto px-6 md:px-10 py-8 space-y-8">
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

              {messages.map((msg) => {
                const isAssistant = msg.role === "assistant";
                const isThinking = isAssistant && !msg.content && isStreaming && msg.id.startsWith("assistant-");
                const isStreamingThis = isStreaming && msg.id.startsWith("assistant-");
                return (
                <div key={msg.id} className="group">
                  <div className="flex items-start gap-3.5">
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${
                      isAssistant
                        ? "bg-gradient-to-br from-violet-500/15 to-purple-500/15"
                        : "bg-emerald-500/15"
                    }`}>
                      {isAssistant
                        ? <Sparkles className="h-4 w-4 text-violet-500" />
                        : <User className="h-4 w-4 text-emerald-600" />}
                    </div>

                    {/* Content column */}
                    <div className="flex-1 min-w-0">
                      {/* Header: role + time */}
                      <div className="flex items-baseline gap-2 mb-1.5">
                        <span className="text-[13px] font-semibold text-foreground">
                          {isAssistant ? "AI 助手" : "用户"}
                        </span>
                        <span className="text-[11px] text-muted-foreground/60">
                          {formatMsgTime(msg.created_at)}
                        </span>
                      </div>

                      {/* Body */}
                      {isThinking ? (
                        <div className="flex items-center gap-2 py-2">
                          <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                          <span className="text-[13px] text-muted-foreground">正在思考...</span>
                        </div>
                      ) : isAssistant ? (
                        <div className="prose prose-[15px] max-w-none break-words leading-relaxed prose-headings:text-foreground prose-headings:font-semibold prose-p:text-foreground prose-p:leading-7 prose-p:my-2.5 prose-strong:text-foreground prose-code:text-violet-600 prose-code:bg-violet-50 dark:prose-code:bg-violet-950/30 dark:prose-code:text-violet-400 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[13px] prose-code:font-mono prose-pre:bg-zinc-900 dark:prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-border/30 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-li:text-foreground prose-ul:my-2.5 prose-ol:my-2.5 prose-li:my-0.5">
                          <ReactMarkdown components={{ html: () => null }}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="text-[15px] leading-7 text-foreground whitespace-pre-wrap break-words">
                          {msg.content}
                        </div>
                      )}

                      {/* Citations */}
                      {isAssistant && msg.citations && msg.citations.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-border/30">
                          <button
                            onClick={() => setShowCitations(showCitations === msg.id ? null : msg.id)}
                            className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <BookOpen className="h-3.5 w-3.5 text-violet-500" />
                            <span>{msg.citations.length} 个引用来源</span>
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showCitations === msg.id ? "rotate-180" : ""}`} />
                          </button>
                          {showCitations === msg.id && (
                            <div className="mt-2.5 space-y-2">
                              {msg.citations.map((citation: any, idx: number) => (
                                <div key={idx}
                                  className="text-[12px] px-3.5 py-2.5 rounded-lg bg-secondary/40 border border-border/30 hover:border-primary/20 transition-colors cursor-pointer"
                                  onClick={() => citation.document_id && setPreviewDocId(citation.document_id)}
                                >
                                  <div className="flex items-start gap-2">
                                    <FileText className="h-3.5 w-3.5 text-violet-500 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <span className="font-medium text-foreground">{citation.document_title || "未命名文档"}</span>
                                      <span className="text-muted-foreground ml-2">{citation.snippet || citation.content?.substring(0, 100)}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Footer actions — hidden during streaming, subtle on hover */}
                      {!(isStreamingThis) && (
                        <div className="flex items-center gap-0.5 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => copyToClipboard(msg.content)}
                            className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                            title="复制"
                          >
                            <Copy className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground" />
                          </button>
                          {isAssistant && (
                            <>
                              <button
                                onClick={() => handleRegenerate(msg.id)}
                                className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                                title="重新生成"
                              >
                                <RotateCw className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground" />
                              </button>
                              <div className="w-px h-3.5 bg-border/50 mx-1" />
                              <button
                                onClick={() => feedbackMutation.mutate({ feedback_type: "thumbs_up", message_id: msg.id })}
                                className="p-1.5 rounded-md hover:bg-green-500/10 transition-colors"
                                title="好评"
                              >
                                <ThumbsUp className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-green-600" />
                              </button>
                              <button
                                onClick={() => feedbackMutation.mutate({ feedback_type: "thumbs_down", message_id: msg.id })}
                                className="p-1.5 rounded-md hover:bg-red-500/10 transition-colors"
                                title="差评"
                              >
                                <ThumbsDown className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-red-600" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Scroll to bottom button */}
          {showScrollButton && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-28 left-1/2 -translate-x-1/2 p-2 rounded-full bg-card border border-border shadow-lg hover:bg-secondary transition-colors z-10"
            >
              <ArrowDown className="h-4 w-4 text-muted-foreground" />
            </button>
          )}

          {/* Input area */}
          <div className="border-t border-border/30 bg-background">
            <div className="max-w-3xl mx-auto px-6 md:px-10 py-4">
              <form onSubmit={handleSend} className="relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入您的问题..."
                  disabled={isStreaming}
                  rows={1}
                  className="w-full resize-none rounded-xl border border-border/50 bg-secondary/30 px-4 py-3.5 pr-13 text-[15px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 focus:border-violet-500/40 transition-all disabled:opacity-50 max-h-[200px] overflow-y-auto"
                  style={{ minHeight: "52px" }}
                />
                <button
                  type="submit"
                  disabled={isStreaming || !input.trim()}
                  className="absolute right-2.5 bottom-2.5 h-9 w-9 rounded-lg bg-violet-500 text-white flex items-center justify-center hover:bg-violet-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
              <div className="text-[11px] text-muted-foreground/50 text-center mt-2">
                <kbd className="px-1 py-0.5 rounded bg-secondary/50 border border-border/30 font-mono text-[10px]">Enter</kbd> 发送
                <span className="mx-1.5">·</span>
                <kbd className="px-1 py-0.5 rounded bg-secondary/50 border border-border/30 font-mono text-[10px]">Shift+Enter</kbd> 换行
              </div>
            </div>
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
              onClick={handleNewConversation}
            >
              创建
            </DialogButton>
          </>
        }
      >
        <FormField label="选择知识库（可选）" hint="可选择知识库作为 AI 回答的数据来源，不选择则使用通用对话模式">
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

      <DocumentPreviewSheet
        open={!!previewDocId}
        onOpenChange={(open) => { if (!open) setPreviewDocId(null); }}
        documentId={previewDocId || undefined}
      />
    </AppLayout>
  );
};

export default Chat;
