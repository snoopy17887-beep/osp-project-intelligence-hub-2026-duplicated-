import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ElementType,
} from "react";

import {
  LayoutDashboard, FolderKanban, Users, Handshake,
  ChartNoAxesCombined, FileText, FileBarChart, Settings,
  Search, Bell, Plus, ArrowUpRight, TrendingUp, Clock3,
  CheckCircle2, MoreHorizontal, Menu, X, Globe2, Leaf,
  Target, Pencil, Trash2, Loader2, AlertCircle, Euro,
  Wallet, Building2, ChevronDown, FilePenLine,
  ClipboardCheck, Activity, UserPlus, ShieldCheck, LogOut,
  CalendarDays, Download, UserRoundPlus, Save,
} from "lucide-react";

import { supabase } from "./supabase";
import "./index.css";

// ==========================================
// TYPES
// ==========================================

type UserRole =
  | "admin"
  | "member"
  | "grant_admin"
  | "implementation_admin"
  | "me_admin";

type Project = {
  id: string;
  name: string;
  category: string | null;
  country: string | null;
  description: string | null;
  status: string;
  progress: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

type TeamProfile = {
  id: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
};

type ProjectAssignment = {
  project_id: string;
  user_id: string;
};

// ==========================================
// NAVIGATION
// ==========================================

const navigation = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Projects", icon: FolderKanban },
  { label: "Team Members", icon: Users },
  { label: "Partners", icon: Handshake },
  { label: "Events", icon: CalendarDays },
  { label: "Impact & Analytics", icon: ChartNoAxesCombined },
  { label: "Documents", icon: FileText },
  { label: "Reports", icon: FileBarChart },
  { label: "Settings", icon: Settings },
];

const specializedDashboards = [
  {
    label: "Grant Writing",
    role: "grant_admin",
    icon: FilePenLine,
    description:
      "Manage funding opportunities, proposals, applications and grant agreements.",
    modules: [
      "Grant Opportunities",
      "Proposals",
      "Funding & Agreements",
      "Applications Tracking",
    ],
  },
  {
    label: "Implementation",
    role: "implementation_admin",
    icon: ClipboardCheck,
    description:
      "Monitor project execution, activities, milestones and deliverables.",
    modules: [
      "Project Activities",
      "Project Milestones",
      "Deliverables",
      "Implementation Tracking",
    ],
  },
  {
    label: "M&E",
    role: "me_admin",
    icon: Activity,
    description:
      "Monitor performance, evaluate results and measure organizational impact.",
    modules: [
      "Indicators",
      "Measurements",
      "Assessments",
      "Monitoring Reports",
    ],
  },
];

// ==========================================
// OSP PARTNERS
// ==========================================

const ospPartners = [
  {
    name: "Erasmus+",
    category: "European Education Programme",
    logo: "https://hu.edu.eg/wp-content/uploads/2026/02/Erasmus.png",
  },
  {
    name: "GIZ",
    category: "German Development Cooperation",
    logo: "https://hu.edu.eg/wp-content/uploads/2026/02/GIZ2.jpg",
  },
  {
    name: "AICS",
    category: "Italian Development Cooperation",
    logo: "https://hu.edu.eg/wp-content/uploads/2026/02/aics-logo.png",
  },
  {
    name: "BMZ",
    category: "German Federal Ministry",
    logo: "https://hu.edu.eg/wp-content/uploads/2026/02/BMZ.jpg",
  },
  {
    name: "ENI CBC MED",
    category: "Mediterranean Cooperation Programme",
    logo: "https://hu.edu.eg/wp-content/uploads/2026/02/eni-cbc-med.png",
  },
  {
    name: "EU PRIMA",
    category: "Mediterranean Research Programme",
    logo: "https://hu.edu.eg/wp-content/uploads/2026/02/EU-Prima2.png",
  },
  {
    name: "Horizon 2020",
    category: "EU Research & Innovation",
    logo: "https://hu.edu.eg/wp-content/uploads/2026/02/Horizon-2020-2.jpg",
  },
  {
    name: "ASRT",
    category: "Egyptian Research & Technology",
    logo: "https://hu.edu.eg/wp-content/uploads/2026/02/Logo-ASRT.png",
  },
  {
    name: "Horizon Europe",
    category: "EU Research & Innovation",
    logo: "https://hu.edu.eg/wp-content/uploads/2026/02/xxxPG.jpg",
  },
];

// ==========================================
// GENERAL DATA
// ==========================================

const activities = [
  {
    title: "Project management workspace",
    detail: "Office of Sponsored Programs - HU-OSP",
    time: "Workspace",
    icon: CheckCircle2,
    color: "#648b70",
  },
];

const emptyForm = {
  name: "",
  category: "",
  country: "",
  description: "",
  status: "Planning",
  progress: 0,
  start_date: "",
  end_date: "",
};

const emptyUserForm = {
  name: "",
  email: "",
  password: "",
  role: "member" as UserRole,
};

// ==========================================
// ROLE HELPERS
// ==========================================

function getRoleLabel(role: string) {
  switch (role) {
    case "admin":
      return "Main Administrator";
    case "grant_admin":
      return "Grant Writing Manager";
    case "implementation_admin":
      return "Implementation Manager";
    case "me_admin":
      return "M&E Manager";
    default:
      return "Member";
  }
}

function getDashboardForRole(role: string) {
  switch (role) {
    case "grant_admin":
      return "Grant Writing";
    case "implementation_admin":
      return "Implementation";
    case "me_admin":
      return "M&E";
    default:
      return "Overview";
  }
}

// ==========================================
// MAIN APP
// ==========================================

