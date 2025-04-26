import "~/styles/globals.css";

import { Montserrat } from "next/font/google";

import { type Metadata } from "next";

import { Toaster } from "~/components/ui/sonner";

import { TRPCReactProvider } from "~/trpc/react";
import { ReduxProvider } from "./_lib/context/redux";

// import parseBackground from "~/lib/utils/parse-background";
// parseBackground()

import { api } from "~/trpc/server";
import { SessionProvider } from "next-auth/react";
// import { Provider } from "react-redux";
// import store from "~/client-store";

export const metadata: Metadata = {
  title: "Академикс — расписание УРТК",
  description:
    "Платформа Свердловской области для просмотра расписания СПО. Расписания уральского радиотехнического колледжа им. А.С. Попова.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const montserrat = Montserrat({ subsets: ["latin"] });

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${montserrat.className} `}>
      <head>
        {/* <title>Академикс — расписание УРТК</title>
        <meta
          name="description"
          content="Платформа Свердловской области для просмотра расписания СПО. Расписания уральского радиотехнического колледжа им. А.С. Попова."
        /> */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no"
          data-meta-dynamic="true"
        ></meta>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="theme-color" content="#f8f8f8" id="theme-color" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap"
          rel="stylesheet"
        ></link>
      </head>
      <body className="bg-background text-foreground" suppressHydrationWarning>
        <div
          dangerouslySetInnerHTML={{
            __html: `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-W5V8WN3GB7"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-W5V8WN3GB7');
</script>`,
          }}
        />

        <TRPCReactProvider>
          <ReduxProvider>{children}</ReduxProvider>
        </TRPCReactProvider>
        <Toaster position="top-right" />

        <script
          dangerouslySetInnerHTML={{
            __html: `if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.body.classList.add('dark');
}

// Подписка на изменения темы в системе:
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (e.matches) {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }
});

function updateThemeColor() {
  const themeColorMetaTag = document.querySelector('#theme-color');
  const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Устанавливаем цвет на основе текущей темы
  themeColorMetaTag.setAttribute('content', isDarkMode ? '#0a0a0a' : '#f8f8f8');
}

// Инициализация и обновление при смене темы
updateThemeColor();

// Отслеживание изменений системной темы
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateThemeColor);

`,
          }}
        ></script>

        {/* <script dangerouslySetInnerHTML={{
          __html: `
          let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  // Предотвращаем автоматический показ запроса на установку
  e.preventDefault();
  // Сохраняем событие для последующего использования
  deferredPrompt = e;
  
  // Запускаем таймер на 20 секунд
  setTimeout(() => {
    if (deferredPrompt) {
      // Показываем пользователю запрос на установку PWA
      deferredPrompt.prompt();
      
      // Обрабатываем выбор пользователя
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('Пользователь установил PWA');
        } else {
          console.log('Пользователь отклонил установку PWA');
        }
        // Обнуляем сохранённое событие, так как оно уже использовано
        deferredPrompt = null;
      });
    }
  }, 20000); // 20000 миллисекунд = 20 секунд
});
`
        }}></script> */}
      </body>
    </html>
  );
}
