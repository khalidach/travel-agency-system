import { useSearchParams } from "react-router-dom";

export function useUrlPagination(paramName: string = "page") {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = Number(searchParams.get(paramName) || "1");

  const setCurrentPage = (pageVal: number | ((prev: number) => number)) => {
    setSearchParams(
      (prevParams) => {
        const nextParam = new URLSearchParams(prevParams);
        const nextPage =
          typeof pageVal === "function" ? pageVal(currentPage) : pageVal;
        nextParam.set(paramName, String(nextPage));
        return nextParam;
      },
      { replace: true }
    );
  };

  return [currentPage, setCurrentPage] as const;
}
