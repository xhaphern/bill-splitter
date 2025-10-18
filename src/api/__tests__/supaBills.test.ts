import { vi, describe, it, expect, beforeEach } from "vitest";
import { saveBill, listBills, deleteBill } from "../supaBills";

type SupabaseMock = {
  from: ReturnType<typeof vi.fn>;
  auth: {
    getUser: ReturnType<typeof vi.fn>;
  };
};

const supabaseMock = vi.hoisted<SupabaseMock>(() => ({
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
  },
}));

vi.mock("../../supabaseClient", () => ({
  supabase: supabaseMock,
}));

beforeEach(() => {
  supabaseMock.from.mockReset();
  supabaseMock.auth.getUser.mockReset();
});

describe("supaBills API", () => {
  it("saveBill inserts record with authenticated user id", async () => {
    const insertPayload = { title: "Dinner", currency: "USD", payload: { total: 24 } };
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const select = vi.fn().mockResolvedValue({ data: [{ id: "bill-7" }], error: null });
    const insert = vi.fn(() => ({ select }));
    supabaseMock.from.mockReturnValue({ insert });

    const saved = await saveBill(insertPayload);

    expect(supabaseMock.auth.getUser).toHaveBeenCalled();
    expect(insert).toHaveBeenCalledWith([
      {
        user_id: "user-1",
        title: "Dinner",
        currency: "USD",
        payload: { total: 24 },
      },
    ]);
    expect(saved).toEqual({ id: "bill-7" });
  });

  it("saveBill allows anonymous user", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const select = vi.fn().mockResolvedValue({ data: [{ id: "anon-bill" }], error: null });
    const insert = vi.fn(() => ({ select }));
    supabaseMock.from.mockReturnValue({ insert });

    const saved = await saveBill({ title: "Lunch", payload: {} });

    expect(insert).toHaveBeenCalledWith([
      {
        user_id: null,
        title: "Lunch",
        currency: "MVR",
        payload: {},
      },
    ]);
    expect(saved).toEqual({ id: "anon-bill" });
  });

  it("saveBill propagates auth errors", async () => {
    const authError = new Error("auth broken");
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null }, error: authError });

    await expect(saveBill({ title: "Oops", payload: {} })).rejects.toBe(authError);
  });

  it("listBills returns empty array when user not signed in", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const bills = await listBills();

    expect(supabaseMock.from).not.toHaveBeenCalled();
    expect(bills).toEqual([]);
  });

  it("listBills fetches bills ordered by created_at desc", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: "user-2" } }, error: null });
    const expected = [{ id: "b1" }];
    const order = vi.fn().mockResolvedValue({ data: expected, error: null });
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    supabaseMock.from.mockReturnValue({ select });

    const bills = await listBills();

    expect(select).toHaveBeenCalledWith("id,title,currency,total,created_at,payload");
    expect(eq).toHaveBeenCalledWith("user_id", "user-2");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(bills).toEqual(expected);
  });

  it("listBills propagates Supabase errors", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: "user-9" } }, error: null });
    const queryError = new Error("db down");
    const order = vi.fn().mockResolvedValue({ data: null, error: queryError });
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    supabaseMock.from.mockReturnValue({ select });

    await expect(listBills()).rejects.toBe(queryError);
  });

  it("deleteBill deletes given id", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const del = vi.fn(() => ({ eq }));
    supabaseMock.from.mockReturnValue({ delete: del });

    await deleteBill("bill-55");

    expect(del).toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith("id", "bill-55");
  });

  it("deleteBill throws when Supabase returns error", async () => {
    const error = new Error("cannot delete");
    const eq = vi.fn().mockResolvedValue({ error });
    const del = vi.fn(() => ({ eq }));
    supabaseMock.from.mockReturnValue({ delete: del });

    await expect(deleteBill("bill-55")).rejects.toBe(error);
  });
});
