export type AppView = "menu" | "campaign" | "play" | "arcade" | "leaderboard" | "help";

export function viewFromMenuId(id: string): AppView | null {
  switch (id) {
    case "campaign":
      return "campaign";
    case "arcade":
      return "arcade";
    case "leaderboard":
      return "leaderboard";
    case "help":
      return "help";
    default:
      return null;
  }
}
