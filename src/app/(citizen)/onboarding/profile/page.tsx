"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User,
  Phone,
  MapPin,
  Briefcase,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { LotusLogo } from "@/components/ui/LotusLogo";
import { useSevaSaarthi } from "@/lib/store/formly-store";
import { toast } from "sonner";

function ProfileOnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profileFields, batchUpdateProfileFields } = useSevaSaarthi();

  const rawStep = Number(searchParams.get("step")) || 1;
  const initialStepParam = rawStep >= 1 && rawStep <= 4 ? rawStep : 1;
  const [currentStep, setCurrentStep] = useState<number>(initialStepParam);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const [isPhoneVerified, setIsPhoneVerified] = useState(false);

  // Redirect to /dashboard if profile is already complete (unless explicitly editing)
  useEffect(() => {
    if (searchParams.get("edit") === "true") return;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.completed) {
          router.replace("/dashboard");
        }
      })
      .catch(() => {});
  }, [router, searchParams]);

  // Synchronize wizard step with URL query parameter
  useEffect(() => {
    const raw = Number(searchParams.get("step"));
    if (raw >= 1 && raw <= 4) {
      setCurrentStep(raw);
    }
  }, [searchParams]);

  // Form State
  const [fullName, setFullName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("Male");
  const [avatar, setAvatar] = useState("");

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Check authoritative phone verification status
  useEffect(() => {
    const checkPhoneVerification = async () => {
      try {
        const res = await fetch("/api/citizen/phone-verify");
        if (res.ok) {
          const data = await res.json();
          if (data.phone_verified) {
            setIsPhoneVerified(true);
            if (data.phone && !phone) setPhone(data.phone);
          }
        }
      } catch {}
    };
    checkPhoneVerification();
  }, [phone]);

  const [stateName, setStateName] = useState("Telangana");
  const [district, setDistrict] = useState("");
  const [mandal, setMandal] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");

  const [occupation, setOccupation] = useState("Student");
  const [education, setEducation] = useState("B.Tech / Bachelor's Degree");
  const [category, setCategory] = useState("General");

  // Prepopulate from user session or existing profile fields
  useEffect(() => {
    if (user) {
      if (user.name && !fullName) setFullName(user.name);
      if (user.email && !email) setEmail(user.email);
      if (user.phone && !phone) {
        setPhone(user.phone);
        setIsPhoneVerified(true);
      }
    }

    if (Array.isArray(profileFields)) {
      const fieldMap: Record<string, string> = {};
      profileFields.forEach((f) => {
        if (f.field_name && f.value) fieldMap[f.field_name] = f.value;
      });

      if (fieldMap.full_name) setFullName(fieldMap.full_name);
      if (fieldMap.father_name) setFatherName(fieldMap.father_name);
      if (fieldMap.mother_name) setMotherName(fieldMap.mother_name);
      if (fieldMap.date_of_birth) setDob(fieldMap.date_of_birth);
      if (fieldMap.gender) setGender(fieldMap.gender);
      if (fieldMap.phone_verified === "true" || fieldMap.phone_verified === "1") {
        setIsPhoneVerified(true);
      }
      if (fieldMap.email) setEmail(fieldMap.email);
      if (fieldMap.state) setStateName(fieldMap.state);
      if (fieldMap.district) setDistrict(fieldMap.district);
      if (fieldMap.mandal) setMandal(fieldMap.mandal);
      if (fieldMap.city || fieldMap.village) setCity(fieldMap.city || fieldMap.village);
      if (fieldMap.permanent_address || fieldMap.address) setAddress(fieldMap.permanent_address || fieldMap.address);
      if (fieldMap.pincode) setPincode(fieldMap.pincode);
      if (fieldMap.occupation) setOccupation(fieldMap.occupation);
      if (fieldMap.education_degree) setEducation(fieldMap.education_degree);
      if (fieldMap.caste_category) setCategory(fieldMap.caste_category);
    }
  }, [user, profileFields]);

  const handleSaveStep = async (nextStep: number) => {
    setIsSubmitting(true);
    try {
      let fieldsToSave: Record<string, string> = {};

      if (currentStep === 1) {
        if (!fullName.trim() || !dob.trim() || !gender.trim()) {
          toast.error("Please fill in all required personal information.");
          setIsSubmitting(false);
          return;
        }
        fieldsToSave = {
          full_name: fullName.trim(),
          father_name: fatherName.trim(),
          mother_name: motherName.trim(),
          date_of_birth: dob.trim(),
          gender: gender.trim(),
        };
      } else if (currentStep === 2) {
        if (!email.trim()) {
          toast.error("Please enter a valid email address.");
          setIsSubmitting(false);
          return;
        }
        if (!phone.trim()) {
          toast.error("Please enter your mobile number.");
          setIsSubmitting(false);
          return;
        }
        fieldsToSave = {
          phone_number: phone.trim(),
          mobile: phone.trim(),
          phone_verified: "true",
          email: email.trim().toLowerCase(),
        };
      } else if (currentStep === 3) {
        if (!district.trim() || !pincode.trim() || !address.trim()) {
          toast.error("Please enter your district, address, and PIN code.");
          setIsSubmitting(false);
          return;
        }
        fieldsToSave = {
          state: stateName.trim(),
          district: district.trim(),
          mandal: mandal.trim(),
          city: city.trim(),
          village: city.trim(),
          permanent_address: address.trim(),
          address: address.trim(),
          pincode: pincode.trim(),
          location: `${city ? city + ", " : ""}${stateName}`,
        };
      } else if (currentStep === 4) {
        fieldsToSave = {
          occupation: occupation.trim(),
          education_degree: education.trim(),
          caste_category: category.trim(),
          profile_completed: "true",
        };
      }

      await batchUpdateProfileFields(fieldsToSave);

      if (nextStep > 4) {
        setIsFinished(true);
        toast.success("Profile setup completed successfully!");
      } else {
        setCurrentStep(nextStep);
        router.replace(`/onboarding/profile?step=${nextStep}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile information.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepTitles = [
    { num: 1, label: "Personal Info", icon: User },
    { num: 2, label: "Contact", icon: Phone },
    { num: 3, label: "Address", icon: MapPin },
    { num: 4, label: "Additional Info", icon: Briefcase },
  ];

  if (isFinished) {
    return (
      <div className="min-h-screen bg-[#FBFBFE] flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-100 p-8 shadow-xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-xs">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Your profile is ready! 🎉
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Seva Saarthi can now use your saved information to assist with supported government applications.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left text-xs text-slate-600 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Citizen:</span>
              <span className="font-bold text-slate-800">{fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Phone:</span>
              <span className="font-semibold text-slate-800">{phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Location:</span>
              <span className="font-semibold text-slate-800">{district}, {stateName}</span>
            </div>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            className="w-full py-3 px-4 bg-[#2F27CE] hover:bg-[#261fa8] text-white text-xs font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span>Go to Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFE] flex flex-col justify-between p-4 sm:p-6 md:p-8">
      {/* Top Brand Header */}
      <div className="max-w-2xl mx-auto w-full flex items-center justify-between pb-6">
        <div className="flex items-center gap-2.5">
          <LotusLogo className="w-8 h-8" />
          <div>
            <div className="text-base font-black tracking-tight text-slate-900">Seva Saarthi</div>
            <div className="text-[10px] font-medium text-slate-400">One Form. A Smarter India.</div>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Profile Setup Wizard</span>
        </div>
      </div>

      {/* Main Wizard Card */}
      <div className="max-w-2xl mx-auto w-full bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-xl">
        {/* Header */}
        <div className="mb-6 space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Step {currentStep} of 4
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Let&apos;s set up your profile
          </h1>
          <p className="text-xs text-slate-500">
            Your information helps Saarthi prepare government applications faster.
          </p>
        </div>

        {/* Step Progress Bar */}
        <div className="grid grid-cols-4 gap-2 mb-8">
          {stepTitles.map((step) => {
            const isDone = currentStep > step.num;
            const isCurrent = currentStep === step.num;
            return (
              <div key={step.num} className="space-y-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    isDone
                      ? "bg-emerald-500"
                      : isCurrent
                      ? "bg-[#2F27CE]"
                      : "bg-slate-100"
                  }`}
                />
                <div className="text-[11px] font-semibold text-slate-500 hidden sm:flex items-center gap-1 truncate">
                  <span
                    className={`w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold ${
                      isDone
                        ? "bg-emerald-100 text-emerald-700"
                        : isCurrent
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {step.num}
                  </span>
                  <span className={isCurrent ? "text-slate-900 font-bold" : ""}>
                    {step.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Form Steps */}
        <div className="space-y-4">
          {/* STEP 1: PERSONAL INFORMATION */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name (as per Aadhaar / Official ID) *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Sai Sankeerth"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2F27CE] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Father&apos;s / Guardian&apos;s Full Name
                  </label>
                  <input
                    type="text"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2F27CE] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mother&apos;s Full Name
                  </label>
                  <input
                    type="text"
                    value={motherName}
                    onChange={(e) => setMotherName(e.target.value)}
                    placeholder="e.g. Lakshmi Devi"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2F27CE] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2F27CE] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Gender *
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2F27CE] focus:bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Profile Photo (Optional)
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:bg-slate-50 transition-colors cursor-pointer">
                  <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs font-medium text-slate-600">
                    Upload passport-style photo for official documents
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">JPG or PNG (Max 2 MB)</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CONTACT */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Email Address */}
              <div>
                <label htmlFor="profile-email-input" className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="profile-email-input"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#2F27CE] focus:bg-white"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label htmlFor="profile-phone-input" className="block text-xs font-bold text-slate-700 mb-1">
                  Phone Number *
                </label>
                <div className="flex rounded-xl border border-slate-200 bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2F27CE] focus-within:border-[#2F27CE] transition-all overflow-hidden">
                  <div className="flex items-center gap-1.5 px-3.5 bg-slate-100/80 border-r border-slate-200 select-none shrink-0">
                    <span className="text-xs font-bold text-slate-700">+91</span>
                  </div>
                  <input
                    type="tel"
                    id="profile-phone-input"
                    required
                    value={phone.replace(/^\+91\s?/, "")}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setPhone(digits ? `+91${digits}` : "");
                    }}
                    placeholder="8499801489"
                    className="w-full px-3.5 py-2.5 bg-transparent text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  10-digit Indian mobile number authenticated with your account.
                </p>
              </div>

              <div className="p-3 bg-blue-50/60 rounded-xl flex items-start gap-2 border border-blue-100">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-900 leading-relaxed">
                  Your contact details are encrypted and only used to fill government portal forms with your explicit consent.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: ADDRESS */}
          {currentStep === 3 && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">State *</label>
                  <select
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2F27CE] focus:bg-white"
                  >
                    <option value="Telangana">Telangana</option>
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="Kerala">Kerala</option>
                    <option value="Other">Other State / UT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">District *</label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="e.g. Hyderabad / Ranga Reddy"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2F27CE] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mandal / Tahsil</label>
                  <input
                    type="text"
                    value={mandal}
                    onChange={(e) => setMandal(e.target.value)}
                    placeholder="e.g. Serilingampally"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2F27CE] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Village / City *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Gachibowli"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2F27CE] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Address *</label>
                <textarea
                  rows={2}
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Door / Flat No, Street, Landmark"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2F27CE] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">PIN Code *</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="500032"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2F27CE] focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* STEP 4: ADDITIONAL INFORMATION */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Occupation</label>
                <select
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2F27CE] focus:bg-white"
                >
                  <option value="Student">Student</option>
                  <option value="Salaried Employee">Salaried Employee</option>
                  <option value="Self-Employed / Professional">Self-Employed / Professional</option>
                  <option value="Business Owner">Business Owner</option>
                  <option value="Agriculture / Farmer">Agriculture / Farmer</option>
                  <option value="Homemaker">Homemaker</option>
                  <option value="Retired">Retired</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Highest Education</label>
                <select
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2F27CE] focus:bg-white"
                >
                  <option value="Class 10 / Matriculation">Class 10 / Matriculation</option>
                  <option value="Class 12 / Intermediate">Class 12 / Intermediate</option>
                  <option value="Diploma / Polytechnic">Diploma / Polytechnic</option>
                  <option value="B.Tech / Bachelor's Degree">B.Tech / Bachelor&apos;s Degree</option>
                  <option value="Master's / Post Graduate">Master&apos;s / Post Graduate</option>
                  <option value="Doctorate / Ph.D">Doctorate / Ph.D</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Social Category (Helps match welfare scholarships)
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2F27CE] focus:bg-white"
                >
                  <option value="General">General / Open</option>
                  <option value="OBC">OBC (Other Backward Class)</option>
                  <option value="SC">SC (Scheduled Caste)</option>
                  <option value="ST">ST (Scheduled Tribe)</option>
                  <option value="EWS">EWS (Economically Weaker Section)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="pt-8 border-t border-slate-100 flex items-center justify-between gap-3">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSaveStep(currentStep + 1)}
            className="px-6 py-2.5 bg-[#2F27CE] hover:bg-[#261fa8] text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : currentStep === 4 ? (
              <>
                <span>Complete Profile</span>
                <CheckCircle2 className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Save &amp; Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-slate-400 pt-6">
        Protected by Section 5 of Digital Personal Data Protection (DPDP) Act, 2023.
      </div>
    </div>
  );
}

export default function ProfileOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FBFBFE]">
          <div className="w-8 h-8 border-4 border-[#2F27CE] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ProfileOnboardingContent />
    </Suspense>
  );
}
