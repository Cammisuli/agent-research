/**
 * This file defines the tools available to the ReAct agent,
 * excluding tools requiring API keys like Tavily search.
 * This version is used for testing git operations without
 * requiring external API keys.
 */
import { GIT_TOOLS } from "./git-tools.js";

/**
 * Export an array of all available tools
 * Add new tools to this array to make them available to the agent
 */
export const GIT_ONLY_TOOLS = [...GIT_TOOLS];