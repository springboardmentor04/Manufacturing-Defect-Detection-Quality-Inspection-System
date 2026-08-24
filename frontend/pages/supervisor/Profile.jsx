import React, { useEffect, useState } from "react";

import {
  User,
  Mail,
  ShieldCheck,
  Calendar,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";


/* ==========================================================
   SUPERVISOR PROFILE
========================================================== */

export default function Profile() {

  const {
    user,
    updateProfile,
  } = useAuth();


  /* ========================================================
     FORM STATE
  ======================================================== */

  const [form, setForm] = useState({
    full_name: "",
    email: "",
  });


  const [dirty, setDirty] = useState(false);

  const [saving, setSaving] = useState(false);

  const [saved, setSaved] = useState(false);

  const [error, setError] = useState("");


  /* ========================================================
     LOAD USER DATA
  ======================================================== */

  useEffect(() => {

    if (!user) {
      return;
    }

    setForm({
      full_name:
        user.full_name ||
        user.name ||
        "",

      email:
        user.email ||
        "",
    });

    setDirty(false);

  }, [user]);


  /* ========================================================
     UPDATE FIELD
  ======================================================== */

  function updateField(field, value) {

    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setDirty(true);

    setSaved(false);

    setError("");
  }


  /* ========================================================
     SAVE PROFILE
  ======================================================== */

  async function handleSubmit(event) {

    event.preventDefault();

    if (!dirty) {
      return;
    }

    if (!form.full_name.trim()) {

      setError(
        "Full name cannot be empty."
      );

      return;
    }


    if (!form.email.trim()) {

      setError(
        "Email address cannot be empty."
      );

      return;
    }


    try {

      setSaving(true);

      setSaved(false);

      setError("");


      await updateProfile(
        form.full_name.trim(),
        form.email.trim()
      );


      setSaved(true);

      setDirty(false);

    } catch (err) {

      console.error(
        "Profile update failed:",
        err
      );

      setError(
        err?.message ||
        "Failed to update profile."
      );

    } finally {

      setSaving(false);

    }
  }


  /* ========================================================
     CANCEL CHANGES
  ======================================================== */

  function handleCancel() {

    setForm({
      full_name:
        user?.full_name ||
        user?.name ||
        "",

      email:
        user?.email ||
        "",
    });

    setDirty(false);

    setSaved(false);

    setError("");
  }


  /* ========================================================
     INITIALS
  ======================================================== */

  const displayName =
    form.full_name ||
    user?.full_name ||
    "Supervisor";


  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .map((part) => part.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase();


  /* ========================================================
     ACCOUNT CREATED DATE
  ======================================================== */

  const createdDate =
    user?.created_at
      ? new Date(
          user.created_at
        ).toLocaleDateString(
          "en-IN",
          {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }
        )
      : "Not available";


  /* ========================================================
     LOADING STATE
  ======================================================== */

  if (!user) {

    return (

      <div className="mx-auto max-w-5xl">

        <Card>

          <div className="flex min-h-[300px] items-center justify-center">

            <p className="text-sm text-slate-400">
              Loading supervisor profile...
            </p>

          </div>

        </Card>

      </div>

    );
  }


  /* ========================================================
     RENDER
  ======================================================== */

  return (

    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-5xl space-y-6"
    >

      {/* ==================================================
          HEADER
      ================================================== */}

      <div>

        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
          Supervisor Profile
        </p>

        <h1 className="mt-1 text-3xl font-bold text-white">
          My Profile
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Manage your VisionInspect AI account information.
        </p>

      </div>


      {/* ==================================================
          PROFILE CARD
      ================================================== */}

      <Card>

        <div
          className="
            grid
            grid-cols-1
            gap-8
            lg:grid-cols-[220px_1fr]
          "
        >

          {/* ==================================================
              PROFILE SUMMARY
          ================================================== */}

          <div
            className="
              flex
              flex-col
              items-center
              border-b
              border-slate-700
              pb-6
              text-center
              lg:border-b-0
              lg:border-r
              lg:pb-0
              lg:pr-8
            "
          >

            {/* Avatar */}

            <div
              className="
                flex
                h-24
                w-24
                items-center
                justify-center
                rounded-full
                bg-gradient-to-br
                from-cyan-400
                to-indigo-500
                text-3xl
                font-bold
                text-white
                shadow-lg
                shadow-cyan-500/20
              "
            >

              {initials}

            </div>


            {/* Name */}

            <h2
              className="
                mt-4
                text-xl
                font-semibold
                text-white
              "
            >

              {displayName}

            </h2>


            {/* Role */}

            <div
              className="
                mt-3
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-cyan-500/20
                bg-cyan-500/10
                px-3
                py-1.5
                text-xs
                font-semibold
                text-cyan-400
              "
            >

              <ShieldCheck size={14} />

              Supervisor

            </div>


            {/* Active Status */}

            <div
              className="
                mt-5
                flex
                items-center
                gap-2
                text-sm
                text-emerald-400
              "
            >

              <span
                className="
                  h-2
                  w-2
                  rounded-full
                  bg-emerald-400
                "
              />

              Active Account

            </div>

          </div>


          {/* ==================================================
              EDITABLE INFORMATION
          ================================================== */}

          <div>

            <div className="mb-6">

              <h3
                className="
                  text-lg
                  font-semibold
                  text-white
                "
              >

                Personal Information

              </h3>

              <p
                className="
                  mt-1
                  text-sm
                  text-slate-400
                "
              >

                Update the information associated
                with your account.

              </p>

            </div>


            <div className="space-y-5">

              {/* Full Name */}

              <div className="relative">

                <User
                  size={17}
                  className="
                    absolute
                    left-3
                    top-[38px]
                    z-10
                    text-slate-500
                  "
                />

                <div className="pl-0">

                  <Input
                    label="Full Name"
                    value={form.full_name}
                    onChange={(event) =>
                      updateField(
                        "full_name",
                        event.target.value
                      )
                    }
                  />

                </div>

              </div>


              {/* Email */}

              <div className="relative">

                <Mail
                  size={17}
                  className="
                    absolute
                    left-3
                    top-[38px]
                    z-10
                    text-slate-500
                  "
                />

                <Input
                  label="Email Address"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    updateField(
                      "email",
                      event.target.value
                    )
                  }
                />

              </div>

            </div>

          </div>

        </div>

      </Card>


      {/* ==================================================
          ACCOUNT INFORMATION
      ================================================== */}

      <Card title="Account Information">

        <div
          className="
            grid
            grid-cols-1
            gap-4
            md:grid-cols-3
          "
        >

          {/* Role */}

          <InfoBox
            icon={<ShieldCheck size={18} />}
            label="Role"
            value="Supervisor"
          />


          {/* User ID */}

          <InfoBox
            icon={<User size={18} />}
            label="User ID"
            value={
              user?.id
                ? `SUP-${String(user.id).padStart(3, "0")}`
                : "Not available"
            }
          />


          {/* Created */}

          <InfoBox
            icon={<Calendar size={18} />}
            label="Account Created"
            value={createdDate}
          />

        </div>

      </Card>


      {/* ==================================================
          EMAIL INFORMATION
      ================================================== */}

      <Card title="Contact Information">

        <div
          className="
            rounded-xl
            border
            border-slate-700
            bg-slate-800/50
            p-4
          "
        >

          <div className="flex items-center gap-3">

            <Mail
              size={18}
              className="text-cyan-400"
            />

            <div className="min-w-0">

              <p className="text-xs text-slate-500">
                Registered Email
              </p>

              <p className="mt-1 truncate text-sm font-medium text-white">
                {user?.email || "Not available"}
              </p>

            </div>

          </div>

        </div>

      </Card>


      {/* ==================================================
          SUCCESS MESSAGE
      ================================================== */}

      {saved && (

        <div
          className="
            flex
            items-center
            gap-2
            rounded-xl
            border
            border-emerald-500/20
            bg-emerald-500/10
            px-4
            py-3
            text-sm
            text-emerald-400
          "
        >

          <CheckCircle2 size={17} />

          Profile updated successfully.

        </div>

      )}


      {/* ==================================================
          ERROR MESSAGE
      ================================================== */}

      {error && (

        <div
          className="
            flex
            items-center
            gap-2
            rounded-xl
            border
            border-red-500/20
            bg-red-500/10
            px-4
            py-3
            text-sm
            text-red-400
          "
        >

          <AlertCircle size={17} />

          {error}

        </div>

      )}


      {/* ==================================================
          ACTIONS
      ================================================== */}

      <div
        className="
          flex
          justify-end
          gap-3
        "
      >

        <Button
          type="button"
          variant="secondary"
          onClick={handleCancel}
          disabled={!dirty || saving}
        >

          <span className="flex items-center gap-2">

            <RotateCcw size={16} />

            Cancel

          </span>

        </Button>


        <Button
          type="submit"
          disabled={!dirty || saving}
        >

          <span className="flex items-center gap-2">

            <Save size={16} />

            {saving
              ? "Saving..."
              : "Save Changes"}

          </span>

        </Button>

      </div>

    </form>

  );
}


/* ==========================================================
   INFORMATION BOX
========================================================== */

function InfoBox({
  icon,
  label,
  value,
}) {

  return (

    <div
      className="
        rounded-xl
        border
        border-slate-700
        bg-slate-800/50
        p-4
      "
    >

      <div className="flex items-center gap-3">

        <div className="text-cyan-400">
          {icon}
        </div>

        <div className="min-w-0">

          <p className="text-xs text-slate-500">
            {label}
          </p>

          <p
            className="
              mt-2
              truncate
              text-sm
              font-medium
              text-white
            "
          >

            {value}

          </p>

        </div>

      </div>

    </div>

  );
}