import './globals.css'

export const metadata = {
  title: 'CoLive Talk',
  description: '실시간 음성 번역 서비스',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        {children}
      </body>
    </html>
  )
}