function App() {
  useEffect(() => {
    document.title = "Office of Sponsored Programs - HU-OSP";
  }, []);

  const [activePage, setActivePage] = useState("Overview");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [dashboardsOpen, setDashboardsOpen] = useState(true);

  const [search, setSearch] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [role, setRole] = useState<UserRole>("member");
  const [userName, setUserName] = useState("OSP User");
  const [currentUserId, setCurrentUserId] = useState("");

  const [teamProfiles, setTeamProfiles] = useState<TeamProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [projectAssignments, setProjectAssignments] =
    useState<ProjectAssignment[]>([]);
  const [selectedAssignmentProjectId, setSelectedAssignmentProjectId] = useState("");
  const [assignmentSavingKey, setAssignmentSavingKey] = useState<string | null>(null);
  const [roleSavingId, setRoleSavingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [savingProfileName, setSavingProfileName] = useState(false);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] =
    useState<Project | null>(null);

  const [form, setForm] = useState(emptyForm);

  const isAdmin = role === "admin";

  const managerDashboard =
    role === "grant_admin"
      ? "Grant Writing"
      : role === "implementation_admin"
        ? "Implementation"
        : role === "me_admin"
          ? "M&E"
          : null;

  const allowedPages =
    role === "admin"
      ? [
          ...navigation.map((item) => item.label),
          ...specializedDashboards.map((item) => item.label),
        ]
      : managerDashboard
        ? [managerDashboard, "Projects", "Events"]
        : navigation.map((item) => item.label);

  const roleLabel = getRoleLabel(role);

  // ==========================================
  // LOAD WORKSPACE
  // ==========================================

  async function loadWorkspace() {
    setLoading(true);
    setError("");

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError) throw userError;

      if (!userData.user) {
        throw new Error("Please sign in again.");
      }

      setCurrentUserId(userData.user.id);

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", userData.user.id)
          .single();

      if (profileError) throw profileError;

      const userRole = (profile.role || "member") as UserRole;

      setRole(userRole);
      setUserName(
        profile.full_name ||
          userData.user.email ||
          "OSP User"
      );

      setActivePage(getDashboardForRole(userRole));

      // RLS returns every project to admins and assigned projects to other roles.
      const { data: visibleProjects, error: projectsError } =
        await supabase
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false });

      if (projectsError) throw projectsError;
      setProjects((visibleProjects || []) as Project[]);

      if (userRole === "admin") {
        setProfilesLoading(true);

        try {
          const [profilesResult, assignmentsResult] = await Promise.all([
            supabase
              .from("profiles")
              .select("id, full_name, role, created_at")
              .order("created_at", { ascending: false }),
            supabase
              .from("project_assignments")
              .select("project_id, user_id"),
          ]);

          if (profilesResult.error) throw profilesResult.error;
          if (assignmentsResult.error) throw assignmentsResult.error;

          setTeamProfiles((profilesResult.data || []) as TeamProfile[]);
          setProjectAssignments((assignmentsResult.data || []) as ProjectAssignment[]);
        } finally {
          setProfilesLoading(false);
        }
      } else {
        setTeamProfiles([]);
        setProjectAssignments([]);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load workspace."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWorkspace();
  }, []);

  // ==========================================
  // PROFILE NAME & LOGOUT
  // ==========================================

  async function updateProfileName(newName: string): Promise<boolean> {
    const cleanName = newName.trim();

    if (!currentUserId || !cleanName) {
      setError("Please enter a valid name.");
      return false;
    }

    setSavingProfileName(true);
    setError("");

    try {
      const { error } = await supabase.rpc("update_my_profile_name", {
        new_name: cleanName,
      });

      if (error) throw error;

      setUserName(cleanName);
      setTeamProfiles((current) =>
        current.map((profile) =>
          profile.id === currentUserId
            ? { ...profile, full_name: cleanName }
            : profile
        )
      );

      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update your name."
      );
      return false;
    } finally {
      setSavingProfileName(false);
    }
  }

  async function handleLogout() {
    setError("");
    const { error } = await supabase.auth.signOut();
    if (error) setError(error.message);
  }

  // ==========================================
  // CREATE USER ACCOUNT
  // ==========================================

  async function createTeamUser(userData: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }): Promise<boolean> {
    if (!isAdmin) {
      setError("Only the Main Administrator can create accounts.");
      return false;
    }

    setCreatingUser(true);
    setError("");

    try {
      const { data, error: functionError } =
        await supabase.functions.invoke("create-user", {
          body: {
            name: userData.name.trim(),
            email: userData.email.trim().toLowerCase(),
            password: userData.password,
            role: userData.role,
          },
        });

      if (functionError) {
        let message = functionError.message;

        try {
          const response = await functionError.context?.json();
          if (response?.error) message = response.error;
        } catch {
          // Keep original error.
        }

        throw new Error(message);
      }

      if (data?.error) throw new Error(data.error);

      if (!data?.success) {
        throw new Error("The account could not be created.");
      }

      await loadWorkspace();
      return true;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create the account."
      );

      return false;
    } finally {
      setCreatingUser(false);
    }
  }

  // ==========================================
  // PROJECT FILTERS & STATISTICS
  // ==========================================

  const filteredProjects = useMemo(() => {
    const term = search.toLowerCase();

    return projects.filter((project) =>
      `${project.name} ${project.category || ""} ${
        project.country || ""
      }`
        .toLowerCase()
        .includes(term)
    );
  }, [projects, search]);

  const activeProjects = projects.filter(
    (project) => project.status === "In Progress"
  ).length;

  const averageProgress = projects.length
    ? Math.round(
        projects.reduce(
          (sum, project) => sum + project.progress,
          0
        ) / projects.length
      )
    : 0;

  // ==========================================
  // PROJECT ASSIGNMENTS (ADMIN ONLY)
  // ==========================================

  async function updateProjectAssignment(
    projectId: string,
    userId: string,
    assigned: boolean
  ) {
    if (!isAdmin) {
      setError("Only the Main Administrator can assign projects.");
      return;
    }

    const key = `${projectId}:${userId}`;
    setAssignmentSavingKey(key);
    setError("");

    try {
      if (assigned) {
        const { error } = await supabase
          .from("project_assignments")
          .insert({
            project_id: projectId,
            user_id: userId,
            assigned_by: currentUserId,
          });
        if (error) throw error;

        setProjectAssignments((current) =>
          current.some((item) => item.project_id === projectId && item.user_id === userId)
            ? current
            : [...current, { project_id: projectId, user_id: userId }]
        );
      } else {
        const { error } = await supabase
          .from("project_assignments")
          .delete()
          .eq("project_id", projectId)
          .eq("user_id", userId);
        if (error) throw error;

        setProjectAssignments((current) =>
          current.filter((item) => !(item.project_id === projectId && item.user_id === userId))
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update project assignment.");
    } finally {
      setAssignmentSavingKey(null);
    }
  }

  // ==========================================
  // ROLE MANAGEMENT
  // ==========================================

  async function updateMemberRole(
    memberId: string,
    newRole: UserRole
  ) {
    if (!isAdmin) {
      setError("Only the Main Administrator can manage roles.");
      return;
    }

    if (memberId === currentUserId) {
      setError("You cannot change your own administrator role.");
      return;
    }

    const member = teamProfiles.find(
      (item) => item.id === memberId
    );

    if (!member || member.role === newRole) return;

    setRoleSavingId(memberId);
    setError("");

    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", memberId)
        .select("id, full_name, role, created_at")
        .single();

      if (error) throw error;

      setTeamProfiles((current) =>
        current.map((item) =>
          item.id === memberId
            ? (data as TeamProfile)
            : item
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update member role."
      );
    } finally {
      setRoleSavingId(null);
    }
  }

  // ==========================================
  // NAVIGATION
  // ==========================================

  function navigateTo(page: string) {
    if (!allowedPages.includes(page)) {
      setError("You do not have permission to access this section.");
      return;
    }

    setActivePage(page);
    setMobileMenu(false);
    setError("");

    if (
      specializedDashboards.some(
        (item) => item.label === page
      )
    ) {
      setDashboardsOpen(true);
    }
  }

  // ==========================================
  // PROJECT MANAGEMENT
  // ==========================================

  function openNewProject() {
    if (!isAdmin) {
      setError("Only the Main Administrator can create projects.");
      return;
    }

    setEditingProject(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  }

  function openEditProject(project: Project) {
    if (!isAdmin) return;

    setEditingProject(project);

    setForm({
      name: project.name,
      category: project.category || "",
      country: project.country || "",
      description: project.description || "",
      status: project.status,
      progress: project.progress,
      start_date: project.start_date || "",
      end_date: project.end_date || "",
    });

    setError("");
    setShowModal(true);
  }

  async function saveProject(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!isAdmin) {
      setError("You do not have permission to manage projects.");
      return;
    }

    if (!form.name.trim()) return;

    setSaving(true);
    setError("");

    const projectData = {
      name: form.name.trim(),
      category: form.category.trim() || null,
      country: form.country.trim() || null,
      description: form.description.trim() || null,
      status: form.status,
      progress: Number(form.progress),
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };

    try {
      if (editingProject) {
        const { data, error } = await supabase
          .from("projects")
          .update(projectData)
          .eq("id", editingProject.id)
          .select()
          .single();

        if (error) throw error;

        setProjects((current) =>
          current.map((project) =>
            project.id === editingProject.id
              ? (data as Project)
              : project
          )
        );
      } else {
        const { data, error } = await supabase
          .from("projects")
          .insert(projectData)
          .select()
          .single();

        if (error) throw error;

        setProjects((current) => [
          data as Project,
          ...current,
        ]);
      }

      setShowModal(false);
      setEditingProject(null);
      setForm(emptyForm);
      setActivePage("Projects");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save project."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteProject(project: Project) {
    if (!isAdmin) {
      setError("You do not have permission to delete projects.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.name}"?`
    );

    if (!confirmed) return;

    setError("");

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", project.id);

    if (error) {
      setError(error.message);
      return;
    }

    setProjects((current) =>
      current.filter((item) => item.id !== project.id)
    );
  }

  // ==========================================
  // LOADING SCREEN
  // ==========================================

  if (loading) {
    return (
      <div className="app-loading">
        <Loader2 className="spin" size={32} />
        <p>Loading OSP Workspace...</p>
      </div>
    );
  }

  // ==========================================
  // MAIN LAYOUT
  // ==========================================

  return (
    <div className="app-shell">
      {mobileMenu && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <aside
        className={`sidebar ${
          mobileMenu ? "sidebar-open" : ""
        }`}
      >
        <div className="brand">
          <div className="brand-mark">
            <span>O</span>
          </div>

          <div>
            <h2>
              OSP<span>.</span>
            </h2>
            <p>PROJECT INTELLIGENCE HUB</p>
          </div>

          <button
            className="mobile-close"
            onClick={() => setMobileMenu(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="navigation">
          {navigation
            .filter((item) => allowedPages.includes(item.label))
            .map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  className={`nav-item ${
                    activePage === item.label ? "nav-active" : ""
                  }`}
                  onClick={() => navigateTo(item.label)}
                >
                  <Icon size={19} strokeWidth={1.8} />
                  <span>{item.label}</span>

                  {item.label === "Projects" && isAdmin && (
                    <span className="nav-count">
                      {projects.length}
                    </span>
                  )}
                </button>
              );
            })}
        </nav>

        {(isAdmin || managerDashboard !== null) && (
          <div
            style={{
              marginTop: "12px",
              paddingTop: "10px",
              borderTop: "1px solid #e8ece8",
            }}
          >
            <button
              className={`nav-item ${
                specializedDashboards.some(
                  (item) => item.label === activePage
                )
                  ? "nav-active"
                  : ""
              }`}
              style={{
                width: "100%",
                justifyContent: "space-between",
              }}
              onClick={() =>
                setDashboardsOpen((previous) => !previous)
              }
              aria-expanded={dashboardsOpen}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <LayoutDashboard size={19} strokeWidth={1.8} />
                <span>Specialized Dashboards</span>
              </span>

              <ChevronDown
                size={16}
                style={{
                  transform: dashboardsOpen
                    ? "rotate(180deg)"
                    : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                  flexShrink: 0,
                }}
              />
            </button>

            {dashboardsOpen && (
              <div
                style={{
                  marginLeft: "18px",
                  paddingLeft: "10px",
                  borderLeft: "1px solid #dfe7df",
                  display: "grid",
                  gap: "4px",
                  marginTop: "5px",
                }}
              >
                {specializedDashboards
                  .filter(
                    (item) =>
                      isAdmin || item.label === managerDashboard
                  )
                  .map((item) => {
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.label}
                        className={`nav-item ${
                          activePage === item.label ? "nav-active" : ""
                        }`}
                        style={{
                          width: "100%",
                          fontSize: "13px",
                        }}
                        onClick={() => navigateTo(item.label)}
                      >
                        <Icon size={17} strokeWidth={1.8} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        <div className="sidebar-bottom">
          <div className="sidebar-card">
            <div className="sidebar-card-icon">
              <Leaf size={20} />
            </div>

            <h4>Office of Sponsored Programs</h4>
            <p>HU-OSP · Project Intelligence Hub</p>
          </div>

          <div className="user-profile">
            <div className="avatar">
              {userName.slice(0, 2).toUpperCase()}
            </div>

            <div className="user-info">
              <strong>{userName}</strong>
              <span>{roleLabel}</span>
            </div>

            <button
              type="button"
              className="row-more"
              title="Sign out"
              aria-label="Sign out"
              onClick={handleLogout}
              style={{
                border: "none",
                background: "transparent",
                color: "#648b70",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <LogOut size={19} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="menu-toggle"
              onClick={() => setMobileMenu(true)}
            >
              <Menu size={22} />
            </button>

            <div className="breadcrumb">
              <span>Workspace</span>
              <span className="breadcrumb-divider">/</span>
              <strong>{activePage}</strong>
            </div>
          </div>

          <div className="topbar-right">
            <div className="search-box">
              <Search size={17} />

              <input
                placeholder="Search anything..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <span className="search-shortcut">⌘ K</span>
            </div>

            <button className="icon-button notification-button">
              <Bell size={19} />
              <span />
            </button>

            <div className="top-avatar">
              {userName.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="page-container">
          <section className="welcome-section">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                OFFICE OF SUPPORTED PROGRAMS
              </div>

              <h1>
                {activePage === "Overview"
                  ? "Project Overview"
                  : activePage}
                <span>.</span>
              </h1>

              <p>
                Monitor progress, manage initiatives,
                and track your organization's impact.
              </p>
            </div>

            {activePage === "Projects" && isAdmin && (
              <button
                className="primary-button"
                onClick={openNewProject}
              >
                <Plus size={18} />
                New Project
              </button>
            )}
          </section>

          {error && (
            <div className="workspace-error">
              <AlertCircle size={18} />
              <span>{error}</span>

              <button onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}

          {/* OVERVIEW */}

          {activePage === "Overview" && (
            <>
              <section className="stats-grid">
                <StatCard
                  label="Total Projects"
                  value={String(projects.length).padStart(2, "0")}
                  change="Live data"
                  detail="Saved in Supabase"
                  icon={FolderKanban}
                  color="green"
                />

                <StatCard
                  label="Active Projects"
                  value={String(activeProjects).padStart(2, "0")}
                  change="Live data"
                  detail="Currently in progress"
                  icon={TrendingUp}
                  color="blue"
                />

                <StatCard
                  label="Team Members"
                  value={String(teamProfiles.length).padStart(2, "0")}
                  change="Live data"
                  detail="Registered profiles"
                  icon={Users}
                  color="gold"
                />

                <StatCard
                  label="Total Partners"
                  value={String(ospPartners.length).padStart(2, "0")}
                  change="Official list"
                  detail="Listed OSP partners"
                  icon={Handshake}
                  color="purple"
                />
              </section>

              <PortfolioOverview />

              <section className="content-grid">
                <div className="panel projects-panel">
                  <div className="panel-header">
                    <div>
                      <span className="section-kicker">PORTFOLIO</span>
                      <h3>Recent Projects</h3>
                    </div>

                    <button
                      className="text-button"
                      onClick={() => navigateTo("Projects")}
                    >
                      View all
                      <ArrowUpRight size={16} />
                    </button>
                  </div>

                  <div className="project-list">
                    {projects.slice(0, 4).map((project) => (
                      <ProjectRow
                        key={project.id}
                        project={project}
                        isAdmin={isAdmin}
                        onEdit={() => openEditProject(project)}
                        onDelete={() => deleteProject(project)}
                      />
                    ))}

                    {projects.length === 0 && (
                      <div className="empty-state">
                        No projects yet. Add your first project.
                      </div>
                    )}
                  </div>
                </div>

                <div className="panel impact-panel">
                  <div className="panel-header">
                    <div>
                      <span className="section-kicker">ORGANIZATION</span>
                      <h3>Impact Snapshot</h3>
                    </div>

                    <Globe2 size={20} className="muted-icon" />
                  </div>

                  <div className="impact-highlight">
                    <div className="impact-icon">
                      <Target size={23} />
                    </div>

                    <div>
                      <span>Overall project progress</span>
                      <h2>{averageProgress}%</h2>
                    </div>
                  </div>

                  <div className="impact-progress">
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${averageProgress}%` }}
                      />
                    </div>

                    <div className="progress-labels">
                      <span>Portfolio completion</span>
                      <strong>{averageProgress}%</strong>
                    </div>
                  </div>

                  <div className="impact-divider" />

                  <div className="impact-mini-stats">
                    <div>
                      <span>Projects</span>
                      <strong>
                        {String(projects.length).padStart(2, "0")}
                      </strong>
                    </div>

                    <div>
                      <span>Active</span>
                      <strong>
                        {String(activeProjects).padStart(2, "0")}
                      </strong>
                    </div>
                  </div>
                </div>
              </section>

              <section className="panel activity-panel">
                <div className="panel-header">
                  <div>
                    <span className="section-kicker">LATEST UPDATES</span>
                    <h3>Workspace Activity</h3>
                  </div>

                  <MoreHorizontal size={20} />
                </div>

                <div className="activity-list">
                  {activities.map((activity, index) => {
                    const Icon = activity.icon;

                    return (
                      <div className="activity-item" key={index}>
                        <div
                          className="activity-icon"
                          style={{ color: activity.color }}
                        >
                          <Icon size={19} />
                        </div>

                        <div className="activity-text">
                          <strong>{activity.title}</strong>
                          <span>{activity.detail}</span>
                        </div>

                        <div className="activity-time">
                          <Clock3 size={13} />
                          {activity.time}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          {/* PROJECTS */}

          {activePage === "Projects" && (
            <section className="panel all-projects-panel">
              <div className="panel-header">
                <div>
                  <span className="section-kicker">PROJECT PORTFOLIO</span>
                  <h3>All Projects ({filteredProjects.length})</h3>
                </div>

                {isAdmin && (
                  <button
                    className="primary-button"
                    onClick={openNewProject}
                  >
                    <Plus size={17} />
                    Add Project
                  </button>
                )}
              </div>

              {isAdmin && (
                <div
                  style={{
                    margin: "18px 0 22px",
                    padding: "20px",
                    border: "1px solid #e8ece8",
                    borderRadius: "13px",
                    background: "#f9fbf9",
                  }}
                >
                  <div style={{ marginBottom: "14px" }}>
                    <span className="section-kicker">ACCESS CONTROL</span>
                    <h3 style={{ margin: "5px 0", color: "#34483b" }}>
                      Assign Projects to Team Members
                    </h3>
                    <p style={{ color: "#89938d", fontSize: "12px", margin: 0 }}>
                      Select a project, then choose which accounts can access it. Changes are saved immediately.
                    </p>
                  </div>

                  <label style={{ display: "block", color: "#526258", fontSize: "12px", fontWeight: 600, marginBottom: "7px" }}>
                    Select Project
                  </label>
                  <select
                    value={projects.some((item) => item.id === selectedAssignmentProjectId) ? selectedAssignmentProjectId : (projects[0]?.id || "")}
                    onChange={(e) => setSelectedAssignmentProjectId(e.target.value)}
                    disabled={projects.length === 0}
                    style={{ width: "100%", maxWidth: "520px", padding: "11px 13px", border: "1px solid #dfe7df", borderRadius: "9px", background: "#fff", color: "#34483b", marginBottom: "15px" }}
                  >
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>

                  {profilesLoading ? (
                    <div className="empty-state">Loading team members...</div>
                  ) : teamProfiles.filter((member) => member.role !== "admin").length === 0 ? (
                    <div className="empty-state">No non-admin accounts are available to assign.</div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "9px" }}>
                      {teamProfiles.filter((member) => member.role !== "admin").map((member) => {
                        const projectId = projects.some((item) => item.id === selectedAssignmentProjectId) ? selectedAssignmentProjectId : (projects[0]?.id || "");
                        const checked = projectAssignments.some((item) => item.project_id === projectId && item.user_id === member.id);
                        const key = `${projectId}:${member.id}`;
                        return (
                          <label key={member.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px", border: "1px solid #e8ece8", borderRadius: "9px", background: "#fff", color: "#526258", fontSize: "12px", cursor: assignmentSavingKey === key ? "wait" : "pointer" }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!projectId || assignmentSavingKey === key}
                              onChange={(e) => updateProjectAssignment(projectId, member.id, e.target.checked)}
                            />
                            <span style={{ flex: 1 }}>{member.full_name || "Unnamed Member"}</span>
                            {assignmentSavingKey === key && <Loader2 className="spin" size={15} />}
                          </label>
                        );
                      })}
                    </div>
                  )}
                  {projects.length === 0 && (
                    <p style={{ color: "#89938d", fontSize: "12px", marginBottom: 0 }}>Create a project before assigning access.</p>
                  )}
                </div>
              )}

              <div className="project-list">
                {filteredProjects.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    isAdmin={isAdmin}
                    onEdit={() => openEditProject(project)}
                    onDelete={() => deleteProject(project)}
                  />
                ))}

                {filteredProjects.length === 0 && (
                  <div className="empty-state">
                    {search
                      ? "No matching projects found."
                      : "No projects have been added yet."}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* TEAM MEMBERS */}

          {activePage === "Team Members" && (
            <TeamMembersPage
              isAdmin={isAdmin}
              teamProfiles={teamProfiles}
              profilesLoading={profilesLoading}
              roleSavingId={roleSavingId}
              currentUserId={currentUserId}
              search={search}
              onUpdateRole={updateMemberRole}
              onGoToSettings={() => navigateTo("Settings")}
            />
          )}

          {/* PARTNERS */}

          {activePage === "Partners" && <PartnersPage />}

          {activePage === "Events" && (
            <EventsPage isAdmin={isAdmin} projects={projects} />
          )}

          {/* SPECIALIZED DASHBOARDS */}

          {specializedDashboards.some(
            (item) => item.label === activePage
          ) && (
            <SpecializedDashboardPage
              dashboard={
                specializedDashboards.find(
                  (item) => item.label === activePage
                )!
              }
              isAdmin={isAdmin}
              currentRole={role}
            />
          )}

          {/* SETTINGS */}

          {activePage === "Settings" && (
            <SettingsPage
              isAdmin={isAdmin}
              userName={userName}
              userRole={role}
              roleLabel={roleLabel}
              currentUserId={currentUserId}
              teamProfiles={teamProfiles}
              profilesLoading={profilesLoading}
              roleSavingId={roleSavingId}
              creatingUser={creatingUser}
              onUpdateRole={updateMemberRole}
              onCreateUser={createTeamUser}
              onUpdateProfileName={updateProfileName}
              savingProfileName={savingProfileName}
            />
          )}

          {/* OTHER SECTIONS */}

          {activePage !== "Overview" &&
            activePage !== "Projects" &&
            activePage !== "Team Members" &&
            activePage !== "Partners" &&
            activePage !== "Events" &&
            activePage !== "Settings" &&
            !specializedDashboards.some(
              (item) => item.label === activePage
            ) && (
              <section className="panel coming-soon">
                <div className="coming-icon">
                  <Settings size={30} />
                </div>

                <h2>{activePage}</h2>

                <p>
                  This workspace section is ready for
                  the next development stage.
                </p>

                <span>Office of Sponsored Programs - HU-OSP</span>
              </section>
            )}

          <footer className="page-footer">
            <span>© 2026 Office of Supported Programs</span>
            <span>
              One Platform. Every Project. Every Achievement.
            </span>
          </footer>
        </div>
      </main>

      {/* PROJECT MODAL */}

      {showModal && isAdmin && (
        <div
          className="modal-backdrop"
          onClick={() => setShowModal(false)}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="section-kicker">
                  PROJECT MANAGEMENT
                </span>

                <h2>
                  {editingProject
                    ? "Edit Project"
                    : "Create New Project"}
                </h2>
              </div>

              <button
                className="icon-button"
                onClick={() => setShowModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveProject}>
              <label>Project Name</label>

              <input
                required
                placeholder="Enter project name"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
              />

              <label>Project Category</label>

              <input
                placeholder="e.g. Sustainable Agriculture"
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
              />

              <label>Country</label>

              <input
                placeholder="Enter country"
                value={form.country}
                onChange={(e) =>
                  setForm({ ...form, country: e.target.value })
                }
              />

              <label>Description</label>

              <textarea
                placeholder="Describe the project"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />

              <label>Status</label>

              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value })
                }
              >
                <option>Planning</option>
                <option>In Progress</option>
                <option>Completed</option>
                <option>On Hold</option>
              </select>

              <label>Progress: {form.progress}%</label>

              <input
                type="range"
                min="0"
                max="100"
                value={form.progress}
                onChange={(e) =>
                  setForm({
                    ...form,
                    progress: Number(e.target.value),
                  })
                }
              />

              <label>Start Date</label>

              <input
                type="date"
                value={form.start_date}
                onChange={(e) =>
                  setForm({ ...form, start_date: e.target.value })
                }
              />

              <label>End Date</label>

              <input
                type="date"
                value={form.end_date}
                onChange={(e) =>
                  setForm({ ...form, end_date: e.target.value })
                }
              />

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingProject
                      ? "Save Changes"
                      : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// EVENTS MANAGEMENT
// ==========================================

type EventRecord = {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  status: "Planned" | "Upcoming" | "Completed" | "Cancelled";
  start_date: string;
  end_date: string | null;
  venue: string | null;
  city: string | null;
  country: string | null;
  organizer: string | null;
  project_id: string | null;
  budget: number | null;
  currency: string | null;
  participant_tracking_mode: "individual" | "total_only";
  participant_count: number;
  notes: string | null;
};

type EventParticipant = {
  id: string;
  event_id: string;
  full_name: string;
  email: string | null;
  organization: string | null;
  job_title: string | null;
  participant_type: string | null;
  attendance_status: "Registered" | "Attended" | "Absent" | "Cancelled";
};

const blankEventForm = {
  title: "", description: "", event_type: "Workshop", status: "Planned" as EventRecord["status"],
  start_date: "", end_date: "", venue: "", city: "", country: "Egypt",
  organizer: "HU-OSP", project_id: "", budget: "0", currency: "EGP",
  participant_tracking_mode: "individual" as EventRecord["participant_tracking_mode"],
  participant_count: "0", notes: "",
};

function EventsPage({ isAdmin, projects }: { isAdmin: boolean; projects: Project[] }) {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [eventLoading, setEventLoading] = useState(true);
  const [eventError, setEventError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<EventRecord | null>(null);
  const [eventForm, setEventForm] = useState(blankEventForm);
  const [savingEvent, setSavingEvent] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantForm, setParticipantForm] = useState({ full_name: "", email: "", organization: "", job_title: "", participant_type: "", attendance_status: "Registered" as EventParticipant["attendance_status"] });
  const [savingParticipant, setSavingParticipant] = useState(false);

  async function loadEvents() {
    setEventLoading(true);
    setEventError("");
    const { data, error } = await supabase.from("events").select("*").order("start_date", { ascending: false });
    if (error) setEventError(`Unable to load events: ${error.message}`);
    else setEvents((data || []) as EventRecord[]);
    setEventLoading(false);
  }

  useEffect(() => { void loadEvents(); }, []);

  const today = new Date();
  const completedCount = events.filter((e) => e.status === "Completed").length;
  const upcomingCount = events.filter((e) => e.status === "Upcoming" || (e.status === "Planned" && new Date(e.start_date) >= today)).length;
  const participantTotal = events.reduce((sum, e) => sum + (Number(e.participant_count) || 0), 0);
  const filteredEvents = events.filter((e) => {
    const text = `${e.title} ${e.event_type} ${e.organizer || ""} ${e.venue || ""}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (statusFilter === "All" || e.status === statusFilter);
  });
  const typeCounts = events.reduce<Record<string, number>>((acc, e) => { acc[e.event_type || "Other"] = (acc[e.event_type || "Other"] || 0) + 1; return acc; }, {});
  const maxTypeCount = Math.max(1, ...Object.values(typeCounts));

  function openCreate() {
    if (!isAdmin) return;
    setEditing(null);
    setEventForm({ ...blankEventForm, project_id: projects[0]?.id || "" });
    setShowEditor(true);
    setEventError("");
  }

  function openEdit(event: EventRecord) {
    if (!isAdmin) return;
    const localDate = (value: string | null) => value ? new Date(value).toISOString().slice(0, 16) : "";
    setEditing(event);
    setEventForm({
      title: event.title, description: event.description || "", event_type: event.event_type || "Other", status: event.status,
      start_date: localDate(event.start_date), end_date: localDate(event.end_date), venue: event.venue || "", city: event.city || "", country: event.country || "",
      organizer: event.organizer || "", project_id: event.project_id || "", budget: String(event.budget ?? 0), currency: event.currency || "EGP",
      participant_tracking_mode: event.participant_tracking_mode || "individual", participant_count: String(event.participant_count || 0), notes: event.notes || "",
    });
    setShowEditor(true);
    setEventError("");
  }

  async function saveEvent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isAdmin) return;
    if (!eventForm.title.trim() || !eventForm.start_date) { setEventError("Event title and start date are required."); return; }
    setSavingEvent(true); setEventError("");
    const payload = {
      title: eventForm.title.trim(), description: eventForm.description.trim() || null, event_type: eventForm.event_type,
      status: eventForm.status, start_date: new Date(eventForm.start_date).toISOString(), end_date: eventForm.end_date ? new Date(eventForm.end_date).toISOString() : null,
      venue: eventForm.venue.trim() || null, city: eventForm.city.trim() || null, country: eventForm.country.trim() || null,
      organizer: eventForm.organizer.trim() || null, project_id: eventForm.project_id || null,
      budget: Math.max(0, Number(eventForm.budget) || 0), currency: eventForm.currency.trim() || "EGP",
      participant_tracking_mode: eventForm.participant_tracking_mode,
      participant_count: eventForm.participant_tracking_mode === "total_only" ? Math.max(0, Number(eventForm.participant_count) || 0) : (editing?.participant_count || 0),
      notes: eventForm.notes.trim() || null,
    };
    const result = editing
      ? await supabase.from("events").update(payload).eq("id", editing.id).select().single()
      : await supabase.from("events").insert({ ...payload }).select().single();
    if (result.error) setEventError(result.error.message);
    else { setShowEditor(false); await loadEvents(); }
    setSavingEvent(false);
  }

  async function deleteEvent(event: EventRecord) {
    if (!isAdmin || !window.confirm(`Delete “${event.title}” and its linked participants/attachments?`)) return;
    const { error } = await supabase.from("events").delete().eq("id", event.id);
    if (error) setEventError(error.message); else { if (selectedEvent?.id === event.id) setSelectedEvent(null); await loadEvents(); }
  }

  async function openParticipants(event: EventRecord) {
    setSelectedEvent(event); setParticipants([]);
    if (!isAdmin || event.participant_tracking_mode !== "individual") return;
    setParticipantsLoading(true);
    const { data, error } = await supabase.from("event_participants").select("*").eq("event_id", event.id).order("created_at", { ascending: false });
    if (error) setEventError(error.message); else setParticipants((data || []) as EventParticipant[]);
    setParticipantsLoading(false);
  }

  async function addParticipant(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isAdmin || !selectedEvent || !participantForm.full_name.trim()) return;
    setSavingParticipant(true); setEventError("");
    const { error } = await supabase.from("event_participants").insert({ event_id: selectedEvent.id, ...participantForm, email: participantForm.email.trim() || null, organization: participantForm.organization.trim() || null, job_title: participantForm.job_title.trim() || null, participant_type: participantForm.participant_type.trim() || null });
    if (error) setEventError(error.message);
    else {
      setParticipantForm({ full_name: "", email: "", organization: "", job_title: "", participant_type: "", attendance_status: "Registered" });
      const { data } = await supabase.from("event_participants").select("*").eq("event_id", selectedEvent.id).order("created_at", { ascending: false });
      setParticipants((data || []) as EventParticipant[]);
      await loadEvents();
    }
    setSavingParticipant(false);
  }

  async function updateParticipantAttendance(participant: EventParticipant, status: EventParticipant["attendance_status"]) {
    if (!isAdmin) return;
    const { data, error } = await supabase.from("event_participants").update({ attendance_status: status }).eq("id", participant.id).select().single();
    if (error) setEventError(error.message);
    else setParticipants((items) => items.map((p) => p.id === participant.id ? data as EventParticipant : p));
  }

  async function removeParticipant(participant: EventParticipant) {
    if (!isAdmin || !window.confirm(`Remove ${participant.full_name} from this event?`)) return;
    const { error } = await supabase.from("event_participants").delete().eq("id", participant.id);
    if (error) setEventError(error.message);
    else { setParticipants((items) => items.filter((p) => p.id !== participant.id)); await loadEvents(); }
  }

  function exportEvents() {
    const headers = ["Title", "Type", "Status", "Start Date", "End Date", "Organizer", "Venue", "City", "Country", "Participants", "Budget", "Currency"];
    const rows = filteredEvents.map((e) => [e.title, e.event_type, e.status, e.start_date, e.end_date || "", e.organizer || "", e.venue || "", e.city || "", e.country || "", e.participant_count, e.budget || 0, e.currency || "EGP"]);
    const csv = [headers, ...rows].map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "HU-OSP-Events.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return <div style={{ display: "grid", gap: 22 }}>
    <section className="stats-grid">
      <StatCard label="Total Events" value={String(events.length)} change="Live data" detail="Registered in Supabase" icon={CalendarDays} />
      <StatCard label="Completed" value={String(completedCount)} change="Event status" detail="Successfully delivered" icon={CheckCircle2} />
      <StatCard label="Upcoming" value={String(upcomingCount)} change="Planned & upcoming" detail="Future activities" icon={Clock3} />
      <StatCard label="Participants" value={String(participantTotal)} change="Recorded total" detail="Individual + total-only" icon={Users} />
    </section>

    {eventError && <div className="workspace-error"><AlertCircle size={17}/><span>{eventError}</span><button onClick={() => setEventError("")}><X size={15}/></button></div>}

    <section className="panel" style={{ padding: 22 }}>
      <div className="panel-header" style={{ flexWrap: "wrap", gap: 12 }}>
        <div><span className="section-kicker">HU-OSP EVENT REGISTER</span><h3 style={{ marginTop: 5 }}>Events Directory</h3><p style={{ color: "#89938d", fontSize: 12, margin: "5px 0 0" }}>A clear record of workshops, conferences, training sessions and outreach activities.</p></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="secondary-button" onClick={exportEvents}><Download size={16}/> Export CSV</button>
          {isAdmin && <button className="primary-button" onClick={openCreate}><Plus size={17}/> Add Event</button>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, margin: "18px 0", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 220px", display: "flex", alignItems: "center", gap: 8, border: "1px solid #e5ebe5", borderRadius: 9, padding: "0 12px", background: "#fff" }}><Search size={16} color="#89938d"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search event, type or organizer..." style={{ border: 0, outline: 0, padding: 11, width: "100%", color: "#34483b" }}/></div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: "10px 12px", border: "1px solid #e5ebe5", borderRadius: 9, color: "#34483b", background: "#fff" }}><option>All</option><option>Planned</option><option>Upcoming</option><option>Completed</option><option>Cancelled</option></select>
        <button className="secondary-button" onClick={() => void loadEvents()}><Activity size={15}/> Refresh</button>
      </div>
      {eventLoading ? <div className="empty-state"><Loader2 className="spin"/> Loading events...</div> : filteredEvents.length === 0 ? <div className="empty-state">{events.length ? "No events match your search or filter." : "No events have been registered yet. Use Add Event to create the first event."}</div> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}><thead><tr style={{ textAlign: "left", color: "#89938d", fontSize: 11, borderBottom: "1px solid #edf0ed" }}>{["Event", "Type", "Date", "Participants", "Status", "Actions"].map((h) => <th key={h} style={{ padding: "12px 10px" }}>{h}</th>)}</tr></thead><tbody>{filteredEvents.map((event) => <tr key={event.id} style={{ borderBottom: "1px solid #f0f2f0" }}><td style={{ padding: 12 }}><strong style={{ color: "#34483b", display: "block" }}>{event.title}</strong><span style={{ color: "#89938d", fontSize: 11 }}>{event.organizer || "No organizer"} · {[event.venue, event.city].filter(Boolean).join(", ")}</span></td><td style={{ padding: 12, color: "#526258", fontSize: 12 }}>{event.event_type}</td><td style={{ padding: 12, color: "#526258", fontSize: 12 }}>{new Date(event.start_date).toLocaleDateString()}</td><td style={{ padding: 12, color: "#526258", fontSize: 12 }}>{event.participant_count || 0}</td><td style={{ padding: 12 }}><span className="status-badge status-progress">{event.status}</span></td><td style={{ padding: 12 }}><div style={{ display: "flex", gap: 6 }}><button className="row-more" title="View participant register" onClick={() => void openParticipants(event)}><Users size={16}/></button>{isAdmin && <><button className="row-more" title="Edit event" onClick={() => openEdit(event)}><Pencil size={16}/></button><button className="row-more delete-action" title="Delete event" onClick={() => void deleteEvent(event)}><Trash2 size={16}/></button></>}</div></td></tr>)}</tbody></table></div>}
    </section>

    <section className="panel" style={{ padding: 22 }}><div className="panel-header"><div><span className="section-kicker">EVENT PERFORMANCE</span><h3>Event Type Analysis</h3></div></div>{Object.keys(typeCounts).length === 0 ? <div className="empty-state">Charts will appear when events are added.</div> : <div style={{ display: "grid", gap: 14, marginTop: 18 }}>{Object.entries(typeCounts).sort((a,b) => b[1]-a[1]).map(([type,count]) => <div key={type}><div style={{ display: "flex", justifyContent: "space-between", color: "#526258", fontSize: 12, marginBottom: 6 }}><strong>{type}</strong><span>{count} event{count === 1 ? "" : "s"}</span></div><div style={{ height: 9, borderRadius: 20, background: "#edf1ed", overflow: "hidden" }}><div style={{ width: `${count/maxTypeCount*100}%`, height: "100%", background: "#648b70", borderRadius: 20 }}/></div></div>)}</div>}</section>

    {selectedEvent && <section className="panel" style={{ padding: 22 }}><div className="panel-header"><div><span className="section-kicker">EVENT DETAILS</span><h3>{selectedEvent.title}</h3><p style={{ color: "#89938d", fontSize: 12 }}>{new Date(selectedEvent.start_date).toLocaleString()} · {selectedEvent.status} · {selectedEvent.participant_count} participants</p></div><button className="secondary-button" onClick={() => setSelectedEvent(null)}><X size={15}/> Close</button></div>
      {selectedEvent.participant_tracking_mode === "total_only" ? <p style={{ color: "#526258", fontSize: 13 }}>This event uses total-only tracking. Recorded participants: <strong>{selectedEvent.participant_count}</strong>.</p> : !isAdmin ? <p style={{ color: "#89938d", fontSize: 13 }}>Individual participant records are restricted to the Main Administrator.</p> : <>
        {participantsLoading ? <p>Loading participant register...</p> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th style={{ textAlign: "left", padding: 9 }}>Name</th><th style={{ textAlign: "left", padding: 9 }}>Email</th><th style={{ textAlign: "left", padding: 9 }}>Organization</th><th style={{ textAlign: "left", padding: 9 }}>Attendance</th><th/></tr></thead><tbody>{participants.map((person) => <tr key={person.id}><td style={{ padding: 9 }}>{person.full_name}</td><td style={{ padding: 9 }}>{person.email || "—"}</td><td style={{ padding: 9 }}>{person.organization || "—"}</td><td style={{ padding: 9 }}><select value={person.attendance_status} disabled={!isAdmin} onChange={(e) => void updateParticipantAttendance(person, e.target.value as EventParticipant["attendance_status"])}><option>Registered</option><option>Attended</option><option>Absent</option><option>Cancelled</option></select></td><td><button className="row-more delete-action" title="Remove participant" onClick={() => void removeParticipant(person)}><Trash2 size={15}/></button></td></tr>)}</tbody></table>{participants.length === 0 && <p className="empty-state">No individual participants recorded yet.</p>}</div>}
        <form onSubmit={addParticipant} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 9, marginTop: 18, paddingTop: 18, borderTop: "1px solid #edf0ed" }}><input required placeholder="Participant full name *" value={participantForm.full_name} onChange={(e) => setParticipantForm({...participantForm,full_name:e.target.value})}/><input type="email" placeholder="Email" value={participantForm.email} onChange={(e) => setParticipantForm({...participantForm,email:e.target.value})}/><input placeholder="Organization" value={participantForm.organization} onChange={(e) => setParticipantForm({...participantForm,organization:e.target.value})}/><input placeholder="Job title" value={participantForm.job_title} onChange={(e) => setParticipantForm({...participantForm,job_title:e.target.value})}/><select value={participantForm.attendance_status} onChange={(e) => setParticipantForm({...participantForm,attendance_status:e.target.value as EventParticipant["attendance_status"]})}><option>Registered</option><option>Attended</option><option>Absent</option><option>Cancelled</option></select><button className="primary-button" disabled={savingParticipant}><UserRoundPlus size={15}/>{savingParticipant ? "Saving..." : "Add Participant"}</button></form>
      </>}
    </section>}

    {showEditor && isAdmin && <div onClick={() => setShowEditor(false)} style={{ position: "fixed", inset: 0, background: "rgba(20,35,26,.48)", zIndex: 1000, display: "grid", placeItems: "center", padding: 16 }}><form onClick={(e) => e.stopPropagation()} onSubmit={saveEvent} style={{ width: "min(760px,100%)", maxHeight: "90vh", overflowY: "auto", background: "#fff", borderRadius: 16, padding: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}><div style={{ gridColumn: "1/-1", display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><span className="section-kicker">EVENT REGISTRATION</span><h2 style={{ margin: "5px 0", color: "#34483b" }}>{editing ? "Edit Event" : "Add New Event"}</h2></div><button type="button" className="row-more" onClick={() => setShowEditor(false)}><X/></button></div>
      <label>Event title *<input required value={eventForm.title} onChange={(e) => setEventForm({...eventForm,title:e.target.value})}/></label>
      <label>Event type<select value={eventForm.event_type} onChange={(e) => setEventForm({...eventForm,event_type:e.target.value})}><option>Workshop</option><option>Conference</option><option>Training</option><option>Seminar</option><option>Meeting</option><option>Networking</option><option>Outreach</option><option>Other</option></select></label>
      <label>Status<select value={eventForm.status} onChange={(e) => setEventForm({...eventForm,status:e.target.value as EventRecord["status"]})}><option>Planned</option><option>Upcoming</option><option>Completed</option><option>Cancelled</option></select></label>
      <label>Start date & time *<input required type="datetime-local" value={eventForm.start_date} onChange={(e) => setEventForm({...eventForm,start_date:e.target.value})}/></label>
      <label>End date & time<input type="datetime-local" value={eventForm.end_date} onChange={(e) => setEventForm({...eventForm,end_date:e.target.value})}/></label>
      <label>Venue<input value={eventForm.venue} onChange={(e) => setEventForm({...eventForm,venue:e.target.value})}/></label><label>City<input value={eventForm.city} onChange={(e) => setEventForm({...eventForm,city:e.target.value})}/></label><label>Country<input value={eventForm.country} onChange={(e) => setEventForm({...eventForm,country:e.target.value})}/></label><label>Organizer<input value={eventForm.organizer} onChange={(e) => setEventForm({...eventForm,organizer:e.target.value})}/></label>
      <label>Related project<select value={eventForm.project_id} onChange={(e) => setEventForm({...eventForm,project_id:e.target.value})}><option value="">No linked project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
      <label>Budget<input type="number" min="0" step="0.01" value={eventForm.budget} onChange={(e) => setEventForm({...eventForm,budget:e.target.value})}/></label><label>Currency<input value={eventForm.currency} onChange={(e) => setEventForm({...eventForm,currency:e.target.value})}/></label>
      <label>Participant tracking<select value={eventForm.participant_tracking_mode} onChange={(e) => setEventForm({...eventForm,participant_tracking_mode:e.target.value as EventRecord["participant_tracking_mode"]})}><option value="individual">Individual participant register</option><option value="total_only">Total number only</option></select></label>
      {eventForm.participant_tracking_mode === "total_only" && <label>Total participants<input type="number" min="0" value={eventForm.participant_count} onChange={(e) => setEventForm({...eventForm,participant_count:e.target.value})}/></label>}
      <label style={{ gridColumn: "1/-1" }}>Description<textarea rows={2} value={eventForm.description} onChange={(e) => setEventForm({...eventForm,description:e.target.value})}/></label><label style={{ gridColumn: "1/-1" }}>Notes<textarea rows={2} value={eventForm.notes} onChange={(e) => setEventForm({...eventForm,notes:e.target.value})}/></label>
      <div style={{ gridColumn: "1/-1", display: "flex", justifyContent: "flex-end", gap: 9 }}><button type="button" className="secondary-button" onClick={() => setShowEditor(false)}>Cancel</button><button className="primary-button" disabled={savingEvent}><Save size={16}/>{savingEvent ? "Saving..." : editing ? "Save Changes" : "Create Event"}</button></div>
    </form></div>}
  </div>;
}

// ==========================================
// PARTNERS PAGE
// ==========================================

function PartnersPage() {
  const [partnerSearch, setPartnerSearch] = useState("");

  const filteredPartners = ospPartners.filter((partner) =>
    `${partner.name} ${partner.category}`
      .toLowerCase()
      .includes(partnerSearch.toLowerCase())
  );

  return (
    <div style={{ display: "grid", gap: "24px" }}>

      {/* INTRODUCTION */}

      <section
        style={{
          background: "linear-gradient(120deg, #263e32, #52745b)",
          borderRadius: "18px",
          padding: "35px",
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "relative", zIndex: 1 }}>
          <span
            style={{
              fontSize: "10px",
              letterSpacing: "2px",
              fontWeight: 700,
              color: "#c6ddca",
            }}
          >
            OUR GLOBAL NETWORK
          </span>

          <h2
            style={{
              fontSize: "30px",
              margin: "12px 0",
              fontWeight: 700,
            }}
          >
            Partners & Collaborators
          </h2>

          <p
            style={{
              color: "#e0e9e1",
              fontSize: "14px",
              lineHeight: 1.8,
              maxWidth: "560px",
              margin: 0,
            }}
          >
            Building meaningful partnerships with international
            institutions and funding organizations to support
            research, innovation and sustainable development.
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginTop: "25px",
            }}
          >
            <Handshake size={20} color="#d7e8d9" />

            <strong style={{ fontSize: "13px" }}>
              {ospPartners.length} Listed Organizations
            </strong>
          </div>
        </div>

        <Globe2
          size={190}
          color="#ffffff"
          style={{
            position: "absolute",
            right: "-25px",
            bottom: "-55px",
            opacity: 0.08,
          }}
        />
      </section>

      {/* PARTNER HEADER */}

      <section
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "15px",
        }}
      >
        <div>
          <span className="section-kicker">OUR NETWORK</span>

          <h3 style={{ margin: "5px 0", color: "#34483b" }}>
            Institutional Partners
          </h3>

          <p style={{ color: "#89938d", fontSize: "13px", margin: 0 }}>
            Organizations featured in the official HU-OSP partner list.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "9px",
            background: "#fff",
            border: "1px solid #e5ebe5",
            borderRadius: "10px",
            padding: "0 13px",
            minWidth: "220px",
          }}
        >
          <Search size={16} color="#89938d" />

          <input
            value={partnerSearch}
            onChange={(e) => setPartnerSearch(e.target.value)}
            placeholder="Search partners..."
            style={{
              border: "none",
              outline: "none",
              padding: "12px 0",
              width: "100%",
              background: "transparent",
              color: "#34483b",
              fontSize: "12px",
            }}
          />
        </div>
      </section>

      {/* PARTNER GRID */}

      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "18px",
        }}
      >
        {filteredPartners.map((partner) => (
          <div
            key={partner.name}
            style={{
              background: "#fff",
              border: "1px solid #e8ece8",
              borderRadius: "15px",
              padding: "22px",
              minHeight: "205px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "15px",
              transition: "all 0.25s ease",
              cursor: "default",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-5px)";
              e.currentTarget.style.boxShadow =
                "0 12px 28px rgba(39, 65, 47, 0.09)";
              e.currentTarget.style.borderColor = "#b9cdbd";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = "#e8ece8";
            }}
          >
            <div
              style={{
                width: "100%",
                height: "105px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={partner.logo}
                alt={`${partner.name} logo`}
                loading="lazy"
                style={{
                  maxWidth: "90%",
                  maxHeight: "95px",
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                }}
              />
            </div>

            <div
              style={{
                width: "100%",
                textAlign: "center",
                borderTop: "1px solid #edf0ed",
                paddingTop: "14px",
              }}
            >
              <strong
                style={{
                  display: "block",
                  color: "#34483b",
                  fontSize: "14px",
                  marginBottom: "6px",
                }}
              >
                {partner.name}
              </strong>

              <span
                style={{
                  color: "#89938d",
                  fontSize: "11px",
                  lineHeight: 1.5,
                }}
              >
                {partner.category}
              </span>
            </div>
          </div>
        ))}

        {filteredPartners.length === 0 && (
          <div
            className="empty-state"
            style={{ gridColumn: "1 / -1" }}
          >
            No matching partners found.
          </div>
        )}
      </section>

      {/* FOOTNOTE */}

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
          padding: "16px",
          background: "#f4f7f4",
          borderRadius: "11px",
        }}
      >
        <ShieldCheck
          size={19}
          color="#648b70"
          style={{ flexShrink: 0 }}
        />

        <p
          style={{
            color: "#78847c",
            fontSize: "11px",
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          Partner names and logos are based on the organizations
          displayed in the official Heliopolis University Office
          of Sponsored Programs website.
        </p>
      </div>
    </div>
  );
}

// ==========================================
// TEAM MEMBERS PAGE
// ==========================================

function TeamMembersPage({
  isAdmin,
  teamProfiles,
  profilesLoading,
  roleSavingId,
  currentUserId,
  search,
  onUpdateRole,
  onGoToSettings,
}: {
  isAdmin: boolean;
  teamProfiles: TeamProfile[];
  profilesLoading: boolean;
  roleSavingId: string | null;
  currentUserId: string;
  search: string;
  onUpdateRole: (memberId: string, newRole: UserRole) => void;
  onGoToSettings: () => void;
}) {
  const filteredMembers = teamProfiles.filter((member) => {
    const name = (member.full_name || "Unnamed Member").toLowerCase();
    const roleName = getRoleLabel(member.role).toLowerCase();
    const term = search.toLowerCase();

    return name.includes(term) || roleName.includes(term);
  });

  const roleCounts = {
    admin: teamProfiles.filter((m) => m.role === "admin").length,
    grant: teamProfiles.filter((m) => m.role === "grant_admin").length,
    implementation: teamProfiles.filter(
      (m) => m.role === "implementation_admin"
    ).length,
    me: teamProfiles.filter((m) => m.role === "me_admin").length,
    member: teamProfiles.filter((m) => m.role === "member").length,
  };

  if (!isAdmin) {
    return (
      <section className="panel" style={{ padding: "30px" }}>
        <div style={{ textAlign: "center", padding: "35px 15px" }}>
          <ShieldCheck size={42} color="#648b70" />

          <h2 style={{ color: "#34483b", marginTop: "18px" }}>
            Team Directory
          </h2>

          <p style={{ color: "#89938d", lineHeight: 1.7 }}>
            Team directory access is currently restricted
            to the Main Administrator.
          </p>
        </div>
      </section>
    );
  }

  return (
    <div style={{ display: "grid", gap: "22px" }}>
      <section
        className="panel"
        style={{
          padding: "25px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "18px",
        }}
      >
        <div>
          <span className="section-kicker">ORGANIZATION DIRECTORY</span>

          <h2 style={{ color: "#34483b", margin: "7px 0" }}>
            Team Directory
          </h2>

          <p style={{ color: "#89938d", fontSize: "13px", margin: 0 }}>
            View your team, manage member roles and control workspace access.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={onGoToSettings}
        >
          <UserPlus size={17} />
          Create Account
        </button>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
        }}
      >
        <StatCard
          label="Total Members"
          value={String(teamProfiles.length).padStart(2, "0")}
          change="Live data"
          detail="Registered accounts"
          icon={Users}
          color="green"
        />

        <StatCard
          label="Main Admins"
          value={String(roleCounts.admin).padStart(2, "0")}
          change="Access control"
          detail="Full workspace access"
          icon={ShieldCheck}
          color="blue"
        />

        <StatCard
          label="Managers"
          value={String(
            roleCounts.grant +
              roleCounts.implementation +
              roleCounts.me
          ).padStart(2, "0")}
          change="Specialized access"
          detail="Department managers"
          icon={Building2}
          color="gold"
        />

        <StatCard
          label="Members"
          value={String(roleCounts.member).padStart(2, "0")}
          change="General access"
          detail="Workspace members"
          icon={Users}
          color="purple"
        />
      </section>

      <section className="panel" style={{ padding: "25px" }}>
        <div className="panel-header">
          <div>
            <span className="section-kicker">TEAM STRUCTURE</span>
            <h3>Department Distribution</h3>
          </div>

          <Building2 size={23} color="#648b70" />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: "13px",
            marginTop: "20px",
          }}
        >
          {[
            {
              name: "Grant Writing",
              count: roleCounts.grant,
              icon: FilePenLine,
            },
            {
              name: "Implementation",
              count: roleCounts.implementation,
              icon: ClipboardCheck,
            },
            {
              name: "Monitoring & Evaluation",
              count: roleCounts.me,
              icon: Activity,
            },
          ].map((department) => {
            const Icon = department.icon;

            return (
              <div
                key={department.name}
                style={{
                  border: "1px solid #e8ece8",
                  borderRadius: "12px",
                  padding: "18px",
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                  }}
                >
                  <span
                    style={{
                      background: "#edf4ee",
                      color: "#648b70",
                      padding: "10px",
                      borderRadius: "10px",
                    }}
                  >
                    <Icon size={21} />
                  </span>

                  <strong
                    style={{
                      fontSize: "25px",
                      color: "#34483b",
                    }}
                  >
                    {department.count}
                  </strong>
                </div>

                <strong
                  style={{
                    display: "block",
                    color: "#526258",
                    fontSize: "13px",
                    marginTop: "15px",
                  }}
                >
                  {department.name}
                </strong>

                <span
                  style={{
                    color: "#89938d",
                    fontSize: "11px",
                  }}
                >
                  Assigned managers
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel" style={{ padding: "25px" }}>
        <div className="panel-header">
          <div>
            <span className="section-kicker">PEOPLE & PERMISSIONS</span>
            <h3>All Team Members ({filteredMembers.length})</h3>
          </div>

          <Users size={23} color="#648b70" />
        </div>

        {profilesLoading ? (
          <div className="empty-state">
            <Loader2 className="spin" size={22} />
            Loading team members...
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px", marginTop: "18px" }}>
            {filteredMembers.map((member) => {
              const isCurrentUser = member.id === currentUserId;
              const isSaving = roleSavingId === member.id;
              const initials = (member.full_name || "U")
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
                .toUpperCase();

              return (
                <div
                  key={member.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "16px",
                    flexWrap: "wrap",
                    padding: "16px",
                    border: "1px solid #e8ece8",
                    borderRadius: "12px",
                    background: "#fff",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "13px",
                      flex: "1 1 220px",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: "43px",
                        height: "43px",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "50%",
                        background: "#edf4ee",
                        color: "#648b70",
                        fontSize: "14px",
                        fontWeight: 700,
                      }}
                    >
                      {initials || "U"}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <strong
                        style={{
                          display: "block",
                          color: "#34483b",
                          fontSize: "14px",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {member.full_name || "Unnamed Member"}
                      </strong>

                      <span
                        style={{
                          display: "block",
                          color: "#89938d",
                          fontSize: "12px",
                          marginTop: "5px",
                        }}
                      >
                        {getRoleLabel(member.role)}
                      </span>

                      {isCurrentUser && (
                        <span
                          style={{
                            display: "inline-block",
                            color: "#648b70",
                            fontSize: "10px",
                            fontWeight: 700,
                            marginTop: "5px",
                            letterSpacing: "0.4px",
                          }}
                        >
                          YOUR ACCOUNT
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    <select
                      value={member.role}
                      disabled={isCurrentUser || isSaving}
                      onChange={(e) =>
                        onUpdateRole(
                          member.id,
                          e.target.value as UserRole
                        )
                      }
                      style={{
                        minWidth: "220px",
                        maxWidth: "100%",
                        padding: "11px 13px",
                        border: "1px solid #dfe7df",
                        borderRadius: "9px",
                        background: isCurrentUser ? "#f4f6f4" : "#fff",
                        color: "#34483b",
                        cursor: isCurrentUser ? "not-allowed" : "pointer",
                        fontSize: "12px",
                      }}
                    >
                      <option value="member">Member</option>
                      <option value="grant_admin">
                        Grant Writing Manager
                      </option>
                      <option value="implementation_admin">
                        Implementation Manager
                      </option>
                      <option value="me_admin">M&E Manager</option>
                      <option value="admin">Main Administrator</option>
                    </select>

                    {isSaving && (
                      <Loader2
                        className="spin"
                        size={19}
                        color="#648b70"
                      />
                    )}
                  </div>
                </div>
              );
            })}

            {filteredMembers.length === 0 && (
              <div className="empty-state">
                {search
                  ? "No team members match your search."
                  : "No team members found."}
              </div>
            )}
          </div>
        )}

        <div
          style={{
            marginTop: "22px",
            padding: "16px",
            background: "#f5f8f5",
            borderRadius: "10px",
          }}
        >
          <strong style={{ color: "#34483b", fontSize: "13px" }}>
            Permission Information
          </strong>

          <p
            style={{
              color: "#89938d",
              fontSize: "12px",
              lineHeight: 1.7,
              marginBottom: 0,
            }}
          >
            Each manager can access only their assigned dashboard.
            The Main Administrator has full workspace access.
            Members have access to the general workspace.
            The current administrator account cannot change its own role.
          </p>
        </div>
      </section>
    </div>
  );
}

// ==========================================
// SETTINGS PAGE
// ==========================================

function SettingsPage({
  isAdmin,
  userName,
  roleLabel,
  currentUserId,
  teamProfiles,
  profilesLoading,
  roleSavingId,
  creatingUser,
  onUpdateRole,
  onCreateUser,
  onUpdateProfileName,
  savingProfileName,
}: {
  isAdmin: boolean;
  userName: string;
  userRole: UserRole;
  roleLabel: string;
  currentUserId: string;
  teamProfiles: TeamProfile[];
  profilesLoading: boolean;
  roleSavingId: string | null;
  creatingUser: boolean;
  onUpdateRole: (memberId: string, newRole: UserRole) => void;
  onCreateUser: (userData: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }) => Promise<boolean>;
  onUpdateProfileName: (newName: string) => Promise<boolean>;
  savingProfileName: boolean;
}) {
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [showPassword, setShowPassword] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [profileName, setProfileName] = useState(userName);
  const [profileMessage, setProfileMessage] = useState("");

  async function handleSaveProfileName(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileMessage("");

    const success = await onUpdateProfileName(profileName);
    if (success) setProfileMessage("Your name has been updated successfully.");
  }

  async function handleCreateUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormMessage("");

    const success = await onCreateUser(userForm);

    if (success) {
      setUserForm(emptyUserForm);
      setShowPassword(false);
      setFormMessage("Account created successfully.");
    }
  }

  return (
    <div style={{ display: "grid", gap: "22px" }}>
      <section className="panel" style={{ padding: "26px" }}>
        <div className="panel-header">
          <div>
            <span className="section-kicker">ACCOUNT SETTINGS</span>
            <h3>My Account</h3>
            <p style={{ color: "#89938d", fontSize: "13px" }}>
              Your account information and workspace access.
            </p>
          </div>

          <Settings size={24} color="#648b70" />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "14px",
            marginTop: "20px",
          }}
        >
          <SettingsInfo label="Account Name" value={userName} />
          <SettingsInfo label="Current Role" value={roleLabel} />
          <SettingsInfo
            label="Account Type"
            value={isAdmin ? "Administrator" : "Workspace Member"}
          />
          <SettingsInfo label="Access Status" value="Active" />
        </div>

        <form
          onSubmit={handleSaveProfileName}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
            alignItems: "end",
            marginTop: "22px",
          }}
        >
          <div>
            <label style={formLabelStyle}>Update Your Display Name</label>
            <input
              type="text"
              required
              maxLength={100}
              autoComplete="name"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              style={userInputStyle}
              placeholder="Enter your full name"
            />
          </div>

          <button
            type="submit"
            className="primary-button"
            disabled={
              savingProfileName ||
              !profileName.trim() ||
              profileName.trim() === userName
            }
          >
            {savingProfileName ? (
              <>
                <Loader2 className="spin" size={17} />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 size={17} />
                Save Name
              </>
            )}
          </button>
        </form>

        {profileMessage && (
          <div
            style={{
              color: "#43815a",
              background: "#edf7ef",
              padding: "12px",
              borderRadius: "9px",
              fontSize: "13px",
              marginTop: "12px",
            }}
          >
            <CheckCircle2
              size={16}
              style={{
                display: "inline",
                verticalAlign: "middle",
                marginRight: "7px",
              }}
            />
            {profileMessage}
          </div>
        )}
      </section>

      {isAdmin && (
        <section className="panel" style={{ padding: "26px" }}>
          <div className="panel-header">
            <div>
              <span className="section-kicker">USER MANAGEMENT</span>
              <h3>Create New Account</h3>
              <p style={{ color: "#89938d", fontSize: "13px" }}>
                Create login credentials and assign workspace permissions.
              </p>
            </div>

            <UserPlus size={25} color="#648b70" />
          </div>

          <form
            onSubmit={handleCreateUser}
            style={{
              display: "grid",
              gap: "14px",
              marginTop: "22px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "14px",
              }}
            >
              <div>
                <label style={formLabelStyle}>Full Name</label>

                <input
                  required
                  type="text"
                  autoComplete="name"
                  placeholder="Enter member's full name"
                  value={userForm.name}
                  onChange={(e) =>
                    setUserForm({
                      ...userForm,
                      name: e.target.value,
                    })
                  }
                  style={userInputStyle}
                />
              </div>

              <div>
                <label style={formLabelStyle}>Email Address</label>

                <input
                  required
                  type="email"
                  autoComplete="email"
                  placeholder="member@example.com"
                  value={userForm.email}
                  onChange={(e) =>
                    setUserForm({
                      ...userForm,
                      email: e.target.value,
                    })
                  }
                  style={userInputStyle}
                />
              </div>

              <div>
                <label style={formLabelStyle}>Password</label>

                <div style={{ position: "relative" }}>
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={8}
                    placeholder="Minimum 8 characters"
                    value={userForm.password}
                    onChange={(e) =>
                      setUserForm({
                        ...userForm,
                        password: e.target.value,
                      })
                    }
                    style={{
                      ...userInputStyle,
                      paddingRight: "70px",
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      border: "none",
                      background: "transparent",
                      color: "#648b70",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                <span style={smallHintStyle}>
                  Use at least 8 characters.
                </span>
              </div>

              <div>
                <label style={formLabelStyle}>Assign Role</label>

                <select
                  required
                  value={userForm.role}
                  onChange={(e) =>
                    setUserForm({
                      ...userForm,
                      role: e.target.value as UserRole,
                    })
                  }
                  style={userInputStyle}
                >
                  <option value="member">Member</option>
                  <option value="grant_admin">Grant Writing Manager</option>
                  <option value="implementation_admin">
                    Implementation Manager
                  </option>
                  <option value="me_admin">M&E Manager</option>
                  <option value="admin">Main Administrator</option>
                </select>
              </div>
            </div>

            <div
              style={{
                padding: "14px",
                background: "#f5f8f5",
                borderRadius: "10px",
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
              }}
            >
              <ShieldCheck
                size={19}
                color="#648b70"
                style={{ flexShrink: 0 }}
              />

              <p
                style={{
                  color: "#65736a",
                  fontSize: "12px",
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                The new account will be created through the secure
                Supabase server function. The member can sign in using
                the email and password you assign here.
              </p>
            </div>

            {formMessage && (
              <div
                style={{
                  color: "#43815a",
                  background: "#edf7ef",
                  padding: "12px",
                  borderRadius: "9px",
                  fontSize: "13px",
                }}
              >
                <CheckCircle2
                  size={16}
                  style={{
                    display: "inline",
                    verticalAlign: "middle",
                    marginRight: "7px",
                  }}
                />
                {formMessage}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                className="primary-button"
                disabled={creatingUser}
              >
                {creatingUser ? (
                  <>
                    <Loader2 className="spin" size={17} />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <UserPlus size={17} />
                    Create Account
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      )}

      {isAdmin && (
        <section className="panel" style={{ padding: "26px" }}>
          <div className="panel-header">
            <div>
              <span className="section-kicker">ACCESS CONTROL</span>
              <h3>Team Role Management</h3>
              <p style={{ color: "#89938d", fontSize: "13px" }}>
                Assign dashboard permissions to your team members.
              </p>
            </div>

            <Users size={24} color="#648b70" />
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              margin: "20px 0",
            }}
          >
            <RoleSummary
              label="Main Admin"
              count={teamProfiles.filter((m) => m.role === "admin").length}
            />
            <RoleSummary
              label="Grant Writing"
              count={teamProfiles.filter((m) => m.role === "grant_admin").length}
            />
            <RoleSummary
              label="Implementation"
              count={teamProfiles.filter((m) => m.role === "implementation_admin").length}
            />
            <RoleSummary
              label="M&E"
              count={teamProfiles.filter((m) => m.role === "me_admin").length}
            />
            <RoleSummary
              label="Members"
              count={teamProfiles.filter((m) => m.role === "member").length}
            />
          </div>

          {profilesLoading ? (
            <div className="empty-state">
              <Loader2 className="spin" size={22} />
              Loading team members...
            </div>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {teamProfiles.map((member) => {
                const isCurrentUser = member.id === currentUserId;
                const isSaving = roleSavingId === member.id;

                return (
                  <div
                    key={member.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "16px",
                      flexWrap: "wrap",
                      padding: "16px",
                      border: "1px solid #e8ece8",
                      borderRadius: "12px",
                      background: "#fff",
                    }}
                  >
                    <div style={{ minWidth: "180px" }}>
                      <strong style={{ color: "#34483b" }}>
                        {member.full_name || "Unnamed Member"}
                      </strong>

                      <div
                        style={{
                          color: "#89938d",
                          fontSize: "12px",
                          marginTop: "5px",
                        }}
                      >
                        {getRoleLabel(member.role)}
                      </div>

                      {isCurrentUser && (
                        <span
                          style={{
                            color: "#648b70",
                            fontSize: "11px",
                            fontWeight: 700,
                          }}
                        >
                          YOUR ACCOUNT
                        </span>
                      )}
                    </div>

                    <select
                      value={member.role}
                      disabled={isCurrentUser || isSaving}
                      onChange={(e) =>
                        onUpdateRole(
                          member.id,
                          e.target.value as UserRole
                        )
                      }
                      style={{
                        minWidth: "220px",
                        padding: "11px 13px",
                        border: "1px solid #dfe7df",
                        borderRadius: "9px",
                        background: isCurrentUser ? "#f4f6f4" : "#fff",
                        color: "#34483b",
                        cursor: isCurrentUser ? "not-allowed" : "pointer",
                      }}
                    >
                      <option value="member">Member</option>
                      <option value="grant_admin">Grant Writing Manager</option>
                      <option value="implementation_admin">
                        Implementation Manager
                      </option>
                      <option value="me_admin">M&E Manager</option>
                      <option value="admin">Main Administrator</option>
                    </select>

                    {isSaving && (
                      <Loader2 className="spin" size={18} />
                    )}
                  </div>
                );
              })}

              {teamProfiles.length === 0 && (
                <div className="empty-state">
                  No team members found.
                </div>
              )}
            </div>
          )}

          <div
            style={{
              marginTop: "22px",
              padding: "16px",
              background: "#f5f8f5",
              borderRadius: "10px",
            }}
          >
            <strong style={{ color: "#34483b", fontSize: "13px" }}>
              Permission Information
            </strong>

            <p style={{ color: "#89938d", fontSize: "12px" }}>
              Each manager can access only their assigned dashboard.
              The Main Administrator has full workspace access.
              Members have access to the general workspace.
            </p>
          </div>
        </section>
      )}

      {!isAdmin && (
        <section className="panel" style={{ padding: "26px" }}>
          <h3>Access Permissions</h3>
          <p style={{ color: "#89938d", fontSize: "13px" }}>
            Team role management is available only to the Main Administrator.
          </p>
        </section>
      )}
    </div>
  );
}

// ==========================================
// FORM STYLES
// ==========================================

const userInputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 13px",
  border: "1px solid #dfe7df",
  borderRadius: "9px",
  background: "#fff",
  color: "#34483b",
  fontSize: "13px",
  outlineColor: "#648b70",
};

const formLabelStyle: React.CSSProperties = {
  display: "block",
  color: "#526258",
  fontSize: "13px",
  fontWeight: 600,
  marginBottom: "7px",
};

const smallHintStyle: React.CSSProperties = {
  display: "block",
  color: "#89938d",
  fontSize: "11px",
  marginTop: "5px",
};

// ==========================================
// SETTINGS INFO CARD
// ==========================================

function SettingsInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: "17px",
        border: "1px solid #e8ece8",
        borderRadius: "11px",
        background: "#fff",
      }}
    >
      <span
        style={{
          display: "block",
          color: "#89938d",
          fontSize: "12px",
          marginBottom: "8px",
        }}
      >
        {label}
      </span>

      <strong style={{ color: "#34483b", fontSize: "15px" }}>
        {value}
      </strong>
    </div>
  );
}

// ==========================================
// ROLE SUMMARY
// ==========================================

function RoleSummary({
  label,
  count,
}: {
  label: string;
  count: number;
}) {
  return (
    <div
      style={{
        padding: "10px 14px",
        background: "#f5f8f5",
        border: "1px solid #e8ece8",
        borderRadius: "9px",
      }}
    >
      <span style={{ color: "#89938d", fontSize: "11px" }}>
        {label}
      </span>

      <strong
        style={{
          display: "block",
          color: "#34483b",
          fontSize: "19px",
          marginTop: "3px",
        }}
      >
        {count}
      </strong>
    </div>
  );
}

// ==========================================
// SPECIALIZED DASHBOARD
// ==========================================

function SpecializedDashboardPage({
  dashboard,
  isAdmin,
  currentRole,
}: {
  dashboard: (typeof specializedDashboards)[number];
  isAdmin: boolean;
  currentRole: UserRole;
}) {
  const Icon = dashboard.icon;

  return (
    <section className="panel" style={{ padding: "26px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "15px",
          marginBottom: "22px",
        }}
      >
        <div
          style={{
            background: "#edf4ee",
            color: "#648b70",
            borderRadius: "12px",
            padding: "14px",
          }}
        >
          <Icon size={28} />
        </div>

        <div>
          <span className="section-kicker">
            SPECIALIZED WORKSPACE
          </span>

          <h2 style={{ margin: "5px 0" }}>
            {dashboard.label} Dashboard
          </h2>
        </div>
      </div>

      <p style={{ color: "#89938d", lineHeight: 1.7 }}>
        {dashboard.description}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "14px",
          marginTop: "25px",
        }}
      >
        {dashboard.modules.map((module, index) => (
          <div
            key={module}
            style={{
              border: "1px solid #e8ece8",
              borderRadius: "12px",
              padding: "20px",
              background: "#fff",
            }}
          >
            <div style={{ color: "#648b70", marginBottom: "15px" }}>
              <Icon size={22} />
            </div>

            <strong style={{ color: "#34483b" }}>
              {module}
            </strong>

            <p
              style={{
                color: "#89938d",
                fontSize: "12px",
                marginBottom: 0,
              }}
            >
              Module {index + 1}
            </p>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: "25px",
          padding: "16px",
          borderRadius: "10px",
          background: "#f6f8f6",
        }}
      >
        <strong style={{ color: "#34483b" }}>
          Workspace Access
        </strong>

        <p
          style={{
            color: "#89938d",
            fontSize: "13px",
            marginBottom: 0,
          }}
        >
          Current account: {getRoleLabel(currentRole)}
        </p>

        <p
          style={{
            color: "#89938d",
            fontSize: "12px",
            marginBottom: 0,
            marginTop: "8px",
          }}
        >
          {isAdmin
            ? "Main Administrator access: all specialized dashboards."
            : `Assigned workspace: ${dashboard.label}`}
        </p>
      </div>

      <p
        style={{
          color: "#89938d",
          fontSize: "11px",
          marginTop: "22px",
        }}
      >
        Office of Sponsored Programs - HU-OSP · DEVELOPMENT STAGE
      </p>
    </section>
  );
}

// ==========================================
// PORTFOLIO OVERVIEW
// ==========================================

function PortfolioOverview() {
  const stats = [
    {
      label: "Externally Funded Projects",
      scope: "All Entities",
      value: "28",
      icon: FolderKanban,
    },
    {
      label: "Externally Funded Projects",
      scope: "HU Only",
      value: "21",
      icon: Building2,
    },
    {
      label: "Portfolio Size",
      scope: "All Entities",
      value: "€7,378,831",
      egp: "EGP 412,329,072",
      icon: Euro,
    },
    {
      label: "Portfolio Size",
      scope: "HU Only",
      value: "€4,678,112",
      egp: "EGP 261,412,899",
      icon: Wallet,
    },
  ];

  const financials = [
    {
      label: "2025 Budget",
      all: "€1,643,904",
      allEgp: "EGP 91,861,370",
      hu: "€805,400",
      huEgp: "EGP 45,005,765",
    },
    {
      label: "2025 Expenditure",
      all: "€1,584,517",
      allEgp: "EGP 88,542,814",
      hu: "€621,247",
      huEgp: "EGP 34,715,282",
    },
  ];

  return (
    <section style={{ marginBottom: "26px" }}>
      <div style={{ marginBottom: "18px" }}>
        <span className="section-kicker">EXTERNAL FUNDING</span>

        <h3 style={{ margin: "5px 0", fontSize: "21px" }}>
          Portfolio Overview
        </h3>

        <p style={{ color: "#89938d", fontSize: "13px" }}>
          Externally funded projects across all entities
          and Heliopolis University.
        </p>

        <span
          style={{
            background: "#fff7e8",
            color: "#a77932",
            padding: "7px 12px",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: 700,
          }}
        >
          INITIAL DATA · PENDING VERIFICATION
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "14px",
          marginBottom: "22px",
        }}
      >
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label + item.scope}
              style={{
                background: "#fff",
                border: "1px solid #e8ece8",
                borderRadius: "14px",
                padding: "22px",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "18px",
                }}
              >
                <span
                  style={{
                    color: "#648b70",
                    background: "#edf4ee",
                    padding: "9px",
                    borderRadius: "9px",
                  }}
                >
                  <Icon size={20} />
                </span>

                <span style={{ color: "#8a948d", fontSize: "12px" }}>
                  {item.scope}
                </span>
              </div>

              <div
                style={{
                  color: "#78847c",
                  fontSize: "12px",
                  marginBottom: "8px",
                }}
              >
                {item.label}
              </div>

              <strong
                style={{
                  display: "block",
                  color: "#263b30",
                  fontSize: item.egp ? "23px" : "32px",
                  overflowWrap: "anywhere",
                }}
              >
                {item.value}
              </strong>

              {item.egp && (
                <div
                  style={{
                    color: "#648b70",
                    fontSize: "12px",
                    marginTop: "8px",
                  }}
                >
                  {item.egp}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e8ece8",
          borderRadius: "14px",
          padding: "22px",
          marginBottom: "18px",
        }}
      >
        <span className="section-kicker">FINANCIAL PERFORMANCE</span>

        <h3 style={{ margin: "5px 0", fontSize: "19px" }}>
          2025 Budget & Expenditure
        </h3>

        <p style={{ color: "#89938d", fontSize: "12px" }}>
          Financial figures in EUR and their EGP equivalents.
        </p>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "540px",
              textAlign: "left",
            }}
          >
            <thead>
              <tr style={{ background: "#f6f8f6" }}>
                {["Indicator", "All Entities", "HU Only"].map(
                  (heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: "13px",
                        color: "#65736a",
                        fontSize: "12px",
                      }}
                    >
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {financials.map((item) => (
                <tr
                  key={item.label}
                  style={{ borderBottom: "1px solid #edf0ed" }}
                >
                  <td
                    style={{
                      padding: "16px 13px",
                      fontWeight: 700,
                      color: "#34483b",
                    }}
                  >
                    {item.label}
                  </td>

                  <td style={{ padding: "16px 13px" }}>
                    <strong style={{ display: "block" }}>
                      {item.all}
                    </strong>

                    <span style={{ color: "#849087", fontSize: "12px" }}>
                      {item.allEgp}
                    </span>
                  </td>

                  <td style={{ padding: "16px 13px" }}>
                    <strong
                      style={{
                        display: "block",
                        color: "#648b70",
                      }}
                    >
                      {item.hu}
                    </strong>

                    <span style={{ color: "#849087", fontSize: "12px" }}>
                      {item.huEgp}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          style={{
            borderTop: "1px solid #edf0ed",
            paddingTop: "14px",
            marginTop: "12px",
            color: "#89938d",
            fontSize: "11px",
          }}
        >
          <span>Exchange Rate: 1 EUR = 55.88 EGP</span>
          <br />
          <span>Rate Reference: February 11 · 7:07 AM UTC</span>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "18px",
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #e8ece8",
            borderRadius: "14px",
            padding: "22px",
          }}
        >
          <span className="section-kicker">FUNDING DISTRIBUTION</span>

          <h3 style={{ margin: "5px 0", fontSize: "19px" }}>
            Portfolio Size Comparison
          </h3>

          <p style={{ color: "#89938d", fontSize: "12px" }}>
            Total externally funded portfolio.
          </p>

          <PortfolioBar
            title="All Entities"
            amount="€7,378,831"
            egp="EGP 412,329,072"
            width={100}
          />

          <PortfolioBar
            title="HU Only"
            amount="€4,678,112"
            egp="EGP 261,412,899"
            width={63.4}
          />

          <p style={{ color: "#78847c", fontSize: "11px" }}>
            HU Only is included within the All Entities portfolio.
          </p>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e8ece8",
            borderRadius: "14px",
            padding: "22px",
          }}
        >
          <span className="section-kicker">2025 FINANCIAL ANALYSIS</span>

          <h3 style={{ margin: "5px 0", fontSize: "19px" }}>
            Budget vs. Expenditure
          </h3>

          <FinancialBarGroup
            title="All Entities"
            budget={1643904}
            expenditure={1584517}
            budgetLabel="€1,643,904"
            expenditureLabel="€1,584,517"
          />

          <div
            style={{
              height: "1px",
              background: "#edf0ed",
              margin: "20px 0",
            }}
          />

          <FinancialBarGroup
            title="HU Only"
            budget={805400}
            expenditure={621247}
            budgetLabel="€805,400"
            expenditureLabel="€621,247"
          />

          <div
            style={{
              borderTop: "1px solid #edf0ed",
              paddingTop: "14px",
              marginTop: "20px",
              color: "#849087",
              fontSize: "11px",
            }}
          >
            All Entities · EGP 91,861,370 budget / EGP 88,542,814 expenditure
            <br />
            HU Only · EGP 45,005,765 budget / EGP 34,715,282 expenditure
          </div>
        </div>
      </div>
    </section>
  );
}

// ==========================================
// PORTFOLIO BAR
// ==========================================

function PortfolioBar({
  title,
  amount,
  egp,
  width,
}: {
  title: string;
  amount: string;
  egp: string;
  width: number;
}) {
  return (
    <div style={{ margin: "22px 0" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "10px",
          marginBottom: "9px",
          fontSize: "13px",
        }}
      >
        <strong>{title}</strong>
        <strong>{amount}</strong>
      </div>

      <div
        style={{
          height: "13px",
          background: "#edf1ed",
          borderRadius: "20px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${width}%`,
            height: "100%",
            background: "#648b70",
            borderRadius: "20px",
          }}
        />
      </div>

      <p
        style={{
          color: "#849087",
          fontSize: "11px",
          margin: "7px 0 0",
        }}
      >
        {egp}
      </p>
    </div>
  );
}

// ==========================================
// FINANCIAL BAR GROUP
// ==========================================

function FinancialBarGroup({
  title,
  budget,
  expenditure,
  budgetLabel,
  expenditureLabel,
}: {
  title: string;
  budget: number;
  expenditure: number;
  budgetLabel: string;
  expenditureLabel: string;
}) {
  const max = Math.max(budget, expenditure);
  const budgetWidth = (budget / max) * 100;
  const expenditureWidth = (expenditure / max) * 100;

  return (
    <div>
      <strong
        style={{
          display: "block",
          color: "#34483b",
          fontSize: "13px",
          marginBottom: "13px",
        }}
      >
        {title}
      </strong>

      <div style={{ marginBottom: "12px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "8px",
            fontSize: "11px",
            marginBottom: "6px",
          }}
        >
          <span>Budget</span>
          <strong>{budgetLabel}</strong>
        </div>

        <div
          style={{
            height: "10px",
            background: "#edf1ed",
            borderRadius: "20px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${budgetWidth}%`,
              height: "100%",
              background: "#91ad98",
              borderRadius: "20px",
            }}
          />
        </div>
      </div>

      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "8px",
            fontSize: "11px",
            marginBottom: "6px",
          }}
        >
          <span>Expenditure</span>
          <strong>{expenditureLabel}</strong>
        </div>

        <div
          style={{
            height: "10px",
            background: "#edf1ed",
            borderRadius: "20px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${expenditureWidth}%`,
              height: "100%",
              background: "#648b70",
              borderRadius: "20px",
            }}
          />
        </div>
      </div>

      <p
        style={{
          color: "#648b70",
          fontSize: "11px",
          fontWeight: 700,
          margin: "10px 0 0",
        }}
      >
        {((expenditure / budget) * 100).toFixed(1)}% of budget spent
      </p>
    </div>
  );
}

// ==========================================
// STAT CARD
// ==========================================

function StatCard({
  label,
  value,
  change,
  detail,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  change: string;
  detail: string;
  icon: ElementType;
  color: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <div className={`stat-icon ${color}`}>
          <Icon size={20} />
        </div>

        <span className="stat-change">
          <TrendingUp size={13} />
          {change}
        </span>
      </div>

      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      <span className="stat-detail">{detail}</span>
    </div>
  );
}

// ==========================================
// PROJECT ROW
// ==========================================

function ProjectRow({
  project,
  isAdmin,
  onEdit,
  onDelete,
}: {
  project: Project;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const color =
    project.status === "Completed"
      ? "#5d9c9b"
      : project.status === "Planning"
        ? "#c59a53"
        : "#648b70";

  return (
    <div className="project-row">
      <div
        className="project-color"
        style={{ background: color }}
      />

      <div className="project-main">
        <strong>{project.name}</strong>

        <span>
          {project.category || "Uncategorized"}
          {" · "}
          {project.country || "Country not set"}
        </span>
      </div>

      <div className="project-progress">
        <div className="project-progress-track">
          <div
            style={{
              width: `${project.progress}%`,
              background: color,
            }}
          />
        </div>

        <span>{project.progress}%</span>
      </div>

      <span
        className={`status-badge ${
          project.status === "Completed"
            ? "status-completed"
            : project.status === "Planning"
              ? "status-planning"
              : "status-progress"
        }`}
      >
        {project.status}
      </span>

      {isAdmin && (
        <div className="project-actions">
          <button
            className="row-more"
            title="Edit project"
            onClick={onEdit}
          >
            <Pencil size={17} />
          </button>

          <button
            className="row-more delete-action"
            title="Delete project"
            onClick={onDelete}
          >
            <Trash2 size={17} />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;