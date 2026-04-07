import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCESS_TOKEN_KEY = "faceme.accessToken";
const REFRESH_TOKEN_KEY = "faceme.refreshToken";
const LANGUAGE_KEY = "faceme.language";

export const tokenStorage = {
  async getAccessToken() {
    return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  },
  async getRefreshToken() {
    return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  },
  async setTokens(accessToken: string, refreshToken: string) {
    await AsyncStorage.multiSet([
      [ACCESS_TOKEN_KEY, accessToken],
      [REFRESH_TOKEN_KEY, refreshToken],
    ]);
  },
  async clear() {
    await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
  },
};

export const preferenceStorage = {
  async getLanguage() {
    return AsyncStorage.getItem(LANGUAGE_KEY);
  },
  async setLanguage(language: string) {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  },
  async clearLanguage() {
    await AsyncStorage.removeItem(LANGUAGE_KEY);
  },
};
