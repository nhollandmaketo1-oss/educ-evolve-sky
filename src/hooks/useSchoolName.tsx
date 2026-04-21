import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import { getSetting, setSetting } from "@/lib/store";

interface SchoolNameContextType {
  schoolName: string;
  loading: boolean;
  setSchoolName: (name: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const SchoolNameContext = createContext<SchoolNameContextType>({
  schoolName: "",
  loading: true,
  setSchoolName: async () => {},
  refresh: async () => {},
});

const DEFAULT_NAME = "EDUC 2.0";

export function useSchoolName() {
  return useContext(SchoolNameContext);
}

/** Returns the school name or the default fallback for headings/PDFs. */
export function useSchoolDisplayName(): string {
  const { schoolName } = useSchoolName();
  return schoolName?.trim() || DEFAULT_NAME;
}

export function SchoolNameProvider({ children }: { children: ReactNode }) {
  const [schoolName, setSchoolNameState] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const v = await getSetting("school_name");
    setSchoolNameState(v ?? "");
    setLoading(false);
  }, []);

  const update = useCallback(async (name: string) => {
    await setSetting("school_name", name);
    setSchoolNameState(name);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SchoolNameContext.Provider value={{ schoolName, loading, setSchoolName: update, refresh }}>
      {children}
    </SchoolNameContext.Provider>
  );
}
