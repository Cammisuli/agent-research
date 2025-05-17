# Git Workflow Agent

A LangGraph-powered agent that can perform Git operations, including cloning repositories, making changes to files, verifying results, and committing changes.

## Features

- Clone Git repositories
- Checkout branches
- Read and modify files
- Verify changes with Git status
- Commit changes
- Push to remote repositories

## How It Works

The agent follows a step-by-step workflow:

1. **Initialize**: Get repository URL and clone it.
2. **Explore**: Examine the repository structure to understand the codebase.
3. **Modify**: Make necessary changes to files.
4. **Verify**: Check file contents and git status to confirm changes.
5. **Commit**: Commit changes with a descriptive message.
6. **Push**: Push changes to the remote repository.

The workflow is managed by a LangGraph state machine that tracks the current step and repository information.

## Usage

### Example Prompts

To work with the agent, use natural language prompts like:

- "Clone the repository at https://github.com/user/repo and update the README file"
- "Check the status of the repository and show me what files were changed"
- "Commit the changes with the message 'Update documentation'"
- "Push the changes to the main branch"

### Authentication

For private repositories, configure your Git credentials in the `.env` file:

```
GIT_USERNAME="your-username"
GIT_PASSWORD="your-personal-access-token"
GIT_EMAIL="your-email@example.com"
```

## Configuration

The agent's behavior can be customized by modifying:

- `prompts.ts`: Update the system prompt to change the agent's instructions
- `git-tools.ts`: Modify Git tool implementations
- `graph.ts`: Adjust the workflow steps and logic

## Requirements

- Node.js v18 or higher
- Git installed on the system
- Appropriate environment variables set up

## Security Considerations

- The agent executes Git commands on your system, so be cautious when using it with untrusted repositories
- Never expose credentials directly in prompts
- Consider setting up sandbox environments for working with untested code

## Contributing

Contributions to improve the agent are welcome! Some areas for enhancement:

- Add support for merge conflict resolution
- Implement code analysis tools integration
- Add support for GitHub/GitLab API operations (PRs, issues, etc.)