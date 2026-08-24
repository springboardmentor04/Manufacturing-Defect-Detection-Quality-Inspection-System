import {
  Users as UsersIcon,
  Mail,
  ShieldCheck,
  CalendarDays,
} from "lucide-react";

import { useFetch } from "../../hooks/useFetch";
import { dashboardService } from "../../services/dashboardService";

import Card from "../../components/common/Card";
import Loader from "../../components/common/Loader";

import { formatDate } from "../../utils/formatters";


export default function Users() {

  const {
    data: users,
    loading,
  } = useFetch(
    () => dashboardService.getUsers(),
    []
  );


  return (

    <div className="space-y-8">

      {/* =====================================================
          Header
      ===================================================== */}

      <div
        className="
          rounded-3xl
          border border-cyan-500/10
          bg-gradient-to-r
          from-slate-900
          via-slate-800
          to-cyan-950
          p-8
        "
      >

        <div className="flex items-center gap-4">

          <div className="rounded-2xl bg-cyan-500/20 p-4">

            <UsersIcon
              size={34}
              className="text-cyan-400"
            />

          </div>

          <div>

            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">

              Supervisor Workspace

            </p>

            <h1 className="mt-1 text-3xl font-bold text-white">

              Team Members

            </h1>

            <p className="mt-2 text-slate-300">

              View the Quality Engineers assigned to the
              manufacturing inspection system.

            </p>

          </div>

        </div>

      </div>


      {/* =====================================================
          Statistics
      ===================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <UserStatCard
          title="Quality Engineers"
          value={users?.length || 0}
          icon={
            <UsersIcon
              size={24}
              className="text-cyan-400"
            />
          }
        />

        <UserStatCard
          title="Active Team"
          value={users?.length || 0}
          icon={
            <ShieldCheck
              size={24}
              className="text-emerald-400"
            />
          }
        />

        <UserStatCard
          title="Team Role"
          value="Quality Engineer"
          icon={
            <ShieldCheck
              size={24}
              className="text-blue-400"
            />
          }
        />

      </div>


      {/* =====================================================
          Team Members
      ===================================================== */}

      <Card title="Quality Engineering Team">

        {loading ? (

          <Loader label="Loading team members..." />

        ) : !users || users.length === 0 ? (

          <div className="flex min-h-[220px] flex-col items-center justify-center text-center">

            <UsersIcon
              size={42}
              className="mb-4 text-slate-600"
            />

            <h3 className="text-lg font-semibold text-white">

              No Quality Engineers Found

            </h3>

            <p className="mt-2 text-sm text-slate-500">

              No Quality Engineer accounts are currently
              registered in the system.

            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="min-w-full">

              <thead>

                <tr className="border-b border-slate-700">

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">

                    Member

                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">

                    Email

                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">

                    Role

                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">

                    Joined

                  </th>

                </tr>

              </thead>


              <tbody>

                {users.map((user) => (

                  <tr
                    key={user.id}
                    className="
                      border-b
                      border-slate-800
                      transition
                      hover:bg-slate-800/40
                    "
                  >

                    {/* Member */}

                    <td className="px-5 py-5">

                      <div className="flex items-center gap-3">

                        <div
                          className="
                            flex
                            h-10
                            w-10
                            items-center
                            justify-center
                            rounded-xl
                            bg-cyan-500/10
                            text-sm
                            font-bold
                            text-cyan-400
                          "
                        >

                          {getInitials(user.full_name)}

                        </div>

                        <div>

                          <p className="font-medium text-white">

                            {user.full_name}

                          </p>

                          <p className="text-xs text-slate-500">

                            ID: QE-{String(user.id).padStart(3, "0")}

                          </p>

                        </div>

                      </div>

                    </td>


                    {/* Email */}

                    <td className="px-5 py-5">

                      <div className="flex items-center gap-2 text-slate-300">

                        <Mail
                          size={15}
                          className="text-slate-500"
                        />

                        {user.email}

                      </div>

                    </td>


                    {/* Role */}

                    <td className="px-5 py-5">

                      <span
                        className="
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
                          text-cyan-300
                        "
                      >

                        <ShieldCheck size={14} />

                        Quality Engineer

                      </span>

                    </td>


                    {/* Joined */}

                    <td className="px-5 py-5">

                      <div className="flex items-center gap-2 text-sm text-slate-400">

                        <CalendarDays
                          size={15}
                          className="text-slate-500"
                        />

                        {user.created_at
                          ? formatDate(user.created_at)
                          : "—"
                        }

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </Card>

    </div>

  );
}


/* =========================================================
   Statistics Card
========================================================= */

function UserStatCard({
  title,
  value,
  icon,
}) {

  return (

    <div
      className="
        rounded-2xl
        border
        border-slate-700
        bg-slate-900/70
        p-6
        transition
        hover:border-cyan-500/30
      "
    >

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm text-slate-400">

            {title}

          </p>

          <h2 className="mt-3 text-3xl font-bold text-white">

            {value}

          </h2>

        </div>

        <div
          className="
            rounded-xl
            bg-slate-800
            p-3
          "
        >

          {icon}

        </div>

      </div>

    </div>

  );
}


/* =========================================================
   Initials
========================================================= */

function getInitials(name) {

  if (!name) {
    return "QE";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

}