import { task, logger, metadata } from "@trigger.dev/sdk/v3";
import Anthropic from "@anthropic-ai/sdk";
import { Sandbox } from "@e2b/code-interpreter";

export const fullStackInSandbox = task({
  id: "fullstack-in-sandbox",
  run: async (payload: { prompt: string }) => {
    const { prompt } = payload;

    const updateProgress = (step: number, total: number, status: string, detail?: string) => {
      logger.info(status, { step, total, detail });
      metadata.set("progress", {
        step,
        total,
        status,
        detail,
        timestamp: new Date().toISOString()
      } as any);
    };

    updateProgress(1, 7, "Starting full-stack generation", `Generating app: ${prompt}`);
    
    // Step 1: Generate code with Claude
    updateProgress(2, 7, "Generating code with Claude AI", "Creating application code...");
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: `Create a simple, functional Next.js application for: "${prompt}"

Requirements:
- Use only basic React/Next.js features (no external libraries)
- TypeScript for type safety
- Tailwind CSS for styling (already included)
- Keep the code simple and maintainable
- Use only standard HTML elements and icons (no external icon libraries)
- All code must be in a single page.tsx file
- Must work without any additional npm packages beyond the basics (next, react, react-dom)
- Use emojis or UTF-8 symbols for icons instead of external icon libraries

IMPORTANT: 
1. Do NOT use any external libraries beyond Next.js, React, and Tailwind
2. Use simple state management with useState
3. Return ONLY the raw TypeScript React code
4. Start directly with 'use client' or import statements
5. No markdown formatting or code block markers`,
        },
      ],
    });

    let generatedCode =
      message.content[0].type === "text" ? message.content[0].text : "";
      
    // Clean up any potential markdown formatting
    generatedCode = generatedCode
      .replace(/^```\w*\n?/gm, "")
      .replace(/```$/gm, "")
      .trim();

    updateProgress(3, 7, "Code generated successfully", `Generated ${generatedCode.length} characters of code`);

    // Step 2: Create E2B sandbox
    updateProgress(3, 7, "Creating sandbox environment", "Setting up isolated development environment...");
    const sandbox = await Sandbox.create({
      apiKey: process.env.E2B_API_KEY!,
      timeoutMs: 600000, // 10 minutes
    });

    updateProgress(4, 7, "Sandbox created", `Sandbox ID: ${sandbox.sandboxId}`);

    try {
      // Step 3: Set up Next.js project structure
      updateProgress(4, 7, "Setting up project", "Creating Next.js project structure...");
      
      await sandbox.files.makeDir("/home/user/app");
      await sandbox.files.makeDir("/home/user/app/app");

      // Track all created files
      const createdFiles: Array<{path: string; content: string; operation: string}> = [];

      const logAndTrackFile = async (path: string, content: string, operation: string = "created") => {
        logger.info(`File ${operation}: ${path}`, { 
          type: 'file',
          path,
          operation,
        });
        
        createdFiles.push({ path, content, operation });
        
        // Update metadata with all files
        metadata.set("files", createdFiles);
      };

      // Write the generated page
      await sandbox.files.write("/home/user/app/app/page.tsx", generatedCode);
      await logAndTrackFile("/home/user/app/app/page.tsx", generatedCode);

      // Create package.json
      const packageJson = {
        name: "generated-app",
        version: "1.0.0",
        scripts: {
          dev: "next dev",
          build: "next build",
          start: "next start",
        },
        dependencies: {
          next: "14.2.18",
          react: "^18.3.0",
          "react-dom": "^18.3.0"
        },
        devDependencies: {
          "@types/node": "^20",
          "@types/react": "^18",
          "@types/react-dom": "^18",
          typescript: "^5",
          tailwindcss: "^3.4.0",
          autoprefixer: "^10.4.16",
          postcss: "^8.4.31",
        },
      };

      const packageJsonContent = JSON.stringify(packageJson, null, 2);
      await sandbox.files.write("/home/user/app/package.json", packageJsonContent);
      await logAndTrackFile("/home/user/app/package.json", packageJsonContent);

      // Create next.config.js
      const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = nextConfig
`;
      await sandbox.files.write("/home/user/app/next.config.js", nextConfig);
      await logAndTrackFile("/home/user/app/next.config.js", nextConfig);

      // Create tsconfig.json
      const tsConfig = {
        compilerOptions: {
          target: "ES2017",
          lib: ["dom", "dom.iterable", "esnext"],
          allowJs: true,
          skipLibCheck: true,
          strict: false,
          noEmit: true,
          esModuleInterop: true,
          module: "esnext",
          moduleResolution: "bundler",
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: "preserve",
          incremental: true,
          plugins: [{ name: "next" }],
          paths: { "@/*": ["./*"] },
        },
        include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
        exclude: ["node_modules"],
      };

      const tsConfigContent = JSON.stringify(tsConfig, null, 2);
      await sandbox.files.write("/home/user/app/tsconfig.json", tsConfigContent);
      await logAndTrackFile("/home/user/app/tsconfig.json", tsConfigContent);

      // Create tailwind.config.ts
      const tailwindConfig = `import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;
`;

      await sandbox.files.write("/home/user/app/tailwind.config.ts", tailwindConfig);
      await logAndTrackFile("/home/user/app/tailwind.config.ts", tailwindConfig);

      // Create postcss.config.js
      const postcssConfig = `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`;

      await sandbox.files.write("/home/user/app/postcss.config.js", postcssConfig);
      await logAndTrackFile("/home/user/app/postcss.config.js", postcssConfig);

      // Create globals.css
      const globalsCss = `@tailwind base;
@tailwind components;
@tailwind utilities;
`;

      await sandbox.files.write("/home/user/app/app/globals.css", globalsCss);
      await logAndTrackFile("/home/user/app/app/globals.css", globalsCss);

      // Create layout.tsx
      const layoutCode = `import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Generated App',
  description: 'AI Generated Application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
`;

      await sandbox.files.write("/home/user/app/app/layout.tsx", layoutCode);
      await logAndTrackFile("/home/user/app/app/layout.tsx", layoutCode);

      // Step 4: Install dependencies
      updateProgress(5, 7, "Installing dependencies", "This may take 2-3 minutes...");
      
      const terminalLogs: Array<{type: string; content: string; timestamp: string}> = [];
      
      const stripAnsi = (str: string): string => {
        // Remove ANSI escape codes
        return str
          .replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '') // CSI sequences
          .replace(/\x1B\][0-9;]*\x07/g, '')     // OSC sequences
          .replace(/\x1B[=>]/g, '')              // Other escape sequences
          .replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F]/g, '') // Control characters (except \n)
          .replace(/\[[\d;]*[a-zA-Z]/g, '')      // Leftover bracket sequences
          .replace(/⠋|⠙|⠹|⠸|⠼|⠴|⠦|⠧|⠇|⠏/g, '') // Spinner characters
          .trim();
      };
      
      const logTerminal = (data: any, type: 'stdout' | 'stderr' = 'stdout') => {
        // Handle various data types that might come from E2B
        let content = '';
        
        if (typeof data === 'string') {
          content = data;
        } else if (Buffer.isBuffer(data)) {
          content = data.toString('utf8');
        } else if (data && typeof data === 'object') {
          content = data.line || data.text || data.content || JSON.stringify(data);
        } else {
          content = String(data);
        }
        
        // Strip ANSI codes and clean up
        content = stripAnsi(content).trim();
        
        // Only log non-empty content
        if (!content) return;
        
        const log = {
          type,
          content,
          timestamp: new Date().toISOString()
        };
        terminalLogs.push(log);
        metadata.set("terminalOutput", terminalLogs);
        
        // Log as plain string to Trigger.dev
        logger.info(`[${type}] ${content}`);
      };

      const installResult = await sandbox.runCode(
        "cd /home/user/app && npm install 2>&1",
        { 
          language: "bash",
          timeoutMs: 300000,
        }
      );

      // Log the output after command completes
      if (installResult.logs?.stdout) {
        installResult.logs.stdout.forEach(line => logTerminal(line, 'stdout'));
      }
      if (installResult.logs?.stderr) {
        installResult.logs.stderr.forEach(line => logTerminal(line, 'stderr'));
      }
      if (installResult.text) {
        logTerminal(installResult.text, 'stdout');
      }

      if (installResult.error) {
        logger.error("Install failed", { error: installResult.error });
        throw new Error(`Install failed: ${installResult.error}`);
      }

      updateProgress(5, 7, "Dependencies installed", "All packages installed successfully");

      // Step 5: Build the application
      updateProgress(6, 7, "Building application", "Compiling Next.js application...");
      const buildResult = await sandbox.runCode(
        "cd /home/user/app && npm run build 2>&1",
        { 
          language: "bash",
          timeoutMs: 300000,
        }
      );

      // Log the build output
      if (buildResult.logs?.stdout) {
        buildResult.logs.stdout.forEach(line => logTerminal(line, 'stdout'));
      }
      if (buildResult.logs?.stderr) {
        buildResult.logs.stderr.forEach(line => logTerminal(line, 'stderr'));
      }
      if (buildResult.text) {
        logTerminal(buildResult.text, 'stdout');
      }

      if (buildResult.error) {
        logger.warn("Build completed with warnings", {
          error: buildResult.error,
        });
      }

      updateProgress(6, 7, "Build completed", "Application compiled successfully");

      // Step 6: Start the development server
      updateProgress(7, 7, "Starting server", "Launching Next.js development server...");
      
      logger.info("Starting Next.js dev server in background...");
      
      // Start the dev server in the background
      await sandbox.runCode(
        "cd /home/user/app && (npm run dev > server.log 2>&1 &)",
        { language: "bash" }
      );

      logger.info("Dev server process started in background");
      
      // Wait a bit for the server to start and capture initial output
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Try to read some initial output
      try {
        const logsResult = await sandbox.runCode(
          "cd /home/user/app && if [ -f .next/server/app-paths-manifest.json ]; then echo 'Next.js dev server is starting...'; fi",
          { language: "bash" }
        );
        
        if (logsResult.text) {
          logTerminal(logsResult.text, 'stdout');
        }
        
        logTerminal("Next.js dev server started successfully", 'stdout');
        logTerminal(`Server running on port 3000`, 'stdout');
      } catch (error) {
        logger.warn("Could not read dev server logs", { error });
      }

      // Step 7: Get the public URL
      const appUrl = `https://${sandbox.getHost(3000)}`;

      const finalProgress = updateProgress(7, 7, "Application ready", "Server is running and ready to accept connections");

      // Ensure final metadata flush
      await metadata.flush();

      // Return success with all the details
      return {
        success: true,
        sandboxId: sandbox.sandboxId,
        appUrl: appUrl,
        code: generatedCode,
        message: "Application is running in E2B sandbox! Click the URL to view.",
        instructions: "The sandbox will remain active. You can access the app at the provided URL.",
        progress: finalProgress,
        files: createdFiles,
        terminalOutput: terminalLogs,
      };
    } catch (error) {
      logger.error("Workflow failed", { error });
      
      // Clean up on error
      try {
        await sandbox.kill();
      } catch (closeError) {
        logger.error("Failed to kill sandbox", { closeError });
      }

      throw error;
    }

    // Note: We DON'T close the sandbox here - it stays alive so the app keeps running!
  },
});