"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Folder,
  FolderOpen,
  FileText,
  Download,
  GitFork,
  ChevronRight,
  ChevronDown,
  X,
  FolderClosed,
} from "lucide-react";
import TerminalText from "./TerminalText";

interface FileItem {
  name: string;
  path: string;
  type: "file" | "dir";
  size: number;
}

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children: TreeNode[];
  expanded: boolean;
  loaded: boolean;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(name: string, isDir: boolean) {
  if (isDir) return <Folder size={14} className="text-ossuary-yellow" />;

  const ext = name.split(".").pop()?.toLowerCase();
  const iconMap: Record<string, string> = {
    js: "text-yellow-400",
    jsx: "text-yellow-400",
    ts: "text-blue-400",
    tsx: "text-blue-400",
    py: "text-green-400",
    rb: "text-red-400",
    go: "text-cyan-400",
    rs: "text-orange-400",
    json: "text-gray-400",
    md: "text-gray-300",
    txt: "text-gray-300",
    yml: "text-pink-400",
    yaml: "text-pink-400",
    toml: "text-pink-400",
  };

  return (
    <FileText
      size={14}
      className={iconMap[ext || ""] || "text-ossuary-grey"}
    />
  );
}

function isTextFile(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase();
  return [
    "md", "txt", "js", "jsx", "ts", "tsx", "py", "rb", "go", "rs", 
    "json", "yml", "yaml", "toml", "html", "css", "scss", "sh", "bash", "zsh",
    "c", "cpp", "h", "hpp", "java", "kt", "swift", "cs", "php",
    "vue", "svelte", "tsx", "jsx", "tsx",
    "lock", "prop", "gitignore", "env", "editorconfig", "prettierrc", "eslintrc",
    "xml", "gradle", "properties"
  ].includes(ext || "");
}

