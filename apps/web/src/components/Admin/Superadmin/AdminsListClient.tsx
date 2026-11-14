"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "react-toastify";
import Image from "next/image";
import { DEFAULT_AVATAR } from "@/constants";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  useAdminsQuery,
  useDemoteUserMutation,
  usePromoteUserMutation,
} from "@/lib/modules/admin-users/hooks";
import type { AdminUserItem } from "@/lib/modules/admin-users/api";
import { TextInput } from "@/components/ui/TextInput";
import { Button } from "@/components/ui/Button";

const ROW_HEIGHT = 88;
const DEBOUNCE_MS = 300;

export default function AdminsListClient() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const promote = usePromoteUserMutation();
  const demote = useDemoteUserMutation();
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const query = useAdminsQuery(search);

  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const lastItem = virtualItems[virtualItems.length - 1];

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    if (
      lastItem &&
      lastItem.index >= items.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      void fetchNextPage();
    }
  }, [lastItem, items.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  function handlePromote(userId: string) {
    promote.mutate(userId, {
      onError: (err) => toast.error(getApiErrorMessage(err)),
    });
  }

  function handleDemote(userId: string) {
    demote.mutate(userId, {
      onError: (err) => toast.error(getApiErrorMessage(err)),
    });
  }

  return (
    <div className="mt-4">
      <TextInput
        placeholder="Search by name or email to promote someone…"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        containerClassName="max-w-md"
      />
      <p className="mt-1 text-xs text-theme-muted dark:text-theme-muted">
        {search
          ? "Showing search results across all users."
          : "Showing current admins. Search above to find someone to promote."}
      </p>

      {query.isPending ? (
        <p className="mt-4 text-theme-text dark:text-theme-text">Loading…</p>
      ) : query.isError ? (
        <p className="mt-4 text-theme-danger dark:text-theme-danger">
          {getApiErrorMessage(query.error)}
        </p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-theme-text dark:text-theme-text">
          No users found.
        </p>
      ) : (
        <div
          ref={parentRef}
          className="mt-4 h-[65dvh] overflow-y-auto rounded-xl border border-theme-border"
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              position: "relative",
            }}
          >
            {virtualItems.map((virtualRow) => {
              const item = items[virtualRow.index];
              if (!item) return null;
              return (
                <div
                  key={item.id}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="flex items-center justify-between gap-4 border-b border-theme-border px-4"
                >
                  <AdminRow
                    item={item}
                    pending={
                      (promote.isPending &&
                        promote.variables?.userId === item.id) ||
                      (demote.isPending && demote.variables?.userId === item.id)
                    }
                    onPromote={() => handlePromote(item.id)}
                    onDemote={() => handleDemote(item.id)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminRow({
  item,
  pending,
  onPromote,
  onDemote,
}: {
  item: AdminUserItem;
  pending: boolean;
  onPromote: () => void;
  onDemote: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-3">
        <Image
          src={item.image || DEFAULT_AVATAR}
          width={40}
          height={40}
          alt={item.name ?? item.email}
          className="rounded-full"
        />
        <div>
          <p className="font-bold text-theme-text dark:text-theme-text">
            {item.name ?? "Unnamed"}
          </p>
          <p className="text-sm text-theme-muted dark:text-theme-muted">
            {item.email}
          </p>
        </div>
        <span className="ml-2 rounded-full bg-theme-primary/20 dark:bg-theme-primary/20 px-2 py-0.5 text-xs font-bold capitalize text-theme-primary dark:text-theme-primary">
          {item.role}
        </span>
      </div>
      {item.role === "user" && (
        <Button size="sm" disabled={pending} onClick={onPromote}>
          Promote to admin
        </Button>
      )}
      {item.role === "admin" && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={onDemote}
        >
          Demote to user
        </Button>
      )}
    </>
  );
}
