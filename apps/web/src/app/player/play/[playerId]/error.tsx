"use client";
export default function ErrorBoundary({ error }: { error: Error }) {
  return (
    <div className="h-screen w-screen flex justify-center items-center">
      <div className="p-2 mx-auto w-fit bg-theme-muted rounded-md text-sm">
        {error.message}
      </div>
    </div>
  );
}
