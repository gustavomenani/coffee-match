export type VoteInput = {
  fromUserId: string;
  toUserId: string;
  interest: "yes" | "no";
};

export type MatchPair = { userAId: string; userBId: string };

function pairKey(a: string, b: string): MatchPair {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
}

export function computeMutualMatches(votes: VoteInput[]): MatchPair[] {
  const yes = new Set<string>();
  for (const v of votes) {
    if (v.interest === "yes") {
      yes.add(`${v.fromUserId}->${v.toUserId}`);
    }
  }
  const out: MatchPair[] = [];
  const seen = new Set<string>();
  for (const v of votes) {
    if (v.interest !== "yes") continue;
    const back = `${v.toUserId}->${v.fromUserId}`;
    if (!yes.has(back)) continue;
    const p = pairKey(v.fromUserId, v.toUserId);
    const k = `${p.userAId}|${p.userBId}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}
