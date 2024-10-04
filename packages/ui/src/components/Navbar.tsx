import { Network } from "@stakingbrain/common";
import { Link, useLocation } from "react-router-dom";
import IconButton from "@mui/material/IconButton";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import { useEffect } from "react";

const routes: { name: string; path: string }[] = [
  { name: "Validators", path: "/" },
  { name: "Import", path: "/import" },
  { name: "Performance", path: "/performance" },
  { name: "Notifications", path: "/notifications" },
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
    <div className="bg-interface-000 flex h-24 w-full justify-center border-b dark:bg-dark-interface-300 dark:border-dark-interface-200">
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

        <div className="flex flex-row gap-5">
          <IconButton sx={{ ml: 1 }} onClick={toggleTheme} color="inherit">
            {theme === "dark" ? (
              <LightModeIcon titleAccess="Set Light Mode" />
            ) : (
              <DarkModeIcon titleAccess="Set Dark Mode" />
            )}
          </IconButton>
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
