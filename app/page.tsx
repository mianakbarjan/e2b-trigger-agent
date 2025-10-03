"use client";

import { useState } from "react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [jobId, setJobId] = useState("");
  const [status, setStatus] = useState("");
  const [appUrl, setAppUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<Array<{path: string; content: string}>>([]);
  const [terminalOutput, setTerminalOutput] = useState<Array<{type: string; content: string; timestamp: string}>>([]);
  const [progress, setProgress] = useState<{step: number; total: number; status: string; detail?: string} | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['app']));
  const [sandboxId, setSandboxId] = useState<string>("");

  const handleCleanup = async () => {
    if (!sandboxId) return;
    
    if (!confirm('Are you sure you want to terminate this sandbox?')) return;
    
    try {
      const response = await fetch('/api/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sandboxId }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('Sandbox terminated successfully');
        setSandboxId("");
        setAppUrl("");
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert('Failed to cleanup sandbox');
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setStatus("Starting...");
    setAppUrl("");
    setFiles([]);
    setTerminalOutput([]);
    setSelectedFile(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      setJobId(data.jobId);
      setStatus("Generating... This will take 3-5 minutes.");

      pollStatus(data.jobId);
    } catch (error) {
      setStatus("Error: " + error);
      setLoading(false);
    }
  };

  const pollStatus = async (id: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/status?jobId=${id}`);
        const data = await response.json();

        if (data.progress) {
          setProgress(data.progress);
          setStatus(data.progress.status + (data.progress.detail ? ` - ${data.progress.detail}` : ''));
        } else {
          setStatus(`Status: ${data.status}`);
        }

        if (data.output?.files) {
          setFiles(data.output.files.filter((f: { operation?: string }) => f.operation === 'created'));
        }
        if (data.output?.terminalOutput) {
          setTerminalOutput(prev => {
            const existing = new Set(prev.map(o => o.timestamp + o.content));
            const newOutputs = data.output.terminalOutput.filter(
              (o: {timestamp: string; content: string}) => !existing.has(o.timestamp + o.content)
            );
            return [...prev, ...newOutputs];
          });
        }

        if (data.status === "COMPLETED" && data.output) {
          clearInterval(interval);
          setAppUrl(data.output.appUrl);
          setSandboxId(data.output.sandboxId || "");
          setStatus("✅ Complete! Your app is running.");
          setLoading(false);
        } else if (data.status === "FAILED") {
          clearInterval(interval);
          setStatus("❌ Failed: " + (data.error || "Unknown error"));
          setLoading(false);
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 3000);

    setTimeout(() => clearInterval(interval), 900000);
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const buildFileTree = () => {
    const tree: any = {};
    files.forEach(file => {
      const cleanPath = file.path.replace('/home/user/app/', '');
      const parts = cleanPath.split('/');
      let current = tree;
      parts.forEach((part, i) => {
        if (i === parts.length - 1) {
          current[part] = file;
        } else {
          current[part] = current[part] || {};
          current = current[part];
        }
      });
    });
    return tree;
  };

  const renderFileTree = (tree: any, path: string = '') => {
    return Object.keys(tree).sort().map(key => {
      const fullPath = path ? `${path}/${key}` : key;
      const item = tree[key];
      
      if (item.path) {
        return (
          <div
            key={fullPath}
            onClick={() => setSelectedFile(item.path)}
            className={`flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-gray-700 text-xs ${
              selectedFile === item.path ? 'bg-blue-600 text-white' : 'text-gray-200'
            }`}
            style={{ paddingLeft: `${(path.split('/').filter(p => p).length) * 12 + 8}px` }}
          >
            <span className="text-xs">📄</span>
            <span className="font-mono">{key}</span>
          </div>
        );
      } else {
        const isExpanded = expandedFolders.has(fullPath);
        return (
          <div key={fullPath}>
            <div
              onClick={() => toggleFolder(fullPath)}
              className="flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-gray-700 text-xs text-gray-200"
              style={{ paddingLeft: `${(path.split('/').filter(p => p).length) * 12 + 8}px` }}
            >
              <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
              <span className="font-mono font-semibold">{key}</span>
            </div>
            {isExpanded && renderFileTree(item, fullPath)}
          </div>
        );
      }
    });
  };

  const selectedFileContent = files.find(f => f.path === selectedFile)?.content || '';
  const fileTree = buildFileTree();

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">✨</span>
          <h1 className="text-lg font-semibold text-white">AI App Generator</h1>
        </div>
        <div className="flex items-center gap-4">
          {sandboxId && (
            <button
              onClick={handleCleanup}
              className="text-sm px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
            >
              Terminate Sandbox
            </button>
          )}
          {appUrl && (
            <a
              href={appUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-400 hover:underline font-mono"
            >
              {appUrl}
            </a>
          )}
        </div>
      </header>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Chat (1/3 width) */}
        <div className="w-1/3 bg-gray-800 border-r border-gray-700 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-700">
            <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              💬 CHAT
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* User Message */}
            {prompt && (
              <div className="bg-gray-700 rounded-lg p-3">
                <p className="text-sm text-gray-200">{prompt}</p>
              </div>
            )}

            {/* Assistant Response */}
            {(loading || status) && (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-lg">🤖</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-300 mb-2">Assistant (Claude Sonnet 4.5)</p>
                    
                    {progress && (
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <div className="w-full bg-gray-700 rounded-full h-1.5">
                            <div 
                              className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${(progress.step / progress.total) * 100}%` }}
                            />
                          </div>
                          <span className="whitespace-nowrap">{progress.step}/{progress.total}</span>
                        </div>
                      </div>
                    )}

                    <div className="text-sm text-gray-300 space-y-2">
                      <p>{status}</p>
                      {files.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-700">
                          <p className="font-semibold mb-2">📁 Uploaded files</p>
                          <ul className="space-y-1 text-xs font-mono">
                            {files.slice(0, 8).map((f, i) => (
                              <li key={i} className="flex items-center gap-1 text-gray-400">
                                <span className="text-green-500">✓</span>
                                {f.path.replace('/home/user/app/', '')}
                              </li>
                            ))}
                            {files.length > 8 && (
                              <li className="text-gray-500">+ {files.length - 8} more files</li>
                            )}
                          </ul>
                        </div>
                      )}
                      {terminalOutput.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-700">
                          <p className="font-semibold mb-2">🔧 Running in background</p>
                          <p className="text-xs text-gray-400 font-mono">pnpm run dev</p>
                        </div>
                      )}
                      {appUrl && (
                        <div className="mt-3 pt-3 border-t border-gray-700">
                          <p className="font-semibold mb-2">🔗 Get Sandbox URL</p>
                          <a href={appUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-xs break-all font-mono">
                            {appUrl}
                          </a>
                          <p className="text-xs text-gray-500 mt-2">
                            Perfect! Your Pokemon search app is ready
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-700 p-4">
            <div className="flex gap-2">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 text-gray-200 placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                rows={2}
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (prompt.trim() && !loading) handleGenerate();
                  }
                }}
              />
              <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                className="px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                ➤
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Sandbox View (2/3 width, split into 3 sections) */}
        <div className="w-2/3 flex flex-col">
          {/* Top 1/3 - Website Preview */}
          <div className="h-1/3 bg-white border-b border-gray-700 flex flex-col">
            <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-300 font-mono">
                {appUrl || 'Waiting for app...'}
              </span>
              {appUrl && (
                <div className="flex items-center gap-2">
                  <button className="p-1 hover:bg-gray-700 rounded">
                    <span className="text-gray-400 text-xs">🔄</span>
                  </button>
                  <button className="p-1 hover:bg-gray-700 rounded">
                    <span className="text-gray-400 text-xs">🗗</span>
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              {appUrl ? (
                <iframe
                  src={appUrl}
                  className="w-full h-full"
                  title="Generated App Preview"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-900">
                  <p className="text-gray-500 text-sm">Generate an app to see preview</p>
                </div>
              )}
            </div>
          </div>

          {/* Middle 1/3 - File System */}
          <div className="h-1/3 bg-gray-900 border-b border-gray-700 flex">
            {/* File Tree */}
            <div className="w-1/3 border-r border-gray-700 flex flex-col">
              <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
                <h3 className="text-xs font-semibold text-gray-300">📁 SANDBOX REMOTE FILESYSTEM</h3>
              </div>
              <div className="flex-1 overflow-y-auto bg-gray-900">
                {files.length > 0 ? (
                  <div className="py-1">
                    {renderFileTree(fileTree)}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 p-4">No files yet</p>
                )}
              </div>
            </div>

            {/* File Content */}
            <div className="flex-1 flex flex-col bg-gray-900">
              <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
                <span className="text-xs font-mono text-gray-400">
                  {selectedFile ? selectedFile.replace('/home/user/app/', '') : 'Select a file'}
                </span>
                {selectedFile && (
                  <button
                    onClick={() => navigator.clipboard.writeText(selectedFileContent)}
                    className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
                  >
                    Copy
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-auto">
                {selectedFileContent ? (
                  <pre className="p-4 text-xs font-mono text-gray-300 leading-relaxed">
                    {selectedFileContent}
                  </pre>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-sm text-gray-500">Select a file to view contents</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom 1/3 - Terminal Output */}
          <div className="h-1/3 bg-black flex flex-col">
            <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
              <h3 className="text-xs font-semibold text-gray-300">📟 SANDBOX REMOTE OUTPUT</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-0.5">
              {terminalOutput.length > 0 ? (
                terminalOutput.map((log, i) => (
                  <div key={i} className={log.type === 'stderr' ? 'text-red-400' : 'text-green-400'}>
                    {log.content}
                  </div>
                ))
              ) : (
                <p className="text-gray-600">Waiting for terminal output...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}