const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

function App(): JSX.Element {
  return (
    <main className="page">
      <section className="panel">
        <p className="tag">TKP Platform</p>
        <h1>Frontend Workspace</h1>
        <p className="desc">
          前端工程已初始化，你可以从这里开始接入业务页面、路由和 API 调用。
        </p>

        <div className="meta">
          <span>API Base</span>
          <code>{apiBase}</code>
        </div>

        <ul className="next-steps">
          <li>新增页面：在 `src/` 下创建业务模块</li>
          <li>接入后端：先从 `/api/health/live` 做联调</li>
          <li>样式体系：按模块拆分 CSS 或切换到你习惯的方案</li>
        </ul>
      </section>
    </main>
  );
}

export default App;
