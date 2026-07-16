import { describe, it, expect } from "vitest";
import {
  computeMutualMatches,
  whoLikedMe,
  type VoteInput,
} from "@/lib/domain/matching";

describe("matching", () => {
  it("creates match only when both said yes", () => {
    const votes: VoteInput[] = [
      { fromUserId: "a", toUserId: "b", interest: "yes" },
      { fromUserId: "b", toUserId: "a", interest: "yes" },
      { fromUserId: "a", toUserId: "c", interest: "yes" },
      { fromUserId: "c", toUserId: "a", interest: "no" },
    ];
    const matches = computeMutualMatches(votes);
    expect(matches).toEqual([{ userAId: "a", userBId: "b" }]);
  });

  it("canonicalizes pair order lexicographically", () => {
    const votes: VoteInput[] = [
      { fromUserId: "z", toUserId: "a", interest: "yes" },
      { fromUserId: "a", toUserId: "z", interest: "yes" },
    ];
    expect(computeMutualMatches(votes)[0]).toEqual({ userAId: "a", userBId: "z" });
  });

  it("dedupes pairs", () => {
    const votes: VoteInput[] = [
      { fromUserId: "a", toUserId: "b", interest: "yes" },
      { fromUserId: "b", toUserId: "a", interest: "yes" },
      { fromUserId: "a", toUserId: "b", interest: "yes" },
    ];
    expect(computeMutualMatches(votes)).toHaveLength(1);
  });

  it("lists who liked me", () => {
    const votes = [
      { fromUserId: "b", toUserId: "a", interest: "yes" as const },
      { fromUserId: "c", toUserId: "a", interest: "no" as const },
    ];
    expect(whoLikedMe(votes, "a")).toEqual(["b"]);
  });
});
