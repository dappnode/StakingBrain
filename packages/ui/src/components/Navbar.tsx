import { Network } from "@stakingbrain/common";
import { Link, useLocation } from "react-router-dom";
import IconButton from "@mui/material/IconButton";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import { useEffect } from "react";
import { Switch } from "@headlessui/react";

const routes: { name: string; path: string }[] = [
  { name: "Validators", path: "/" },
  { name: "Import", path: "/import" },
  { name: "Performance", path: "/performance" },
];

export default function NavBar({
  theme,
  toggleTheme,
  userMode,
  setUserMode,
  network,
}: {
  theme: "light" | "dark";
  toggleTheme: () => void;
  userMode: "basic" | "advanced";
  setUserMode: React.Dispatch<React.SetStateAction<"basic" | "advanced">>;
  network?: Network;
}): JSX.Element {
  const location = useLocation();

  useEffect(() => {
    console.log(`theme now is ${theme}`);
  }, [theme]);
  return (
    <div className="flex h-24 w-full justify-center border-b bg-interface-000 dark:border-dark-interface-200 dark:bg-dark-interface-300">
      <div className="flex h-full w-3/4 flex-row items-center justify-between">
        <div className="flex flex-row items-center gap-3">
          <Link
            to={{ pathname: "/" }}
            className="text-lg duration-300 ease-in-out hover:text-text-purple"
          >
            <img
              src="/assets/dappnode_logo_clean.png"
              alt="logo"
              className="h-16 w-16"
            />
          </Link>

          <div className="mt-2 flex flex-col">
            <h1 className="text-xl font-semibold">Staking Brain</h1>
            <div className="-mt-2 font-light italic">{network}</div>
          </div>
        </div>

        <div className="mt-3 flex justify-evenly gap-10">
          {routes.map((route) => (
            <Link
              key={route.path}
              to={{ pathname: route.path }}
              className="text-lg duration-300 ease-in-out hover:text-text-purple"
            >
              {route.name}
              <span
                className={`block h-1 rounded-lg bg-purple-500 transition-all duration-500 ${
                  location.pathname === route.path ? "w-full" : "w-0"
                }`}
              ></span>
            </Link>
          ))}
        </div>

        <div className="flex flex-row gap-5 items-center">
          <Switch
            checked={theme === "dark"}
            onChange={() => {
              toggleTheme();
              localStorage.setItem(
                "theme",
                theme === "dark" ? "light" : "dark",
              );
            }}
            className="group inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition data-[checked]:bg-text-purple"
          >
            <span className="size-4 translate-x-1 transition-transform group-data-[checked]:translate-x-6 flex items-center justify-center ease-in-out">
              {theme === "dark" ? (
                <DarkModeIcon titleAccess="Set Dark Mode" style={{fontSize: "18px"}} />
              ) : (
                <LightModeIcon titleAccess="Set Light Mode" style={{fontSize: "18px"}}/>
              )}
            </span>
          </Switch>

          <IconButton
            sx={{ ml: 1 }}
            onClick={() =>
              setUserMode(userMode === "basic" ? "advanced" : "basic")
            }
            color="inherit"
          >
            {userMode === "basic" ? (
              <UnfoldMoreIcon titleAccess="Expand Andanced Info" />
            ) : (
              <UnfoldLessIcon titleAccess="Collapse Advanced Info" />
            )}
          </IconButton>
        </div>
      </div>
    </div>
  );
}
