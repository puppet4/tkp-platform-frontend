import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

export default function Forbidden() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md px-4">
        <div className="flex justify-center">
          <ShieldAlert className="w-24 h-24 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">403</h1>
          <h2 className="text-2xl font-semibold">权限不足</h2>
          <p className="text-muted-foreground">
            抱歉，您没有权限访问此页面。如需访问，请联系管理员。
          </p>
        </div>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-input rounded-md hover:bg-accent"
          >
            返回上一页
          </button>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            返回首页
          </button>
        </div>
      </div>
    </div>
  );
}
