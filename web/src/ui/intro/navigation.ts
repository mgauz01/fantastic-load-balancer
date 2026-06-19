export type AppView = "menu" | "campaign" | "leaderboard" | "help";

export function viewFromMenuId(id: string): AppView | null {
  switch (id) {
    case "campaign":
      return "campaign";
    case "leaderboard":
      return "leaderboard";
    case "help":
      return "help";
    default:
      return null;
  }
}
