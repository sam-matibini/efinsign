import { useSearchParams } from "react-router-dom";

export function useEmbedConfig() {
  const [searchParams] = useSearchParams();

  const primaryColor = searchParams.get("primary") || "#2563EB";
  const logoUrl = searchParams.get("logo") || undefined;

  return { primaryColor, logoUrl };
}
