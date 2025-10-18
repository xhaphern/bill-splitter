import { vi, describe, it, expect, beforeEach } from "vitest";
import { fetchFriends, addFriend, removeFriend, updateFriend } from "../supaFriends";

type FromFn = ReturnType<typeof vi.fn>;

type SupabaseMock = {
  from: FromFn;
};

const supabaseMock = vi.hoisted<SupabaseMock>(() => ({
  from: vi.fn(),
}));

vi.mock("../../supabaseClient", () => ({
  supabase: supabaseMock,
}));

beforeEach(() => {
  supabaseMock.from.mockReset();
});

describe("supaFriends API", () => {
  it("fetchFriends returns friend list and filters by user", async () => {
    const userId = "user-123";
    const result = [{ id: 1, name: "Sam" }];
    const eq = vi.fn().mockResolvedValue({ data: result, error: null });
    const select = vi.fn(() => ({ eq }));
    supabaseMock.from.mockReturnValue({ select });

    const friends = await fetchFriends(userId);

    expect(supabaseMock.from).toHaveBeenCalledWith("friends");
    expect(select).toHaveBeenCalledWith("*");
    expect(eq).toHaveBeenCalledWith("user_id", userId);
    expect(friends).toEqual(result);
  });

  it("fetchFriends throws when Supabase returns error", async () => {
    const eqError = new Error("boom");
    const eq = vi.fn().mockResolvedValue({ data: null, error: eqError });
    const select = vi.fn(() => ({ eq }));
    supabaseMock.from.mockReturnValue({ select });

    await expect(fetchFriends("user-1")).rejects.toBe(eqError);
  });

  it("addFriend inserts friend with user id and returns created row", async () => {
    const created = { id: 7, name: "Alex" };
    const select = vi.fn().mockResolvedValue({ data: [created], error: null });
    const insert = vi.fn(() => ({ select }));
    supabaseMock.from.mockReturnValue({ insert });

    const payload = { name: "Alex", account: "ax-1", phone: "+15551234567" };
    const saved = await addFriend("user-9", payload);

    expect(insert).toHaveBeenCalledWith([{ ...payload, user_id: "user-9" }]);
    expect(select).toHaveBeenCalled();
    expect(saved).toEqual(created);
  });

  it("removeFriend deletes friend by id and user", async () => {
    const chain = { eq: vi.fn() };
    chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ error: null });
    const del = vi.fn(() => chain);
    supabaseMock.from.mockReturnValue({ delete: del });

    await removeFriend("42", "user-123");

    expect(del).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenNthCalledWith(1, "id", "42");
    expect(chain.eq).toHaveBeenNthCalledWith(2, "user_id", "user-123");
  });

  it("updateFriend updates record and returns the updated row", async () => {
    const updated = { id: 4, name: "Taylor" };
    const select = vi.fn().mockResolvedValue({ data: [updated], error: null });
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    supabaseMock.from.mockReturnValue({ update });

    const result = await updateFriend("4", { name: "Taylor" });

    expect(update).toHaveBeenCalledWith({ name: "Taylor" });
    expect(eq).toHaveBeenCalledWith("id", "4");
    expect(select).toHaveBeenCalled();
    expect(result).toEqual(updated);
  });

  it("updateFriend throws when Supabase returns error", async () => {
    const error = new Error("write failed");
    const select = vi.fn().mockResolvedValue({ data: null, error });
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    supabaseMock.from.mockReturnValue({ update });

    await expect(updateFriend("5", { name: "Jamie" })).rejects.toBe(error);
  });
});
