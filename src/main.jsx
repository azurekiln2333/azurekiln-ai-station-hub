import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  CheckCircle2,
  Code2,
  DatabaseZap,
  ExternalLink,
  Filter,
  Heart,
  History,
  Languages,
  LayoutGrid,
  ListFilter,
  LogIn,
  LogOut,
  MessagesSquare,
  Network,
  Search,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Star,
  TerminalSquare,
  UserCircle,
  WandSparkles,
  X
} from "lucide-react";
import { allTags, categories, stations } from "./data/stations";
import "./styles.css";

const iconMap = {
  ServerCog,
  MessagesSquare,
  Code2,
  DatabaseZap,
  Network,
  Languages,
  WandSparkles,
  TerminalSquare
};

const demoUser = {
  name: "AzureKiln User",
  email: "demo@azurekiln.ai"
};

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function usePersistedState(key, fallback) {
  const [value, setValue] = useState(() => readJson(key, fallback));
  const update = (next) => {
    setValue((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      writeJson(key, resolved);
      return resolved;
    });
  };
  return [value, update];
}

function App() {
  const [view, setView] = useState("explore");
  const [selectedStationId, setSelectedStationId] = useState(stations[0].id);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [activeTags, setActiveTags] = useState([]);
  const [favorites, setFavorites] = usePersistedState("azurekiln:favorites", [
    "titan-node-omega",
    "arch-node-x"
  ]);
  const [recentIds, setRecentIds] = usePersistedState("azurekiln:recent", []);
  const [user, setUser] = usePersistedState("azurekiln:user", null);
  const [toast, setToast] = useState("");

  const selectedStation = stations.find((station) => station.id === selectedStationId) || stations[0];
  const favoriteStations = stations.filter((station) => favorites.includes(station.id));
  const recentStations = recentIds
    .map((id) => stations.find((station) => station.id === id))
    .filter(Boolean)
    .slice(0, 4);

  const filteredStations = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return stations.filter((station) => {
      const matchesKeyword =
        !keyword ||
        [station.name, station.tagline, station.description, station.category, station.region, ...station.tags, ...station.models]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      const matchesCategory = category === "全部" || station.category === category;
      const matchesTags = activeTags.length === 0 || activeTags.every((tag) => station.tags.includes(tag));
      return matchesKeyword && matchesCategory && matchesTags;
    });
  }, [activeTags, category, query]);

  function showToast(message) {
    setToast(message);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(""), 2200);
  }

  function openDetail(stationId) {
    setSelectedStationId(stationId);
    setRecentIds((current) => [stationId, ...current.filter((id) => id !== stationId)].slice(0, 8));
    setView("detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleFavorite(stationId) {
    if (!user) {
      setView("login");
      showToast("请先登录后再收藏中转站");
      return;
    }
    setFavorites((current) =>
      current.includes(stationId) ? current.filter((id) => id !== stationId) : [...current, stationId]
    );
  }

  function toggleTag(tag) {
    setActiveTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]));
  }

  function login(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || demoUser.email).trim() || demoUser.email;
    setUser({ ...demoUser, email, name: email.split("@")[0] || demoUser.name });
    setView("explore");
    showToast("登录成功，收藏与最近访问会保存在本地");
  }

  function logout() {
    setUser(null);
    showToast("已退出登录");
  }

  function directLaunch(station) {
    setRecentIds((current) => [station.id, ...current.filter((id) => id !== station.id)].slice(0, 8));
    window.open(station.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="app-shell">
      <Header view={view} setView={setView} user={user} logout={logout} favoriteCount={favorites.length} />
      <main className="main-layout">
        {view === "explore" && (
          <ExploreView
            activeTags={activeTags}
            category={category}
            favoriteIds={favorites}
            filteredStations={filteredStations}
            query={query}
            recentStations={recentStations}
            setActiveTags={setActiveTags}
            setCategory={setCategory}
            setQuery={setQuery}
            toggleFavorite={toggleFavorite}
            toggleTag={toggleTag}
            openDetail={openDetail}
            directLaunch={directLaunch}
          />
        )}
        {view === "detail" && (
          <DetailView
            station={selectedStation}
            isFavorite={favorites.includes(selectedStation.id)}
            onBack={() => setView("explore")}
            onFavorite={() => toggleFavorite(selectedStation.id)}
            directLaunch={directLaunch}
            related={stations
              .filter((station) => station.id !== selectedStation.id && station.category === selectedStation.category)
              .slice(0, 3)}
            openDetail={openDetail}
          />
        )}
        {view === "favorites" && (
          <FavoritesView
            user={user}
            favoriteStations={favoriteStations}
            recentStations={recentStations}
            openDetail={openDetail}
            directLaunch={directLaunch}
            toggleFavorite={toggleFavorite}
            setView={setView}
          />
        )}
        {view === "login" && <LoginView login={login} setView={setView} />}
      </main>
      <MobileNav view={view} setView={setView} favoriteCount={favorites.length} />
      <Footer />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Header({ view, setView, user, logout, favoriteCount }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <button className="brand-button" onClick={() => setView("explore")} aria-label="返回首页">
          <span className="brand-mark">AK</span>
          <span className="brand-text">AzureKiln AI Hub</span>
        </button>
        <nav className="desktop-nav" aria-label="主导航">
          <NavButton active={view === "explore"} onClick={() => setView("explore")}>
            探索中转站
          </NavButton>
          <NavButton active={view === "favorites"} onClick={() => setView("favorites")}>
            我的收藏 <span className="nav-count">{favoriteCount}</span>
          </NavButton>
          <a className="nav-link" href="#status">
            状态监控
          </a>
        </nav>
        <div className="header-actions">
          {user ? (
            <>
              <button className="user-pill" onClick={() => setView("favorites")}>
                <UserCircle size={18} />
                <span>{user.name}</span>
              </button>
              <button className="icon-button" onClick={logout} aria-label="退出登录" title="退出登录">
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <button className="primary-button compact" onClick={() => setView("login")}>
              <LogIn size={18} />
              登录
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function NavButton({ active, children, onClick }) {
  return (
    <button className={`nav-link ${active ? "active" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}

function ExploreView({
  activeTags,
  category,
  favoriteIds,
  filteredStations,
  query,
  recentStations,
  setActiveTags,
  setCategory,
  setQuery,
  toggleFavorite,
  toggleTag,
  openDetail,
  directLaunch
}) {
  const featured = filteredStations.find((station) => station.featured) || filteredStations[0];
  const rest = filteredStations.filter((station) => station.id !== featured?.id);

  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <div className="eyebrow">
            <Sparkles size={16} />
            AI 中转站汇总与直达入口
          </div>
          <h1>统一发现、筛选、收藏和打开你的 AI 中转站</h1>
          <p>
            按标签、模型、用途和区域快速筛选可靠的中转站。登录后可保存收藏列表，详情页提供性能、价格、安全能力和直达入口。
          </p>
        </div>
        <div className="hero-panel" id="status">
          <div className="metric-row">
            <span>收录站点</span>
            <strong>{stations.length}</strong>
          </div>
          <div className="metric-row">
            <span>平均延迟</span>
            <strong>{Math.round(stations.reduce((sum, station) => sum + station.latency, 0) / stations.length)}ms</strong>
          </div>
          <div className="metric-row">
            <span>在线可用</span>
            <strong>{stations.filter((station) => station.status === "online").length}</strong>
          </div>
        </div>
      </section>

      <section className="control-panel" aria-label="筛选中转站">
        <div className="search-box">
          <Search size={20} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索中转站、模型、标签、地区..."
          />
        </div>
        <div className="category-row">
          {categories.map((item) => (
            <button key={item} className={`chip ${category === item ? "selected" : ""}`} onClick={() => setCategory(item)}>
              {item}
            </button>
          ))}
        </div>
        <div className="tag-filter-row">
          <div className="filter-label">
            <Filter size={16} />
            标签
          </div>
          <div className="tag-cloud">
            {allTags.slice(0, 20).map((tag) => (
              <button key={tag} className={`tag-chip ${activeTags.includes(tag) ? "selected" : ""}`} onClick={() => toggleTag(tag)}>
                {tag}
              </button>
            ))}
          </div>
          {activeTags.length > 0 && (
            <button className="text-button" onClick={() => setActiveTags([])}>
              清空
            </button>
          )}
        </div>
      </section>

      {recentStations.length > 0 && (
        <section className="recent-strip">
          <div className="section-title inline">
            <History size={18} />
            <span>最近访问</span>
          </div>
          <div className="recent-list">
            {recentStations.map((station) => (
              <button key={station.id} onClick={() => openDetail(station.id)}>
                {station.name}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="results-header">
        <div>
          <h2>中转站目录</h2>
          <p>当前匹配 {filteredStations.length} 个站点</p>
        </div>
        <div className="view-tools">
          <ListFilter size={18} />
          <span>按综合评分排序</span>
        </div>
      </section>

      {filteredStations.length === 0 ? (
        <EmptyState title="没有找到匹配站点" action="重置筛选" onAction={() => setActiveTags([])} />
      ) : (
        <section className="station-grid">
          {featured && (
            <StationCard
              station={featured}
              featured
              isFavorite={favoriteIds.includes(featured.id)}
              onFavorite={() => toggleFavorite(featured.id)}
              onOpen={() => openDetail(featured.id)}
              onLaunch={() => directLaunch(featured)}
            />
          )}
          {rest.map((station) => (
            <StationCard
              key={station.id}
              station={station}
              isFavorite={favoriteIds.includes(station.id)}
              onFavorite={() => toggleFavorite(station.id)}
              onOpen={() => openDetail(station.id)}
              onLaunch={() => directLaunch(station)}
            />
          ))}
        </section>
      )}
    </>
  );
}

function StationCard({ station, featured = false, isFavorite, onFavorite, onOpen, onLaunch }) {
  const Icon = iconMap[station.icon] || ServerCog;
  return (
    <article className={`station-card accent-${station.accent} ${featured ? "featured" : ""}`}>
      <div className="card-top">
        <div className="station-icon">
          <Icon size={26} />
        </div>
        <button
          className={`bookmark-button ${isFavorite ? "saved" : ""}`}
          onClick={onFavorite}
          aria-label={isFavorite ? "取消收藏" : "收藏中转站"}
        >
          <Bookmark size={18} fill={isFavorite ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="station-heading">
        <button className="title-button" onClick={onOpen}>
          {station.name}
        </button>
        <span className={`status-pill ${station.status}`}>
          <span />
          {station.status === "online" ? "Online" : "Degraded"}
        </span>
      </div>
      <p className="station-tagline">{station.tagline}</p>
      <p className="station-description">{station.description}</p>
      <div className="tag-row">
        {station.tags.slice(0, featured ? 5 : 3).map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <div className="stat-grid">
        <Metric label="延迟" value={`${station.latency}ms`} />
        <Metric label="可用率" value={station.uptime} />
        <Metric label="区域" value={station.region} />
        <Metric label="评分" value={station.score} />
      </div>
      <div className="card-actions">
        <button className="secondary-button" onClick={onOpen}>
          查看详情
        </button>
        <button className="primary-button" onClick={onLaunch}>
          {station.launchLabel}
          <ArrowUpRight size={18} />
        </button>
      </div>
    </article>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DetailView({ station, isFavorite, onBack, onFavorite, directLaunch, related, openDetail }) {
  const Icon = iconMap[station.icon] || ServerCog;
  return (
    <section className="detail-page">
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={18} />
        返回目录
      </button>
      <div className="detail-hero">
        <div className="detail-main">
          <div className="detail-title-row">
            <div className={`detail-icon accent-${station.accent}`}>
              <Icon size={34} />
            </div>
            <div>
              <div className="breadcrumbs">探索 / {station.category} / {station.name}</div>
              <h1>{station.name}</h1>
              <p>{station.description}</p>
            </div>
          </div>
          <div className="tag-row large">
            {station.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
        <aside className="launch-panel">
          <div className="score-ring">
            <strong>{station.score}</strong>
            <span>综合评分</span>
          </div>
          <button className="primary-button full" onClick={() => directLaunch(station)}>
            点击直达
            <ExternalLink size={18} />
          </button>
          <button className={`secondary-button full ${isFavorite ? "saved" : ""}`} onClick={onFavorite}>
            <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
            {isFavorite ? "已收藏" : "加入收藏"}
          </button>
        </aside>
      </div>

      <div className="detail-grid">
        <section className="panel-card">
          <h2>性能概览</h2>
          <div className="wide-stat-grid">
            <Metric label="平均延迟" value={`${station.latency}ms`} />
            <Metric label="30 天可用率" value={station.uptime} />
            <Metric label="区域" value={station.region} />
            <Metric label="接口形态" value={station.apiShape} />
          </div>
          <div className="pulse-chart" aria-label="性能趋势图">
            {[42, 54, 48, 70, 62, 88, 64, 76, 58, 80, 66, 72].map((height, index) => (
              <span key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
        </section>

        <section className="panel-card">
          <h2>模型兼容</h2>
          <div className="list-stack">
            {station.models.map((model) => (
              <div className="list-item" key={model}>
                <CheckCircle2 size={18} />
                <span>{model}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel-card">
          <h2>安全与治理</h2>
          <div className="list-stack">
            {station.security.map((item) => (
              <div className="list-item" key={item}>
                <ShieldCheck size={18} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel-card">
          <h2>价格与用途</h2>
          <div className="pricing-box">{station.pricing}</div>
          <div className="tag-row">
            {station.useCases.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <a className="docs-link" href={station.docs} target="_blank" rel="noreferrer">
            查看文档 <ArrowUpRight size={16} />
          </a>
        </section>
      </div>

      {related.length > 0 && (
        <section className="related-section">
          <h2>同类推荐</h2>
          <div className="mini-card-row">
            {related.map((item) => (
              <button className="mini-card" key={item.id} onClick={() => openDetail(item.id)}>
                <strong>{item.name}</strong>
                <span>{item.tagline}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

function FavoritesView({ user, favoriteStations, recentStations, openDetail, directLaunch, toggleFavorite, setView }) {
  if (!user) {
    return (
      <section className="auth-required">
        <div className="auth-card">
          <UserCircle size={42} />
          <h1>登录后查看收藏列表</h1>
          <p>收藏夹会记录你常用的 AI 中转站，并提供一键直达、最近访问和分类管理。</p>
          <button className="primary-button" onClick={() => setView("login")}>
            立即登录
            <LogIn size={18} />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="favorites-layout">
      <aside className="sidebar">
        <h2>收藏夹</h2>
        <button className="sidebar-item active">
          <Bookmark size={18} />
          全部收藏 <span>{favoriteStations.length}</span>
        </button>
        <button className="sidebar-item">
          <History size={18} />
          最近访问 <span>{recentStations.length}</span>
        </button>
        <button className="sidebar-item">
          <Star size={18} />
          高评分 <span>{favoriteStations.filter((station) => station.score >= 95).length}</span>
        </button>
      </aside>
      <div className="favorites-main">
        <div className="results-header">
          <div>
            <h1>我的收藏</h1>
            <p>{user.email} 的常用中转站列表</p>
          </div>
          <button className="secondary-button" onClick={() => setView("explore")}>
            <LayoutGrid size={18} />
            继续探索
          </button>
        </div>
        {favoriteStations.length === 0 ? (
          <EmptyState title="还没有收藏中转站" action="去探索" onAction={() => setView("explore")} />
        ) : (
          <div className="favorites-grid">
            {favoriteStations.map((station) => (
              <StationCard
                key={station.id}
                station={station}
                isFavorite
                onFavorite={() => toggleFavorite(station.id)}
                onOpen={() => openDetail(station.id)}
                onLaunch={() => directLaunch(station)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function LoginView({ login, setView }) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <section className="login-page">
      <form className="login-card" onSubmit={login}>
        <button type="button" className="close-login" onClick={() => setView("explore")} aria-label="关闭登录">
          <X size={18} />
        </button>
        <div className="login-brand">
          <span className="brand-mark">AK</span>
          <h1>欢迎回来</h1>
          <p>登录后即可收藏中转站，并保留最近访问记录。</p>
        </div>
        <label>
          邮箱
          <input name="email" type="email" placeholder="name@company.com" defaultValue={demoUser.email} />
        </label>
        <label>
          密码
          <div className="password-field">
            <input name="password" type={showPassword ? "text" : "password"} placeholder="demo-password" />
            <button type="button" onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? "隐藏" : "显示"}
            </button>
          </div>
        </label>
        <div className="form-row">
          <label className="checkbox-label">
            <input type="checkbox" defaultChecked />
            保持登录
          </label>
          <span>Demo 登录无需真实密码</span>
        </div>
        <button className="primary-button full" type="submit">
          登录
          <ArrowUpRight size={18} />
        </button>
      </form>
    </section>
  );
}

function EmptyState({ title, action, onAction }) {
  return (
    <div className="empty-state">
      <Search size={34} />
      <h2>{title}</h2>
      <button className="primary-button" onClick={onAction}>
        {action}
      </button>
    </div>
  );
}

function MobileNav({ view, setView, favoriteCount }) {
  return (
    <nav className="mobile-nav" aria-label="移动端导航">
      <button className={view === "explore" ? "active" : ""} onClick={() => setView("explore")}>
        <Search size={20} />
        探索
      </button>
      <button className={view === "favorites" ? "active" : ""} onClick={() => setView("favorites")}>
        <Bookmark size={20} />
        收藏 {favoriteCount}
      </button>
      <button className={view === "login" ? "active" : ""} onClick={() => setView("login")}>
        <UserCircle size={20} />
        账户
      </button>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <span>AzureKiln AI Hub</span>
      <p>用于发现、评估、收藏并直达 AI 中转站的工作台。</p>
    </footer>
  );
}

createRoot(document.getElementById("root")).render(<App />);
