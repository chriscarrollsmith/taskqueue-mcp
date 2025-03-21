import { exec } from "child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { promisify } from "util";

const execAsync = promisify(exec);
const CLI_PATH = path.resolve(process.cwd(), "src/client/cli.ts");

describe("CLI Integration Tests", () => {
  let tempDir: string;
  let tasksFilePath: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `task-manager-cli-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    tasksFilePath = path.join(tempDir, "test-tasks.json");
    process.env.TASK_MANAGER_FILE_PATH = tasksFilePath;

    // Create initial task file with projects in different states
    const initialTasks = {
      projects: [
        {
          projectId: "proj-1",
          initialPrompt: "open project",
          projectPlan: "test",
          completed: false,
          tasks: [
            {
              id: "task-1",
              title: "open task",
              description: "test",
              status: "not started",
              approved: false,
              completedDetails: ""
            }
          ]
        },
        {
          projectId: "proj-2",
          initialPrompt: "pending approval project",
          projectPlan: "test",
          completed: false,
          tasks: [
            {
              id: "task-2",
              title: "pending approval task",
              description: "test",
              status: "done",
              approved: false,
              completedDetails: "completed"
            }
          ]
        },
        {
          projectId: "proj-3",
          initialPrompt: "completed project",
          projectPlan: "test",
          completed: true,
          tasks: [
            {
              id: "task-3",
              title: "completed task",
              description: "test",
              status: "done",
              approved: true,
              completedDetails: "completed"
            }
          ]
        }
      ]
    };
    await fs.writeFile(tasksFilePath, JSON.stringify(initialTasks));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    delete process.env.TASK_MANAGER_FILE_PATH;
  });

  it("should list only open projects via CLI", async () => {
    const { stdout } = await execAsync(`TASK_MANAGER_FILE_PATH=${tasksFilePath} tsx ${CLI_PATH} list -s open`);
    expect(stdout).toContain("proj-1");
    expect(stdout).not.toContain("proj-2");
    expect(stdout).not.toContain("proj-3");
  }, 5000);

  it("should list only pending approval projects via CLI", async () => {
    const { stdout } = await execAsync(`TASK_MANAGER_FILE_PATH=${tasksFilePath} tsx ${CLI_PATH} list -s pending_approval`);
    expect(stdout).toContain("proj-2");
    expect(stdout).not.toContain("proj-1");
    expect(stdout).not.toContain("proj-3");
  }, 5000);

  it("should list only completed projects via CLI", async () => {
    const { stdout } = await execAsync(`TASK_MANAGER_FILE_PATH=${tasksFilePath} tsx ${CLI_PATH} list -s completed`);
    expect(stdout).toContain("proj-3");
    expect(stdout).not.toContain("proj-1");
    expect(stdout).not.toContain("proj-2");
  }, 5000);

  it("should list all projects when no state is specified", async () => {
    const { stdout } = await execAsync(`TASK_MANAGER_FILE_PATH=${tasksFilePath} tsx ${CLI_PATH} list`);
    expect(stdout).toContain("proj-1");
    expect(stdout).toContain("proj-2");
    expect(stdout).toContain("proj-3");
  }, 5000);

  it("should list tasks for a specific project filtered by state", async () => {
    // Test open tasks
    const openResult = await execAsync(`TASK_MANAGER_FILE_PATH=${tasksFilePath} tsx ${CLI_PATH} list -p proj-1 -s open`);
    expect(openResult.stdout).toContain("task-1");
    expect(openResult.stdout).not.toContain("task-2");
    expect(openResult.stdout).not.toContain("task-3");

    // Test pending approval tasks
    const pendingResult = await execAsync(`TASK_MANAGER_FILE_PATH=${tasksFilePath} tsx ${CLI_PATH} list -p proj-2 -s pending_approval`);
    expect(pendingResult.stdout).toContain("task-2");
    expect(pendingResult.stdout).not.toContain("task-1");
    expect(pendingResult.stdout).not.toContain("task-3");

    // Test completed tasks
    const completedResult = await execAsync(`TASK_MANAGER_FILE_PATH=${tasksFilePath} tsx ${CLI_PATH} list -p proj-3 -s completed`);
    expect(completedResult.stdout).toContain("task-3");
    expect(completedResult.stdout).not.toContain("task-1");
    expect(completedResult.stdout).not.toContain("task-2");
  }, 5000);

  it("should handle no matching items gracefully", async () => {
    // Test no matching projects
    const { stdout: noProjects } = await execAsync(`TASK_MANAGER_FILE_PATH=${tasksFilePath} tsx ${CLI_PATH} list -s open -p proj-3`);
    expect(noProjects).toContain("No tasks match the specified state filter");

    // Test no matching tasks
    const { stdout: noTasks } = await execAsync(`TASK_MANAGER_FILE_PATH=${tasksFilePath} tsx ${CLI_PATH} list -s completed -p proj-1`);
    expect(noTasks).toContain("No tasks match the specified state filter");
  }, 5000);

  it("should show progress bars and status indicators correctly", async () => {
    const { stdout } = await execAsync(`TASK_MANAGER_FILE_PATH=${tasksFilePath} tsx ${CLI_PATH} list`);
    
    // Check for progress indicators
    expect(stdout).toContain("Progress:");
    expect(stdout).toContain("approved/completed/total");
    
    // Check for status indicators
    expect(stdout).toContain("In Progress");
    expect(stdout).toContain("Completed ✓");
  }, 5000);
}); 