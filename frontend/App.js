import { useEffect } from "react";
import { View } from "react-native";
import { Provider } from "react-redux";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";

import { ColorProvider, useColors, useTheme } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { store } from "./redux/store";
import MainNavigator from "./shared/navigation/MainNavigator";
import { API_BASE_URL } from "@utils/authSession";
import AuthProvider from "./context/store/authGlobal";

SplashScreen.preventAutoHideAsync();
WebBrowser.maybeCompleteAuthSession();

function AppShell({ children }) {
  const tokens = useColors();
  const { resolvedScheme } = useTheme();
  const canvasColor = rgb(tokens["--base-canvas"]);

  return (
    <View style={{ flex: 1, backgroundColor: canvasColor }}>
      <StatusBar
        style={resolvedScheme === "dark" ? "light" : "dark"}
        backgroundColor={canvasColor}
        translucent={false}
      />
      {children}
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    "Inter-Regular": require("./assets/fonts/Inter-Regular.ttf"),
    "Inter-Medium": require("./assets/fonts/Inter-Medium.ttf"),
    "Inter-SemiBold": require("./assets/fonts/Inter-SemiBold.ttf"),
    "Inter-Bold": require("./assets/fonts/Inter-Bold.ttf"),
    "PlayfairDisplay-Regular": require("./assets/fonts/PlayfairDisplay-Regular.ttf"),
    "PlayfairDisplay-Medium": require("./assets/fonts/PlayfairDisplay-Medium.ttf"),
    "PlayfairDisplay-SemiBold": require("./assets/fonts/PlayfairDisplay-SemiBold.ttf"),
    "PlayfairDisplay-Bold": require("./assets/fonts/PlayfairDisplay-Bold.ttf"),
    "SpaceMono-Regular": require("./assets/fonts/SpaceMono-Regular.ttf"),
  });

  const appReady = fontsLoaded;

  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync();
    }
  }, [appReady]);

  useEffect(() => {
    let isMounted = true;
    const baseHost = API_BASE_URL.replace(/\/api$/, "");

    const checkBackend = async () => {
      try {
        const response = await fetch(`${baseHost}/health`);
        if (!isMounted) return;
        if (response.ok) {
          console.log(`[app] Backend reachable at ${baseHost}/health`);
        } else {
          console.log(`[app] Backend health check failed: ${response.status}`);
        }
      } catch (error) {
        if (!isMounted) return;
        console.log(`[app] Backend unreachable at ${baseHost}/health`, error?.message || error);
      }
    };

    checkBackend();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ColorProvider initialTheme="default" initialScheme="system">
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <Provider store={store}>
          <AuthProvider>
            <AppShell>
              {appReady ? <MainNavigator /> : null}
            </AppShell>
          </AuthProvider>
        </Provider>
      </SafeAreaProvider>
    </ColorProvider>
  );
}
