import axios from "axios";

const API = "http://localhost:8000";

export const historyService = {

  async getHistory() {

    try {

      const response = await axios.get(
        `${API}/inspection/history`
      );

      return response.data;

    } catch (error) {

      throw error.response?.data || error;

    }

  },

  async getInspection(id) {

    try {

      const response = await axios.get(
        `${API}/inspection/${id}`
      );

      return response.data;

    } catch (error) {

      throw error.response?.data || error;

    }

  }

};