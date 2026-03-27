type AuthSessionHandlers = {
  refreshSession: () => Promise<string | null>;
  clearSession: () => Promise<void>;
};

let handlers: AuthSessionHandlers | null = null;

export const registerAuthSessionHandlers = (nextHandlers: AuthSessionHandlers) => {
  handlers = nextHandlers;
};

export const authSession = {
  async refreshSession() {
    return handlers?.refreshSession() ?? null;
  },
  async clearSession() {
    await handlers?.clearSession();
  },
};
