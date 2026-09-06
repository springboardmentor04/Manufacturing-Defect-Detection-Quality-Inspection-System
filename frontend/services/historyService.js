import { api } from "./api";


export const historyService = {

  async getHistory() {

    try {

      return await api.get(
        "/inspection/history"
      );

    } catch (error) {

      throw error;

    }

  },


  async getInspection(id) {

    try {

      return await api.get(
        `/inspection/${id}`
      );

    } catch (error) {

      throw error;

    }

  }

};