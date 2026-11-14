"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/modules/query-keys";
import { quizzesApi } from "./api";

export function useQuizPresentationMutation(quizId: string) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (body: import("@buzrr/contract").QuizPresentation) =>
      quizzesApi.presentation(quizId, body),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: queryKeys.quizzes.all });
      await cache.invalidateQueries({
        queryKey: queryKeys.quizzes.detail(quizId),
      });
    },
  });
}

export function useQuizzesQuery() {
  return useQuery({
    queryKey: queryKeys.quizzes.all,
    queryFn: () => quizzesApi.list(),
    staleTime: 30_000,
  });
}

export function useQuizDetailQuery(quizId: string) {
  return useQuery({
    queryKey: queryKeys.quizzes.detail(quizId),
    queryFn: () => quizzesApi.getById(quizId),
    enabled: Boolean(quizId),
    staleTime: 30_000,
  });
}

export function useCreateQuizMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: quizzesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.me });
    },
  });
}

export function useCreateAiQuizMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: quizzesApi.createAi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all });
    },
    // A generation spends an AI token on success and refunds it on failure;
    // either way the usage numbers changed.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.me });
    },
  });
}

export function useUpdateQuizMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      quizId,
      ...body
    }: {
      quizId: string;
      title?: string;
      description?: string;
      isPublic?: boolean;
    }) => quizzesApi.update(quizId, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.quizzes.detail(variables.quizId),
      });
    },
  });
}

export function useDeleteQuizMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: quizzesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all });
      // Frees a slot under the Free plan's quiz cap.
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.me });
    },
  });
}

export function useImportQuizMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: quizzesApi.import,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.me });
    },
  });
}
