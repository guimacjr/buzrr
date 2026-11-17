import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  role: vi.fn(),
  find: vi.fn(),
  create: vi.fn(),
  hash: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("better-auth", () => ({
  betterAuth: () => ({
    api: { getSession: mocks.session },
    $context: Promise.resolve({ password: { hash: mocks.hash } }),
  }),
}));
vi.mock("better-auth/adapters/prisma", () => ({ prismaAdapter: vi.fn() }));
vi.mock("@buzrr/prisma", () => ({
  prisma: { user: { findFirst: mocks.find, create: mocks.create } },
  Prisma: { PrismaClientKnownRequestError: class extends Error {} },
}));
vi.mock("../get-current-role", () => ({ getUserRole: mocks.role }));
import { provisionBulkAccounts } from "../auth";

describe("superadmin account provisioning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_EMAIL_PASSWORD = "ON";
    process.env.AUTH_EMAIL_SIGNUP = "OFF";
    mocks.session.mockResolvedValue({ user: { id: "actor" } });
    mocks.role.mockResolvedValue("superadmin");
    mocks.find.mockResolvedValue(null);
    mocks.hash.mockResolvedValue("hashed-password");
    mocks.create.mockResolvedValue({});
  });
  const rows = [{ email: "TEAM@example.com", password: "password123" }];
  it("rejects unauthenticated and demoted callers before writing or hashing", async () => {
    mocks.session.mockResolvedValueOnce(null);
    await expect(provisionBulkAccounts(rows, new Headers())).rejects.toThrow(
      "superadmins",
    );
    mocks.role.mockResolvedValueOnce("admin");
    await expect(provisionBulkAccounts(rows, new Headers())).rejects.toThrow(
      "superadmins",
    );
    expect(mocks.hash).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("creates atomic credential accounts with signup closed and never returns passwords", async () => {
    const result = await provisionBulkAccounts(rows, new Headers());
    expect(result[0]).toEqual({
      email: "team@example.com",
      userId: expect.any(String),
    });
    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        id: result[0]!.userId,
        email: "team@example.com",
        name: "team",
        role: "user",
        accounts: {
          create: {
            providerId: "credential",
            accountId: result[0]!.userId,
            password: "hashed-password",
          },
        },
      },
    });
  });
  it("preserves existing users and continues after a failed account", async () => {
    mocks.find.mockResolvedValueOnce({ id: "existing" });
    mocks.create.mockRejectedValueOnce(new Error("private database detail"));
    const result = await provisionBulkAccounts(
      [
        ...rows,
        { email: "two@example.com", password: "password123" },
        { email: "three@example.com", password: "password123" },
      ],
      new Headers(),
    );
    expect(result[0]!.error).toContain("já cadastrado");
    expect(result[1]!.error).not.toContain("private");
    expect(result[2]!.userId).toBeDefined();
    expect(mocks.create).toHaveBeenCalledTimes(2);
  });
  it("rejects disabled password auth, duplicate emails and weak passwords before writes", async () => {
    process.env.AUTH_EMAIL_PASSWORD = "OFF";
    await expect(provisionBulkAccounts(rows, new Headers())).rejects.toThrow(
      "AUTH_EMAIL_PASSWORD",
    );
    process.env.AUTH_EMAIL_PASSWORD = "ON";
    await expect(
      provisionBulkAccounts([...rows, ...rows], new Headers()),
    ).rejects.toThrow();
    await expect(
      provisionBulkAccounts(
        [{ email: "a@b.com", password: "short" }],
        new Headers(),
      ),
    ).rejects.toThrow();
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
