import { api } from "./api";

export const analyticsService = {
  async getDefectAnalytics() {
    try {
      return await api.get("/qe/analytics/defects");
    } catch (error) {
      throw error;
    }
  },
};