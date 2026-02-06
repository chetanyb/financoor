"use client";

import { useSession, type UserType } from "@/lib/session";
import { IconUser, IconUsers, IconBuilding } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const userTypes: { type: UserType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    type: "individual",
    label: "Individual",
    description: "Personal tax filing under new regime slabs",
    icon: <IconUser className="w-6 h-6" />,
  },
  {
    type: "huf",
    label: "HUF",
    description: "Hindu Undivided Family tax entity",
    icon: <IconUsers className="w-6 h-6" />,
  },
  {
    type: "corporate",
    label: "Corporate",
    description: "Domestic company under Section 115BAA",
    icon: <IconBuilding className="w-6 h-6" />,
  },
];

interface UserTypeStepProps {
  onNext: () => void;
}

export function UserTypeStep({ onNext }: UserTypeStepProps) {
  const { session, setUserType } = useSession();

  const handleSelect = (type: UserType) => {
    setUserType(type);
  };

  const handleContinue = () => {
    if (session.userType) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-neutral-200 mb-2">
          Select Your Entity Type
        </h2>
        <p className="text-neutral-500 text-sm">
          This determines how your tax is calculated under Indian tax law.
        </p>
      </div>

      <div className="grid gap-4">
        {userTypes.map(({ type, label, description, icon }) => (
          <button
            key={type}
            onClick={() => handleSelect(type)}
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl border text-left transition-all",
              session.userType === type
                ? "bg-blue-950/50 border-blue-700 text-white"
                : "bg-neutral-800/50 border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:border-neutral-600"
            )}
          >
            <div
              className={cn(
                "w-12 h-12 rounded-lg flex items-center justify-center",
                session.userType === type
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-neutral-700/50 text-neutral-400"
              )}
            >
              {icon}
            </div>
            <div>
              <p className="font-medium">{label}</p>
              <p className="text-sm text-neutral-500">{description}</p>
            </div>
            {session.userType === type && (
              <div className="ml-auto w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleContinue}
          disabled={!session.userType}
          className={cn(
            "px-6 py-2 rounded-full font-medium transition-colors",
            session.userType
              ? "bg-white text-black hover:bg-neutral-200"
              : "bg-neutral-700 text-neutral-500 cursor-not-allowed"
          )}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