export default function ExtractPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const repo = searchParams.get("repo") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repoData, setRepoData] = useState<{
    owner: string;
    repo: string;
    readme: string | null;
    files: FileItem[];
  } | null>(null);

  const [currentPath, setCurrentPath] = useState("");
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [selectedContent, setSelectedContent] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [viewMode, setViewMode] = useState<"readme" | "file">("readme");
  const [readmeContent, setReadmeContent] = useState<string | null>(null);

  const { data: session, status } = useSession();
  const loggedIn = status === "authenticated";

  useEffect(() => {
    if (!loggedIn) {
      router.push("/login");
    }
  }, [loggedIn, router]);

  const fetchContents = useCallback(
    async (path: string) => {
      if (!repo) return;

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ repo });
        if (path) params.set("path", path);

        const res = await fetch(`/api/extract?${params.toString()}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to fetch contents");
          return;
        }

        setRepoData({
          owner: data.owner,
          repo: data.repo,
          readme: data.readme,
          files: data.files || [],
        });

        if (data.readme && !readmeContent) {
          setReadmeContent(data.readme);
        }
      } catch (err) {
        setError("Failed to load repository");
      } finally {
        setLoading(false);
      }
    },
    [repo]
  );

  const fetchTree = useCallback(
    async (path: string): Promise<TreeNode[]> => {
      if (!repo) return [];

      try {
        const params = new URLSearchParams({ repo });
        if (path) params.set("path", path);

        const res = await fetch(`/api/extract?${params.toString()}`);
        const data = await res.json();

        if (!res.ok) return [];

        const files: FileItem[] = data.files || [];
        return files
          .filter((f: FileItem) => f.type === "dir")
          .map((f: FileItem) => ({
            name: f.name,
            path: f.path,
            type: f.type,
            children: [],
            expanded: false,
            loaded: false,
          }));
      } catch {
        return [];
      }
    },
    [repo]
  );

  const buildTree = useCallback(async () => {
    if (!repo) return;

    const rootFolders = await fetchTree("");
    setTree({
      name: repo.split("/")[1] || "",
      path: "",
      type: "dir",
      children: rootFolders,
      expanded: true,
      loaded: true,
    });
  }, [repo, fetchTree]);

  useEffect(() => {
    if (repo) {
      setViewMode("readme");
      setSelectedFile(null);
      setSelectedContent(null);
      setReadmeContent(null);
      fetchContents("");
      buildTree();
    }
  }, [repo, fetchContents, buildTree]);

  function handleNavigate(path: string) {
    setCurrentPath(path);
    setViewMode("readme");
    setSelectedFile(null);
    setSelectedContent(null);
    fetchContents(path);
  }

  async function toggleFolder(nodePath: string) {
    if (!tree) return;

    function traverse(nodes: TreeNode[]): TreeNode[] {
      return nodes.map((node) => {
        if (node.path === nodePath && node.type === "dir") {
          if (!node.loaded) {
            fetchTree(node.path).then((children) => {
              setTree((prev) => {
                if (!prev) return prev;
                return updateTreeNode(prev, nodePath, children);
              });
            });
            return { ...node, expanded: !node.expanded, loaded: true };
          }
          return { ...node, expanded: !node.expanded };
        }
        if (node.children.length > 0) {
          return { ...node, children: traverse(node.children) };
        }
        return node;
      });
    }

    setTree((prev) => (prev ? traverse([prev])[0] : prev));
  }

  function updateTreeNode(root: TreeNode, targetPath: string, children: TreeNode[]): TreeNode {
    if (root.path === targetPath) {
      return { ...root, children };
    }
    return {
      ...root,
      children: root.children.map((child) => updateTreeNode(child, targetPath, children)),
    };
  }

  function renderTreeNode(node: TreeNode, depth: number = 0): React.ReactNode {
    const isExpanded = node.expanded;
    const isActive = node.path === currentPath;

    return (
      <div key={node.path}>
        <button
          onClick={() => {
            if (node.type === "dir") {
              toggleFolder(node.path);
              handleNavigate(node.path);
            }
          }}
          className={`w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-ossuary-panel transition-colors ${
            isActive ? "bg-ossuary-panel" : ""
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {node.type === "dir" && (
            <span className="text-ossuary-greyDark">
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
          )}
          <Folder size={12} className="text-ossuary-yellow" />
          <span className={`text-[10px] font-mono truncate ${isActive ? "text-ossuary-yellow" : "text-ossuary-grey"}`}>
            {node.name}
          </span>
        </button>
        {node.type === "dir" && isExpanded && node.children.length > 0 && (
          <div>{node.children.map((child) => renderTreeNode(child, depth + 1))}</div>
        )}
      </div>
    );
  }

  function handleSelectFile(file: FileItem) {
    setSelectedFile(file);
    setViewMode("file");
    setSelectedContent(null);
    loadFileContent(file);
  }

  async function loadFileContent(file: FileItem) {
    if (!repo || file.type !== "file") return;

    const owner = repo.split("/")[0];
    const repoName = repo.split("/")[1];
    const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
    
    const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${filePath}`;

    setLoadingFile(true);
    try {
      const res = await fetch(apiUrl);
      if (res.ok) {
        const data = await res.json();
        
        if (data.content) {
          const content = atob(data.content);
          setSelectedContent(content);
        } else if (data.download_url) {
          const rawRes = await fetch(data.download_url);
          if (rawRes.ok) {
            const content = await rawRes.text();
            setSelectedContent(content);
          } else {
            setSelectedContent("// Unable to load file content");
          }
        } else {
          setSelectedContent("// Unable to load file content - no content available");
        }
      } else {
        setSelectedContent("// Unable to load file content");
      }
    } catch {
      setSelectedContent("// Unable to load file content");
    } finally {
      setLoadingFile(false);
    }
  }

  async function handleLootFile(file: FileItem) {
    if (!repo) return;

    const owner = repo.split("/")[0];
    const repoName = repo.split("/")[1];
    const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;

    try {
      const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${filePath}`;
      const res = await fetch(apiUrl, {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!res.ok) {
        alert("Failed to fetch file for download");
        return;
      }

      const data = await res.json();
      let content: string;

      if (data.content) {
        content = atob(data.content);
      } else if (data.download_url) {
        const rawRes = await fetch(data.download_url);
        if (!rawRes.ok) {
          alert("Failed to download file");
          return;
        }
        content = await rawRes.text();
      } else {
        alert("Unable to download file");
        return;
      }

      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const lootRes = await fetch("/api/loot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoName,
          repoOwner: owner,
          itemName: file.name,
          itemPath: filePath,
          type: "file",
        }),
        credentials: "include",
      });
      
      if (!lootRes.ok) {
        console.error("Failed to save loot:", await lootRes.json());
      }
    } catch {
      alert("Failed to download file");
    }
  }

  async function handleLootModule() {
    if (!repo) return;

    const owner = repo.split("/")[0];
    const repoName = repo.split("/")[1];

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "zipball", repoFullName: repo }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to download repository");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${repoName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const lootRes = await fetch("/api/loot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoName,
          repoOwner: owner,
          itemName: `${repoName}.zip`,
          itemPath: "",
          type: "repo",
        }),
        credentials: "include",
      });

      if (!lootRes.ok) {
        console.error("Failed to save loot:", await lootRes.json());
      }
    } catch {
      alert("Failed to download repository");
    }
  }

  function goBack() {
    if (currentPath.includes("/")) {
      const parts = currentPath.split("/");
      parts.pop();
      const newPath = parts.join("/");
      setCurrentPath(newPath);
      setViewMode("readme");
      setSelectedFile(null);
      setSelectedContent(null);
      fetchContents(newPath);
    } else {
      setCurrentPath("");
      setViewMode("readme");
      setSelectedFile(null);
      setSelectedContent(null);
      fetchContents("");
    }
  }

  function getPathSegments() {
    if (!currentPath) return [];
    return currentPath.split("/");
  }

  function clearSelection() {
    setViewMode("readme");
    setSelectedFile(null);
    setSelectedContent(null);
  }

  if (!repo) {
    return (
      <div className="p-6">
        <div className="text-center py-16 border border-ossuary-border">
          <p className="text-ossuary-greyDark text-sm font-mono tracking-widest mb-2">
            NO_REPOSITORY_SELECTED
          </p>
          <button
            onClick={() => router.back()}
            className="mt-4 bg-ossuary-panel border border-ossuary-border px-4 py-2 text-[10px] font-bold tracking-wider text-ossuary-white hover:bg-ossuary-yellow hover:text-ossuary-black hover:border-ossuary-yellow transition-all"
          >
            RETURN_TO_MAUSOLEUM
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[10px] text-ossuary-grey hover:text-ossuary-yellow transition-colors"
          >
            <ArrowLeft size={12} />
            BACK_TO_MAUSOLEUM
          </button>
          <span className="text-[10px] text-ossuary-greyDark tracking-wider">
            DIR: //EXTRACT_MODE
          </span>
        </div>
        <h1 className="text-3xl font-black tracking-tight mb-2 flex items-center gap-3">
          <GitFork size={28} className="text-ossuary-yellow" />
          {repo}
        </h1>
        <div className="text-[10px] text-ossuary-greyDark tracking-widest uppercase">
          {"> "}
          <TerminalText text="LOOTING_REPO_MODULES_FOR_EXTRACTION.EXE" speed={40} />
        </div>
      </div>

      {/* Breadcrumb navigation */}
      <div className="flex items-center gap-1 mb-4 text-xs">
        <button
          onClick={() => {
            setCurrentPath("");
            setViewMode("readme");
            setSelectedFile(null);
            setSelectedContent(null);
            fetchContents("");
          }}
          className="text-ossuary-grey hover:text-ossuary-yellow transition-colors"
        >
          {repo}
        </button>
        {getPathSegments().map((segment, idx) => (
          <span key={idx} className="flex items-center gap-1">
            <ChevronRight size={12} className="text-ossuary-greyDark" />
            <button
              onClick={() => {
                const newPath = getPathSegments().slice(0, idx + 1).join("/");
                setCurrentPath(newPath);
                setViewMode("readme");
                setSelectedFile(null);
                setSelectedContent(null);
                fetchContents(newPath);
              }}
              className="text-ossuary-grey hover:text-ossuary-yellow transition-colors"
            >
              {segment}
            </button>
          </span>
        ))}
      </div>

      {/* Main content area - Two panels */}
      <div className="grid grid-cols-3 gap-px bg-ossuary-border border border-ossuary-border">
        {/* Left Panel - Directory map + Files */}
        <div className="bg-[#060606] border-r border-ossuary-border col-span-1 flex flex-col">
          <div className="p-3 border-b border-ossuary-border flex items-center justify-between">
            <h2 className="text-xs font-bold tracking-wider text-ossuary-yellow flex items-center gap-2">
              <FolderClosed size={14} />
              DIRECTORY_MAP
            </h2>
            <button
              onClick={handleLootModule}
              className="bg-ossuary-yellow text-ossuary-black px-2 py-1 text-[9px] font-bold tracking-wider hover:bg-ossuary-white transition-all flex items-center gap-1"
            >
              <Download size={8} />
              LOOT MODULE
            </button>
          </div>

          {/* Directory Tree */}
          <div className="flex-1 overflow-y-auto max-h-64 border-b border-ossuary-border p-2">
            {tree && renderTreeNode(tree)}
          </div>

          {/* Current folder files - only files, no directories */}
          <div className="p-3 border-b border-ossuary-border">
            <h2 className="text-xs font-bold tracking-wider text-ossuary-yellow flex items-center gap-2">
              <FolderOpen size={14} />
              {currentPath ? currentPath : "ROOT_FILES"}
            </h2>
          </div>

          {/* Loading */}
          {loading && (
            <div className="text-center py-4">
              <p className="text-ossuary-grey text-xs font-mono tracking-widest animate-pulse">
                SCANNING_FILES...
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-center py-4 border border-ossuary-border mx-2">
              <p className="text-ossuary-red text-xs font-mono tracking-widest mb-2">
                ERROR: {error}
              </p>
            </div>
          )}

          {/* Files list - only show files, not directories */}
          {!loading && !error && repoData?.files && (
            <div className="flex-1 overflow-y-auto max-h-96">
              {currentPath && (
                <button
                  onClick={goBack}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-[#060606] text-left hover:bg-ossuary-panel transition-colors border-b border-ossuary-border"
                >
                  <ArrowLeft size={14} className="text-ossuary-grey" />
                  <span className="text-xs text-ossuary-grey">..</span>
                </button>
              )}

              {repoData.files
                .filter((f) => f.type === "file")
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((file) => (
                  <div
                    key={file.path}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-ossuary-panel transition-colors group border-b border-ossuary-border"
                  >
                    <button
                      onClick={() => handleSelectFile(file)}
                      className={`flex items-center gap-3 flex-1 text-left ${
                        selectedFile?.path === file.path ? "bg-ossuary-panel" : ""
                      }`}
                    >
                      {getFileIcon(file.name, false)}
                      <span className="text-xs text-ossuary-white font-mono truncate">
                        {file.name}
                      </span>
                      {file.size > 0 && (
                        <span className="text-[10px] text-ossuary-greyDark">
                          {formatSize(file.size)}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLootFile(file);
                      }}
                      className="opacity-0 group-hover:opacity-100 bg-ossuary-panel border border-ossuary-border px-2 py-1 text-[9px] font-bold tracking-wider text-ossuary-white hover:bg-ossuary-yellow hover:text-ossuary-black hover:border-ossuary-yellow transition-all flex items-center gap-1"
                    >
                      <Download size={8} />
                      LOOT
                    </button>
                  </div>
                ))}

              {repoData.files.filter((f) => f.type === "file").length === 0 && (
                <div className="px-4 py-4 text-center">
                  <p className="text-ossuary-greyDark text-[10px] font-mono">
                    NO_FILES_IN_THIS_FOLDER
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel - README or File content */}
        <div className="bg-[#060606] col-span-2 flex flex-col">
          <div className="p-3 border-b border-ossuary-border flex items-center justify-between">
            <h2 className="text-xs font-bold tracking-wider text-ossuary-yellow flex items-center gap-2">
              {viewMode === "readme" ? (
                <>
                  <FileText size={14} />
                  README
                </>
              ) : (
                <>
                  {selectedFile && getFileIcon(selectedFile.name, false)}
                  {selectedFile?.name || "FILE_CONTENT"}
                </>
              )}
            </h2>
            {viewMode === "file" && selectedFile && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => selectedFile && handleLootFile(selectedFile)}
                  className="bg-ossuary-panel border border-ossuary-border px-2 py-1 text-[9px] font-bold tracking-wider text-ossuary-white hover:bg-ossuary-yellow hover:text-ossuary-black hover:border-ossuary-yellow transition-all flex items-center gap-1"
                >
                  <Download size={8} />
                  LOOT
                </button>
                <button
                  onClick={clearSelection}
                  className="text-ossuary-grey hover:text-ossuary-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {viewMode === "readme" ? (
              !loading && !error && readmeContent ? (
                <pre className="text-[10px] text-ossuary-grey leading-relaxed whitespace-pre-wrap font-mono">
                  {readmeContent}
                </pre>
              ) : !loading && !error ? (
                <div className="text-center py-8">
                  <p className="text-ossuary-greyDark text-xs font-mono tracking-widest">
                    NO_README_FOUND
                  </p>
                </div>
              ) : loading ? (
                <p className="text-ossuary-grey text-xs font-mono tracking-widest animate-pulse">
                  LOADING_README...
                </p>
              ) : null
            ) : (
              <>
                {loadingFile ? (
                  <p className="text-ossuary-grey text-xs font-mono tracking-widest animate-pulse">
                    LOADING_FILE_CONTENT...
                  </p>
                ) : (
                  <pre className="text-[10px] text-ossuary-grey leading-relaxed whitespace-pre-wrap font-mono">
                    {selectedContent || "// Binary file - click LOOT to download"}
                  </pre>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}