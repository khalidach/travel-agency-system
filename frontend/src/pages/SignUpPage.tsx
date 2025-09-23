// frontend/src/pages/SignUpPage.tsx
import React from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { Plane, Lock, User, Building, Mail, Phone } from "lucide-react";
import { toast } from "react-hot-toast";
import * as api from "../services/api";
import { useMutation } from "@tanstack/react-query";

type SignUpFormData = {
  ownerName: string;
  agencyName: string;
  phoneNumber: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
};

export default function SignUpPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignUpFormData>();

  const { mutate: signupUser, isPending } = useMutation({
    mutationFn: (data: SignUpFormData) => api.signup(data),
    onSuccess: (data) => {
      toast.success(data.message || "Account created successfully!");
      navigate("/login");
    },
    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Registration failed.";
      toast.error(errorMessage);
    },
  });

  const onSubmit = (data: SignUpFormData) => {
    signupUser(data);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
        <div className="text-center">
          <div className="inline-block p-4 bg-blue-600 rounded-2xl mb-4">
            <Plane className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Create Your TravelPro Account
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Start your 3-day free trial now.
          </p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sr-only">
                Owner Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  {...register("ownerName", {
                    required: "Owner name is required",
                  })}
                  placeholder="Owner Name"
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                    errors.ownerName
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
              </div>
              {errors.ownerName && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.ownerName.message}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sr-only">
                Agency Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  {...register("agencyName", {
                    required: "Agency name is required",
                  })}
                  placeholder="Agency Name"
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                    errors.agencyName
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
              </div>
              {errors.agencyName && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.agencyName.message}
                </p>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sr-only">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="email"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^\S+@\S+$/i,
                    message: "Invalid email address",
                  },
                })}
                placeholder="Email Address"
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                  errors.email
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">
                {errors.email.message}
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sr-only">
              Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="tel"
                {...register("phoneNumber", {
                  required: "Phone number is required",
                })}
                placeholder="Phone Number"
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                  errors.phoneNumber
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              />
            </div>
            {errors.phoneNumber && (
              <p className="text-red-500 text-xs mt-1">
                {errors.phoneNumber.message}
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sr-only">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="w-5 h-5 text-gray-400" />
              </div>
              <input
                {...register("username", { required: "Username is required" })}
                placeholder="Username"
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                  errors.username
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              />
            </div>
            {errors.username && (
              <p className="text-red-500 text-xs mt-1">
                {errors.username.message}
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sr-only">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="password"
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 6,
                    message: "Password must be at least 6 characters",
                  },
                })}
                placeholder="Password"
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                  errors.password
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              />
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">
                {errors.password.message}
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sr-only">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="password"
                {...register("confirmPassword", {
                  required: "Please confirm your password",
                  validate: (value) =>
                    value === watch("password") || "Passwords do not match",
                })}
                placeholder="Confirm Password"
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                  errors.confirmPassword
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {isPending ? "Creating Account..." : "Sign Up"}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
