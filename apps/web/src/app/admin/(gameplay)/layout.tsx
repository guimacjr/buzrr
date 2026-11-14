export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div lang="pt-BR" className="contents">
      {children}
    </div>
  );
}
