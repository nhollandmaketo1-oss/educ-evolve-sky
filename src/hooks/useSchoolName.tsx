import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import { getSetting, setSetting } from "@/lib/store";

interface SchoolBrandContextType {
  schoolName: string;
  schoolLogo: string;
  loading: boolean;
  setSchoolName: (name: string) => Promise<void>;
  setSchoolLogo: (url: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const SchoolBrandContext = createContext<SchoolBrandContextType>({
  schoolName: "",
  schoolLogo: "",
  loading: true,
  setSchoolName: async () => {},
  setSchoolLogo: async () => {},
  refresh: async () => {},
});

const DEFAULT_NAME = "EDUC 2.0";

export function useSchoolName() {
  return useContext(SchoolBrandContext);
}

/** Returns the school name or the default fallback for headings/PDFs. */
export function useSchoolDisplayName(): string {
  const { schoolName } = useSchoolName();
  return schoolName?.trim() || DEFAULT_NAME;
}

/** Returns the school logo URL (empty string if none). */
export function useSchoolLogo(): string {
  const { schoolLogo } = useSchoolName();
  return schoolLogo || "";
}

export function SchoolNameProvider({ children }: { children: ReactNode }) {
  const [schoolName, setSchoolNameState] = useState<string>("");
  const [schoolLogo, setSchoolLogoState] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [name, logo] = await Promise.all([
      getSetting("school_name"),
      getSetting("school_logo"),
    ]);
    setSchoolNameState(name ?? "");
    setSchoolLogoState(logo ?? "");
    setLoading(false);
  }, []);

  const updateName = useCallback(async (name: string) => {
    await setSetting("school_name", name);
    setSchoolNameState(name);
  }, []);

  const updateLogo = useCallback(async (url: string) => {
    await setSetting("school_logo", url);
    setSchoolLogoState(url);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SchoolBrandContext.Provider
      value={{
        schoolName,
        schoolLogo,
        loading,
        setSchoolName: updateName,
        setSchoolLogo: updateLogo,
        refresh,
      }}
    >
      {children}
    </SchoolBrandContext.Provider>
  );
}
