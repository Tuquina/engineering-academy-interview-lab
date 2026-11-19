"use client";

import { useMemo } from "react";
import { createStoreContext } from "@/shared/lib/create-store-context";
import { EMPTY_INTERVIEWS, recordSession, type InterviewsState, type SessionRecord } from "../domain/history";

const interviewsContext = createStoreContext<InterviewsState>("Interviews", EMPTY_INTERVIEWS);

export const InterviewsProvider = interviewsContext.Provider;
export const useInterviewsState = interviewsContext.useStoreState;

export function useInterviewsActions() {
  const store = interviewsContext.useStore();
  return useMemo(
    () => ({ recordSession: (session: SessionRecord) => store.update((s) => recordSession(s, session)) }),
    [store],
  );
}
