import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { errorMessage } from "../services/api";

export function useResource(fetcher, dependencies = [], pollMs = 0) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const reload = useCallback(async (quiet = false) => {
    const request = ++generation.current;
    if (!quiet) setLoading(true);
    try {
      const result = await fetcher();
      if (request === generation.current) {
        setData(result);
        setError("");
      }
    } catch (err) {
      if (request === generation.current) setError(errorMessage(err));
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, dependencies);
  useFocusEffect(
    useCallback(() => {
      setData(null);
      reload();
      const timer = pollMs ? setInterval(() => reload(true), pollMs) : null;
      return () => {
        ++generation.current;
        if (timer) clearInterval(timer);
      };
    }, [reload, pollMs]),
  );
  return { data, setData, loading, error, reload };
}
