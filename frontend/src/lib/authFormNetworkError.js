/**
 * Map fetch/JSON failures to a safe user-facing message (shared by auth-adjacent forms).
 */
export function authFormNetworkErrorMessage(err) {
  const isNetwork = err instanceof TypeError && err.message?.includes("fetch");
  return isNetwork
    ? "Could not reach the server. Please try again."
    : "Something went wrong. Please try again.";
}
