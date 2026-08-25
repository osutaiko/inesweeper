import { useEffect, useState } from "react";

export const usePersistentState = <T,>(
  key: string,
  initialValue: T,
  parse: (value: string) => T = JSON.parse,
  serialize: (value: T) => string = JSON.stringify,
) => {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    const storedValue = localStorage.getItem(key);
    if (storedValue === null) {
      return initialValue;
    }

    try {
      return parse(storedValue);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, serialize(value));
  }, [key, serialize, value]);

  return [value, setValue] as const;
};
