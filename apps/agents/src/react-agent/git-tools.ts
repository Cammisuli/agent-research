import { tool } from "@langchain/core/tools";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { z } from "zod";

const execAsync = promisify(exec);

// Function to safely execute shell commands
async function safeExecAsync(command: string, cwd?: string): Promise<string> {
  try {
    console.log(`Executing: ${command} in ${cwd || 'current directory'}`);
    const { stdout, stderr } = await execAsync(command, { cwd });
    if (stderr) {
      console.warn(`Command produced warnings: ${stderr}`);
    }
    return stdout.trim();
  } catch (error) {
    console.error(`Error executing command: ${command}`, error);
    throw new Error(`Failed to execute: ${command} - ${(error as Error).message}`);
  }
}

// Git clone tool
export const gitClone = tool(
  async ({ repoUrl, directory, branch }: {
    repoUrl: string;
    directory?: string;
    branch?: string;
  }) => {
    try {
      // Extract repo name from URL if directory not provided
      if (!directory) {
        const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'repo';
        directory = `./${repoName}`;
      }

      // Create directory if it doesn't exist
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      // Clone the repository
      const cloneCmd = `git clone ${repoUrl} ${directory}`;
      await safeExecAsync(cloneCmd);

      // Checkout specific branch if specified
      if (branch) {
        const checkoutCmd = `git checkout ${branch}`;
        await safeExecAsync(checkoutCmd, directory);
      }

      return `Repository cloned successfully to ${directory}`;
    } catch (error) {
      return `Error cloning repository: ${(error as Error).message}`;
    }
  },
  {
    name: "git_clone",
    description: "Clone a git repository to a local directory. Returns the path to the cloned repo.",
    schema: z.object({
      repoUrl: z.string().describe("URL of the git repository to clone"),
      directory: z.string().optional().describe("Optional directory to clone into. If not provided, the repo name will be used"),
      branch: z.string().optional().describe("Optional branch to checkout after cloning")
    })
  }
);

// Git checkout tool
export const gitCheckout = tool(
  async ({
    directory,
    target,
    createBranch = false
  }: {
    directory: string;
    target: string;
    createBranch?: boolean;
  }) => {
    try {
      const checkoutCmd = createBranch
        ? `git checkout -b ${target}`
        : `git checkout ${target}`;

      const result = await safeExecAsync(checkoutCmd, directory);
      return `Successfully checked out ${target}: ${result}`;
    } catch (error) {
      return `Error checking out ${target}: ${(error as Error).message}`;
    }
  },
  {
    name: "git_checkout",
    description: "Checkout a branch or commit in a git repository",
    schema: z.object({
      directory: z.string().describe("Path to the git repository"),
      target: z.string().describe("Branch name, tag, or commit hash to checkout"),
      createBranch: z.boolean().optional().describe("Whether to create a new branch. Default is false")
    })
  }
);

// Git status tool
export const gitStatus = tool(
  async ({ directory }: { directory: string }) => {
    try {
      const result = await safeExecAsync("git status", directory);
      return `Git status: ${result}`;
    } catch (error) {
      return `Error getting git status: ${(error as Error).message}`;
    }
  },
  {
    name: "git_status",
    description: "Check the status of a git repository",
    schema: z.object({
      directory: z.string().describe("Path to the git repository")
    })
  }
);

// Git commit tool
export const gitCommit = tool(
  async ({
    directory,
    message,
    addAll = true
  }: {
    directory: string;
    message: string;
    addAll?: boolean;
  }) => {
    try {
      if (addAll) {
        await safeExecAsync("git add .", directory);
      }

      const result = await safeExecAsync(`git commit -m "${message}"`, directory);
      return `Changes committed: ${result}`;
    } catch (error) {
      return `Error committing changes: ${(error as Error).message}`;
    }
  },
  {
    name: "git_commit",
    description: "Commit changes to a git repository",
    schema: z.object({
      directory: z.string().describe("Path to the git repository"),
      message: z.string().describe("Commit message"),
      addAll: z.boolean().optional().describe("Whether to add all files before committing. Default is true")
    })
  }
);

// Git push tool
export const gitPush = tool(
  async ({
    directory,
    remote = "origin",
    branch,
    setUpstream = false
  }: {
    directory: string;
    remote?: string;
    branch?: string;
    setUpstream?: boolean;
  }) => {
    try {
      // Get current branch if not specified
      if (!branch) {
        branch = await safeExecAsync("git rev-parse --abbrev-ref HEAD", directory);
      }

      const pushCmd = setUpstream
        ? `git push -u ${remote} ${branch}`
        : `git push ${remote} ${branch}`;

      const result = await safeExecAsync(pushCmd, directory);
      return `Changes pushed to ${remote}/${branch}: ${result}`;
    } catch (error) {
      return `Error pushing changes: ${(error as Error).message}`;
    }
  },
  {
    name: "git_push",
    description: "Push commits to a remote repository",
    schema: z.object({
      directory: z.string().describe("Path to the git repository"),
      remote: z.string().optional().describe("Remote name. Default is 'origin'"),
      branch: z.string().optional().describe("Branch name to push to. Default is the current branch"),
      setUpstream: z.boolean().optional().describe("Whether to set the upstream for the branch. Default is false")
    })
  }
);

// File read tool
export const readFile = tool(
  async ({ filePath }: { filePath: string }) => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return `File contents:\n${content}`;
    } catch (error) {
      return `Error reading file: ${(error as Error).message}`;
    }
  },
  {
    name: "read_file",
    description: "Read the contents of a file",
    schema: z.object({
      filePath: z.string().describe("Path to the file to read")
    })
  }
);

// File write tool
export const writeFile = tool(
  async ({ filePath, content }: { filePath: string; content: string }) => {
    try {
      // Ensure directory exists
      const directory = path.dirname(filePath);
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      fs.writeFileSync(filePath, content);
      return `Content written to ${filePath} successfully`;
    } catch (error) {
      return `Error writing to file: ${(error as Error).message}`;
    }
  },
  {
    name: "write_file",
    description: "Write or update the contents of a file",
    schema: z.object({
      filePath: z.string().describe("Path to the file to write"),
      content: z.string().describe("Content to write to the file")
    })
  }
);

// List directory content tool
export const listDirectory = tool(
  async ({ directory }: { directory: string }) => {
    try {
      const files = fs.readdirSync(directory);
      return `Directory contents of ${directory}:\n${files.join('\n')}`;
    } catch (error) {
      return `Error listing directory: ${(error as Error).message}`;
    }
  },
  {
    name: "list_directory",
    description: "List the contents of a directory",
    schema: z.object({
      directory: z.string().describe("Path to the directory to list")
    })
  }
);

// Export all Git and file operation tools
export const GIT_TOOLS = [
  gitClone,
  gitCheckout,
  gitStatus,
  gitCommit,
  gitPush,
  readFile,
  writeFile,
  listDirectory
];
