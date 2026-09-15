"use client";

import { useState } from "react";

import { User, Mail, Briefcase, Phone, Hash, Save, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const profileSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: {
      name: user?.name || "",
      phone: user?.phone || "",
    }
  });

  const onSubmit = async () => {
    setIsLoading(true);
    setSuccessMsg("");
    // Mock save
    await new Promise(r => setTimeout(r, 1000));
    setIsLoading(false);
    setIsEditing(false);
    setSuccessMsg("Profile updated successfully!");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  if (!user) return <div className="p-8">Loading profile...</div>;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">My Profile</h1>
          <p className="text-slate-500 dark:text-slate-400">View and manage your personal information.</p>
        </div>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg font-medium transition-colors">
            Edit Profile
          </button>
        )}
      </div>

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-900/30 font-medium text-sm">
          {successMsg}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-8 sm:p-12 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
            {user.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{user.name}</h2>
            <p className="text-slate-500 dark:text-slate-400 capitalize">{user.role?.replace("_", " ").toLowerCase()}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-8 sm:p-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                <User className="w-4 h-4" /> Full Name
              </label>
              {isEditing ? (
                <>
                  <input {...register("name")} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                </>
              ) : (
                <p className="text-slate-900 dark:text-white font-medium">{user.name}</p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                <Mail className="w-4 h-4" /> Email Address
              </label>
              <p className="text-slate-900 dark:text-white font-medium opacity-70 cursor-not-allowed">{user.email}</p>
              {isEditing && <p className="text-xs text-slate-400 mt-1">Email cannot be changed.</p>}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                <Hash className="w-4 h-4" /> Employee ID
              </label>
              <p className="text-slate-900 dark:text-white font-medium opacity-70 cursor-not-allowed">{user.employee_id}</p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                <Briefcase className="w-4 h-4" /> Department
              </label>
              <p className="text-slate-900 dark:text-white font-medium opacity-70 cursor-not-allowed">{user.department || "N/A"}</p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                <Phone className="w-4 h-4" /> Phone Number
              </label>
              {isEditing ? (
                <input {...register("phone")} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="+1 (555) 000-0000" />
              ) : (
                <p className="text-slate-900 dark:text-white font-medium">{user.phone || "Not provided"}</p>
              )}
            </div>

          </div>

          {isEditing && (
            <div className="mt-10 flex gap-4 border-t border-slate-100 dark:border-slate-800 pt-8">
              <button type="submit" disabled={isLoading} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-70">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
              </button>
              <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors">
                Cancel
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
