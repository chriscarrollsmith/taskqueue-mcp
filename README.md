[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/chriscarrollsmith-taskqueue-mcp-badge.png)](https://mseep.ai/app/chriscarrollsmith-taskqueue-mcp)

# MCP Task Manager

[![smithery badge](https://smithery.ai/badge/@chriscarrollsmith/taskqueue-mcp)](https://smithery.ai/server/@chriscarrollsmith/taskqueue-mcp)

MCP Task Manager ([npm package: taskqueue-mcp](https://www.npmjs.com/package/taskqueue-mcp)) is a Model Context Protocol (MCP) server for AI task management. This tool helps AI assistants handle multi-step tasks in a structured way, with optional user approval checkpoints.

## Features

- Task planning with multiple steps
- Progress tracking
- User approval of completed tasks
- Project completion approval
- Task details visualization
- Task status state management
- Enhanced CLI for task inspection and management

## Basic Setup

Usually you will set the tool configuration in Claude Desktop, Cursor, or another MCP client as follows:

```json
{
  "tools": {
    "taskqueue": {
      "command": "npx",
      "args": ["-y", "taskqueue-mcp"]
    }
  }
}
```

To use the CLI utility, you can install the package globally and then use the following command:

```bash
npx taskqueue --help
```

This will show the available commands and options.

### Advanced Configuration

The task manager supports multiple LLM providers for generating project plans. You can configure one or more of the following environment variables depending on which providers you want to use:

- `OPENAI_API_KEY`: Required for using OpenAI models (e.g., GPT-4)
- `GOOGLE_GENERATIVE_AI_API_KEY`: Required for using Google's Gemini models
- `DEEPSEEK_API_KEY`: Required for using Deepseek models

To generate project plans using the CLI, set these environment variables in your shell:

```bash
export OPENAI_API_KEY="your-api-key"
export GOOGLE_GENERATIVE_AI_API_KEY="your-api-key"
export DEEPSEEK_API_KEY="your-api-key"
```

Or you can include them in your MCP client configuration to generate project plans with MCP tool calls:

```json
{
  "tools": {
    "taskqueue": {
      "command": "npx",
      "args": ["-y", "taskqueue-mcp"],
      "env": {
        "OPENAI_API_KEY": "your-api-key",
        "GOOGLE_GENERATIVE_AI_API_KEY": "your-api-key",
        "DEEPSEEK_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Available MCP Tools

The TaskManager now uses a direct tools interface with specific, purpose-built tools for each operation:

### Project Management Tools

- `list_projects`: Lists all projects in the system
- `read_project`: Gets details about a specific project
- `create_project`: Creates a new project with initial tasks
- `delete_project`: Removes a project
- `add_tasks_to_project`: Adds new tasks to an existing project
- `finalize_project`: Finalizes a project after all tasks are done

### Task Management Tools

- `list_tasks`: Lists all tasks for a specific project
- `read_task`: Gets details of a specific task
- `create_task`: Creates a new task in a project
- `update_task`: Modifies a task's properties (title, description, status)
- `delete_task`: Removes a task from a project
- `approve_task`: Approves a completed task
- `get_next_task`: Gets the next pending task in a project
- `mark_task_done`: Marks a task as completed with details

### Task Status and Workflows

Tasks have a status field that can be one of:
- `not started`: Task has not been started yet
- `in progress`: Task is currently being worked on
- `done`: Task has been completed (requires `completedDetails`)

#### Status Transition Rules

The system enforces the following rules for task status transitions:

- Tasks follow a specific workflow with defined valid transitions:
  - From `not started`: Can only move to `in progress`
  - From `in progress`: Can move to either `done` or back to `not started`
  - From `done`: Can move back to `in progress` if additional work is needed
- When a task is marked as "done", the `completedDetails` field must be provided to document what was completed
- Approved tasks cannot be modified
- A project can only be approved when all tasks are both done and approved

These rules help maintain the integrity of task progress and ensure proper documentation of completed work.

### Usage Workflow

A typical workflow for an LLM using this task manager would be:

1. `create_project`: Start a project with initial tasks
2. `get_next_task`: Get the first pending task
3. Work on the task
4. `mark_task_done`: Mark the task as complete with details
5. Wait for approval (user must call `approve_task` through the CLI)
6. `get_next_task`: Get the next pending task
7. Repeat steps 3-6 until all tasks are complete
8. `finalize_project`: Complete the project (requires user approval)

### CLI Commands

To use the CLI, you will need to install the package globally:

```bash
npm install -g taskqueue-mcp
```

Alternatively, you can run the CLI with `npx` using the `--package=taskqueue-mcp` flag to tell `npx` what package it's from.

```bash
npx --package=taskqueue-mcp taskqueue --help
```

#### Task Approval

By default, all tasks and projects will be auto-approved when marked "done" by the AI agent. To require manual human task approval, set `autoApprove` to `false` when creating a project.

Task approval is controlled exclusively by the human user through the CLI:

```bash
npx taskqueue approve-task -- <projectId> <taskId>
```

Options:
- `-f, --force`: Force approval even if the task is not marked as done

Note: Tasks must be marked as "done" with completed details by the AI agent before they can be approved (unless using --force).

#### Listing Tasks and Projects

The CLI provides a command to list all projects and tasks:

```bash
npx taskqueue list-tasks
```

To view details of a specific project:

```bash
npx taskqueue list-tasks -- -p <projectId>
```

This command displays information about all projects in the system or a specific project, including:

- Project ID and initial prompt
- Completion status
- Task details (title, description, status, approval)
- Progress metrics (approved/completed/total tasks)

## Data Schema and Storage

### File Location

The task manager stores data in a JSON file that must be accessible to both the server and CLI.

The default platform-specific location is:
   - **Linux**: `~/.local/share/taskqueue-mcp/tasks.json`
   - **macOS**: `~/Library/Application Support/taskqueue-mcp/tasks.json`
   - **Windows**: `%APPDATA%\taskqueue-mcp\tasks.json`

Using a custom file path for storing task data is not recommended, because you have to remember to set the same path for both the MCP server and the CLI, or they won't be able to coordinate with each other. But if you do want to use a custom path, you can set the `TASK_MANAGER_FILE_PATH` environment variable in your MCP client configuration:

```json
{
  "tools": {
    "taskqueue": {
      "command": "npx",
      "args": ["-y", "taskqueue-mcp"],
      "env": {
        "TASK_MANAGER_FILE_PATH": "/path/to/tasks.json"
      }
    }
  }
}
```

Then, before running the CLI, you should export the same path in your shell:

```bash
export TASK_MANAGER_FILE_PATH="/path/to/tasks.json"
```

### Data Schema

The JSON file uses the following structure:

```
TaskManagerFile
├── projects: Project[]
    ├── projectId: string            # Format: "proj-{number}"
    ├── initialPrompt: string        # Original user request text
    ├── projectPlan: string          # Additional project details
    ├── completed: boolean           # Project completion status
    ├── autoApprove: boolean         # Set `false` to require manual user approval
    └── tasks: Task[]                # Array of tasks
        ├── id: string               # Format: "task-{number}"
        ├── title: string            # Short task title
        ├── description: string      # Detailed task description
        ├── status: string           # Task status: "not started", "in progress", or "done"
        ├── approved: boolean        # Task approval status
        ├── completedDetails: string # Completion information (required when status is "done")
        ├── toolRecommendations: string # Suggested tools that might be helpful for this task
        └── ruleRecommendations: string # Suggested rules/guidelines to follow for this task
```

## License

MIT
