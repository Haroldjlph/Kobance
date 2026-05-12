import { FormEvent, ReactElement, ReactNode, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  CalendarDays,
  CreditCard,
  Download,
  FileText,
  LockKeyhole,
  LogOut,
  MoreHorizontal,
  ReceiptText,
  Scale,
  ShoppingCart,
  UserPlus,
  Users
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { RealWorkspace } from "./RealWorkspace";
import { isSupabaseConfigured, supabase } from "./supabase";

type AuthMode = "login" | "register" | "forgot" | "recovery";
type DemoPage = "dashboard" | "company" | "articles" | "clients" | "suppliers" | "quotes" | "invoices" | "purchases" | "bank" | "vat" | "monthly";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

type Totals = {
  salesHt: number;
  salesTtc: number;
  purchasesHt: number;
  purchasesTtc: number;
  collectedVat: number;
  deductibleVat: number;
  vatDue: number;
  profit: number;
};

const clients = [
  { name: "Atelier Martin", email: "contact@atelier-martin.fr", phone: "01 42 10 33 20", city: "Paris", siret: "812 456 903 00018" },
  { name: "Studio Bellecour", email: "admin@bellecour.fr", phone: "04 78 44 12 90", city: "Lyon", siret: "903 118 441 00022" },
  { name: "Maison Lenoir", email: "factures@lenoir.fr", phone: "02 40 77 19 34", city: "Nantes", siret: "534 872 119 00031" }
];

const suppliers = [
  { name: "Papeterie Pro", email: "compta@papeteriepro.fr", phone: "01 55 20 11 91", city: "Paris", siret: "421 905 778 00016" },
  { name: "Web Services SAS", email: "billing@webservices.fr", phone: "03 88 71 10 10", city: "Strasbourg", siret: "790 221 104 00027" },
  { name: "Mobilier Bureau", email: "contact@mobilierbureau.fr", phone: "05 56 80 44 21", city: "Bordeaux", siret: "688 440 123 00019" }
];

const articles = [
  { reference: "CONS-01", name: "Prestation conseil", description: "Accompagnement mensuel", price: 900, vatRate: 20 },
  { reference: "WEB-01", name: "Creation site vitrine", description: "Conception et integration", price: 3200, vatRate: 20 },
  { reference: "MAINT-01", name: "Maintenance mensuelle", description: "Suivi technique et correctifs", price: 950, vatRate: 20 }
];

const quotes = [
  { date: "02/04/2026", client: "Atelier Martin", description: "Audit comptable interne", ht: 1200, vat: 240, ttc: 1440, status: "Brouillon" },
  { date: "10/04/2026", client: "Studio Bellecour", description: "Creation site vitrine", ht: 3200, vat: 640, ttc: 3840, status: "Valide" },
  { date: "23/04/2026", client: "Maison Lenoir", description: "Maintenance trimestrielle", ht: 2850, vat: 570, ttc: 3420, status: "Envoye" }
];

const sales = [
  { date: "05/04/2026", client: "Atelier Martin", description: "FAC-2026-0001 - Prestation conseil", ht: 1800, vat: 360, ttc: 2160, status: "Payee" },
  { date: "12/04/2026", client: "Studio Bellecour", description: "FAC-2026-0002 - Creation site vitrine", ht: 3200, vat: 640, ttc: 3840, status: "Emise" },
  { date: "19/04/2026", client: "Maison Lenoir", description: "FAC-2026-0003 - Maintenance mensuelle", ht: 950, vat: 190, ttc: 1140, status: "Payee" }
];

const purchases = [
  { date: "03/04/2026", supplier: "Papeterie Pro", description: "Fournitures bureau", ht: 210, vat: 42, ttc: 252, status: "Paye" },
  { date: "08/04/2026", supplier: "Web Services SAS", description: "Hebergement annuel", ht: 480, vat: 96, ttc: 576, status: "Paye" },
  { date: "17/04/2026", supplier: "Mobilier Bureau", description: "Chaise ergonomique", ht: 390, vat: 78, ttc: 468, status: "Non paye" }
];

const bankTransactions = [
  { date: "06/04/2026", label: "Virement Atelier Martin", type: "Encaissement", amount: 2160, reconciliation: "Facture FAC-2026-0001" },
  { date: "09/04/2026", label: "Hebergement Web Services", type: "Decaissement", amount: -576, reconciliation: "Achat rapproche" },
  { date: "20/04/2026", label: "Virement Maison Lenoir", type: "Encaissement", amount: 1140, reconciliation: "Facture FAC-2026-0003" }
];

const monthlyData = [
  { month: "Jan", sales: 5200, purchases: 1700, profit: 3500 },
  { month: "Fev", sales: 6100, purchases: 2100, profit: 4000 },
  { month: "Mar", sales: 7350, purchases: 2500, profit: 4850 },
  { month: "Avr", sales: 5950, purchases: 1080, profit: 4870 },
  { month: "Mai", sales: 6900, purchases: 2300, profit: 4600 },
  { month: "Juin", sales: 8100, purchases: 2950, profit: 5150 }
];

const vatByRate = [
  { rate: "20 %", salesHt: 5950, collectedVat: 1190, purchasesHt: 1080, deductibleVat: 216 },
  { rate: "10 %", salesHt: 0, collectedVat: 0, purchasesHt: 0, deductibleVat: 0 },
  { rate: "5,5 %", salesHt: 0, collectedVat: 0, purchasesHt: 0, deductibleVat: 0 },
  { rate: "0 %", salesHt: 0, collectedVat: 0, purchasesHt: 0, deductibleVat: 0 }
];

const formatEuro = (value: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);

const authNamePattern = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/;
const authSiretPattern = /^\d{14}$/;

export function App() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [activePage, setActivePage] = useState<DemoPage>("dashboard");
  const [demoMoreOpen, setDemoMoreOpen] = useState(false);
  const [name, setName] = useState("");
  const [siret, setSiret] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const recoveryUrl =
      window.location.hash.includes("type=recovery") ||
      window.location.search.includes("type=recovery");

    if (recoveryUrl) {
      setMode("recovery");
      setMessage("Choisissez votre nouveau mot de passe.");
    }

    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user;

      if (sessionUser && !recoveryUrl) {
        setUser({
          id: sessionUser.id,
          email: sessionUser.email ?? "",
          name: sessionUser.user_metadata.name ?? null
        });
      }
    });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("recovery");
        setUser(null);
        setMessage("Choisissez votre nouveau mot de passe.");
        return;
      }

      if (!session?.user) {
        setUser(null);
        return;
      }

      setUser({
        id: session.user.id,
        email: session.user.email ?? "",
        name: session.user.user_metadata.name ?? null
      });
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };

    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        Boolean(navigatorWithStandalone.standalone)
    );

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setInstallPrompt(null);
      setIsStandalone(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const totals = useMemo(() => {
    const salesHt = sales.reduce((sum, item) => sum + item.ht, 0);
    const salesTtc = sales.reduce((sum, item) => sum + item.ttc, 0);
    const purchasesHt = purchases.reduce((sum, item) => sum + item.ht, 0);
    const purchasesTtc = purchases.reduce((sum, item) => sum + item.ttc, 0);
    const collectedVat = sales.reduce((sum, item) => sum + item.vat, 0);
    const deductibleVat = purchases.reduce((sum, item) => sum + item.vat, 0);

    return {
      salesHt,
      salesTtc,
      purchasesHt,
      purchasesTtc,
      collectedVat,
      deductibleVat,
      vatDue: collectedVat - deductibleVat,
      profit: salesHt - purchasesHt
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      if (!isSupabaseConfigured) {
        setMessage("Supabase n'est pas configure.");
        return;
      }

      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin
        });

        if (error) {
          setMessage(error.message);
          return;
        }

        setMessage("Un email de reinitialisation vient d'etre envoye si ce compte existe.");
        return;
      }

      if (mode === "recovery") {
        const { error } = await supabase.auth.updateUser({ password: newPassword });

        if (error) {
          setMessage(error.message);
          return;
        }

        setMessage("Mot de passe modifie. Vous pouvez maintenant vous connecter.");
        setMode("login");
        setPassword("");
        setNewPassword("");
        await supabase.auth.signOut();
        return;
      }

      if (mode === "register") {
        if (!authNamePattern.test(name.trim())) {
          setMessage("Le nom ne doit contenir que des lettres, espaces, tirets ou apostrophes.");
          return;
        }

        if (!authSiretPattern.test(siret.replace(/\s/g, ""))) {
          setMessage("Le SIRET doit contenir exactement 14 chiffres.");
          return;
        }
      }

      const response =
        mode === "login"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                  name,
                  siret: siret.replace(/\s/g, "")
                }
              }
            });

      if (response.error) {
        const lowerMessage = response.error.message.toLowerCase();

        if (lowerMessage.includes("already") || lowerMessage.includes("registered")) {
          setMessage("Un compte existe deja avec cet email.");
        } else {
          setMessage(response.error.message);
        }
        return;
      }

      if (!response.data.session) {
        setMessage(
          mode === "register"
            ? "Compte cree. Confirmez votre email Supabase, puis connectez-vous."
            : "Connexion impossible : aucune session Supabase active."
        );
        return;
      }

      if (mode === "register" && response.data.user) {
        await supabase.from("profiles").upsert({
          user_id: response.data.user.id,
          company_name: name || response.data.user.email || email,
          siret: siret.replace(/\s/g, "")
        });
      }

      if (response.data.user) {
        setUser({
          id: response.data.user.id,
          email: response.data.user.email ?? email,
          name: response.data.user.user_metadata.name ?? (name || null)
        });
      }
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof error.response === "object" &&
        error.response !== null &&
        "data" in error.response &&
        typeof error.response.data === "object" &&
        error.response.data !== null &&
        "message" in error.response.data &&
        typeof error.response.data.message === "string"
      ) {
        setMessage(error.response.data.message);
      } else {
        setMessage(
          mode === "login"
            ? "Connexion impossible. Verifiez vos identifiants ou creez un compte."
            : "Creation du compte impossible. Verifiez les informations saisies."
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  function logout() {
    void supabase.auth.signOut();
    setUser(null);
    setPassword("");
    setNewPassword("");
    setSiret("");
    setActivePage("dashboard");
    setDemoMoreOpen(false);
  }

  function startDemo() {
    setUser({
      id: "demo",
      email: "demo@kobance.fr",
      name: "Compte demo"
    });
  }

  async function installApp() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  if (user) {
    if (user.id !== "demo") {
      return <RealWorkspace onLogout={logout} userEmail={user.email} userId={user.id} userName={user.name ?? user.email} />;
    }

    const primaryDemoPages: Array<{ page: DemoPage; icon: ReactNode; label: string }> = [
      { page: "dashboard", icon: <BarChart3 size={20} />, label: "Accueil" },
      { page: "invoices", icon: <ReceiptText size={20} />, label: "Factures" },
      { page: "purchases", icon: <ShoppingCart size={20} />, label: "Achats" },
      { page: "bank", icon: <CreditCard size={20} />, label: "Banque" }
    ];
    const secondaryDemoPages: Array<{ page: DemoPage; icon: ReactNode; label: string }> = [
      { page: "company", icon: <Building2 size={20} />, label: "Entreprise" },
      { page: "articles", icon: <FileText size={20} />, label: "Articles" },
      { page: "clients", icon: <Users size={20} />, label: "Clients" },
      { page: "suppliers", icon: <Building2 size={20} />, label: "Fournisseurs" },
      { page: "quotes", icon: <FileText size={20} />, label: "Devis" },
      { page: "vat", icon: <Scale size={20} />, label: "TVA" },
      { page: "monthly", icon: <CalendarDays size={20} />, label: "Recap" }
    ];
    const currentDemoPageLabel =
      primaryDemoPages.find((item) => item.page === activePage)?.label ??
      secondaryDemoPages.find((item) => item.page === activePage)?.label ??
      "Demo";
    const goToDemoPage = (nextPage: DemoPage) => {
      setActivePage(nextPage);
      setDemoMoreOpen(false);
    };

    return (
      <main className="app-shell dashboard-shell">
        <header className="mobile-app-header">
          <div className="mobile-brand">
            <img alt="" src="/icon-192.png" />
            <div>
              <strong>Kobance</strong>
              <span>Demo - {currentDemoPageLabel}</span>
            </div>
          </div>
          <button className="mobile-header-button" onClick={() => setDemoMoreOpen(true)} type="button">
            <MoreHorizontal size={22} />
            Plus
          </button>
        </header>
        <aside className="sidebar">
          <div>
            <p className="brand">Kobance</p>
            <p className="muted">Votre compta, sans prise de tete.</p>
            <p className="muted">Demo TPE France</p>
            <nav className="nav-list">
              <NavButton active={activePage === "dashboard"} icon={<BarChart3 size={18} />} label="Dashboard" onClick={() => goToDemoPage("dashboard")} />
              <NavButton active={activePage === "company"} icon={<Building2 size={18} />} label="Entreprise" onClick={() => goToDemoPage("company")} />
              <NavButton active={activePage === "articles"} icon={<FileText size={18} />} label="Articles" onClick={() => goToDemoPage("articles")} />
              <NavButton active={activePage === "clients"} icon={<Users size={18} />} label="Clients" onClick={() => goToDemoPage("clients")} />
              <NavButton active={activePage === "suppliers"} icon={<Building2 size={18} />} label="Fournisseurs" onClick={() => goToDemoPage("suppliers")} />
              <NavButton active={activePage === "quotes"} icon={<FileText size={18} />} label="Devis" onClick={() => goToDemoPage("quotes")} />
              <NavButton active={activePage === "invoices"} icon={<ReceiptText size={18} />} label="Factures" onClick={() => goToDemoPage("invoices")} />
              <NavButton active={activePage === "purchases"} icon={<ShoppingCart size={18} />} label="Achats" onClick={() => goToDemoPage("purchases")} />
              <NavButton active={activePage === "bank"} icon={<CreditCard size={18} />} label="Banque" onClick={() => goToDemoPage("bank")} />
              <NavButton active={activePage === "vat"} icon={<Scale size={18} />} label="TVA" onClick={() => goToDemoPage("vat")} />
              <NavButton active={activePage === "monthly"} icon={<CalendarDays size={18} />} label="Recap mensuel" onClick={() => goToDemoPage("monthly")} />
            </nav>
          </div>
          <button className="ghost-button" onClick={logout} type="button">
            <LogOut size={18} />
            Deconnexion
          </button>
        </aside>

        <section className="dashboard-content">
          {activePage === "dashboard" ? <Dashboard totals={totals} /> : null}
          {activePage === "company" ? <CompanyDemoPage /> : null}
          {activePage === "articles" ? <ArticlesDemoPage /> : null}
          {activePage === "clients" ? <DirectoryPage title="Clients" rows={clients} type="client" /> : null}
          {activePage === "suppliers" ? <DirectoryPage title="Fournisseurs" rows={suppliers} type="supplier" /> : null}
          {activePage === "quotes" ? <InvoicesPage title="Devis" rows={quotes} partyLabel="Client" partyKey="client" /> : null}
          {activePage === "invoices" ? <InvoicesPage title="Factures" rows={sales} partyLabel="Client" partyKey="client" /> : null}
          {activePage === "purchases" ? <InvoicesPage title="Achats" rows={purchases} partyLabel="Fournisseur" partyKey="supplier" /> : null}
          {activePage === "bank" ? <BankDemoPage /> : null}
          {activePage === "vat" ? <VatPage totals={totals} /> : null}
          {activePage === "monthly" ? <MonthlyPage totals={totals} /> : null}
        </section>
        <nav className="mobile-bottom-nav" aria-label="Navigation demo mobile">
          {primaryDemoPages.map((item) => (
            <button className={activePage === item.page ? "active" : ""} key={item.page} onClick={() => goToDemoPage(item.page)} type="button">
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
          <button className={demoMoreOpen || secondaryDemoPages.some((item) => item.page === activePage) ? "active" : ""} onClick={() => setDemoMoreOpen(true)} type="button">
            <MoreHorizontal size={20} />
            <span>Plus</span>
          </button>
        </nav>
        {demoMoreOpen ? (
          <div className="mobile-more-backdrop" onClick={() => setDemoMoreOpen(false)} role="presentation">
            <section className="mobile-more-sheet" onClick={(event) => event.stopPropagation()}>
              <div className="mobile-more-header">
                <div className="mobile-brand">
                  <img alt="" src="/icon-192.png" />
                  <div>
                    <strong>Kobance</strong>
                    <span>Demo</span>
                  </div>
                </div>
                <button className="mobile-header-button" onClick={() => setDemoMoreOpen(false)} type="button">
                  Fermer
                </button>
              </div>
              <div className="mobile-more-grid">
                {secondaryDemoPages.map((item) => (
                  <button className={activePage === item.page ? "active" : ""} key={item.page} onClick={() => goToDemoPage(item.page)} type="button">
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
                <button className="logout-mobile-button" onClick={logout} type="button">
                  <LogOut size={20} />
                  <span>Retour</span>
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="auth-layout">
        <div className="auth-intro">
          <p className="eyebrow">Kobance</p>
          <h1>Votre compta, sans prise de tete.</h1>
          <p>
            Connectez-vous pour gerer vos clients, fournisseurs, factures, achats,
            TVA et benefices en euros.
          </p>
          {installPrompt && !isStandalone ? (
            <button className="install-button" onClick={installApp} type="button">
              <Download size={18} />
              Installer l'application
            </button>
          ) : null}
          <p className="muted" id="installation-mobile">
            Sur Android/Chrome, utilisez le bouton Installer s'il apparait. Sur iPhone, ouvrez le menu Partager de Safari, puis choisissez Ajouter a l'ecran d'accueil.
          </p>
        </div>

        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-switch" aria-label="Choix du mode d'authentification">
            <button
              className={mode === "login" ? "active" : ""}
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
              type="button"
            >
              Connexion
            </button>
            <button
              className={mode === "register" ? "active" : ""}
              onClick={() => {
                setMode("register");
                setMessage("");
              }}
              type="button"
            >
              Creer un compte
            </button>
          </div>

          <div className="form-heading">
            {mode === "register" ? <UserPlus size={24} /> : <LockKeyhole size={24} />}
            <div>
              <h2>
                {mode === "register"
                  ? "Inscription"
                  : mode === "forgot"
                    ? "Mot de passe oublie"
                    : mode === "recovery"
                      ? "Nouveau mot de passe"
                      : "Connexion"}
              </h2>
              <p>
                {mode === "register"
                  ? "Creez votre premier compte utilisateur."
                  : mode === "forgot"
                    ? "Recevez un lien securise par email."
                    : mode === "recovery"
                      ? "Definissez un nouveau mot de passe."
                      : "Accedez a votre espace comptable."}
              </p>
            </div>
          </div>

          {mode === "register" ? (
            <label>
              Nom
              <input autoComplete="name" onChange={(event) => setName(event.target.value)} pattern="[A-Za-zÀ-ÖØ-öø-ÿ' -]+" title="Lettres, espaces, tirets et apostrophes uniquement." type="text" value={name} />
            </label>
          ) : null}

          {mode === "register" ? (
            <label>
              SIRET
              <input
                inputMode="numeric"
                maxLength={17}
                onChange={(event) => setSiret(event.target.value)}
                placeholder="14 chiffres"
                required
                title="SIRET attendu : exactement 14 chiffres, espaces autorises."
                type="text"
                value={siret}
              />
            </label>
          ) : null}

          <label>
            Email
            <input autoComplete="email" disabled={mode === "recovery"} onChange={(event) => setEmail(event.target.value)} required={mode !== "recovery"} type="email" value={email} />
          </label>

          {mode === "forgot" ? null : (
            <label>
              {mode === "recovery" ? "Nouveau mot de passe" : "Mot de passe"}
              <input
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={8}
                onChange={(event) => mode === "recovery" ? setNewPassword(event.target.value) : setPassword(event.target.value)}
                required
                type="password"
                value={mode === "recovery" ? newPassword : password}
              />
            </label>
          )}

          {message ? <p className="error-message">{message}</p> : null}

          <button className="primary-button" disabled={isLoading} type="submit">
            {isLoading
              ? "Veuillez patienter..."
              : mode === "register"
                ? "Creer le compte"
                : mode === "forgot"
                  ? "Envoyer le lien"
                  : mode === "recovery"
                    ? "Modifier le mot de passe"
                    : "Se connecter"}
          </button>

          {mode === "login" ? (
            <button
              className="link-button"
              onClick={() => {
                setMode("forgot");
                setMessage("");
              }}
              type="button"
            >
              Mot de passe oublie ?
            </button>
          ) : null}

          {mode !== "recovery" ? (
            <button
              className="link-button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setMessage("");
              }}
              type="button"
            >
              {mode === "login" ? "Creer un compte" : "Revenir a la connexion"}
            </button>
          ) : null}

          <button className="demo-button" onClick={startDemo} type="button">
            Voir la demo complete
          </button>
        </form>
      </section>
    </main>
  );
}

function NavButton(props: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button className={props.active ? "nav-item active" : "nav-item"} onClick={props.onClick} type="button">
      {props.icon}
      {props.label}
    </button>
  );
}

function PageHeader(props: { title: string; subtitle: string }) {
  return (
    <div className="page-header">
      <div>
        <p className="eyebrow">Mode demo</p>
        <h1>{props.title}</h1>
        <p>{props.subtitle}</p>
      </div>
      <button className="export-button" type="button">
        <Download size={18} />
        Export CSV
      </button>
    </div>
  );
}

function Dashboard({ totals }: { totals: Totals }) {
  return (
    <>
      <PageHeader title="Dashboard" subtitle="Vue mensuelle avril 2026 avec factures, achats, TVA et tresorerie de presentation." />
      <div className="metrics-grid">
        <Metric label="CA du mois HT" value={formatEuro(totals.salesHt)} />
        <Metric label="Achats du mois HT" value={formatEuro(totals.purchasesHt)} />
        <Metric label="TVA a declarer" value={formatEuro(totals.vatDue)} />
        <Metric label="Benefice estime" value={formatEuro(totals.profit)} />
      </div>
      <div className="chart-grid">
        <ChartCard title="Factures et achats mensuels">
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => formatEuro(Number(value))} />
            <Bar dataKey="sales" fill="#21725e" name="Factures HT" />
            <Bar dataKey="purchases" fill="#d97706" name="Achats HT" />
          </BarChart>
        </ChartCard>
        <ChartCard title="Benefices mensuels">
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => formatEuro(Number(value))} />
            <Line dataKey="profit" name="Benefice HT" stroke="#1849a9" strokeWidth={3} />
          </LineChart>
        </ChartCard>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function ChartCard({ children, title }: { children: ReactElement; title: string }) {
  return (
    <section className="chart-card">
      <h2>{title}</h2>
      <div className="chart-area">
        <ResponsiveContainer height="100%" width="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function DirectoryPage({ rows, title, type }: { rows: typeof clients; title: string; type: "client" | "supplier" }) {
  return (
    <>
      <PageHeader title={title} subtitle={`Liste de ${type === "client" ? "clients" : "fournisseurs"} exemple avec SIRET et coordonnees.`} />
      <div className="toolbar">
        <input placeholder="Rechercher..." />
        <button className="primary-button" type="button">Ajouter</button>
      </div>
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Email</th>
              <th>Telephone</th>
              <th>Ville</th>
              <th>SIRET</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.siret}>
                <td>{row.name}</td>
                <td>{row.email}</td>
                <td>{row.phone}</td>
                <td>{row.city}</td>
                <td>{row.siret}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CompanyDemoPage() {
  return (
    <>
      <PageHeader title="Entreprise" subtitle="Informations legales et coordonnees utilisees sur les factures." />
      <div className="form-grid">
        <label>
          Nom de l'entreprise
          <input readOnly value="Kobance Demo SAS" />
        </label>
        <label>
          SIRET
          <input readOnly value="812 456 903 00018" />
        </label>
        <label>
          Numero TVA
          <input readOnly value="FR 32 812456903" />
        </label>
        <label>
          Adresse
          <input readOnly value="12 rue de la Paix, 75002 Paris" />
        </label>
        <label>
          Telephone
          <input readOnly value="01 42 10 33 20" />
        </label>
        <label>
          Email
          <input readOnly value="contact@kobance.fr" />
        </label>
      </div>
    </>
  );
}

function ArticlesDemoPage() {
  return (
    <>
      <PageHeader title="Articles" subtitle="Catalogue exemple pour remplir rapidement devis et factures." />
      <div className="toolbar">
        <input placeholder="Rechercher un article..." />
        <button className="primary-button" type="button">Ajouter un article</button>
      </div>
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Article</th>
              <th>Description</th>
              <th>Prix HT</th>
              <th>TVA</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((row) => (
              <tr key={row.reference}>
                <td>{row.reference}</td>
                <td>{row.name}</td>
                <td>{row.description}</td>
                <td>{formatEuro(row.price)}</td>
                <td>{row.vatRate} %</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

type InvoiceRow = {
  date: string;
  client?: string;
  supplier?: string;
  description: string;
  ht: number;
  vat: number;
  ttc: number;
  status: string;
};

function InvoicesPage({ partyKey, partyLabel, rows, title }: { partyKey: "client" | "supplier"; partyLabel: string; rows: InvoiceRow[]; title: string }) {
  const subtitle =
    title === "Devis"
      ? "Devis clients avec HT, TVA, TTC et statut de suivi."
      : title === "Achats"
        ? "Factures fournisseurs avec HT, TVA deductible, TTC et statut de paiement."
        : "Factures clients avec HT, TVA, TTC, statut et suivi de paiement.";

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="toolbar">
        <select defaultValue="04"><option value="04">Avril</option></select>
        <select defaultValue="2026"><option value="2026">2026</option></select>
        <button className="primary-button" type="button">Ajouter</button>
      </div>
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>{partyLabel}</th>
              <th>Description</th>
              <th>HT</th>
              <th>TVA</th>
              <th>TTC</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.date}-${row.description}`}>
                <td>{row.date}</td>
                <td>{row[partyKey]}</td>
                <td>{row.description}</td>
                <td>{formatEuro(row.ht)}</td>
                <td>{formatEuro(row.vat)}</td>
                <td>{formatEuro(row.ttc)}</td>
                <td><span className={row.status.includes("Non") ? "badge warning" : "badge"}>{row.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function BankDemoPage() {
  return (
    <>
      <PageHeader title="Banque" subtitle="Mouvements bancaires exemples avec rapprochement facture ou achat." />
      <div className="toolbar">
        <select defaultValue="04"><option value="04">Avril</option></select>
        <select defaultValue="2026"><option value="2026">2026</option></select>
        <button className="primary-button" type="button">Ajouter un mouvement</button>
      </div>
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Libelle</th>
              <th>Type</th>
              <th>Montant</th>
              <th>Rapprochement</th>
            </tr>
          </thead>
          <tbody>
            {bankTransactions.map((row) => (
              <tr key={`${row.date}-${row.label}`}>
                <td>{row.date}</td>
                <td>{row.label}</td>
                <td>{row.type}</td>
                <td>{formatEuro(row.amount)}</td>
                <td><span className="badge">{row.reconciliation}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function MonthlyPage({ totals }: { totals: Totals }) {
  return (
    <>
      <PageHeader title="Recap mensuel" subtitle="Avril 2026 : synthese TVA, chiffre d'affaires, achats et benefice." />
      <div className="summary-grid">
        <Metric label="Factures HT" value={formatEuro(totals.salesHt)} />
        <Metric label="Factures TTC" value={formatEuro(totals.salesTtc)} />
        <Metric label="TVA collectee" value={formatEuro(totals.collectedVat)} />
        <Metric label="Achats HT" value={formatEuro(totals.purchasesHt)} />
        <Metric label="Achats TTC" value={formatEuro(totals.purchasesTtc)} />
        <Metric label="TVA deductible" value={formatEuro(totals.deductibleVat)} />
        <Metric label="TVA a payer" value={formatEuro(totals.vatDue)} />
        <Metric label="Benefice estime" value={formatEuro(totals.profit)} />
      </div>
      <InvoicesPage title="Detail factures du mois" rows={sales} partyLabel="Client" partyKey="client" />
      <InvoicesPage title="Detail achats du mois" rows={purchases} partyLabel="Fournisseur" partyKey="supplier" />
    </>
  );
}

function VatPage({ totals }: { totals: Totals }) {
  return (
    <>
      <PageHeader title="Declaration TVA" subtitle="Preparation de la declaration de TVA pour avril 2026." />
      <div className="vat-status">
        <div>
          <p className="eyebrow">Statut</p>
          <h2>TVA a payer : {formatEuro(totals.vatDue)}</h2>
          <p>Periode du 01/04/2026 au 30/04/2026. Donnees demo non transmises a l'administration fiscale.</p>
        </div>
        <span className="badge warning">A verifier</span>
      </div>

      <div className="summary-grid">
        <Metric label="TVA collectee ventes" value={formatEuro(totals.collectedVat)} />
        <Metric label="TVA deductible achats" value={formatEuro(totals.deductibleVat)} />
        <Metric label="TVA nette" value={formatEuro(totals.vatDue)} />
        <Metric label="Base HT ventes" value={formatEuro(totals.salesHt)} />
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Taux TVA</th>
              <th>Base ventes HT</th>
              <th>TVA collectee</th>
              <th>Base achats HT</th>
              <th>TVA deductible</th>
              <th>TVA nette</th>
            </tr>
          </thead>
          <tbody>
            {vatByRate.map((row) => (
              <tr key={row.rate}>
                <td>{row.rate}</td>
                <td>{formatEuro(row.salesHt)}</td>
                <td>{formatEuro(row.collectedVat)}</td>
                <td>{formatEuro(row.purchasesHt)}</td>
                <td>{formatEuro(row.deductibleVat)}</td>
                <td>{formatEuro(row.collectedVat - row.deductibleVat)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="declaration-panel">
        <h2>Controle avant declaration</h2>
        <ul>
          <li>Verifier que toutes les ventes du mois sont saisies.</li>
          <li>Verifier que les factures fournisseurs sont eligibles a la TVA deductible.</li>
          <li>Exporter le recap TVA et conserver les justificatifs.</li>
        </ul>
      </div>
    </>
  );
}

function YearlyPage() {
  return (
    <>
      <PageHeader title="Recap annuel" subtitle="Tableau mois par mois avec totaux annuels et graphiques." />
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Mois</th>
              <th>CA HT</th>
              <th>Achats HT</th>
              <th>TVA a declarer</th>
              <th>Benefice</th>
            </tr>
          </thead>
          <tbody>
            {monthlyData.map((row) => (
              <tr key={row.month}>
                <td>{row.month}</td>
                <td>{formatEuro(row.sales)}</td>
                <td>{formatEuro(row.purchases)}</td>
                <td>{formatEuro((row.sales - row.purchases) * 0.2)}</td>
                <td>{formatEuro(row.profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="chart-grid">
        <ChartCard title="CA HT annuel">
          <BarChart data={monthlyData}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => formatEuro(Number(value))} />
            <Bar dataKey="sales" fill="#21725e" />
          </BarChart>
        </ChartCard>
        <ChartCard title="Benefice annuel">
          <LineChart data={monthlyData}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => formatEuro(Number(value))} />
            <Line dataKey="profit" stroke="#1849a9" strokeWidth={3} />
          </LineChart>
        </ChartCard>
      </div>
    </>
  );
}
