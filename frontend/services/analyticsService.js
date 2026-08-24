const API_BASE_URL = "http://127.0.0.1:8000";

export const analyticsService = {

  async getDefectAnalytics() {

    const response = await fetch(
      `${API_BASE_URL}/qe/analytics/defects`
    );

    if (!response.ok) {
      throw new Error(
        "Failed to load defect analytics"
      );
    }

    return await response.json();
  },

};