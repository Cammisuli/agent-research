import { AIMessage } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import {
  Annotation,
  MessagesAnnotation,
  StateGraph,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";

import { ConfigurationSchema, ensureConfiguration } from "./configuration.js";
import { GIT_ONLY_TOOLS } from "./tools-git-only.js";
import { loadChatModel } from "./utils.js";

// Extended state to track Git workflow progress
const GitWorkflowAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  // Track current workflow step
  workflowStep: Annotation<string>({
    value: (_existing, update) => update,
    default: () => "initialize",
  }),
  // Track repository information
  repository: Annotation<{
    url?: string;
    directory?: string;
    branch?: string;
    filesModified?: string[];
  }>({
    value: (_existing, update) => ({ ..._existing, ...update }),
    default: () => ({}),
  }),
});

// Define the function that calls the model
async function callModel(
  state: typeof GitWorkflowAnnotation.State,
  config: RunnableConfig
): Promise<typeof GitWorkflowAnnotation.Update> {
  /** Call the LLM powering our agent. **/
  const configuration = ensureConfiguration(config);

  // Feel free to customize the prompt, model, and other logic!
  const loadedModel = await loadChatModel(configuration.model);
  if (!loadedModel) {
    throw new Error("Failed to load the chat model");
  }
  // Cast to any to resolve TypeScript errors with bindTools
  const model = (loadedModel as any).bindTools(GIT_ONLY_TOOLS);

  // Add current workflow step to context
  let systemPrompt = configuration.systemPromptTemplate.replace(
    "{system_time}",
    new Date().toISOString()
  );

  // Add workflow context based on current step
  systemPrompt += `\n\nCurrent workflow step: ${state.workflowStep}`;

  // Add repository context if available
  if (state.repository.url) {
    systemPrompt += `\n\nRepository: ${state.repository.url}`;
    systemPrompt += state.repository.directory
      ? `\nLocal directory: ${state.repository.directory}`
      : "";
    systemPrompt += state.repository.branch
      ? `\nBranch: ${state.repository.branch}`
      : "";
  }

  // Add guidelines based on workflow step
  switch (state.workflowStep) {
    case "initialize":
      systemPrompt += `\n\nYou need to get the repository URL from the user and clone it. Ask for any necessary details.`;
      break;
    case "explore":
      systemPrompt += `\n\nYou should explore the repository structure to understand the codebase before making changes.`;
      break;
    case "modify":
      systemPrompt += `\n\nMake the necessary modifications to files as required by the user.`;
      break;
    case "verify":
      systemPrompt += `\n\nVerify your changes by checking file contents and git status.`;
      break;
    case "commit":
      systemPrompt += `\n\nCommit your changes with a descriptive commit message.`;
      break;
    case "push":
      systemPrompt += `\n\nPush changes to the remote repository if requested by the user.`;
      break;
  }

  const response = await model.invoke([
    {
      role: "system",
      content: systemPrompt,
    },
    ...state.messages,
  ]);

  // We return a list, because this will get added to the existing list
  return { messages: [response] };
}

// Determine the next step in the workflow based on tools used and context
function determineNextWorkflowStep(
  state: typeof GitWorkflowAnnotation.State
): typeof GitWorkflowAnnotation.Update {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];
  const toolCalls = (lastMessage as AIMessage)?.tool_calls || [];

  // If no tool calls, keep the same step
  if (toolCalls.length === 0) {
    return {};
  }

  // Check for tool usage patterns to determine workflow progression
  const toolNames = toolCalls.map((tool) => tool.name);

  // Current step logic
  switch (state.workflowStep) {
    case "initialize":
      // If git_clone was called, move to explore step
      if (toolNames.includes("git_clone")) {
        return { workflowStep: "explore" };
      }
      break;

    case "explore":
      // If file operations were called after exploring, move to modify step
      if (
        toolNames.includes("read_file") ||
        toolNames.includes("list_directory")
      ) {
        const writeOps = toolCalls.filter((tool) => tool.name === "write_file");
        if (writeOps.length > 0) {
          return { workflowStep: "modify" };
        }
      }
      // If write operations were called, move to modify step
      if (toolNames.includes("write_file")) {
        return { workflowStep: "modify" };
      }
      break;

    case "modify":
      // If git status was called after modifications, move to verify step
      if (toolNames.includes("git_status") || toolNames.includes("read_file")) {
        return { workflowStep: "verify" };
      }
      break;

    case "verify":
      // If git commit was called after verification, move to commit step
      if (toolNames.includes("git_commit")) {
        return { workflowStep: "commit" };
      }
      break;

    case "commit":
      // If git push was called after commit, move to push step
      if (toolNames.includes("git_push")) {
        return { workflowStep: "push" };
      }
      break;
  }

  // Default: don't change the step
  return {};
}

