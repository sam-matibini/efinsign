import { useSearchParams } from "react-router-dom";

export function useEmbedConfig() {
  const [searchParams] = useSearchParams();

  const primaryColor = searchParams.get("primary") || "#0b1f33";
  const logoUrl = searchParams.get("logo") || undefined;

  return { primaryColor, logoUrl };
}
