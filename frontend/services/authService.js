import { api } from "./api";


export const authService = {

  /* =====================================================
     LOGIN
  ===================================================== */

  async login(email, password) {

    const formData =
      new URLSearchParams();

    formData.append(
      "username",
      email
    );

    formData.append(
      "password",
      password
    );


    const response =
      await fetch(
        "http://localhost:8000/auth/login",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },

          body: formData,
        }
      );


    if (!response.ok) {

      const error =
        await response.json();

      throw new Error(
        error.detail ||
        "Login failed"
      );
    }


    const tokenData =
      await response.json();


    localStorage.setItem(
      "vi_token",
      tokenData.access_token
    );


    const user =
      await api.get("/users/me");


    localStorage.setItem(
      "vi_user",
      JSON.stringify(user)
    );


    return user;
  },


  /* =====================================================
     REGISTER
  ===================================================== */

  async register(payload) {

    return api.post(
      "/auth/register",
      payload,
      {
        auth: false,
      }
    );
  },


  /* =====================================================
     UPDATE PROFILE
  ===================================================== */

  async updateProfile(
    full_name,
    email
  ) {

    const updatedUser =
      await api.put(
        "/auth/profile",
        {
          full_name,
          email,
        }
      );


    /*
      Update local user after
      successful database update.
    */

    localStorage.setItem(
      "vi_user",
      JSON.stringify(
        updatedUser
      )
    );


    return updatedUser;
  },


  /* =====================================================
     LOGOUT
  ===================================================== */

  logout() {

    localStorage.removeItem(
      "vi_token"
    );

    localStorage.removeItem(
      "vi_user"
    );
  },


  /* =====================================================
     CURRENT USER
  ===================================================== */

  getCurrentUser() {

    const raw =
      localStorage.getItem(
        "vi_user"
      );


    return raw
      ? JSON.parse(raw)
      : null;
  },

};