// Function to update repository information based on tool calls
function updateRepositoryInfo(
  state: typeof GitWorkflowAnnotation.State
): typeof GitWorkflowAnnotation.Update {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];

  // If this isn't a tool call, no repository updates
  if (!(lastMessage as AIMessage)?.tool_calls?.length) {
    return {};
  }

  const toolCalls = (lastMessage as AIMessage).tool_calls || [];
  let repositoryUpdate = { ...state.repository };
  let updated = false;

  // Check each tool call for repository-related information
  for (const toolCall of toolCalls) {
    try {
      // Handle different possible formats of toolCall.args
      const args =
        typeof toolCall.args === "string"
          ? JSON.parse(toolCall.args)
          : toolCall.args;

      switch (toolCall.name) {
        case "git_clone":
          if (args.repoUrl) {
            repositoryUpdate.url = args.repoUrl;
            if (args.directory) {
              repositoryUpdate.directory = args.directory;
            } else {
              // Extract repo name from URL if directory not provided
              const repoName =
                args.repoUrl.split("/").pop()?.replace(".git", "") || "repo";
              repositoryUpdate.directory = `./${repoName}`;
            }
            if (args.branch) {
              repositoryUpdate.branch = args.branch;
            }
            updated = true;
          }
          break;

        case "git_checkout":
          if (args.target) {
            repositoryUpdate.branch = args.target;
            updated = true;
          }
          break;

        case "write_file":
          if (args.filePath) {
            repositoryUpdate.filesModified =
              repositoryUpdate.filesModified || [];
            if (!repositoryUpdate.filesModified.includes(args.filePath)) {
              repositoryUpdate.filesModified.push(args.filePath);
            }
            updated = true;
          }
          break;
      }
    } catch (error) {
      console.warn("Error parsing tool call arguments:", error);
    }
  }

  return updated ? { repository: repositoryUpdate } : {};
}

// Define the function that determines whether to continue or not
function routeModelOutput(state: typeof GitWorkflowAnnotation.State): string {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];
  // If the LLM is invoking tools, route there.
  if ((lastMessage as AIMessage)?.tool_calls?.length || 0 > 0) {
    return "tools";
  }
  // Otherwise end the graph.
  else {
    return "__end__";
  }
}

// Process any state updates after tool execution
function processToolResults(
  state: typeof GitWorkflowAnnotation.State
): typeof GitWorkflowAnnotation.Update {
  // Create a properly typed return value
  const result: typeof GitWorkflowAnnotation.Update = {};

  // Get updates from both workflow step and repository info
  const workflowUpdate = determineNextWorkflowStep(state);
  const repoUpdate = updateRepositoryInfo(state);

  // Only add defined properties from both update objects
  if (
    "workflowStep" in workflowUpdate &&
    workflowUpdate.workflowStep !== undefined
  ) {
    result.workflowStep = workflowUpdate.workflowStep;
  }

  if ("messages" in workflowUpdate && workflowUpdate.messages !== undefined) {
    result.messages = workflowUpdate.messages;
  }

  if ("repository" in repoUpdate && repoUpdate.repository !== undefined) {
    result.repository = repoUpdate.repository;
  }

  return result;
}

// Define a new graph with our extended state annotation
const workflow = new StateGraph(GitWorkflowAnnotation, ConfigurationSchema)
  // Define the nodes for our workflow
  .addNode("callModel", callModel)
  .addNode("tools", new ToolNode(GIT_ONLY_TOOLS))
  .addNode("processResults", processToolResults)
  // Set the entrypoint as `callModel`
  .addEdge("__start__", "callModel")
  .addConditionalEdges("callModel", routeModelOutput)
  // After tools are executed, process results to update workflow state
  .addEdge("tools", "processResults")
  // Then go back to the model
  .addEdge("processResults", "callModel");

// Finally, we compile it!
// This compiles it into a graph you can invoke and deploy.
export const gitOnlyGraph = workflow.compile({
  interruptBefore: [], // if you want to update the state before calling the tools
  interruptAfter: [],
});
