import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  CheckCircle2,
  Code2,
  DatabaseZap,
  Edit3,
  ExternalLink,
  Filter,
  Heart,
  History,
  Languages,
  LayoutDashboard,
  LayoutGrid,
  ListFilter,
  LogIn,
  LogOut,
  MessagesSquare,
  Network,
  Plus,
  Search,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Star,
  TerminalSquare,
  Trash2,
  UserCircle,
  WandSparkles,
  X,
  Zap
} from "lucide-react";
import { api, clearSession, getStoredSession, storeSession } from "./api";
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

const emptyStation = {
  id: "",
  name: "",
  tagline: "",
  description: "",
  url: "",
  category: "API 接入",
  tags: [],
  models: [],
  region: "Global",
  latency: 100,
  uptime: "99.9%",
  status: "online",
  security: [],
  pricing: "待定",
  launchLabel: "点击直达",
  icon: "ServerCog",
  accent: "blue",
  featured: false,
  score: 90,
  apiShape: "OpenAI Compatible",
  useCases: [],
  docs: ""
};

function App() {
  const storedSession = getStoredSession();
  const [view, setView] = useState("explore");
  const [stations, setStations] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [recentIds, setRecentIds] = useState(() => readJson("azurekiln:recent", []));
  const [selectedStationId, setSelectedStationId] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [activeTags, setActiveTags] = useState([]);
  const [user, setUser] = useState(storedSession.user);
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [probeInfo, setProbeInfo] = useState(null);
  const [statusRefreshing, setStatusRefreshing] = useState(false);
  const [checkingStationIds, setCheckingStationIds] = useState([]);

  useEffect(() => {
    refreshStations();
  }, []);

  useEffect(() => {
    if (user) {
      refreshFavorites();
    } else {
      setFavorites([]);
    }
  }, [user]);

  useEffect(() => {
    if (apiError) return undefined;
    const timer = window.setInterval(() => {
      refreshStationStatuses();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [apiError]);

  const categories = useMemo(
    () => ["全部", ...Array.from(new Set(stations.map((station) => station.category))).sort()],
    [stations]
  );

  const allTags = useMemo(
    () =>
      Array.from(new Set(stations.flatMap((station) => station.tags || []))).sort((a, b) =>
        a.localeCompare(b, "zh-CN")
      ),
    [stations]
  );

  const selectedStation = stations.find((station) => station.id === selectedStationId) || stations[0];
  const favoriteIds = favorites.map((station) => station.id);
  const recentStations = recentIds.map((id) => stations.find((station) => station.id === id)).filter(Boolean);

  const filteredStations = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return stations.filter((station) => {
      const haystack = [
        station.name,
        station.tagline,
        station.description,
        station.category,
        station.region,
        ...(station.tags || []),
        ...(station.models || [])
      ]
        .join(" ")
        .toLowerCase();
      return (
        (!keyword || haystack.includes(keyword)) &&
        (category === "全部" || station.category === category) &&
        (activeTags.length === 0 || activeTags.every((tag) => station.tags.includes(tag)))
      );
    });
  }, [activeTags, category, query, stations]);

  async function refreshStations() {
    setLoading(true);
    try {
      const data = await api("/api/stations");
      setStations(data.stations);
      setSelectedStationId((current) => current || data.stations[0]?.id || "");
      setApiError("");
    } catch (error) {
      setApiError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshStationStatuses(manual = false) {
    setStatusRefreshing(true);
    try {
      const data = await api(manual ? "/api/admin/stations/check" : "/api/stations/status", {
        method: manual ? "POST" : "GET"
      });
      mergeStatuses(data.statuses);
      setProbeInfo(data.probe);
      if (manual) {
        showToast("已触发实时检测，延迟和状态已更新");
      }
    } catch (error) {
      if (manual) {
        showToast(error.message);
      }
    } finally {
      setStatusRefreshing(false);
    }
  }

  function mergeStatuses(statuses = []) {
    const statusMap = new Map(statuses.map((status) => [status.id, status]));
    const merge = (station) => {
      const status = statusMap.get(station.id);
      return status ? { ...station, ...status } : station;
    };
    setStations((current) => current.map(merge));
    setFavorites((current) => current.map(merge));
  }

  async function refreshStationStatus(stationId) {
    setCheckingStationIds((current) => (current.includes(stationId) ? current : [...current, stationId]));
    try {
      const data = await api(`/api/stations/${stationId}/check`, { method: "POST" });
      mergeStatuses([data.status]);
      showToast("延迟已刷新");
    } catch (error) {
      showToast(error.message);
    } finally {
      setCheckingStationIds((current) => current.filter((id) => id !== stationId));
    }
  }

  async function refreshFavorites() {
    try {
      const data = await api("/api/favorites");
      setFavorites(data.stations);
    } catch (error) {
      showToast(error.message);
    }
  }

  function showToast(message) {
    setToast(message);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(""), 2400);
  }

  function saveRecent(stationId) {
    setRecentIds((current) => {
      const next = [stationId, ...current.filter((id) => id !== stationId)].slice(0, 8);
      writeJson("azurekiln:recent", next);
      return next;
    });
  }

  function openDetail(stationId) {
    setSelectedStationId(stationId);
    saveRecent(stationId);
    setView("detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleFavorite(stationId) {
    if (!user) {
      setView("login");
      showToast("请先登录后再收藏中转站");
      return;
    }
    try {
      if (favoriteIds.includes(stationId)) {
        await api(`/api/favorites/${stationId}`, { method: "DELETE" });
      } else {
        await api(`/api/favorites/${stationId}`, { method: "POST" });
      }
      await refreshFavorites();
    } catch (error) {
      showToast(error.message);
    }
  }

  function toggleTag(tag) {
    setActiveTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]));
  }

  async function login(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const session = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: String(form.get("email") || "").trim(),
          password: String(form.get("password") || "")
        })
      });
      storeSession(session);
      setUser(session.user);
      setView(session.user.role === "admin" ? "admin" : "explore");
      showToast(session.user.role === "admin" ? "管理员登录成功" : "登录成功");
    } catch (error) {
      showToast(error.message);
    }
  }

  function logout() {
    clearSession();
    setUser(null);
    setFavorites([]);
    setView("explore");
    showToast("已退出登录");
  }

  function directLaunch(station) {
    saveRecent(station.id);
    window.open(station.url, "_blank", "noopener,noreferrer");
  }

  async function saveStation(station) {
    const method = stations.some((item) => item.id === station.id) ? "PUT" : "POST";
    const path = method === "PUT" ? `/api/admin/stations/${station.id}` : "/api/admin/stations";
    await api(path, {
      method,
      body: JSON.stringify(station)
    });
    await refreshStations();
    showToast("中转站已保存");
  }

  async function deleteStation(stationId) {
    await api(`/api/admin/stations/${stationId}`, { method: "DELETE" });
    await refreshStations();
    await refreshFavorites();
    showToast("中转站已删除");
  }

  return (
    <div className="app-shell">
      <Header view={view} setView={setView} user={user} logout={logout} favoriteCount={favorites.length} />
      <main className="main-layout">
        {apiError && <ApiNotice message={apiError} onRetry={refreshStations} />}
        {loading && <div className="loading-card">正在从 MySQL API 加载中转站...</div>}
        {!loading && !apiError && view === "explore" && (
          <ExploreView
            activeTags={activeTags}
            allTags={allTags}
            categories={categories}
            category={category}
            favoriteIds={favoriteIds}
            filteredStations={filteredStations}
            query={query}
            recentStations={recentStations}
            stations={stations}
            probeInfo={probeInfo}
            statusRefreshing={statusRefreshing}
            checkingStationIds={checkingStationIds}
            setActiveTags={setActiveTags}
            setCategory={setCategory}
            setQuery={setQuery}
            toggleFavorite={toggleFavorite}
            toggleTag={toggleTag}
            openDetail={openDetail}
            directLaunch={directLaunch}
            refreshStationStatuses={refreshStationStatuses}
            refreshStationStatus={refreshStationStatus}
          />
        )}
        {!loading && !apiError && view === "detail" && selectedStation && (
          <DetailView
            station={selectedStation}
            isFavorite={favoriteIds.includes(selectedStation.id)}
            onBack={() => setView("explore")}
            onFavorite={() => toggleFavorite(selectedStation.id)}
            directLaunch={directLaunch}
            isCheckingLatency={checkingStationIds.includes(selectedStation.id)}
            onRefreshLatency={() => refreshStationStatus(selectedStation.id)}
            related={stations
              .filter((station) => station.id !== selectedStation.id && station.category === selectedStation.category)
              .slice(0, 3)}
            openDetail={openDetail}
          />
        )}
        {!loading && !apiError && view === "favorites" && (
          <FavoritesView
            user={user}
            favoriteStations={favorites}
            recentStations={recentStations}
            openDetail={openDetail}
            directLaunch={directLaunch}
            toggleFavorite={toggleFavorite}
            setView={setView}
            checkingStationIds={checkingStationIds}
            refreshStationStatus={refreshStationStatus}
          />
        )}
        {view === "login" && <LoginView login={login} setView={setView} />}
        {!loading && !apiError && view === "admin" && (
          <AdminView
            user={user}
            stations={stations}
            saveStation={saveStation}
            deleteStation={deleteStation}
            refreshStationStatuses={refreshStationStatuses}
            statusRefreshing={statusRefreshing}
            probeInfo={probeInfo}
            setView={setView}
          />
        )}
      </main>
      <MobileNav view={view} setView={setView} favoriteCount={favorites.length} isAdmin={user?.role === "admin"} />
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
          {user?.role === "admin" && (
            <NavButton active={view === "admin"} onClick={() => setView("admin")}>
              管理后台
            </NavButton>
          )}
        </nav>
        <div className="header-actions">
          {user ? (
            <>
              <button className="user-pill" onClick={() => setView(user.role === "admin" ? "admin" : "favorites")}>
                <UserCircle size={18} />
                <span>{user.name}</span>
                {user.role === "admin" && <small>ADMIN</small>}
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

function ApiNotice({ message, onRetry }) {
  return (
    <section className="api-notice">
      <h1>后端 API 尚未连接</h1>
      <p>{message}</p>
      <p>请先配置 MySQL，运行 `npm run db:seed`，再运行 `npm run dev`。</p>
      <button className="primary-button" onClick={onRetry}>
        重试连接
      </button>
    </section>
  );
}

function ExploreView({
  activeTags,
  allTags,
  categories,
  category,
  favoriteIds,
  filteredStations,
  query,
  recentStations,
  stations,
  probeInfo,
  statusRefreshing,
  setActiveTags,
  setCategory,
  setQuery,
  toggleFavorite,
  toggleTag,
  openDetail,
  directLaunch,
  refreshStationStatuses,
  checkingStationIds,
  refreshStationStatus
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
            数据现在来自 MySQL。普通用户可以浏览、收藏和直达；管理员登录后可以进入管理后台新增、编辑和删除中转站。
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
          <div className="metric-row">
            <span>实时检测</span>
            <strong>{statusRefreshing ? "检测中" : probeInfo?.lastRun ? "已启用" : "等待中"}</strong>
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
        <EmptyState title="没有找到匹配站点" action="清空筛选" onAction={() => setActiveTags([])} />
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
              isCheckingLatency={checkingStationIds.includes(featured.id)}
              onRefreshLatency={() => refreshStationStatus(featured.id)}
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
              isCheckingLatency={checkingStationIds.includes(station.id)}
              onRefreshLatency={() => refreshStationStatus(station.id)}
            />
          ))}
        </section>
      )}
    </>
  );
}

