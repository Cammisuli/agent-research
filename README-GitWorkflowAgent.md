# Git Workflow Agent Using LangGraph.js

## Overview

The Git Workflow Agent is a specialized agent built with LangGraph.js that can perform Git operations such as cloning repositories, making file modifications, verifying changes, and committing them. It follows a structured workflow approach by tracking the current state of operations and guiding the user through the process.

## Features

- **Repository Cloning**: Clone Git repositories from URLs provided by users
- **Branch Management**: Checkout branches in the cloned repositories
- **File Operations**: Read, write, and modify files within repositories
- **Git Status Tracking**: Check the status of Git repositories to monitor changes
- **Commit & Push**: Commit changes with descriptive messages and push to remote repositories
- **Workflow Tracking**: Automatically progress through workflow steps (initialize → explore → modify → verify → commit → push)
- **Human-in-the-loop**: Pause at critical points to get user confirmation before proceeding

## Architecture

### State Management

The agent uses LangGraph's state management to track:

- **Messages**: Conversation history between the user and agent
- **Workflow Step**: Current stage in the Git workflow process
- **Repository Information**: URL, local directory, branch, and files modified

### Workflow Steps

1. **Initialize**: Get repository URL and clone it
2. **Explore**: Examine repository structure to understand the codebase
3. **Modify**: Make necessary changes to files
4. **Verify**: Check file contents and Git status to confirm changes
5. **Commit**: Commit changes with a descriptive message
6. **Push**: Push changes to the remote repository

### Components

1. **Git Tools**: Custom tools for Git operations implemented using the LangChain tool framework
2. **Graph Structure**: Multi-node graph with model, tools, and state processing nodes
3. **State Tracking**: Automatic workflow progression based on agent actions
4. **Repository Info Tracking**: Tracking metadata about the repository being modified

## Implementation Details

### Custom Git Tools

- `gitClone`: Clones a repository from a URL
- `gitCheckout`: Checks out branches or commits
- `gitStatus`: Checks repository status
- `gitCommit`: Commits changes with messages
- `gitPush`: Pushes changes to remote repositories
- `readFile`: Reads file contents
- `writeFile`: Writes or updates files
- `listDirectory`: Lists directory contents

### Graph Structure

The agent uses a LangGraph graph with the following nodes:

- `callModel`: Calls the LLM with contextual information about the current workflow step
- `tools`: Executes Git and file operations requested by the model
- `processResults`: Updates workflow state based on tool execution results

The graph routes messages between these nodes based on the agent's decisions, forming a ReAct-style agent that can handle multi-step Git workflows.

### State Management

The agent maintains state using LangGraph's `Annotation` system, tracking:

- Messages (user inputs and agent responses)
- Current workflow step
- Repository information (URL, directory, branch, modified files)

### Workflow Progression Logic

The agent automatically determines when to progress to the next workflow step based on the tools used:

- After cloning → move to explore
- After reading files → potentially move to modify
- After writing files → move to verify
- After status checks → potentially move to commit
- After commit → potentially move to push

## Usage Examples

```
Clone the repository at https://github.com/user/repo.git

Check out the main branch and list the contents of the repository

Modify the README.md file to add a new section about installation

Check the status to see what files were changed

Commit the changes with the message "Update README with installation instructions"

Push the changes to the main branch
```

## Implementation Benefits

- **Structured Process**: Guides users through a logical Git workflow
- **State Tracking**: Maintains context about the current operation
- **Automatic Progression**: Intelligently moves through workflow steps
- **Human Oversight**: Can pause for verification of sensitive operations
- **Extensible**: Can be modified to support additional Git operations

This agent is particularly useful for automating common Git workflows, collaborating on code repositories, and helping users less familiar with Git to perform complex operations safely.