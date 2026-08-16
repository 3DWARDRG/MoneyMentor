// hooks/useUser.ts
import { database } from "@/database";
import { User } from "@/database/models/mlUser";
import { useEffect, useState } from "react";

export const useUser = (userId: string) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🔑 useUser userId:", userId);

    if (!userId) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const subscription = database
      .get<User>("users")
      .findAndObserve(userId)
      .subscribe({
        next: (record) => {
          console.log("📡 useUser observe emitió:", record?.names);
          setUser(record);
          setLoading(false);
        },
        error: (err) => {
          console.error("❌ useUser observe error:", err);
          setLoading(false);
        },
      });

    return () => subscription.unsubscribe();
  }, [userId]);

  return { user, loading };
};