function StationCard({
  station,
  featured = false,
  isFavorite,
  onFavorite,
  onOpen,
  onLaunch,
  isCheckingLatency = false,
  onRefreshLatency
}) {
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
          {station.status === "online" ? "Online" : station.status === "degraded" ? "Degraded" : "Offline"}
        </span>
      </div>
      <div className="probe-meta">
        <span>{station.lastCheckedAt ? `最后检测 ${formatRelativeTime(station.lastCheckedAt)}` : "等待首次检测"}</span>
        {station.statusError && <span className="probe-error">{station.statusError}</span>}
      </div>
      <p className="station-tagline">{station.tagline}</p>
      <p className="station-description">{station.description}</p>
      <div className="tag-row">
        {station.tags.slice(0, featured ? 5 : 3).map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <div className="stat-grid">
        <Metric
          label="延迟"
          value={`${station.latency}ms`}
          action={<LatencyRefreshButton isChecking={isCheckingLatency} onClick={onRefreshLatency} />}
        />
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

function Metric({ label, value, action = null }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <div className="metric-value-row">
        <strong>{value}</strong>
        {action}
      </div>
    </div>
  );
}

function LatencyRefreshButton({ isChecking = false, onClick }) {
  if (!onClick) return null;
  return (
    <button
      type="button"
      className={`latency-refresh ${isChecking ? "loading" : ""}`}
      onClick={onClick}
      disabled={isChecking}
      aria-label="刷新延迟"
      title="刷新延迟"
    >
      <Zap size={14} />
    </button>
  );
}

function DetailView({
  station,
  isFavorite,
  onBack,
  onFavorite,
  directLaunch,
  related,
  openDetail,
  isCheckingLatency = false,
  onRefreshLatency
}) {
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
            <Metric
              label="平均延迟"
              value={`${station.latency}ms`}
              action={<LatencyRefreshButton isChecking={isCheckingLatency} onClick={onRefreshLatency} />}
            />
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

        <InfoPanel title="模型兼容" items={station.models} icon={<CheckCircle2 size={18} />} />
        <InfoPanel title="安全与治理" items={station.security} icon={<ShieldCheck size={18} />} />

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

function InfoPanel({ title, items, icon }) {
  return (
    <section className="panel-card">
      <h2>{title}</h2>
      <div className="list-stack">
        {items.map((item) => (
          <div className="list-item" key={item}>
            {icon}
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function FavoritesView({
  user,
  favoriteStations,
  recentStations,
  openDetail,
  directLaunch,
  toggleFavorite,
  setView,
  checkingStationIds,
  refreshStationStatus
}) {
  if (!user) {
    return (
      <section className="auth-required">
        <div className="auth-card">
          <UserCircle size={42} />
          <h1>登录后查看收藏列表</h1>
          <p>收藏夹现在保存在 MySQL 的 favorites 表中，换浏览器也能跟随账号同步。</p>
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
                isCheckingLatency={checkingStationIds.includes(station.id)}
                onRefreshLatency={() => refreshStationStatus(station.id)}
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
          <p>管理员账号会进入管理后台；普通账号进入收藏和浏览体验。</p>
        </div>
        <label>
          邮箱
          <input name="email" type="email" placeholder="admin@azurekiln.ai" defaultValue="admin@azurekiln.ai" />
        </label>
        <label>
          密码
          <div className="password-field">
            <input name="password" type={showPassword ? "text" : "password"} placeholder="admin123456" />
            <button type="button" onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? "隐藏" : "显示"}
            </button>
          </div>
        </label>
        <div className="form-row">
          <span>默认管理员：admin@azurekiln.ai / admin123456</span>
        </div>
        <button className="primary-button full" type="submit">
          登录
          <ArrowUpRight size={18} />
        </button>
      </form>
    </section>
  );
}

function AdminView({
  user,
  stations,
  saveStation,
  deleteStation,
  refreshStationStatuses,
  statusRefreshing,
  probeInfo,
  setView
}) {
  const [editing, setEditing] = useState(emptyStation);
  const [saving, setSaving] = useState(false);

  if (!user) {
    return (
      <section className="auth-required">
        <div className="auth-card">
          <LayoutDashboard size={42} />
          <h1>请先登录管理员账号</h1>
          <button className="primary-button" onClick={() => setView("login")}>
            登录
          </button>
        </div>
      </section>
    );
  }

  if (user.role !== "admin") {
    return (
      <section className="auth-required">
        <div className="auth-card">
          <ShieldCheck size={42} />
          <h1>只有管理员可以访问管理页</h1>
          <p>后端接口也会校验 JWT 中的 role，普通用户不能调用新增、编辑、删除接口。</p>
          <button className="secondary-button" onClick={() => setView("explore")}>
            返回探索
          </button>
        </div>
      </section>
    );
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await saveStation(editing);
      setEditing(emptyStation);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-layout">
      <div className="results-header">
        <div>
          <h1>管理后台</h1>
          <p>新增、编辑、删除中转站。所有改动写入 MySQL 的 stations 表。</p>
        </div>
        <div className="admin-header-actions">
          <button className="secondary-button" onClick={() => refreshStationStatuses(true)} disabled={statusRefreshing}>
            {statusRefreshing ? "检测中..." : "立即检测延迟"}
          </button>
          <button className="secondary-button" onClick={() => setEditing(emptyStation)}>
          <Plus size={18} />
          新增站点
          </button>
        </div>
      </div>

      <div className="probe-strip compact">
        <div>
          <strong>实时探测</strong>
          <span>
            {probeInfo?.lastRun
              ? `最近检测：${formatRelativeTime(probeInfo.lastRun)}`
              : "后端启动后会定时检测，也可以手动触发"}
          </span>
        </div>
      </div>

      <div className="admin-grid">
        <form className="admin-form panel-card" onSubmit={submit}>
          <h2>{stations.some((item) => item.id === editing.id) ? "编辑中转站" : "新增中转站"}</h2>
          <AdminInput label="ID" value={editing.id} onChange={(value) => setEditing({ ...editing, id: slugify(value) })} required />
          <AdminInput label="名称" value={editing.name} onChange={(value) => setEditing({ ...editing, name: value })} required />
          <AdminInput label="直达链接" value={editing.url} onChange={(value) => setEditing({ ...editing, url: value })} required />
          <AdminInput label="一句话描述" value={editing.tagline} onChange={(value) => setEditing({ ...editing, tagline: value })} />
          <AdminTextarea label="详情描述" value={editing.description} onChange={(value) => setEditing({ ...editing, description: value })} />
          <div className="admin-form-row">
            <AdminInput label="分类" value={editing.category} onChange={(value) => setEditing({ ...editing, category: value })} />
            <AdminInput label="区域" value={editing.region} onChange={(value) => setEditing({ ...editing, region: value })} />
          </div>
          <div className="admin-form-row">
            <AdminInput label="延迟 ms" type="number" value={editing.latency} onChange={(value) => setEditing({ ...editing, latency: Number(value) })} />
            <AdminInput label="评分" type="number" value={editing.score} onChange={(value) => setEditing({ ...editing, score: Number(value) })} />
          </div>
          <div className="admin-form-row">
            <AdminInput label="可用率" value={editing.uptime} onChange={(value) => setEditing({ ...editing, uptime: value })} />
            <label>
              状态
              <select value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value })}>
                <option value="online">online</option>
                <option value="degraded">degraded</option>
                <option value="offline">offline</option>
              </select>
            </label>
          </div>
          <AdminInput label="标签（逗号分隔）" value={editing.tags.join(", ")} onChange={(value) => setEditing({ ...editing, tags: splitList(value) })} />
          <AdminInput label="模型（逗号分隔）" value={editing.models.join(", ")} onChange={(value) => setEditing({ ...editing, models: splitList(value) })} />
          <AdminInput label="安全能力（逗号分隔）" value={editing.security.join(", ")} onChange={(value) => setEditing({ ...editing, security: splitList(value) })} />
          <AdminInput label="使用场景（逗号分隔）" value={editing.useCases.join(", ")} onChange={(value) => setEditing({ ...editing, useCases: splitList(value) })} />
          <div className="admin-form-row">
            <AdminInput label="价格" value={editing.pricing} onChange={(value) => setEditing({ ...editing, pricing: value })} />
            <AdminInput label="接口形态" value={editing.apiShape} onChange={(value) => setEditing({ ...editing, apiShape: value })} />
          </div>
          <div className="admin-form-row">
            <AdminInput label="图标" value={editing.icon} onChange={(value) => setEditing({ ...editing, icon: value })} />
            <AdminInput label="强调色" value={editing.accent} onChange={(value) => setEditing({ ...editing, accent: value })} />
          </div>
          <AdminInput label="按钮文案" value={editing.launchLabel} onChange={(value) => setEditing({ ...editing, launchLabel: value })} />
          <AdminInput label="文档链接" value={editing.docs} onChange={(value) => setEditing({ ...editing, docs: value })} />
          <label className="checkbox-label admin-checkbox">
            <input
              type="checkbox"
              checked={editing.featured}
              onChange={(event) => setEditing({ ...editing, featured: event.target.checked })}
            />
            设为推荐站点
          </label>
          <button className="primary-button full" type="submit" disabled={saving}>
            {saving ? "保存中..." : "保存到 MySQL"}
          </button>
        </form>

        <div className="admin-table panel-card">
          <h2>站点列表</h2>
          <div className="admin-list">
            {stations.map((station) => (
              <div className="admin-row" key={station.id}>
                <div>
                  <strong>{station.name}</strong>
                  <span>{station.category} · {station.url}</span>
                </div>
                <div className="admin-actions">
                  <button className="icon-button" onClick={() => setEditing(station)} aria-label="编辑">
                    <Edit3 size={18} />
                  </button>
                  <button className="icon-button danger" onClick={() => deleteStation(station.id)} aria-label="删除">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function AdminInput({ label, value, onChange, type = "text", required = false }) {
  return (
    <label>
      {label}
      <input type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function AdminTextarea({ label, value, onChange }) {
  return (
    <label>
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
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

function MobileNav({ view, setView, favoriteCount, isAdmin }) {
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
      <button className={view === (isAdmin ? "admin" : "login") ? "active" : ""} onClick={() => setView(isAdmin ? "admin" : "login")}>
        {isAdmin ? <LayoutDashboard size={20} /> : <UserCircle size={20} />}
        {isAdmin ? "管理" : "账户"}
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

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatRelativeTime(value) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "未知时间";
  const diffSeconds = Math.max(Math.floor((Date.now() - timestamp) / 1000), 0);
  if (diffSeconds < 60) return `${diffSeconds} 秒前`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} 天前`;
}

createRoot(document.getElementById("root")).render(<App />);
