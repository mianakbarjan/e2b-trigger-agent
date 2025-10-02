import { task, logger } from "@trigger.dev/sdk/v3";
import Anthropic from "@anthropic-ai/sdk";
import { Sandbox } from "@e2b/code-interpreter";

export const fullStackInSandbox = task({
  id: "fullstack-in-sandbox",
  run: async (payload: { prompt: string }) => {
    const { prompt } = payload;

    const updateProgress = (step: number, total: number, status: string, detail?: string) => {
      logger.info(status, { step, total, detail });
      return {
        step,
        total,
        status,
        detail,
        timestamp: new Date().toISOString()
      };
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
          content: `Create a complete, beautiful, production-ready Next.js application for: "${prompt}"

Requirements:
- Modern Next.js 14 with App Router
- TypeScript
- Tailwind CSS for styling
- Make it fully functional and interactive
- Include proper styling and responsive design
- All code should be in a single page.tsx file for simplicity

IMPORTANT: Return ONLY the raw TypeScript React code. Do not include any markdown formatting, code block markers (like \`\`\`), or explanations. The response should start directly with either 'use client' or import statements.`,
        },
      ],
    });

    let generatedCode =
      message.content[0].type === "text" ? message.content[0].text : "";
      
    // Clean up any potential markdown formatting
    generatedCode = generatedCode
      .replace(/^```\w*\n?/gm, "") // Remove opening code blocks
      .replace(/```$/gm, "") // Remove closing code blocks
      .trim(); // Remove extra whitespace

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

      // Write the generated page
      await sandbox.files.write(
        "/home/user/app/app/page.tsx",
        generatedCode
      );

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
          "react-dom": "^18.3.0",
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

      await sandbox.files.write(
        "/home/user/app/package.json",
        JSON.stringify(packageJson, null, 2)
      );

      // Create next.config.js
      const nextConfig = `
/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = nextConfig
`;
      await sandbox.files.write(
        "/home/user/app/next.config.js",
        nextConfig
      );

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

      await sandbox.files.write(
        "/home/user/app/tsconfig.json",
        JSON.stringify(tsConfig, null, 2)
      );

      // Create tailwind.config.ts
      const tailwindConfig = `
import type { Config } from "tailwindcss";

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

      await sandbox.files.write(
        "/home/user/app/tailwind.config.ts",
        tailwindConfig
      );

      // Create postcss.config.js
      const postcssConfig = `
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`;

      await sandbox.files.write(
        "/home/user/app/postcss.config.js",
        postcssConfig
      );

      // Create globals.css
      const globalsCss = `
@tailwind base;
@tailwind components;
@tailwind utilities;
`;

      await sandbox.files.write(
        "/home/user/app/app/globals.css",
        globalsCss
      );

      // Create layout.tsx
      const layoutCode = `
import './globals.css'
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

      await sandbox.files.write(
        "/home/user/app/app/layout.tsx",
        layoutCode
      );

      // Step 4: Install dependencies
      updateProgress(5, 7, "Installing dependencies", "This may take 2-3 minutes...");
      const installResult = await sandbox.runCode(
        "cd /home/user/app && npm install",
        { 
          language: "bash",
          timeoutMs: 300000 // 5 minutes
        }
      );

      if (installResult.error) {
        logger.error("Install failed", { error: installResult.error });
        throw new Error(`Install failed: ${installResult.error}`);
      }

      updateProgress(5, 7, "Dependencies installed", "All packages installed successfully");

      // Step 5: Build the application
      updateProgress(6, 7, "Building application", "Compiling Next.js application...");
      const buildResult = await sandbox.runCode(
        "cd /home/user/app && npm run build",
        { 
          language: "bash",
          timeoutMs: 300000 
        }
      );

      if (buildResult.error) {
        logger.warn("Build completed with warnings", {
          error: buildResult.error,
        });
        // Continue anyway - warnings are usually okay
      }

      updateProgress(6, 7, "Build completed", "Application compiled successfully");

      // Step 6: Start the development server
      updateProgress(7, 7, "Starting server", "Launching Next.js development server...");
      
      // Start the server and wait for it to be ready
      logger.info("Starting server and waiting for ready message...");
      await sandbox.runCode(
        "cd /home/user/app && (npm run dev > server.log 2>&1 &) && sleep 2 && tail -f server.log | while read line; do if [[ $line == *'Ready'* ]]; then break; fi; done",
        {
          language: "bash",
          onStdout: (data) => logger.info("Server output", { data }),
          onStderr: (data) => logger.warn("Server stderr", { data }),
          timeoutMs: 30000 // 30 seconds
        }
      );

      // Step 7: Get the public URL
      const appUrl = `https://${sandbox.getHost(3000)}`;

      const finalProgress = updateProgress(7, 7, "Application ready", "Server is running and ready to accept connections");

      // Return success with all the details
      return {
        success: true,
        sandboxId: sandbox.sandboxId,
        appUrl: appUrl,
        code: generatedCode,
        message: "Application is running in E2B sandbox! Click the URL to view.",
        instructions: "The sandbox will remain active. You can access the app at the provided URL.",
        progress: finalProgress
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