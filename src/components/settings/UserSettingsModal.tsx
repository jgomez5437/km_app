"use client";

import React, { useState } from "react";
import { AuthUser, Note, Folder } from "@/types/vault";
import {
  loadAISettings,
  STORAGE_KEY_BASE,
  StoredAISettings,
} from "@/lib/ai";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  X,
  User as UserIcon,
  Sparkles,
  Database,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  LogOut,
  LogIn,
  RefreshCw,
  Download,
  Trash2,
  Loader2,
  CheckCircle2,
  Cloud,
  CloudOff,
} from "lucide-react";

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  onUpdateUser: (user: AuthUser) => void;
  onLogout: () => void;
  onOpenAuthModal: () => void;
  syncStatus: "synced" | "syncing" | "offline";
  onManualSync: () => void;
  notes: Note[];
  folders: Folder[];
  initialTab?: "profile" | "ai" | "vault";
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  onLogout,
  onOpenAuthModal,
  syncStatus,
  onManualSync,
  notes,
  folders,
  initialTab = "profile",
}) => {
  const [activeTab, setActiveTab] = useState<"profile" | "ai" | "vault">(
    initialTab
  );

  // Sync activeTab if initialTab prop changes
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab);
    setActiveTab(initialTab);
  }

  // --- Profile State ---
  const [name, setName] = useState(currentUser?.name || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Keep name/email synced when currentUser changes
  const [prevUserId, setPrevUserId] = useState<string | undefined>(
    currentUser?.id
  );
  if (currentUser?.id !== prevUserId) {
    setPrevUserId(currentUser?.id);
    setName(currentUser?.name || "");
    setEmail(currentUser?.email || "");
  }

  // --- AI Settings State ---
  const storageKey = `${STORAGE_KEY_BASE}${currentUser?.id || "local"}`;
  const initialAI: StoredAISettings = loadAISettings(currentUser?.id);
  const [provider, setProvider] = useState<
    "openai" | "gemini" | "local-ollama"
  >(initialAI.provider);
  const [endpoint, setEndpoint] = useState(initialAI.endpoint);
  const [openaiKey, setOpenaiKey] = useState(initialAI.openaiKey);
  const [geminiKey, setGeminiKey] = useState(initialAI.geminiKey);
  const [model, setModel] = useState(initialAI.model);
  const [showKey, setShowKey] = useState(false);
  const [aiSavedFeedback, setAiSavedFeedback] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Reload settings and reset tab when modal opens
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setActiveTab(initialTab);
      const currentAI = loadAISettings(currentUser?.id);
      setProvider(currentAI.provider);
      setEndpoint(currentAI.endpoint);
      setOpenaiKey(currentAI.openaiKey);
      setGeminiKey(currentAI.geminiKey);
      setModel(currentAI.model);
    }
  }

  if (!isOpen) return null;

  const saveAISettings = (override?: Partial<StoredAISettings>) => {
    if (typeof window === "undefined") return;
    const payload: StoredAISettings = {
      provider: override?.provider ?? provider,
      openaiKey: override?.openaiKey ?? openaiKey,
      geminiKey: override?.geminiKey ?? geminiKey,
      endpoint: override?.endpoint ?? endpoint,
      model: override?.model ?? model,
    };
    try {
      const serialized = JSON.stringify(payload);
      localStorage.setItem(storageKey, serialized);
      localStorage.setItem("astro_ai_settings_v1", serialized);
      window.dispatchEvent(new Event("astro_ai_settings_updated"));
      setAiSavedFeedback(true);
      setTimeout(() => setAiSavedFeedback(false), 2500);
    } catch (e) {
      console.error("Failed to save AI settings:", e);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setProfileError(null);
    setProfileSuccess(null);
    setProfileLoading(true);

    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile.");
      }

      if (data.user) {
        onUpdateUser(data.user);
      }
      setCurrentPassword("");
      setNewPassword("");
      setProfileSuccess("Profile updated successfully.");
    } catch (err: unknown) {
      setProfileError(
        err instanceof Error ? err.message : "Failed to update profile."
      );
    } finally {
      setProfileLoading(false);
    }
  };

  const handleExportVault = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      folders,
      notes,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `astro-vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearLocalCache = () => {
    localStorage.removeItem("nexus_vault_notes_v3");
    localStorage.removeItem("nexus_vault_folders_v3");
    localStorage.removeItem("nexus_vault_deleted_notes_v1");
    localStorage.removeItem("nexus_vault_deleted_folders_v1");
    localStorage.removeItem("nexus_vault_collapsed_folders_v1");
    localStorage.removeItem("nexus_vault_collapsed_notes_v1");
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-[#0B0F19] border border-slate-800/80 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[90dvh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-[#06080F]/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
              {currentUser?.name ? currentUser.name[0].toUpperCase() : "U"}
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                User & Vault Settings
              </h2>
              <p className="text-xs text-slate-400">
                {currentUser ? currentUser.email : "Local Storage Mode"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
            title="Close Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-800/80 flex gap-2 bg-[#0B0F19]">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "profile"
                ? "bg-sky-950/70 text-sky-200 border border-sky-800/60"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Profile & Account</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "ai"
                ? "bg-sky-950/70 text-sky-200 border border-sky-800/60"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Engine</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("vault")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "vault"
                ? "bg-sky-950/70 text-sky-200 border border-sky-800/60"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Vault & Sync</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm custom-scrollbar">
          {/* TAB 1: PROFILE & ACCOUNT */}
          {activeTab === "profile" && (
            <>
              {currentUser ? (
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  {profileError && (
                    <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-xl flex items-start gap-2 text-xs text-red-300">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <span>{profileError}</span>
                    </div>
                  )}
                  {profileSuccess && (
                    <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{profileSuccess}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-3.5 py-2.5 bg-[#06080F] border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#06080F] border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 space-y-3">
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Change Password (Optional)
                    </span>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Required only if changing password"
                        className="w-full px-3.5 py-2 bg-[#06080F] border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        className="w-full px-3.5 py-2 bg-[#06080F] border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500 transition"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        onLogout();
                        onClose();
                      }}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/50 text-xs font-semibold transition"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </button>

                    <button
                      type="submit"
                      disabled={profileLoading}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
                    >
                      {profileLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-4 rounded-xl bg-[#06080F] border border-slate-800 space-y-3 text-center">
                  <Cloud className="w-8 h-8 text-sky-400 mx-auto" />
                  <div>
                    <h4 className="font-semibold text-white text-sm">
                      You are in Local Mode
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Sign in or create an account to back up your notes to Neon
                      PostgreSQL and sync across devices.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAuthModal();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold transition"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Sign In / Create Account</span>
                  </button>
                </div>
              )}
            </>
          )}

          {/* TAB 2: AI ENGINE */}
          {activeTab === "ai" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  AI Provider & Credentials
                </span>
                {aiSavedFeedback && (
                  <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Saved</span>
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  AI Provider
                </label>
                <select
                  value={provider}
                  onChange={(e) => {
                    const nextProvider = e.target.value as
                      | "openai"
                      | "gemini"
                      | "local-ollama";
                    setProvider(nextProvider);
                    const defaultModel =
                      nextProvider === "gemini"
                        ? "gemini-2.5-flash"
                        : nextProvider === "openai"
                        ? "gpt-4o-mini"
                        : "";
                    setModel(defaultModel);
                    saveAISettings({
                      provider: nextProvider,
                      model: defaultModel,
                    });
                  }}
                  className="w-full bg-[#06080F] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sky-500 transition"
                >
                  <option value="gemini">
                    Google Gemini (Gemini 2.5 Flash / Pro)
                  </option>
                  <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
                  <option value="local-ollama">
                    Ollama (100% Local & Private)
                  </option>
                </select>
              </div>

              {provider === "local-ollama" ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Ollama Endpoint
                    </label>
                    <input
                      type="text"
                      value={endpoint}
                      onChange={(e) => setEndpoint(e.target.value)}
                      onBlur={() => saveAISettings()}
                      placeholder="http://localhost:11434"
                      className="w-full bg-[#06080F] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sky-500 transition"
                    />
                    <p className="text-xs text-slate-500 mt-1.5">
                      Default: http://localhost:11434 (zero telemetry, runs locally on your machine).
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Model Name
                    </label>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      onBlur={() => saveAISettings()}
                      placeholder="llama3, mistral, deepseek-r1"
                      className="w-full bg-[#06080F] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 font-mono focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        {provider === "gemini"
                          ? "Google Gemini API Key"
                          : "OpenAI API Key"}
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                      >
                        {showKey ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                        <span>{showKey ? "Hide" : "Show"}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showKey ? "text" : "password"}
                        placeholder={
                          provider === "gemini" ? "AIzaSy..." : "sk-..."
                        }
                        value={provider === "gemini" ? geminiKey : openaiKey}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (provider === "gemini") {
                            setGeminiKey(val);
                            saveAISettings({ geminiKey: val });
                          } else {
                            setOpenaiKey(val);
                            saveAISettings({ openaiKey: val });
                          }
                        }}
                        onBlur={() => saveAISettings()}
                        className="w-full bg-[#06080F] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 font-mono focus:outline-none focus:border-sky-500 transition pr-14"
                      />
                      {(provider === "gemini" ? geminiKey : openaiKey) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (provider === "gemini") {
                              setGeminiKey("");
                              saveAISettings({ geminiKey: "" });
                            } else {
                              setOpenaiKey("");
                              saveAISettings({ openaiKey: "" });
                            }
                          }}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 text-xs px-1.5 py-0.5 rounded hover:bg-slate-800"
                          title="Clear key"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5">
                      Your key is persisted securely in your local browser storage and never logged in the database.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Model
                    </label>
                    {provider === "gemini" ? (
                      <select
                        value={
                          ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"].includes(model || "gemini-2.5-flash")
                            ? model || "gemini-2.5-flash"
                            : "custom"
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "custom") {
                            setModel("");
                            saveAISettings({ model: "" });
                          } else {
                            setModel(val);
                            saveAISettings({ model: val });
                          }
                        }}
                        className="w-full bg-[#06080F] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sky-500 transition"
                      >
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended: Fast & Intelligent)</option>
                        <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep Reasoning & Analysis)</option>
                        <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast Multimodal)</option>
                        <option value="custom">Custom Model Identifier...</option>
                      </select>
                    ) : (
                      <select
                        value={
                          ["gpt-4o-mini", "gpt-4o", "o3-mini"].includes(model || "gpt-4o-mini")
                            ? model || "gpt-4o-mini"
                            : "custom"
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "custom") {
                            setModel("");
                            saveAISettings({ model: "" });
                          } else {
                            setModel(val);
                            saveAISettings({ model: val });
                          }
                        }}
                        className="w-full bg-[#06080F] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sky-500 transition"
                      >
                        <option value="gpt-4o-mini">GPT-4o mini (Recommended: Fast & Efficient)</option>
                        <option value="gpt-4o">GPT-4o (Flagship Omni)</option>
                        <option value="o3-mini">o3-mini (Advanced Reasoning)</option>
                        <option value="custom">Custom Model Identifier...</option>
                      </select>
                    )}

                    {/* Show custom text input if custom selected */}
                    {!["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash", "gpt-4o-mini", "gpt-4o", "o3-mini"].includes(model) && (
                      <input
                        type="text"
                        value={model}
                        onChange={(e) => {
                          setModel(e.target.value);
                          saveAISettings({ model: e.target.value });
                        }}
                        onBlur={() => saveAISettings()}
                        placeholder={provider === "gemini" ? "e.g. gemini-2.5-flash" : "e.g. gpt-4o-mini"}
                        className="w-full mt-2 bg-[#06080F] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 font-mono focus:outline-none focus:border-sky-500 transition"
                      />
                    )}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => saveAISettings()}
                className="w-full py-2.5 px-4 rounded-xl bg-sky-950/60 hover:bg-sky-900/60 text-sky-300 border border-sky-800/60 font-semibold text-xs transition flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Save AI Settings</span>
              </button>
            </div>
          )}

          {/* TAB 3: VAULT & SYNC */}
          {activeTab === "vault" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#06080F] border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {syncStatus === "syncing" ? (
                    <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />
                  ) : currentUser ? (
                    <Cloud className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <CloudOff className="w-5 h-5 text-slate-500" />
                  )}
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {currentUser ? "Cloud Sync Enabled" : "Local Storage Only"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {notes.length} notes · {folders.length} folders
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onManualSync}
                  className="px-3 py-1.5 rounded-lg bg-sky-950/60 hover:bg-sky-900/60 text-sky-300 border border-sky-800/60 text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{currentUser ? "Sync Now" : "Sign In"}</span>
                </button>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleExportVault}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#06080F] hover:bg-slate-800/60 border border-slate-800 text-slate-200 text-xs font-semibold transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Download className="w-4 h-4 text-sky-400" />
                    <span>Export Vault Backup (.json)</span>
                  </div>
                  <span className="text-slate-500">Download</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsResetConfirmOpen(true)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#06080F] hover:bg-red-950/30 border border-slate-800 hover:border-red-800/50 text-red-300 text-xs font-semibold transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <span>Reset Local Browser Cache</span>
                  </div>
                  <span className="text-slate-500">Reset</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reset Cache Confirmation Modal */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        title="Reset Local Browser Cache"
        message="Are you sure you want to clear your local browser storage cache and reload? Make sure any local changes are synced to cloud storage first."
        confirmLabel="Reset & Reload"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleClearLocalCache}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
};
