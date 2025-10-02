"use client";

import { useState } from "react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [jobId, setJobId] = useState("");
  const [status, setStatus] = useState("");
  const [appUrl, setAppUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setStatus("Starting...");
    setAppUrl("");

    try {
      // Start the workflow
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      setJobId(data.jobId);
      setStatus("Generating... This will take 3-5 minutes.");

      // Poll for status
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

        setStatus(`Status: ${data.status}`);

        if (data.status === "COMPLETED" && data.output) {
          clearInterval(interval);
          setAppUrl(data.output.appUrl);
          setStatus("✅ Complete! Click the link below to view your app.");
          setLoading(false);
        } else if (data.status === "FAILED") {
          clearInterval(interval);
          setStatus("❌ Failed: " + (data.error || "Unknown error"));
          setLoading(false);
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 3000); // Poll every 3 seconds

    // Stop polling after 15 minutes
    setTimeout(() => clearInterval(interval), 900000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          🚀 AI App Generator
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Generate and run a complete Next.js app in an E2B sandbox
        </p>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What would you like to build?
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., A todo list with add, delete, and complete functionality"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 bg-white placeholder-gray-500"
            rows={4}
            disabled={loading}
          />

          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {loading ? "Generating..." : "Generate App"}
          </button>
        </div>

        {status && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="font-semibold text-lg mb-2">Status</h2>
            <p className="text-gray-700">{status}</p>
            {jobId && (
              <p className="text-sm text-gray-500 mt-2">Job ID: {jobId}</p>
            )}
          </div>
        )}

        {appUrl && (
          <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6">
            <h2 className="font-semibold text-lg mb-2 text-green-800">
              🎉 Your App is Live!
            </h2>
            <a
              href={appUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-lg break-all"
            >
              {appUrl}
            </a>
            <p className="text-sm text-gray-600 mt-4">
              Click the link above to view your generated application running in
              the E2B sandbox!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}